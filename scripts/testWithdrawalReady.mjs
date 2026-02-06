/**
 * Test Script: Make User Ready for Withdrawal
 * Sets a user's donation contract dates to make withdrawal available immediately
 * 
 * Usage: node scripts/testWithdrawalReady.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account
const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');
let serviceAccount;

try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('❌ Error: serviceAccountKey.json not found!');
  console.log('Please download your service account key from:');
  console.log('Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
  process.exit(1);
}

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Target user ID
const TARGET_USER_ID = 'tXZ1e7PaoLadaxxRs9dFodUXUb22';

async function makeUserReadyForWithdrawal() {
  try {
    console.log('🔍 Finding contracts for user:', TARGET_USER_ID);
    console.log('─'.repeat(60));

    // Find user's donation contracts
    const contractsSnapshot = await db
      .collection('donationContracts')
      .where('userId', '==', TARGET_USER_ID)
      .get();

    if (contractsSnapshot.empty) {
      console.log('❌ No contracts found for this user');
      console.log('\n💡 Create a donation contract first through the app');
      return;
    }

    console.log(`✅ Found ${contractsSnapshot.size} contract(s)\n`);

    // Process each contract
    for (const doc of contractsSnapshot.docs) {
      const contract = doc.data();
      const contractId = doc.id;

      console.log(`📋 Contract ID: ${contractId}`);
      console.log(`   Status: ${contract.status}`);
      console.log(`   Amount: ₱${contract.donationAmount?.toLocaleString()}`);
      console.log(`   Withdrawals: ${contract.withdrawalsCount || 0}/12`);

      // Skip if not active/approved or pending
      if (contract.status === 'completed') {
        console.log('   ⚠️  Contract already completed (12 withdrawals)\n');
        continue;
      }

      if (contract.status === 'expired') {
        console.log('   ⚠️  Contract expired\n');
        continue;
      }

      // Calculate dates for immediate withdrawal eligibility
      const now = new Date();
      
      // If contract is pending, approve it first
      if (contract.status === 'pending') {
        console.log('   🔄 Approving pending contract...');
        
        // Set start date to 31 days ago (so 30 days have passed)
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 31);
        
        // Set end date to 1 year from start
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        await db.collection('donationContracts').doc(contractId).update({
          status: 'active',
          donationStartDate: startDate.toISOString(),
          contractEndDate: endDate.toISOString(),
          approvedAt: startDate.toISOString(),
          approvedBy: 'TEST_SCRIPT',
        });

        console.log('   ✅ Contract approved and activated');
        console.log(`   📅 Start Date: ${startDate.toLocaleString()}`);
        console.log(`   📅 End Date: ${endDate.toLocaleString()}`);
        console.log('   🎉 Ready for immediate withdrawal!\n');
        continue;
      }

      // If contract is active/approved but not ready for withdrawal
      if (contract.status === 'active' || contract.status === 'approved') {
        const withdrawalCount = contract.withdrawalsCount || 0;
        
        if (withdrawalCount >= 12) {
          console.log('   ⚠️  All 12 withdrawals already used\n');
          continue;
        }

        // Check if already ready
        const startDate = contract.donationStartDate ? new Date(contract.donationStartDate) : null;
        const lastWithdrawal = contract.lastWithdrawalDate ? new Date(contract.lastWithdrawalDate) : null;
        
        if (!startDate) {
          console.log('   ⚠️  Contract has no start date, skipping\n');
          continue;
        }

        // Calculate if already ready
        const referenceDate = lastWithdrawal || startDate;
        const daysSinceReference = Math.floor((now - referenceDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceReference >= 30) {
          console.log(`   ✅ Already ready! (${daysSinceReference} days since last withdrawal)`);
          console.log('   🎉 Can withdraw now!\n');
          continue;
        }

        // Make it ready by adjusting the last withdrawal date
        console.log(`   🔄 Adjusting dates to make ready...`);
        console.log(`   📊 Current status: ${daysSinceReference} days since reference`);
        
        // Set last withdrawal to 31 days ago
        const newLastWithdrawal = new Date(now);
        newLastWithdrawal.setDate(newLastWithdrawal.getDate() - 31);

        await db.collection('donationContracts').doc(contractId).update({
          lastWithdrawalDate: newLastWithdrawal.toISOString(),
        });

        console.log('   ✅ Contract updated!');
        console.log(`   📅 Last Withdrawal: ${newLastWithdrawal.toLocaleString()}`);
        console.log('   🎉 Ready for immediate withdrawal!\n');
      }
    }

    console.log('─'.repeat(60));
    console.log('✅ All contracts processed!');
    console.log('\n📱 Open the app and navigate to Donation page');
    console.log('🎯 You should see the "Withdraw" button enabled');
    console.log('⏰ Countdown should show: 00:00:00:00');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Run the script
makeUserReadyForWithdrawal()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
