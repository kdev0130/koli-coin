import { db } from "./firebase";
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { verifyPin } from "./pinSecurity";
import { canUserWithdraw } from "./kycService";

export type DonationContractType =
  | "monthly_12_no_principal"
  | "lockin_6_compound"
  | "lockin_12_compound";

type ContractPlanConfig = {
  type: DonationContractType;
  label: string;
  durationMonths: number;
  compoundLockIn: boolean;
  periodicRate: number;
  withdrawalSlots: number;
};

const MONTHLY_PERIOD_DAYS = 30;

const CONTRACT_PLAN_CONFIG: Record<DonationContractType, ContractPlanConfig> = {
  monthly_12_no_principal: {
    type: "monthly_12_no_principal",
    label: "30% Monthly for 1 Year (Principal Unchanged)",
    durationMonths: 12,
    compoundLockIn: false,
    periodicRate: 0.3,
    withdrawalSlots: 12,
  },
  lockin_6_compound: {
    type: "lockin_6_compound",
    label: "6-Month Lock-In (30% Monthly Compounded)",
    durationMonths: 6,
    compoundLockIn: true,
    periodicRate: 0.3,
    withdrawalSlots: 1,
  },
  lockin_12_compound: {
    type: "lockin_12_compound",
    label: "12-Month Lock-In (30% Monthly Compounded)",
    durationMonths: 12,
    compoundLockIn: true,
    periodicRate: 0.3,
    withdrawalSlots: 1,
  },
};

export interface DonationContract {
  id?: string;
  userId: string;
  donationAmount: number; // Principal - NEVER changes
  contractType?: DonationContractType;
  verifiedAmount?: number | null; // Admin-verified principal when adjusted
  discrepancyAmount?: number | null; // Difference between submitted and verified amount
  hasDiscrepancy?: boolean; // Flag for adjusted approvals
  reviewOutcome?: string | null; // e.g. "approved_adjusted"
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  donationStartDate: string | null; // ISO string - Set when approved by admin
  lastWithdrawalDate: string | null; // ISO string or null
  withdrawalsCount: number; // 0-12 (deprecated, kept for backwards compatibility)
  totalWithdrawn?: number; // Actual total amount withdrawn (replaces period counting)
  contractEndDate: string | null; // ISO string (donationStartDate + 1 year) - Set when approved
  status: "pending" | "active" | "approved" | "completed" | "expired" | "rejected";
  receiptURL?: string;
  receiptPath?: string;
  rejectionReason?: string | null;
  paymentMethod?: string;
  createdAt: string;
  approvedAt?: string | null; // When admin approved
  approvedBy?: string | null; // Admin user ID
}

export interface ContractAdjustmentDetails {
  isAdjusted: boolean;
  originalAmount: number;
  approvedAmount: number;
  discrepancyAmount: number;
}

const toSafeAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
};

export function getContractType(contract: DonationContract): DonationContractType {
  const value = contract.contractType;
  if (value && value in CONTRACT_PLAN_CONFIG) {
    return value;
  }
  return "monthly_12_no_principal";
}

export function getContractPlanConfig(contract: DonationContract): ContractPlanConfig {
  return CONTRACT_PLAN_CONFIG[getContractType(contract)];
}

export function getContractPlanLabel(contract: DonationContract): string {
  return getContractPlanConfig(contract).label;
}

export function calculateCompoundedContractValue(
  principal: number,
  months: number,
  monthlyRate: number = 0.3
): number {
  const safePrincipal = Math.max(0, Number(principal) || 0);
  const safeMonths = Math.max(0, Math.floor(Number(months) || 0));
  const safeRate = Math.max(0, Number(monthlyRate) || 0);
  return safePrincipal * Math.pow(1 + safeRate, safeMonths);
}

export function getContractMaxTotalWithdrawal(contract: DonationContract): number {
  const principal = getContractPrincipal(contract);
  const plan = getContractPlanConfig(contract);

  if (plan.compoundLockIn) {
    return calculateCompoundedContractValue(principal, plan.durationMonths, plan.periodicRate);
  }

  return principal * plan.periodicRate * plan.withdrawalSlots;
}

export function getContractWithdrawalSlots(contract: DonationContract): number {
  return getContractPlanConfig(contract).withdrawalSlots;
}

