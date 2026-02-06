/**
 * Test Script: Make User Ready for Withdrawal (Client SDK Version)
 * Sets a user's donation contract dates to make withdrawal available immediately
 * 
 * IMPORTANT: You must be logged in as an ADMIN user to run this script
 * 
 * Usage: 
 * 1. Make sure you have admin access in Firebase
 * 2. Update ADMIN_EMAIL and ADMIN_PASSWORD below
 * 3. Run: node scripts/testWithdrawalReadyClient.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase configuration (from your firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyBemMQx3Y8rGZJXhBvDkuV7JXxglxPMh0s",
  authDomain: "koli-2bad9.firebaseapp.com",
  projectId: "koli-2bad9",
  storageBucket: "koli-2bad9.firebasestorage.app",
  messagingSenderId: "1092768867673",
  appId: "1:1092768867673:web:5c0a7fbb2fcaf26d7c5cee",
  measurementId: "G-YLFVYKM0GZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Target user ID
const TARGET_USER_ID = 'tXZ1e7PaoLadaxxRs9dFodUXUb22';

// ADMIN CREDENTIALS - Update these with your admin account
const ADMIN_EMAIL = 'admin@example.com'; // Change this
const ADMIN_PASSWORD = 'your-admin-password'; // Change this

async function makeUserReadyForWithdrawal() {
  try {
    console.log('🔐 Signing in as admin...');
    
    // Sign in as admin
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Signed in successfully\n');

    console.log('🔍 Finding contracts for user:', TARGET_USER_ID);
    console.log('─'.repeat(60));

    // Find user's donation contracts
    const contractsRef = collection(db, 'donationContracts');
    const q = query(contractsRef, where('userId', '==', TARGET_USER_ID));
    const contractsSnapshot = await getDocs(q);

    if (contractsSnapshot.empty) {
      console.log('❌ No contracts found for this user');
      console.log('\n💡 Create a donation contract first through the app');
      return;
    }

    console.log(`✅ Found ${contractsSnapshot.size} contract(s)\n`);

    // Process each contract
    for (const docSnapshot of contractsSnapshot.docs) {
      const contract = docSnapshot.data();
      const contractId = docSnapshot.id;

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

        const contractRef = doc(db, 'donationContracts', contractId);
        await updateDoc(contractRef, {
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

        const contractRef = doc(db, 'donationContracts', contractId);
        await updateDoc(contractRef, {
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

    // Sign out
    await auth.signOut();
    console.log('\n🔓 Signed out');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      console.log('\n💡 Please update ADMIN_EMAIL and ADMIN_PASSWORD in the script');
    }
    console.error(error);
  }
}

// Run the script
makeUserReadyForWithdrawal()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
