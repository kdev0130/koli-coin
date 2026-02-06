import { db } from "./firebase";
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { verifyPin } from "./pinSecurity";
import { canUserWithdraw } from "./kycService";

export interface DonationContract {
  id?: string;
  userId: string;
  donationAmount: number; // Principal - NEVER changes
  donationStartDate: string | null; // ISO string - Set when approved by admin
  lastWithdrawalDate: string | null; // ISO string or null
  withdrawalsCount: number; // 0-12
  contractEndDate: string | null; // ISO string (donationStartDate + 1 year) - Set when approved
  status: "pending" | "active" | "approved" | "completed" | "expired";
  receiptURL?: string;
  receiptPath?: string;
  paymentMethod?: string;
  createdAt: string;
  approvedAt?: string | null; // When admin approved
  approvedBy?: string | null; // Admin user ID
}

/**
 * Create a new donation contract
 * @param userId - User's Firebase UID
 * @param amount - Donation amount
 * @param paymentMethod - Payment method used
 * @param receiptURL - Receipt image URL
 * @param receiptPath - Receipt storage path
 * @returns Contract ID
 */
export async function donate(
  userId: string,
  amount: number,
  paymentMethod: string,
  receiptURL?: string,
  receiptPath?: string
): Promise<string> {
  if (amount <= 0) {
    throw new Error("Donation amount must be greater than zero");
  }

  const now = new Date();
  const createdDate = now.toISOString();

  const contract: Omit<DonationContract, "id"> = {
    userId,
    donationAmount: amount,
    donationStartDate: null, // Will be set when admin approves
    lastWithdrawalDate: null,
    withdrawalsCount: 0,
    contractEndDate: null, // Will be set when admin approves
    status: "pending", // Awaiting admin approval
    paymentMethod,
    receiptURL,
    receiptPath,
    createdAt: createdDate,
    approvedAt: null,
    approvedBy: null,
  };

  const docRef = await addDoc(collection(db, "donationContracts"), contract);
  return docRef.id;
}

/**
 * Approve a pending contract (Admin only)
 * @param contractId - Contract document ID
 * @param adminUserId - Admin user ID
 * @returns Updated contract
 */
export async function approveContract(
  contractId: string,
  adminUserId: string
): Promise<void> {
  const contractRef = doc(db, "donationContracts", contractId);
  const contractSnap = await getDoc(contractRef);

  if (!contractSnap.exists()) {
    throw new Error("Contract not found");
  }

  const contract = contractSnap.data() as DonationContract;

  if (contract.status !== "pending") {
    throw new Error("Contract is not pending approval");
  }

  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from approval

  await updateDoc(contractRef, {
    status: "active",
    donationStartDate: startDate,
    contractEndDate: endDate.toISOString(),
    approvedAt: startDate,
    approvedBy: adminUserId,
  });
}

/**
 * Check if user can withdraw from a contract
 * @param contract - The donation contract
 * @returns Object with canWithdraw boolean, reason, and available periods
 */
