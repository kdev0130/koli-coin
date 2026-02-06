/**
 * Make Both Contracts Ready for Withdrawal
 * 
 * This script makes both contracts eligible for withdrawal by:
 * 1. Setting donationStartDate to 31 days ago
 * 2. Setting lastWithdrawalDate appropriately
 * 
 * Usage: node scripts/makeBothContractsReady.mjs
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where,
  doc,
  updateDoc,
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

async function makeBothContractsReady() {
  try {
    console.log('🔧 Making Both Contracts Ready for Withdrawal\n');
    console.log('─'.repeat(60));

    // Get user's contracts
    console.log('\n📋 Fetching user contracts...');
    const contractsQuery = query(
      collection(db, 'donationContracts'),
      where('userId', '==', TEST_USER_ID)
    );
    const contractsSnap = await getDocs(contractsQuery);
    
    if (contractsSnap.empty) {
      console.log('❌ No contracts found for user');
      return;
    }

    const contracts = contractsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`   Found ${contracts.length} contract(s)`);

    // Filter active/approved contracts
    const eligibleContracts = contracts.filter(c => 
      c.status === 'active' || c.status === 'approved'
    );

    if (eligibleContracts.length === 0) {
      console.log('❌ No active/approved contracts found');
      return;
    }

    console.log(`   ${eligibleContracts.length} active/approved contract(s) found\n`);

    // Set dates for each contract
    const now = new Date();
    const startDate31DaysAgo = new Date(now);
    startDate31DaysAgo.setDate(startDate31DaysAgo.getDate() - 31);

    const endDate = new Date(startDate31DaysAgo);
    endDate.setFullYear(endDate.getFullYear() + 1);

    for (const contract of eligibleContracts) {
      console.log(`\n🔄 Processing Contract ${contract.id.slice(-6)}...`);
      console.log(`   Principal: ₱${contract.donationAmount.toLocaleString()}`);
      console.log(`   Current withdrawals: ${contract.withdrawalsCount || 0}/12`);

      const contractRef = doc(db, 'donationContracts', contract.id);

      const updates = {
        donationStartDate: startDate31DaysAgo.toISOString(),
        contractEndDate: endDate.toISOString(),
        status: 'active',
      };

      // If they've already withdrawn once, set lastWithdrawalDate to 31 days ago too
      if (contract.withdrawalsCount > 0) {
        updates.lastWithdrawalDate = startDate31DaysAgo.toISOString();
        console.log('   Setting lastWithdrawalDate to 31 days ago (has previous withdrawals)');
      } else {
        console.log('   First withdrawal - no lastWithdrawalDate needed');
      }

      await updateDoc(contractRef, updates);

      console.log('   ✅ Contract updated!');
      console.log(`   Start Date: ${startDate31DaysAgo.toLocaleDateString()}`);
      console.log(`   End Date: ${endDate.toLocaleDateString()}`);
      console.log(`   Available to withdraw: ₱${Math.floor(contract.donationAmount * 0.3).toLocaleString()}`);
    }

    console.log('\n' + '─'.repeat(60));
    console.log('\n✅ All contracts are now ready for withdrawal!');
    
    // Calculate total available
    const totalAvailable = eligibleContracts.reduce((sum, c) => 
      sum + Math.floor(c.donationAmount * 0.3), 0
    );

    // Get MANA balance
    const userDoc = await getDoc(doc(db, 'members', TEST_USER_ID));
    const userData = userDoc.data();
    const manaBalance = userData?.balance || 0;

    console.log(`\n💰 Total Available:`);
    console.log(`   Contracts: ₱${totalAvailable.toLocaleString()}`);
    console.log(`   MANA: ₱${manaBalance.toLocaleString()}`);
    console.log(`   Grand Total: ₱${(totalAvailable + manaBalance).toLocaleString()}`);

    console.log('\n📱 Next Steps:');
    console.log('   1. Go to http://localhost:8082/donation');
    console.log('   2. Refresh the page');
    console.log(`   3. Look for "Withdraw Now" button showing ${eligibleContracts.length} ready`);
    console.log('   4. Click to open unified withdrawal modal');
    console.log('   5. Choose your amount or use quick buttons');
    console.log('   6. Enter PIN: 123456');
    console.log('   7. Submit!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error);
  }
}

// Run the script
makeBothContractsReady()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
