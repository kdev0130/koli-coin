import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const REJECTED_STATUSES = new Set(['rejected', 'reject', 'declined', 'failed', 'returned']);

const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

const getRefundAmount = (payout) => {
  const rawAmount = payout?.netAmount ?? payout?.actualAmountWithdrawn ?? payout?.amount ?? 0;
  const parsed = Number(rawAmount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
};

const getFinanceNote = (payout) => {
  return (
    payout?.financeNote ||
    payout?.mainAdminNote ||
    payout?.rejectionReason ||
    payout?.notes ||
    ''
  );
};

const syncLinkedOdhexWithdrawal = async (payoutId, payoutData) => {
  const linkedWithdrawalId = payoutData?.odhexWithdrawalId;
  if (!linkedWithdrawalId) {
    return;
  }

  const linkedWithdrawalRef = db.collection('odhexWithdrawals').doc(linkedWithdrawalId);
  const syncedFinanceNote = getFinanceNote(payoutData);

  await linkedWithdrawalRef.set({
    payoutQueueId: payoutId,
    status: payoutData.status || 'pending',
    processedAt: payoutData.processedAt || null,
    processedBy: payoutData.processedBy || null,
    financeAdminNote: syncedFinanceNote || null,
    mainAdminNote: payoutData.mainAdminNote || null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
};

const processRejectedRefund = async (payoutId) => {
  const payoutRef = db.collection('payout_queue').doc(payoutId);

  await db.runTransaction(async (transaction) => {
    const payoutSnapshot = await transaction.get(payoutRef);
    if (!payoutSnapshot.exists) {
      return;
    }

    const payoutData = payoutSnapshot.data();
    if (!payoutData) {
      return;
    }

    const payoutStatus = normalizeStatus(payoutData.status);
    if (!REJECTED_STATUSES.has(payoutStatus)) {
      return;
    }

    if (payoutData.odhexRefundProcessedAt) {
      return;
    }

    const userId = payoutData.userId;
    const amountToRefund = getRefundAmount(payoutData);
    if (!userId || amountToRefund <= 0) {
      return;
    }

    const memberRef = db.collection('ODHexMembers').doc(userId);
    const memberSnapshot = await transaction.get(memberRef);

    if (!memberSnapshot.exists) {
      transaction.update(payoutRef, {
        odhexRefundProcessedAt: FieldValue.serverTimestamp(),
        odhexRefundError: 'ODHex member not found',
      });
      return;
    }

    const currentVaultBalance = Number(memberSnapshot.data()?.vaultBalance || 0);
    const nextVaultBalance = currentVaultBalance + amountToRefund;

    transaction.update(memberRef, {
      vaultBalance: nextVaultBalance,
      lastRefundedAt: FieldValue.serverTimestamp(),
    });

    const financeAdminNote = getFinanceNote(payoutData);
    const notificationRef = db.collection('odhexNotifications').doc();
    const message = financeAdminNote
      ? `Your withdrawal was rejected by finance admin. ₱${amountToRefund.toFixed(2)} was returned to your ODHex wallet. Note: ${financeAdminNote}`
      : `Your withdrawal was rejected by finance admin. ₱${amountToRefund.toFixed(2)} was returned to your ODHex wallet.`;

    transaction.set(notificationRef, {
      userId,
      payoutId,
      type: 'withdrawal_rejected',
      title: 'Withdrawal Rejected',
      message,
      amount: amountToRefund,
      financeAdminNote: financeAdminNote || null,
      status: payoutStatus,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });

    transaction.update(payoutRef, {
      odhexRefundProcessedAt: FieldValue.serverTimestamp(),
      odhexRefundAmount: amountToRefund,
      odhexRefundedTo: userId,
      odhexNotificationId: notificationRef.id,
    });
  });
};

export const handlePayoutRejection = onDocumentUpdated('payout_queue/{payoutId}', async (event) => {
  const after = event.data?.after?.data();

  if (!after) {
    return;
  }

  const payoutId = event.params.payoutId;
  const currentStatus = normalizeStatus(after.status);

  await syncLinkedOdhexWithdrawal(payoutId, after);

  if (!REJECTED_STATUSES.has(currentStatus)) {
    return;
  }

  await processRejectedRefund(payoutId);
});

export const backfillRejectedOdhexRefunds = onSchedule('every 5 minutes', async () => {
  const rejectedStatuses = [
    'rejected',
    'reject',
    'declined',
    'failed',
    'returned',
    'Rejected',
    'Declined',
    'Failed',
    'Returned',
    'REJECTED',
  ];
  const snapshot = await db
    .collection('payout_queue')
    .where('status', 'in', rejectedStatuses)
    .limit(100)
    .get();

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    await syncLinkedOdhexWithdrawal(docSnap.id, data);

    if (!data.odhexRefundProcessedAt) {
      await processRejectedRefund(docSnap.id);
    }
  }
});