export function getContractUnlockDate(contract: DonationContract): Date | null {
  if (!contract.donationStartDate) return null;
  const startDate = new Date(contract.donationStartDate);
  const plan = getContractPlanConfig(contract);

  if (plan.compoundLockIn) {
    const unlockDate = new Date(startDate);
    unlockDate.setMonth(unlockDate.getMonth() + plan.durationMonths);
    return unlockDate;
  }

  const firstWithdrawalDate = new Date(startDate);
  firstWithdrawalDate.setDate(firstWithdrawalDate.getDate() + MONTHLY_PERIOD_DAYS);
  return firstWithdrawalDate;
}

export function getContractAdjustmentDetails(contract: DonationContract): ContractAdjustmentDetails {
  const originalAmount = toSafeAmount(contract.donationAmount);
  const verifiedRaw = contract.verifiedAmount;
  const hasVerifiedAmount = verifiedRaw !== undefined && verifiedRaw !== null && Number.isFinite(Number(verifiedRaw));
  const verifiedAmount = hasVerifiedAmount ? toSafeAmount(verifiedRaw) : originalAmount;
  const outcomeAdjusted = String(contract.reviewOutcome || "").toLowerCase() === "approved_adjusted";
  const amountAdjusted = hasVerifiedAmount && verifiedAmount !== originalAmount;
  const isAdjusted = outcomeAdjusted || Boolean(contract.hasDiscrepancy) || amountAdjusted;

  const explicitDiscrepancy =
    contract.discrepancyAmount !== undefined && contract.discrepancyAmount !== null
      ? toSafeAmount(contract.discrepancyAmount)
      : Math.max(0, originalAmount - verifiedAmount);

  const approvedAmount = isAdjusted ? verifiedAmount : originalAmount;
  const discrepancyAmount = Math.max(
    0,
    explicitDiscrepancy || Math.max(0, originalAmount - approvedAmount)
  );

  return {
    isAdjusted,
    originalAmount,
    approvedAmount,
    discrepancyAmount,
  };
}

export function getContractPrincipal(contract: DonationContract): number {
  return getContractAdjustmentDetails(contract).approvedAmount;
}

