/**
 * Quick Test: Make Contract Ready for Withdrawal
 * 
 * This script directly manipulates the Firestore database to make a contract
 * ready for withdrawal testing. Run this in Firebase Console or as admin.
 * 
 * Copy-paste this code into Firebase Console → Firestore → Query tab (Console API)
 * OR run via Node.js with admin credentials
 */

// TARGET USER ID
const TARGET_USER_ID = 'tXZ1e7PaoLadaxxRs9dFodUXUb22';

// FOR FIREBASE CONSOLE (Browser Console):
// ========================================
// 1. Go to: https://console.firebase.google.com/project/koli-2bad9/firestore/data
// 2. Open browser Developer Tools (F12)
// 3. Paste this code in the Console tab and press Enter:

/*
(async function makeReadyForWithdrawal() {
  const userId = 'tXZ1e7PaoLadaxxRs9dFodUXUb22';
  
  // Get contracts
  const snapshot = await firebase.firestore()
    .collection('donationContracts')
    .where('userId', '==', userId)
    .get();
  
  if (snapshot.empty) {
    console.log('No contracts found');
    return;
  }
  
  const now = new Date();
  
  for (const doc of snapshot.docs) {
    const contract = doc.data();
    console.log('Processing:', doc.id, contract.status);
    
    if (contract.status === 'pending') {
      // Approve and make ready
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 31);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      await doc.ref.update({
        status: 'active',
        donationStartDate: startDate.toISOString(),
        contractEndDate: endDate.toISOString(),
        approvedAt: startDate.toISOString(),
        approvedBy: 'TEST_CONSOLE'
      });
      
      console.log('✅ Approved and ready:', doc.id);
    } else if (contract.status === 'active' || contract.status === 'approved') {
      // Make ready by adjusting last withdrawal
      const newLastWithdrawal = new Date(now);
      newLastWithdrawal.setDate(newLastWithdrawal.getDate() - 31);
      
      await doc.ref.update({
        lastWithdrawalDate: newLastWithdrawal.toISOString()
      });
      
      console.log('✅ Made ready:', doc.id);
    }
  }
  
  console.log('✅ Done! Refresh the app.');
})();
*/


// FOR MANUAL FIRESTORE UPDATE:
// ========================================
// 1. Go to: https://console.firebase.google.com/project/koli-2bad9/firestore/data
// 2. Navigate to: donationContracts collection
// 3. Find the document where userId == 'tXZ1e7PaoLadaxxRs9dFodUXUb22'
// 4. Click on the document
// 5. Edit these fields:

console.log(`
===================================================================
MANUAL FIRESTORE UPDATE INSTRUCTIONS
===================================================================

1. Go to Firebase Console:
   https://console.firebase.google.com/project/koli-2bad9/firestore/data

2. Open: donationContracts collection

3. Find document where:
   userId == "${TARGET_USER_ID}"

4. Update the following fields:
   
   IF status == "pending":
   ----------------------
   status: "active"
   donationStartDate: "${new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()}"
   contractEndDate: "${new Date(Date.now() + (365 - 31) * 24 * 60 * 60 * 1000).toISOString()}"
   approvedAt: "${new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()}"
   approvedBy: "TEST_MANUAL"
   
   IF status == "active" or "approved":
   ------------------------------------
   lastWithdrawalDate: "${new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()}"

5. Save the changes

6. Refresh the app - user should be able to withdraw!

===================================================================

DATES EXPLAINED:
- donationStartDate: 31 days ago (so 30+ days have passed)
- lastWithdrawalDate: 31 days ago (so 30+ days have passed)
- contractEndDate: ~334 days from now (1 year from start)

WITHDRAWAL READY WHEN:
- Current time - lastWithdrawalDate >= 30 days
- OR (if no lastWithdrawalDate): Current time - donationStartDate >= 30 days
- AND status == "active"
- AND withdrawalsCount < 12

===================================================================
`);

// Export for Node.js usage
export const targetUserId = TARGET_USER_ID;
export const testDates = {
  startDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
  endDate: new Date(Date.now() + (365 - 31) * 24 * 60 * 60 * 1000).toISOString(),
  lastWithdrawal: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
};

console.log('\n📋 Quick Copy-Paste Values:');
console.log('─'.repeat(60));
console.log('Start Date (31 days ago):');
console.log(testDates.startDate);
console.log('\nEnd Date (~334 days from now):');
console.log(testDates.endDate);
console.log('\nLast Withdrawal (31 days ago):');
console.log(testDates.lastWithdrawal);
console.log('─'.repeat(60));
