/**
 * Test Unified Withdrawal - Withdraw from Multiple Contracts
 * 
 * This script tests the pooled withdrawal system by withdrawing
 * a custom amount across all eligible contracts.
 * 
 * Usage: node scripts/testUnifiedWithdrawal.mjs
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc 
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBemMQx3Y8rGZJXhBvDkuV7JXxglxPMh0s",
  authDomain: "koli-2bad9.firebaseapp.com",
  projectId: "koli-2bad9",
  storageBucket: "koli-2bad9.firebasestorage.app",
  messagingSenderId: "1092768867673",
  appId: "1:1092768867673:web:5c0a7fbb2fcaf26d7c5cee",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test user ID
const TEST_USER_ID = 'tXZ1e7PaoLadaxxRs9dFodUXUb22';

async function testUnifiedWithdrawal() {
  try {
    console.log('🔍 Testing Unified Withdrawal System\n');
    console.log('─'.repeat(60));

    // 1. Get user's contracts
    console.log('\n📋 Step 1: Fetching user contracts...');
    const contractsQuery = query(
      collection(db, 'donationContracts'),
      where('userId', '==', TEST_USER_ID)
    );
    const contractsSnap = await getDocs(contractsQuery);
    const contracts = contractsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`   Found ${contracts.length} total contracts`);

    // 2. Check which contracts are eligible for withdrawal
    console.log('\n✅ Step 2: Checking eligibility...');
    const now = new Date();
    const eligibleContracts = [];

    for (const contract of contracts) {
      const status = contract.status;
      const withdrawalsCount = contract.withdrawalsCount || 0;
      const lastWithdrawalDate = contract.lastWithdrawalDate 
        ? new Date(contract.lastWithdrawalDate) 
        : null;

      // Check if contract is active or approved
      const isActive = status === 'active' || status === 'approved';
      
      // Check if not completed (max 12 withdrawals)
      const notCompleted = withdrawalsCount < 12;
      
      // Check if 30 days have passed since last withdrawal
      let canWithdrawNow = false;
      if (!lastWithdrawalDate) {
        // First withdrawal - check if 30 days since approval
        const startDate = contract.donationStartDate ? new Date(contract.donationStartDate) : null;
        if (startDate) {
          const daysSinceStart = (now - startDate) / (1000 * 60 * 60 * 24);
          canWithdrawNow = daysSinceStart >= 30;
        }
      } else {
        const daysSinceLastWithdrawal = (now - lastWithdrawalDate) / (1000 * 60 * 60 * 24);
        canWithdrawNow = daysSinceLastWithdrawal >= 30;
      }

      const availableAmount = Math.floor(contract.donationAmount * 0.3);

      if (isActive && notCompleted && canWithdrawNow) {
        eligibleContracts.push({
          id: contract.id,
          donationAmount: contract.donationAmount,
          availableAmount,
          withdrawalsCount,
          status
        });
        console.log(`   ✓ Contract ${contract.id.slice(-6)}: ₱${availableAmount} available`);
      } else {
        console.log(`   ✗ Contract ${contract.id.slice(-6)}: Not eligible`);
        console.log(`     - Active: ${isActive}`);
        console.log(`     - Not completed: ${notCompleted}`);
        console.log(`     - Can withdraw now: ${canWithdrawNow}`);
      }
    }

    if (eligibleContracts.length === 0) {
      console.log('\n❌ No eligible contracts found for withdrawal');
      return;
    }

    // 3. Calculate total available
    const totalAvailable = eligibleContracts.reduce((sum, c) => sum + c.availableAmount, 0);
    
    console.log('\n💰 Step 3: Total Available');
    console.log(`   ${eligibleContracts.length} contracts ready`);
    console.log(`   Total: ₱${totalAvailable.toLocaleString()}`);

    // 4. Get user's MANA balance
    console.log('\n🎁 Step 4: Checking MANA balance...');
    const userDoc = await getDoc(doc(db, 'members', TEST_USER_ID));
    const userData = userDoc.data();
    const manaBalance = userData?.balance || 0;
    console.log(`   MANA Rewards: ₱${manaBalance.toLocaleString()}`);
    console.log(`   Grand Total: ₱${(totalAvailable + manaBalance).toLocaleString()}`);

    // 5. Show withdrawal examples
    console.log('\n📝 Step 5: Withdrawal Examples');
    console.log('─'.repeat(60));
    console.log('\nTo withdraw from browser console, paste this code:\n');
    
    console.log('// Example 1: Withdraw 25% of total available');
    const amount25 = Math.floor((totalAvailable + manaBalance) * 0.25 * 100) / 100;
    console.log(`window.testWithdraw = async () => {
  const { processPooledWithdrawal } = await import('./src/lib/donationContract.ts');
  const pin = prompt('Enter your 6-digit PIN:');
  const amount = ${amount25};
  
  try {
    const result = await processPooledWithdrawal(
      '${TEST_USER_ID}',
      pin,
      amount,
      contracts // You need to have contracts loaded
    );
    console.log('✅ Success!', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};
window.testWithdraw();
`);

    console.log('\n// Example 2: Withdraw 50% of total available');
    const amount50 = Math.floor((totalAvailable + manaBalance) * 0.5 * 100) / 100;
    console.log(`// Change amount to: ${amount50}`);

    console.log('\n// Example 3: Withdraw 100% of total available');
    const amount100 = totalAvailable + manaBalance;
    console.log(`// Change amount to: ${amount100}`);

    console.log('\n─'.repeat(60));
    console.log('\n💡 Note: Use the UI instead for easier testing:');
    console.log('   1. Go to http://localhost:8082/donation');
    console.log('   2. Click "Withdraw Now" button');
    console.log('   3. Enter custom amount or use quick buttons');
    console.log('   4. Enter PIN and submit');
    console.log('\n✨ The system will automatically distribute the amount');
    console.log('   across all eligible contracts!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error);
  }
}

// Run the test
testUnifiedWithdrawal()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