export function canWithdraw(contract: DonationContract): {
  canWithdraw: boolean;
  reason: string;
  nextWithdrawalDate?: Date;
  availablePeriods?: number;
} {
  const now = new Date();
  
  // Check if contract is pending approval
  if (contract.status === "pending") {
    return {
      canWithdraw: false,
      reason: "Contract pending admin approval",
      availablePeriods: 0,
    };
  }
  
  // Check if dates are set (should be set after approval)
  if (!contract.donationStartDate || !contract.contractEndDate) {
    return {
      canWithdraw: false,
      reason: "Contract not yet approved",
      availablePeriods: 0,
    };
  }
  
  const startDate = new Date(contract.donationStartDate);
  const endDate = new Date(contract.contractEndDate);

  // Check if contract is expired
  if (now > endDate) {
    return {
      canWithdraw: false,
      reason: "Contract has expired (1 year period ended)",
      availablePeriods: 0,
    };
  }

  // Check if contract is not active or approved
  if (contract.status !== "active" && contract.status !== "approved") {
    return {
      canWithdraw: false,
      reason: `Contract status is ${contract.status}`,
      availablePeriods: 0,
    };
  }

  // Check if all withdrawals used (12 max)
  if (contract.withdrawalsCount >= 12) {
    return {
      canWithdraw: false,
      reason: "All 12 withdrawals have been used",
      availablePeriods: 0,
    };
  }

  // Calculate how many 30-day periods have elapsed since start
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const periodsElapsed = Math.floor(daysSinceStart / 30);
  
  // Available periods = periods elapsed - withdrawals already taken
  const availablePeriods = Math.min(periodsElapsed - contract.withdrawalsCount, 12 - contract.withdrawalsCount);

  // Calculate when next period unlocks
  const nextPeriodNumber = contract.withdrawalsCount + availablePeriods + 1;
  const nextWithdrawalDate = new Date(startDate);
  nextWithdrawalDate.setDate(nextWithdrawalDate.getDate() + (nextPeriodNumber * 30));

  // Check if first period has unlocked yet (30 days after start)
  if (periodsElapsed < 1) {
    const firstWithdrawalDate = new Date(startDate);
    firstWithdrawalDate.setDate(firstWithdrawalDate.getDate() + 30);
    return {
      canWithdraw: false,
      reason: "Must wait 30 days after donation before first withdrawal",
      nextWithdrawalDate: firstWithdrawalDate,
      availablePeriods: 0,
    };
  }

  if (availablePeriods > 0) {
    return {
      canWithdraw: true,
      reason: availablePeriods === 1 ? "1 period available" : `${availablePeriods} periods available (stacked)`,
      nextWithdrawalDate: nextWithdrawalDate,
      availablePeriods,
    };
  }

  return {
    canWithdraw: false,
    reason: "No periods available yet",
    nextWithdrawalDate: nextWithdrawalDate,
    availablePeriods: 0,
  };
}

/**
 * Process a withdrawal from a contract
 * @param contractId - Contract document ID
 * @returns Withdrawal amount
 */
export async function withdraw(contractId: string): Promise<number> {
  const contractRef = doc(db, "donationContracts", contractId);
  const contractSnap = await getDoc(contractRef);

  if (!contractSnap.exists()) {
    throw new Error("Contract not found");
  }

  const contract = { id: contractSnap.id, ...contractSnap.data() } as DonationContract;

  // Validate withdrawal eligibility
  const { canWithdraw: isAllowed, reason } = canWithdraw(contract);
  if (!isAllowed) {
    throw new Error(reason);
  }

  // Calculate withdrawal amount (always 30% of original donation)
  const withdrawalAmount = Math.floor(contract.donationAmount * 0.3);

  // Update contract
  const now = new Date().toISOString();
  const newWithdrawalsCount = contract.withdrawalsCount + 1;
  const newStatus = newWithdrawalsCount >= 12 ? "completed" : "active";

  await updateDoc(contractRef, {
    lastWithdrawalDate: now,
    withdrawalsCount: newWithdrawalsCount,
    status: newStatus,
  });

  // Note: Actual balance update would happen here
  // This should be done in a cloud function for security

  return withdrawalAmount;
}

/**
 * Process a withdrawal with PIN verification and P2P queue creation
 * @param contractId - Contract document ID
 * @param userId - User's Firebase UID
 * @param pin - User's 6-digit funding PIN
 * @returns Withdrawal amount
 */
