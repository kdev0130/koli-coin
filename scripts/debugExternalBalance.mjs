import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCBZLgXkQCJAi9kHlQQ-XLnKXx8wEP0Rjo",
  authDomain: "koli-2bad9.web.app",
  projectId: "koli-2bad9",
  storageBucket: "koli-2bad9.firebasestorage.app",
  messagingSenderId: "231983013520",
  appId: "1:231983013520:web:42253b097233b8d4bbc215",
  measurementId: "G-5C2J27Q5DQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugExternalBalance() {
  try {
    // Get all members
    const membersSnapshot = await getDocs(collection(db, "members"));
    
    console.log("\n=== MEMBERS ===");
    membersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nUser ID: ${doc.id}`);
      console.log(`Email: ${data.email}`);
      console.log(`Name: ${data.firstName} ${data.lastName}`);
    });

    // Check each member's contracts
    for (const memberDoc of membersSnapshot.docs) {
      const userId = memberDoc.id;
      const userData = memberDoc.data();
      
      const contractsQuery = query(
        collection(db, "donationContracts"),
        where("userId", "==", userId),
        where("status", "in", ["active", "approved"])
      );
      
      const contractsSnapshot = await getDocs(contractsQuery);
      
      if (!contractsSnapshot.empty) {
        console.log(`\n\n=== CONTRACTS FOR ${userData.email} ===`);
        
        let totalAvailable = 0;
        
        contractsSnapshot.forEach(contractDoc => {
          const contract = contractDoc.data();
          const donationAmount = contract.donationAmount || 0;
          const totalWithdrawn = contract.totalWithdrawn || 0;
          const withdrawalsCount = contract.withdrawalsCount || 0;
          const startDate = new Date(contract.contractStartDate || contract.donationStartDate);
          const now = new Date();
          
          const monthsElapsed = Math.max(
            0,
            (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
          
          const monthlyWithdrawable = donationAmount * 0.30;
          const totalEarned = Math.min(monthlyWithdrawable * monthsElapsed, donationAmount);
          const available = Math.max(0, totalEarned - totalWithdrawn);
          
          console.log(`\nContract ID: ${contractDoc.id}`);
          console.log(`Status: ${contract.status}`);
          console.log(`Donation Amount: ${donationAmount} KOLI`);
          console.log(`Start Date: ${startDate.toISOString()}`);
          console.log(`Months Elapsed: ${monthsElapsed.toFixed(2)}`);
          console.log(`Monthly Withdrawable (30%): ${monthlyWithdrawable} KOLI`);
          console.log(`Total Earned So Far: ${totalEarned.toFixed(2)} KOLI`);
          console.log(`Total Already Withdrawn: ${totalWithdrawn} KOLI`);
          console.log(`Withdrawals Count: ${withdrawalsCount}`);
          console.log(`Available Now: ${available.toFixed(3)} KOLI`);
          
          totalAvailable += available;
        });
        
        console.log(`\n>>> TOTAL AVAILABLE FOR ${userData.email}: ${totalAvailable.toFixed(3)} KOLI <<<`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugExternalBalance();
