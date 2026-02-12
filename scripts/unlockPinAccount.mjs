import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

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

const userId = "MbIVMoMKxqadEbam8c9PUeN0COQ2"; // Your locked account

async function unlockAccount() {
  try {
    console.log(`🔓 Unlocking PIN for user ${userId}...`);
    
    const userRef = doc(db, "members", userId);
    await updateDoc(userRef, {
      pinLockUntil: null,
      failedPinAttempts: 0,
    });
    
    console.log("✅ Account unlocked successfully!");
    console.log("You can now try entering your PIN again.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error unlocking account:", error);
    process.exit(1);
  }
}

unlockAccount();
