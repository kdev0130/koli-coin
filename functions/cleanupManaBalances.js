import { onRequest } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const CONFIRMATION_KEY = 'ZERO_MANA_BALANCES';

const parseIsoTime = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const isRewardActive = (rewardData) => {
  if (!rewardData) {
    return false;
  }

  const hasCode = typeof rewardData.activeCode === 'string' && rewardData.activeCode.trim().length > 0;
  const hasPool = Number(rewardData.remainingPool || 0) > 0;
  const expiresAt = parseIsoTime(rewardData.expiresAt);
  const notExpired = expiresAt ? expiresAt.getTime() > Date.now() : false;

  return hasCode && hasPool && notExpired;
};

const getBearerToken = (authHeader) => {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const ensureAdminUser = async (req) => {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    throw new Error('Missing Authorization bearer token');
  }

  const decoded = await auth.verifyIdToken(token);
  const adminDoc = await db.collection('admins').doc(decoded.uid).get();

  if (!adminDoc.exists) {
    throw new Error('Only admins can run this operation');
  }

  return decoded;
};

export const cleanupManaBalances = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const adminUser = await ensureAdminUser(req);

    const {
      dryRun = true,
      force = false,
      userIds,
      confirm,
    } = req.body || {};

    if (confirm !== CONFIRMATION_KEY) {
      res.status(400).json({
        error: `Missing confirmation key. Send confirm: ${CONFIRMATION_KEY}`,
      });
      return;
    }

    const rewardSnapshot = await db.collection('globalRewards').doc('currentActiveReward').get();
    const rewardData = rewardSnapshot.exists ? rewardSnapshot.data() : null;
    const active = isRewardActive(rewardData);

    if (active && !force) {
      res.status(409).json({
        error: 'Cleanup blocked: reward is still active. Deactivate reward first or pass force: true.',
      });
      return;
    }

    const membersSnapshot = await db
      .collection('members')
      .where('balance', '>', 0)
      .get();

    const targetUserIds = Array.isArray(userIds)
      ? new Set(userIds.filter((value) => typeof value === 'string' && value.trim().length > 0))
      : null;

    const candidates = membersSnapshot.docs.filter((doc) => {
      if (!targetUserIds) {
        return true;
      }
      return targetUserIds.has(doc.id);
    });

    let affectedUsers = 0;
    let totalBalanceZeroed = 0;
    const sample = [];

    if (!dryRun) {
      let batch = db.batch();
      let opsInBatch = 0;

      for (const memberDoc of candidates) {
        const memberData = memberDoc.data();
        const previousBalance = Number(memberData.balance || 0);
        if (previousBalance <= 0) {
          continue;
        }

        affectedUsers += 1;
        totalBalanceZeroed += previousBalance;

        if (sample.length < 20) {
          sample.push({
            userId: memberDoc.id,
            previousBalance,
          });
        }

        batch.update(memberDoc.ref, {
          balance: 0,
          manaBalanceCleanupAt: FieldValue.serverTimestamp(),
          manaBalanceCleanupBy: adminUser.uid,
          manaBalanceBeforeCleanup: previousBalance,
        });

        opsInBatch += 1;
        if (opsInBatch >= 400) {
          await batch.commit();
          batch = db.batch();
          opsInBatch = 0;
        }
      }

      if (opsInBatch > 0) {
        await batch.commit();
      }

      await db.collection('manaBalanceCleanupLogs').add({
        adminUid: adminUser.uid,
        dryRun: false,
        force: Boolean(force),
        affectedUsers,
        totalBalanceZeroed,
        candidateCount: candidates.length,
        targetScoped: Boolean(targetUserIds),
        sample,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      for (const memberDoc of candidates) {
        const previousBalance = Number(memberDoc.data().balance || 0);
        if (previousBalance <= 0) {
          continue;
        }

        affectedUsers += 1;
        totalBalanceZeroed += previousBalance;

        if (sample.length < 20) {
          sample.push({
            userId: memberDoc.id,
            previousBalance,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      dryRun: Boolean(dryRun),
      rewardActive: active,
      affectedUsers,
      totalBalanceZeroed: Number(totalBalanceZeroed.toFixed(2)),
      sample,
      message: dryRun
        ? 'Dry run complete. Re-run with dryRun: false to apply cleanup.'
        : 'Cleanup complete. MANA balances were reset to zero for target users.',
    });
  } catch (error) {
    console.error('cleanupManaBalances error:', error);
    res.status(401).json({
      success: false,
      error: error?.message || 'Unauthorized or failed cleanup',
    });
  }
});
