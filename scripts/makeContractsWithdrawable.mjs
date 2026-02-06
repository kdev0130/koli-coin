import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function makeContractsWithdrawable() {
  try {
    const userId = "tXZ1e7PaoLadaxxRs9dFodUXUb22";
    
    // Get all contracts for this user
    const contractsSnapshot = await db.collection('donationContracts')
      .where('userId', '==', userId)
      .get();
    
    if (contractsSnapshot.empty) {
      console.log('No contracts found for user:', userId);
      return;
    }
    
    const now = new Date();
    
    // Set start date to 60 days ago (so 2 periods are available)
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 60);
    
    // End date should be 1 year from start
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    
    console.log('📅 Setting up contracts for testing:');
    console.log('Start Date:', startDate.toISOString());
    console.log('End Date:', endDate.toISOString());
    console.log('Days elapsed: 60 (2 periods available)');
    console.log('');
    
    let count = 0;
    for (const doc of contractsSnapshot.docs) {
      const contract = doc.data();
      
      await doc.ref.update({
        donationStartDate: startDate.toISOString(),
        contractEndDate: endDate.toISOString(),
        status: 'active', // Required by canWithdraw()
        approvedAt: startDate.toISOString(),
      });
      
      const periodsAvailable = 2;
      const amountPerPeriod = contract.donationAmount * 0.3;
      const totalAvailable = amountPerPeriod * periodsAvailable;
      
      count++;
      console.log(`✅ Contract ${count}: ${doc.id}`);
      console.log(`   Principal: ₱${contract.donationAmount.toLocaleString()}`);
      console.log(`   Per Period (30%): ₱${amountPerPeriod.toLocaleString()}`);
      console.log(`   Periods Available: ${periodsAvailable} (stacked)`);
      console.log(`   Total Withdrawable: ₱${totalAvailable.toLocaleString()}`);
      console.log('');
    }
    
    console.log(`🎉 Updated ${count} contract(s) - Ready for withdrawal testing!`);
    console.log('');
    console.log('💡 You can now:');
    console.log('   - Withdraw the full stacked amount (₱' + (contractsSnapshot.docs.reduce((sum, doc) => {
      const amount = doc.data().donationAmount * 0.3 * 2;
      return sum + amount;
    }, 0)).toLocaleString() + ' total)');
    console.log('   - Withdraw partial amounts');
    console.log('   - Select specific contracts to withdraw from');
    console.log('   - Test MANA + Contract pooled withdrawals');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

makeContractsWithdrawable();
