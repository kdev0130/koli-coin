import { useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { createNotificationIfMissing } from "@/lib/notifications";
import { DonationContract, canWithdraw } from "@/lib/donationContract";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const FIRST_WITHDRAWAL_DAYS = 30;
const NEAR_WITHDRAWAL_THRESHOLD_DAYS = 3;
const ACTIVE_CONTRACT_STATUSES = new Set(["active", "approved"]);
const APPROVED_PAYOUT_STATUSES = new Set(["approved", "completed"]);

interface PayoutSnapshotDoc {
  id: string;
  status?: string;
  amount?: number;
}

const isKycApprovedStatus = (status?: string) => status === "APPROVED" || status === "VERIFIED";

const toCurrency = (value: number) =>
  value.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const hasContractStarted = (contract: DonationContract) =>
  Boolean(contract.approvedAt || contract.donationStartDate);

export const NotificationSync = () => {
  const { user, userData } = useAuth();
  const userId = user?.uid || null;

  useEffect(() => {
    if (!userId || !isKycApprovedStatus(userData?.kycStatus)) {
      return;
    }

    void createNotificationIfMissing({
      userId,
      notificationId: `${userId}_kyc_approved`,
      type: "kyc_approved",
      title: "KYC Approved",
      message: "Your KYC has been approved. You can now access withdrawal-related features.",
      relatedId: userId,
    }).catch((error) => {
      console.error("Failed to create KYC approval notification:", error);
    });
  }, [userId, userData?.kycStatus]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const contractsQuery = query(
      collection(db, "donationContracts"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      contractsQuery,
      (snapshot) => {
        snapshot.docs.forEach((docSnapshot) => {
          const contract = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as DonationContract;

          if (!contract.id) return;
          const contractId = contract.id;

          if (ACTIVE_CONTRACT_STATUSES.has(contract.status) && hasContractStarted(contract)) {
            void createNotificationIfMissing({
              userId,
              notificationId: `${userId}_donation_approved_${contractId}`,
              type: "donation_approved",
              title: "Donation Contract Approved",
              message: `Your donation contract of ${toCurrency(contract.donationAmount || 0)} KOLI is now active.`,
              relatedId: contractId,
            }).catch((error) => {
              console.error("Failed to create donation approval notification:", error);
            });
          }

          if (!ACTIVE_CONTRACT_STATUSES.has(contract.status) || !hasContractStarted(contract)) {
            return;
          }

          const totalWithdrawn = Number(contract.totalWithdrawn || 0);
          const withdrawalsCount = Number(contract.withdrawalsCount || 0);
          const hasWithdrawnAlready = totalWithdrawn > 0 || withdrawalsCount > 0;

          if (hasWithdrawnAlready) {
            return;
          }

          const startDate = parseDate(contract.donationStartDate || contract.approvedAt);
          if (!startDate) {
            return;
          }

          const firstWithdrawalDate = new Date(
            startDate.getTime() + FIRST_WITHDRAWAL_DAYS * DAY_IN_MS
          );
          const now = Date.now();
          const daysUntilFirstWithdrawal = Math.ceil((firstWithdrawalDate.getTime() - now) / DAY_IN_MS);

          if (
            daysUntilFirstWithdrawal > 0 &&
            daysUntilFirstWithdrawal <= NEAR_WITHDRAWAL_THRESHOLD_DAYS
          ) {
            void createNotificationIfMissing({
              userId,
              notificationId: `${userId}_contract_near_${contractId}`,
              type: "contract_near_withdrawal",
              title: "Contract Near Withdrawal Window",
              message: `Your contract ${contractId.slice(0, 8)} unlocks in ${daysUntilFirstWithdrawal} day(s).`,
              relatedId: contractId,
            }).catch((error) => {
              console.error("Failed to create contract near-withdrawal notification:", error);
            });
          }

          if (daysUntilFirstWithdrawal <= 0) {
            const withdrawalCheck = canWithdraw(contract);
            if (withdrawalCheck.canWithdraw && (withdrawalCheck.availableAmount || 0) > 0) {
              void createNotificationIfMissing({
                userId,
                notificationId: `${userId}_contract_ready_${contractId}`,
                type: "contract_ready_withdrawal",
                title: "Contract Ready To Withdraw",
                message: `Your contract ${contractId.slice(0, 8)} has reached 30 days and is ready to withdraw.`,
                relatedId: contractId,
              }).catch((error) => {
                console.error("Failed to create contract ready notification:", error);
              });
            }
          }
        });
      },
      (error) => {
        console.error("Failed to listen for donation contract notifications:", error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const payoutsQuery = query(collection(db, "payout_queue"), where("userId", "==", userId));

    const unsubscribe = onSnapshot(
      payoutsQuery,
      (snapshot) => {
        snapshot.docs.forEach((docSnapshot) => {
          const payout = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as PayoutSnapshotDoc;

          if (!payout.id || !payout.status || !APPROVED_PAYOUT_STATUSES.has(payout.status)) {
            return;
          }

          const payoutAmount = Number(payout.amount || 0);
          const payoutStatusText = payout.status === "completed" ? "completed" : "approved";

          void createNotificationIfMissing({
            userId,
            notificationId: `${userId}_transaction_approved_${payout.id}`,
            type: "transaction_approved",
            title: "Transaction Approved",
            message: `Your withdrawal transaction was ${payoutStatusText} for ${toCurrency(
              payoutAmount
            )} KOLI.`,
            relatedId: payout.id,
          }).catch((error) => {
            console.error("Failed to create transaction approval notification:", error);
          });
        });
      },
      (error) => {
        console.error("Failed to listen for payout notifications:", error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return null;
};