export async function withdrawWithPin(
  contractId: string,
  userId: string,
  pin: string
): Promise<number> {
  // Verify PIN first
  const isPinValid = await verifyPin(userId, pin);
  if (!isPinValid) {
    throw new Error("Incorrect PIN. Please try again.");
  }

  const contractRef = doc(db, "donationContracts", contractId);
  const contractSnap = await getDoc(contractRef);

  if (!contractSnap.exists()) {
    throw new Error("Contract not found");
  }

  const contract = { id: contractSnap.id, ...contractSnap.data() } as DonationContract;

  // Validate withdrawal eligibility
  const { canWithdraw: isAllowed, reason } = canWithdraw(contract);
  if (!isAllowed) {
    throw new Error(reason);
  }

  // Verify contract belongs to user
  if (contract.userId !== userId) {
    throw new Error("Unauthorized: Contract does not belong to this user");
  }

  // Get user data for P2P queue
  const userRef = doc(db, "members", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const userData = userSnap.data();

  // Verify KYC status
  if (userData.kycStatus !== "VERIFIED" && userData.kycStatus !== "APPROVED") {
    throw new Error("KYC verification required for withdrawals");
  }

  // Calculate withdrawal amount (always 30% of original donation)
  const withdrawalAmount = Math.floor(contract.donationAmount * 0.3);
  const now = new Date().toISOString();
  const newWithdrawalsCount = contract.withdrawalsCount + 1;
  const newStatus = newWithdrawalsCount >= 12 ? "completed" : "active";

  // Create P2P payout queue document
  await addDoc(collection(db, "payout_queue"), {
    userId,
    contractId,
    amount: withdrawalAmount,
    status: "pending",
    userFullName: userData.name || `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
    userPhoneNumber: userData.phoneNumber || "N/A",
    userEmail: userData.email || "N/A",
    withdrawalNumber: newWithdrawalsCount,
    totalWithdrawals: 12,
    contractPrincipal: contract.donationAmount,
    requestedAt: now,
    processedAt: null,
    processedBy: null,
    notes: `P2P Withdrawal ${newWithdrawalsCount}/12 from contract ${contractId}`,
    createdAt: serverTimestamp(),
  });

  // Update contract
  await updateDoc(contractRef, {
    lastWithdrawalDate: now,
    withdrawalsCount: newWithdrawalsCount,
    status: newStatus,
  });

  // Note: Actual balance update should be done by admin when processing P2P queue
  // This ensures security and manual verification

  return withdrawalAmount;
}

/**
 * Get remaining withdrawals for a contract
 * @param contract - The donation contract
 * @returns Number of remaining withdrawals (0-12)
 */
export function getRemainingWithdrawals(contract: DonationContract): number {
  return Math.max(0, 12 - contract.withdrawalsCount);
}

/**
 * Check if contract is still active
 * @param contract - The donation contract
 * @returns Boolean indicating if contract is active
 */
export function isContractActive(contract: DonationContract): boolean {
  if (contract.status === "pending") {
    return false; // Pending contracts are not active
  }
  
  if (!contract.contractEndDate) {
    return false; // No end date means not approved yet
  }
  
  const now = new Date();
  const endDate = new Date(contract.contractEndDate);

  // Accept both "active" and "approved" statuses
  return (
    (contract.status === "active" || contract.status === "approved") &&
    now <= endDate &&
    contract.withdrawalsCount < 12
  );
}

/**
 * Get withdrawal history details
 * @param contract - The donation contract
 * @returns Withdrawal details
 */
export function getWithdrawalDetails(contract: DonationContract): {
  totalWithdrawn: number;
  totalRemaining: number;
  withdrawalPerPeriod: number;
  withdrawalsUsed: number;
  withdrawalsRemaining: number;
  maxTotalWithdrawal: number;
} {
  const withdrawalPerPeriod = Math.floor(contract.donationAmount * 0.3);
  const maxTotalWithdrawal = withdrawalPerPeriod * 12;
  const totalWithdrawn = withdrawalPerPeriod * contract.withdrawalsCount;
  const totalRemaining = maxTotalWithdrawal - totalWithdrawn;

  return {
    totalWithdrawn,
    totalRemaining,
    withdrawalPerPeriod,
    withdrawalsUsed: contract.withdrawalsCount,
    withdrawalsRemaining: getRemainingWithdrawals(contract),
    maxTotalWithdrawal,
  };
}

/**
 * Calculate days until next withdrawal
 * @param contract - The donation contract
 * @returns Days until next withdrawal or null if can withdraw now
 */
export function getDaysUntilNextWithdrawal(contract: DonationContract): number | null {
  if (contract.status === "pending") {
    return null; // Pending contracts have no withdrawal date
  }
  
  const { canWithdraw: isAllowed, nextWithdrawalDate } = canWithdraw(contract);

  if (isAllowed) {
    return 0; // Can withdraw now
  }

  if (!nextWithdrawalDate) {
    return null; // Cannot withdraw (contract expired or completed)
  }

  const now = new Date();
  const diffMs = nextWithdrawalDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Calculate total withdrawable amount across all eligible contracts
 * @param contracts - Array of user's donation contracts
 * @param userBalance - User's current balance (includes MANA rewards)
 * @returns Object with total amount, contract withdrawals, MANA balance, and eligible contracts
 */
export function calculateTotalWithdrawable(
  contracts: DonationContract[],
  userBalance: number = 0
): {
  totalAmount: number;
  contractWithdrawals: number;
  manaBalance: number;
  eligibleContracts: Array<{
    contract: DonationContract;
    availableAmount: number;
  }>;
} {
  const eligibleContracts: Array<{
    contract: DonationContract;
    availableAmount: number;
  }> = [];

  let contractWithdrawals = 0;

  for (const contract of contracts) {
    const { canWithdraw: isAllowed, availablePeriods = 0 } = canWithdraw(contract);
    
    if (isAllowed && availablePeriods > 0) {
      const details = getWithdrawalDetails(contract);
      // Calculate total available: withdrawal per period * number of available periods
      const availableAmount = details.withdrawalPerPeriod * availablePeriods;
      
      eligibleContracts.push({
        contract,
        availableAmount,
      });
      
      contractWithdrawals += availableAmount;
    }
  }

  const manaBalance = userBalance || 0;
  const totalAmount = contractWithdrawals + manaBalance;

  return { totalAmount, contractWithdrawals, manaBalance, eligibleContracts };
}

/**
 * Distribute a custom withdrawal amount across multiple contracts
 * @param requestedAmount - Amount user wants to withdraw
 * @param eligibleContracts - Contracts that can be withdrawn from
 * @returns Distribution plan with amount per contract
 */
export function distributeWithdrawalAmount(
  requestedAmount: number,
  eligibleContracts: Array<{
    contract: DonationContract;
    availableAmount: number;
  }>
): Array<{
  contractId: string;
  amount: number;
  contract: DonationContract;
}> {
  if (requestedAmount <= 0) {
    throw new Error("Withdrawal amount must be greater than zero");
  }

  const totalAvailable = eligibleContracts.reduce(
    (sum, item) => sum + item.availableAmount,
    0
  );

  if (requestedAmount > totalAvailable) {
    throw new Error(
      `Requested amount ₱${requestedAmount.toFixed(2)} exceeds available ₱${totalAvailable.toFixed(2)}`
    );
  }

  const distribution: Array<{
    contractId: string;
    amount: number;
    contract: DonationContract;
  }> = [];

  let remainingAmount = requestedAmount;

  // Distribute sequentially: fully drain first contract, then second, etc.
  for (const { contract, availableAmount } of eligibleContracts) {
    if (remainingAmount <= 0) break;

    // Take as much as possible from this contract
    const amountFromThisContract = Math.min(remainingAmount, availableAmount);

    if (amountFromThisContract > 0) {
      distribution.push({
        contractId: contract.id,
        amount: amountFromThisContract,
        contract,
      });
      remainingAmount -= amountFromThisContract;
    }
  }

  // Handle any rounding differences by adding to the first contract
  if (remainingAmount > 0 && distribution.length > 0) {
    distribution[0].amount += remainingAmount;
  }

  return distribution;
}

/**
 * Process a pooled withdrawal with PIN verification across multiple contracts
 * @param userId - User's Firebase UID
 * @param pin - User's 6-digit funding PIN
 * @param requestedAmount - Custom amount to withdraw
 * @param contracts - Selected user's contracts
 * @param manaToWithdraw - Amount from MANA rewards to include (optional)
 * @returns Array of created payout queue IDs
 */
export async function processPooledWithdrawal(
  userId: string,
  pin: string,
  requestedAmount: number,
  contracts: DonationContract[],
  manaToWithdraw: number = 0
): Promise<{ payoutIds: string[]; totalAmount: number }> {
  // Verify PIN first
  const isPinValid = await verifyPin(userId, pin);
  if (!isPinValid) {
    throw new Error("Incorrect PIN. Please try again.");
  }

  // Calculate total withdrawable from selected contracts
  const { totalAmount: contractTotal, eligibleContracts } = calculateTotalWithdrawable(contracts, 0);
  const totalAvailable = contractTotal + manaToWithdraw;

  if (eligibleContracts.length === 0 && manaToWithdraw === 0) {
    throw new Error("No contracts or MANA rewards selected for withdrawal");
  }

  if (requestedAmount > totalAvailable) {
    throw new Error(
      `Requested amount ₱${requestedAmount.toFixed(2)} exceeds selected available ₱${totalAvailable.toFixed(2)}`
    );
  }

  // Get user data for P2P queue
  const userRef = doc(db, "members", userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const userData = userSnap.data();

  // Verify KYC status
  const { canWithdraw: kycAllowed, reason: kycReason } = canUserWithdraw(userData);
  if (!kycAllowed) {
    throw new Error(kycReason || "KYC verification required");
  }

  const payoutIds: string[] = [];
  const now = new Date().toISOString();
  let remainingAmount = requestedAmount;

  // First, withdraw from MANA if selected
  if (manaToWithdraw > 0 && remainingAmount > 0) {
    const manaAmount = Math.min(remainingAmount, manaToWithdraw);

    // Deduct MANA balance from user account immediately
    const currentBalance = userData.balance || 0;
    const newBalance = Math.max(0, currentBalance - manaAmount);
    await updateDoc(userRef, {
      balance: newBalance,
    });

    // Create MANA withdrawal payout queue document
    const manaPayoutData = {
      userId,
      userName: userData.fullName || userData.email || "Unknown",
      userEmail: userData.email || "",
      userPhone: userData.phoneNumber || "",
      amount: manaAmount,
      withdrawalType: "MANA_REWARDS",
      isPooled: true,
      status: "pending",
      paymentMethod: userData.preferredPayoutMethod || "GCash",
      gcashNumber: userData.gcashNumber || "",
      requestedAt: now,
      processedAt: null,
      processedBy: null,
      transactionProof: null,
      notes: `MANA Rewards withdrawal: ₱${manaAmount.toFixed(2)}`,
    };

    const manaPayoutRef = await addDoc(collection(db, "payout_queue"), manaPayoutData);
    payoutIds.push(manaPayoutRef.id);

    remainingAmount -= manaAmount;
  }

  // Then, withdraw from contracts if any are selected and there's remaining amount
  if (eligibleContracts.length > 0 && remainingAmount > 0) {
    const amountFromContracts = Math.min(remainingAmount, contractTotal);
    const distribution = distributeWithdrawalAmount(amountFromContracts, eligibleContracts);

    // Process each contract in the distribution
    for (const item of distribution) {
      const { contractId, amount, contract } = item;
      const contractRef = doc(db, "donationContracts", contractId);

      // Calculate how many periods are being withdrawn
      const amountPerPeriod = contract.donationAmount * 0.3;
      const periodsWithdrawn = Math.round(amount / amountPerPeriod);

      // Update contract withdrawal info
      const newWithdrawalsCount = contract.withdrawalsCount + periodsWithdrawn;
      const newStatus = newWithdrawalsCount >= 12 ? "completed" : contract.status;

      await updateDoc(contractRef, {
        withdrawalsCount: newWithdrawalsCount,
        status: newStatus,
      });

      // Create P2P payout queue document for manual processing
      const payoutData = {
        userId,
        userName: userData.fullName || userData.email || "Unknown",
        userEmail: userData.email || "",
        userPhone: userData.phoneNumber || "",
        contractId,
        amount,
        isPooled: true, // Mark as pooled withdrawal
        withdrawalNumber: newWithdrawalsCount,
        totalWithdrawals: 12,
        periodsWithdrawn, // Track how many periods were withdrawn
        status: "pending",
        paymentMethod: userData.preferredPayoutMethod || "GCash",
        gcashNumber: userData.gcashNumber || "",
        requestedAt: now,
        processedAt: null,
        processedBy: null,
        transactionProof: null,
        notes: periodsWithdrawn > 1 
          ? `Pooled withdrawal: ₱${amount.toFixed(2)} (${periodsWithdrawn} periods) from contract ${contractId}`
          : `Pooled withdrawal: ₱${amount.toFixed(2)} from contract ${contractId}`,
      };

      const payoutRef = await addDoc(collection(db, "payout_queue"), payoutData);
      payoutIds.push(payoutRef.id);
    }

    remainingAmount -= amountFromContracts;
  }

  return { payoutIds, totalAmount: requestedAmount };
}