export function hasAdjustedApproval(contract: DonationContract): boolean {
  return getContractAdjustmentDetails(contract).isAdjusted;
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
  contractType: DonationContractType = "monthly_12_no_principal",
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
    contractType,
    donationStartDate: null, // Will be set when admin approves
    lastWithdrawalDate: null,
    withdrawalsCount: 0,
    totalWithdrawn: 0, // Track actual amount withdrawn
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
 * Create a donation contract using the user's withdrawable pool (contracts + MANA balance)
 * @param userId - User's Firebase UID
 * @param amount - Amount to re-donate from withdrawable pool
 * @param contractType - Selected contract type
 * @param contracts - Current list of user's contracts
 * @param userBalance - Current user MANA/reward balance
 * @returns New contract ID
 */
export async function donateFromWithdrawablePool(
  userId: string,
  amount: number,
  contractType: DonationContractType,
  contracts: DonationContract[],
  userBalance: number = 0
): Promise<string> {
  if (amount <= 0) {
    throw new Error("Donation amount must be greater than zero");
  }

  const safeContracts = contracts.filter((contract) => contract.userId === userId);
  const {
    totalAmount: totalWithdrawable,
    contractWithdrawals,
    eligibleContracts,
  } = calculateTotalWithdrawable(safeContracts, userBalance);

  if (amount > totalWithdrawable) {
    throw new Error(
      `Requested amount ${amount.toFixed(2)} KOLI exceeds withdrawable pool ${totalWithdrawable.toFixed(2)} KOLI`
    );
  }

  const userRef = doc(db, "members", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const liveUserData = userSnap.data();
  const liveBalance = Number(liveUserData.balance || 0);

  const amountFromContracts = Math.min(amount, contractWithdrawals);
  const amountFromBalance = Math.max(0, amount - amountFromContracts);

  if (amountFromBalance > liveBalance) {
    throw new Error("Insufficient MANA balance for this re-donation amount");
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const endDate = new Date(now);
  const selectedPlan = CONTRACT_PLAN_CONFIG[contractType];
  endDate.setMonth(endDate.getMonth() + selectedPlan.durationMonths);

  const batch = writeBatch(db);

  if (amountFromContracts > 0) {
    const distribution = distributeWithdrawalAmount(amountFromContracts, eligibleContracts);

    for (const item of distribution) {
      const { contract, amount: consumedAmount } = item;

      if (!contract.id) {
        throw new Error("Contract ID missing for withdrawable pool re-donation");
      }

      const plan = getContractPlanConfig(contract);
      const amountPerPeriod = getContractPrincipal(contract) * plan.periodicRate;
      const maxTotalWithdrawal = getContractMaxTotalWithdrawal(contract);
      const currentTotalWithdrawn = contract.totalWithdrawn ?? (contract.withdrawalsCount * amountPerPeriod);
      const newTotalWithdrawn = currentTotalWithdrawn + consumedAmount;
      const equivalentPeriods = plan.compoundLockIn
        ? (newTotalWithdrawn > 0 ? 1 : 0)
        : Math.ceil(newTotalWithdrawn / amountPerPeriod);
      const newStatus = newTotalWithdrawn >= maxTotalWithdrawal ? "completed" : contract.status;

      batch.update(doc(db, "donationContracts", contract.id), {
        totalWithdrawn: newTotalWithdrawn,
        withdrawalsCount: equivalentPeriods,
        lastWithdrawalDate: timestamp,
        status: newStatus,
      });
    }
  }

  if (amountFromBalance > 0) {
    batch.update(userRef, {
      balance: Math.max(0, liveBalance - amountFromBalance),
    });
  }

  const newContractRef = doc(collection(db, "donationContracts"));
  const newContract: Omit<DonationContract, "id"> = {
    userId,
    donationAmount: amount,
    contractType,
    donationStartDate: timestamp,
    lastWithdrawalDate: null,
    withdrawalsCount: 0,
    totalWithdrawn: 0,
    contractEndDate: endDate.toISOString(),
    status: "active",
    paymentMethod: "redonate_pool",
    createdAt: timestamp,
    approvedAt: timestamp,
    approvedBy: "system_redonate_pool",
  };

  batch.set(newContractRef, newContract);
  await batch.commit();

  return newContractRef.id;
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
  const plan = getContractPlanConfig(contract);
  endDate.setMonth(endDate.getMonth() + plan.durationMonths);

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
 * @returns Object with canWithdraw boolean, reason, available periods, and available amount
 */
export function canWithdraw(contract: DonationContract): {
  canWithdraw: boolean;
  reason: string;
  nextWithdrawalDate?: Date;
  availablePeriods?: number;
  availableAmount?: number;
} {
  const now = new Date();
  
  // Check if contract is pending approval
  if (contract.status === "pending") {
    return {
      canWithdraw: false,
      reason: "Contract pending admin approval",
      availablePeriods: 0,
      availableAmount: 0,
    };
  }
  
  // Check if dates are set (should be set after approval)
  if (!contract.donationStartDate || !contract.contractEndDate) {
    return {
      canWithdraw: false,
      reason: "Contract not yet approved",
      availablePeriods: 0,
      availableAmount: 0,
    };
  }
  
  const startDate = new Date(contract.donationStartDate);
  const endDate = new Date(contract.contractEndDate);
  const plan = getContractPlanConfig(contract);

  if (plan.compoundLockIn) {
    const totalWithdrawn = Number(contract.totalWithdrawn || 0);

    if (now < endDate) {
      return {
        canWithdraw: false,
        reason: `Locked for ${plan.durationMonths} months. Withdrawal unlocks at maturity.`,
        nextWithdrawalDate: endDate,
        availablePeriods: 0,
        availableAmount: 0,
      };
    }

    const maturityAmount = getContractMaxTotalWithdrawal(contract);
    const availableAmount = Math.max(0, maturityAmount - totalWithdrawn);

    if (availableAmount > 0) {
      return {
        canWithdraw: true,
        reason: `${availableAmount.toFixed(2)} KOLI available after lock-in maturity`,
        availablePeriods: 1,
        availableAmount,
      };
    }

    return {
      canWithdraw: false,
      reason: "All matured funds withdrawn",
      availablePeriods: 0,
      availableAmount: 0,
    };
  }

  // Check if contract is expired
  if (now > endDate) {
    return {
      canWithdraw: false,
      reason: "Contract has expired (1 year period ended)",
      availablePeriods: 0,
      availableAmount: 0,
    };
  }

  // Check if contract is not active or approved
  if (contract.status !== "active" && contract.status !== "approved") {
    return {
      canWithdraw: false,
      reason: `Contract status is ${contract.status}`,
      availablePeriods: 0,
      availableAmount: 0,
    };
  }

  // Calculate accumulated withdrawable funds based on time elapsed
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const periodsElapsed = Math.floor(daysSinceStart / 30);
  
  // Amount per period (30% of donation)
  const amountPerPeriod = getContractPrincipal(contract) * plan.periodicRate;
  
  // Maximum total that can ever be withdrawn (12 periods worth = 3.6x donation)
  const maxTotalWithdrawal = getContractMaxTotalWithdrawal(contract);
  
  // Total amount withdrawn so far (use new field or calculate from old withdrawalsCount)
  const totalWithdrawn = contract.totalWithdrawn ?? (contract.withdrawalsCount * amountPerPeriod);
  
  // Accumulated available = (periods elapsed × amount per period) - total already withdrawn
  // Capped at maximum allowed
  const accumulatedAmount = Math.min(periodsElapsed * amountPerPeriod, maxTotalWithdrawal);
  const availableAmount = Math.max(0, accumulatedAmount - totalWithdrawn);
  
  // Calculate equivalent periods for backwards compatibility
  const availablePeriods = amountPerPeriod > 0 ? Math.floor(availableAmount / amountPerPeriod) : 0;
  
  // Check if first period has unlocked yet (30 days after start)
  if (periodsElapsed < 1) {
    const firstWithdrawalDate = new Date(startDate);
    firstWithdrawalDate.setDate(firstWithdrawalDate.getDate() + 30);
    return {
      canWithdraw: false,
      reason: "Must wait 30 days after donation before first withdrawal",
      nextWithdrawalDate: firstWithdrawalDate,
      availablePeriods: 0,
      availableAmount: 0,
    };
  }

  if (availableAmount > 0) {
    return {
      canWithdraw: true,
      reason: `${availableAmount.toFixed(2)} KOLI available to withdraw`,
      availablePeriods,
      availableAmount,
    };
  }
  
  // Check if completed or just need to wait
  const isCompleted = totalWithdrawn >= maxTotalWithdrawal;
  const nextWithdrawalDate = new Date(startDate);
  nextWithdrawalDate.setDate(nextWithdrawalDate.getDate() + ((periodsElapsed + 1) * 30));

  return {
    canWithdraw: false,
    reason: isCompleted
      ? "All funds withdrawn (3.6x donation limit reached)"
      : `Next funds available in ${30 - (daysSinceStart % 30)} days`,
    nextWithdrawalDate: isCompleted ? undefined : nextWithdrawalDate,
    availablePeriods: 0,
    availableAmount: 0,
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
  const plan = getContractPlanConfig(contract);

  // Validate withdrawal eligibility
  const { canWithdraw: isAllowed, reason, availableAmount = 0 } = canWithdraw(contract);
  if (!isAllowed) {
    throw new Error(reason);
  }

  // Calculate withdrawal amount based on contract plan
  const withdrawalAmount = plan.compoundLockIn
    ? Math.floor(availableAmount)
    : Math.floor(getContractPrincipal(contract) * plan.periodicRate);

  // Update contract
  const now = new Date().toISOString();
  const updatedTotalWithdrawn = Number(contract.totalWithdrawn || 0) + withdrawalAmount;
  const maxTotalWithdrawal = getContractMaxTotalWithdrawal(contract);
  const newWithdrawalsCount = plan.compoundLockIn
    ? (updatedTotalWithdrawn > 0 ? 1 : 0)
    : contract.withdrawalsCount + 1;
  const newStatus = updatedTotalWithdrawn >= maxTotalWithdrawal ? "completed" : "active";

  await updateDoc(contractRef, {
    lastWithdrawalDate: now,
    totalWithdrawn: updatedTotalWithdrawn,
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
  const plan = getContractPlanConfig(contract);

  // Validate withdrawal eligibility
  const { canWithdraw: isAllowed, reason, availableAmount = 0 } = canWithdraw(contract);
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

  // Calculate withdrawal amount based on contract plan
  const withdrawalAmount = plan.compoundLockIn
    ? Math.floor(availableAmount)
    : Math.floor(getContractPrincipal(contract) * plan.periodicRate);
  const now = new Date().toISOString();
  const currentTotalWithdrawn = Number(contract.totalWithdrawn || 0);
  const newTotalWithdrawn = currentTotalWithdrawn + withdrawalAmount;
  const maxTotalWithdrawal = getContractMaxTotalWithdrawal(contract);
  const newWithdrawalsCount = plan.compoundLockIn
    ? (newTotalWithdrawn > 0 ? 1 : 0)
    : contract.withdrawalsCount + 1;
  const newStatus = newTotalWithdrawn >= maxTotalWithdrawal ? "completed" : "active";

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
    totalWithdrawals: getContractWithdrawalSlots(contract),
    contractPrincipal: getContractPrincipal(contract),
    requestedAt: now,
    processedAt: null,
    processedBy: null,
    notes: `P2P Withdrawal ${newWithdrawalsCount}/${getContractWithdrawalSlots(contract)} from contract ${contractId}`,
    createdAt: serverTimestamp(),
  });

  // Update contract
  await updateDoc(contractRef, {
    lastWithdrawalDate: now,
    totalWithdrawn: newTotalWithdrawn,
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
  return Math.max(0, getContractWithdrawalSlots(contract) - contract.withdrawalsCount);
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
  
  const plan = getContractPlanConfig(contract);
  const amountPerPeriod = getContractPrincipal(contract) * plan.periodicRate;
  const maxTotalWithdrawal = getContractMaxTotalWithdrawal(contract);
  const totalWithdrawn = contract.totalWithdrawn ?? (contract.withdrawalsCount * amountPerPeriod);

  // Accept both "active" and "approved" statuses
  return (
    (contract.status === "active" || contract.status === "approved") &&
    (plan.compoundLockIn ? true : now <= endDate) &&
    totalWithdrawn < maxTotalWithdrawal
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
  const plan = getContractPlanConfig(contract);
  const maxTotalWithdrawal = getContractMaxTotalWithdrawal(contract);

  if (plan.compoundLockIn) {
    const totalWithdrawn = contract.totalWithdrawn ?? 0;
    const totalRemaining = Math.max(0, maxTotalWithdrawal - totalWithdrawn);
    const withdrawalsUsed = totalWithdrawn > 0 ? 1 : 0;
    const withdrawalsRemaining = totalRemaining > 0 ? 1 : 0;

    return {
      totalWithdrawn,
      totalRemaining,
      withdrawalPerPeriod: Math.floor(maxTotalWithdrawal),
      withdrawalsUsed,
      withdrawalsRemaining,
      maxTotalWithdrawal,
    };
  }

  const withdrawalPerPeriod = Math.floor(getContractPrincipal(contract) * plan.periodicRate);
  // Use actual amount withdrawn, not period-based calculation
  const totalWithdrawn = contract.totalWithdrawn ?? (withdrawalPerPeriod * contract.withdrawalsCount);
  const totalRemaining = Math.max(0, maxTotalWithdrawal - totalWithdrawn);
  
  // Calculate equivalent periods for display
  const equivalentPeriodsUsed = withdrawalPerPeriod > 0 ? Math.ceil(totalWithdrawn / withdrawalPerPeriod) : 0;
  const equivalentPeriodsRemaining = Math.max(0, getContractWithdrawalSlots(contract) - equivalentPeriodsUsed);

  return {
    totalWithdrawn,
    totalRemaining,
    withdrawalPerPeriod,
    withdrawalsUsed: equivalentPeriodsUsed,
    withdrawalsRemaining: equivalentPeriodsRemaining,
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
    const withdrawalCheck = canWithdraw(contract);
    const { canWithdraw: isAllowed, availableAmount = 0 } = withdrawalCheck;
    
    if (isAllowed && availableAmount > 0) {
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
      `Requested amount ${requestedAmount.toFixed(2)} KOLI exceeds available ${totalAvailable.toFixed(2)} KOLI`
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
  manaToWithdraw: number = 0,
  platformFee: number = 0,
  grossAmount: number = 0
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
      `Requested amount ${requestedAmount.toFixed(2)} KOLI exceeds selected available ${totalAvailable.toFixed(2)} KOLI`
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

  // Generate a unique withdrawal session ID to link all payouts from this single withdrawal
  const withdrawalSessionId = `session_${Date.now()}_${userId.substring(0, 8)}`;

  // Calculate remaining withdrawable balance after this withdrawal
  const { totalAmount: currentTotalWithdrawable } = calculateTotalWithdrawable(contracts, userData.balance || 0);
  const totalWithdrawableAfterWithdrawal = currentTotalWithdrawable - requestedAmount;

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
      grossAmount: platformFee > 0 ? manaAmount / (1 - (platformFee / grossAmount)) : manaAmount,
      platformFee: platformFee > 0 ? (manaAmount / (1 - (platformFee / grossAmount))) - manaAmount : 0,
      netAmount: manaAmount,
      withdrawalType: "MANA_REWARDS",
      isPooled: true,
      withdrawalSessionId, // Link to withdrawal session
      totalWithdrawableBalance: totalWithdrawableAfterWithdrawal, // Remaining balance after withdrawal
      status: "pending",
      paymentMethod: userData.preferredPayoutMethod || "GCash",
      gcashNumber: userData.gcashNumber || "",
      requestedAt: now,
      processedAt: null,
      processedBy: null,
      transactionProof: null,
      notes: `MANA Rewards withdrawal: ${manaAmount.toFixed(2)} KOLI`,
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
      const plan = getContractPlanConfig(contract);

      // Calculate actual total withdrawn and check if completed
      const amountPerPeriod = getContractPrincipal(contract) * plan.periodicRate;
      const maxTotalWithdrawal = getContractMaxTotalWithdrawal(contract);
      const currentTotalWithdrawn = contract.totalWithdrawn ?? (contract.withdrawalsCount * amountPerPeriod);
      const newTotalWithdrawn = currentTotalWithdrawn + amount;
      
      // Calculate equivalent periods for backwards compatibility
      const equivalentPeriods = plan.compoundLockIn
        ? (newTotalWithdrawn > 0 ? 1 : 0)
        : Math.ceil(newTotalWithdrawn / amountPerPeriod);
      const newStatus = newTotalWithdrawn >= maxTotalWithdrawal ? "completed" : contract.status;

      // Update contract with actual amount withdrawn
      await updateDoc(contractRef, {
        totalWithdrawn: newTotalWithdrawn,
        withdrawalsCount: equivalentPeriods, // Keep for backwards compatibility
        lastWithdrawalDate: now,
        status: newStatus,
      });

      // Create P2P payout queue document for manual processing
      const remainingBalance = maxTotalWithdrawal - newTotalWithdrawn;
      const payoutData = {
        userId,
        userName: userData.fullName || userData.email || "Unknown",
        userEmail: userData.email || "",
        userPhone: userData.phoneNumber || "",
        contractId,
        amount,
        grossAmount: platformFee > 0 ? amount / (1 - (platformFee / grossAmount)) : amount,
        platformFee: platformFee > 0 ? (amount / (1 - (platformFee / grossAmount))) - amount : 0,
        netAmount: amount,
        isPooled: true, // Mark as pooled withdrawal
        withdrawalSessionId, // Link to withdrawal session
        totalWithdrawableBalance: totalWithdrawableAfterWithdrawal, // Remaining balance after withdrawal
        withdrawalNumber: equivalentPeriods, // Equivalent period number
        totalWithdrawals: getContractWithdrawalSlots(contract),
        actualAmountWithdrawn: amount, // Actual amount this withdrawal
        totalWithdrawnSoFar: newTotalWithdrawn, // Total withdrawn including this
        remainingBalance, // Remaining withdrawable balance
        status: "pending",
        paymentMethod: userData.preferredPayoutMethod || "GCash",
        gcashNumber: userData.gcashNumber || "",
        requestedAt: now,
        processedAt: null,
        processedBy: null,
        transactionProof: null,
        notes: `Withdrawal: ${amount.toFixed(2)} KOLI (${remainingBalance.toFixed(2)} KOLI remaining) from contract ${contractId}`,
      };

      const payoutRef = await addDoc(collection(db, "payout_queue"), payoutData);
      payoutIds.push(payoutRef.id);
    }

    remainingAmount -= amountFromContracts;
  }

  return { payoutIds, totalAmount: requestedAmount };
}
