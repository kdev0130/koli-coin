/**
 * Firebase Cloud Function: Claim MANA Reward
 * 
 * This function handles the MANA reward claim process:
 * 1. Verifies the secret code
 * 2. Checks remaining pool
 * 3. Generates random reward (₱1-₱5)
 * 4. Updates pool and user balance atomically
 * 
 * Deploy this to your Firebase Functions
 */

import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin (only once)
initializeApp();

const db = getFirestore();

export const claimManaReward = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId, userName, secretCode } = req.body;

    // Validate input
    if (!userId || !secretCode) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const normalizedCode = secretCode.trim().toUpperCase();

    // Use Firestore transaction for atomicity
    const result = await db.runTransaction(async (transaction) => {
      // === ALL READS FIRST ===
      
      // 1. Get current active reward
      const rewardRef = db.collection('globalRewards').doc('currentActiveReward');
      const rewardDoc = await transaction.get(rewardRef);

      if (!rewardDoc.exists) {
        throw new Error('No active reward available');
      }

      const rewardData = rewardDoc.data();

      // 2. Get user document (for balance update later)
      const userRef = db.collection('members').doc(userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();

      // 3. Check if user already claimed today (using regular query outside transaction)
      const today = new Date().toISOString().split('T')[0];
      const userClaimsSnapshot = await db
        .collection('rewardsHistory')
        .where('userId', '==', userId)
        .where('claimedDate', '==', today)
        .where('type', '==', 'mana')
        .limit(1)
        .get();
      
      if (!userClaimsSnapshot.empty) {
        throw new Error('You already claimed your MANA reward today');
      }

      // === VALIDATIONS ===
      
      // 4. Verify secret code
      if (rewardData.activeCode !== normalizedCode) {
        throw new Error('Invalid secret code');
      }

      // 5. Check expiration
      const expiresAt = new Date(rewardData.expiresAt);
      if (expiresAt < new Date()) {
        throw new Error('This code has expired');
      }

      // 6. Check remaining pool
      if (rewardData.remainingPool <= 0) {
        throw new Error('Reward pool has been depleted');
      }

      // === CALCULATIONS ===
      
      // 7. Generate random reward amount (₱1.00 to ₱5.00)
      let rewardAmount = Math.random() * 4 + 1; // 1.00 to 5.00
      rewardAmount = Math.round(rewardAmount * 100) / 100; // Round to 2 decimals

      // 8. Adjust if remaining pool is less than reward
      if (rewardData.remainingPool < rewardAmount) {
        rewardAmount = rewardData.remainingPool;
      }

      // === ALL WRITES LAST ===

      // 9. Update remaining pool
      transaction.update(rewardRef, {
        remainingPool: rewardData.remainingPool - rewardAmount,
      });

      // 10. Add reward to user's history
      const rewardHistoryRef = db.collection('rewardsHistory').doc();
      transaction.set(rewardHistoryRef, {
        userId,
        userName: userName || 'User',
        type: 'mana',
        amount: rewardAmount,
        secretCode: normalizedCode,
        claimedAt: FieldValue.serverTimestamp(),
        claimedDate: today,
        poolBefore: rewardData.remainingPool,
        poolAfter: rewardData.remainingPool - rewardAmount,
      });

      // 11. Update user's balance and total rewards
      const currentTotalRewards = userData.totalRewards || 0;
      const currentBalance = userData.balance || 0;

      transaction.update(userRef, {
        totalRewards: currentTotalRewards + rewardAmount,
        balance: currentBalance + rewardAmount,
        lastManaClaimDate: today,
      });

      return { amount: rewardAmount };
    });

    // Success response
    res.status(200).json({
      success: true,
      amount: result.amount,
      message: `You won ₱${result.amount.toFixed(2)}!`,
    });
  } catch (error) {
    console.error('MANA claim error:', error);
    
    // Send appropriate error response
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to claim reward',
    });
  }
});
