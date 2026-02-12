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

const userId = "MbIVMoMKxqadEbam8c9PUeN0COQ2"; // Your account

async function resetPinSetup() {
  try {
    console.log(`🔄 Resetting PIN setup for user ${userId}...`);
    
    const userRef = doc(db, "members", userId);
    await updateDoc(userRef, {
      pinHash: null,
      hasPinSetup: false,
      pinLockUntil: null,
      failedPinAttempts: 0,
    });
    
    console.log('✅ PIN setup reset successfully!');
    console.log('🔧 Next steps:');
    console.log('1. Go to the production website: https://koli-2bad9.web.app');
    console.log('2. Sign in with your account');
    console.log('3. You will be redirected to PIN setup');
    console.log('4. Create a new 6-digit PIN that will work in production');
    console.log('5. After testing, the temporary Firestore rule will be reverted');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting PIN setup:', error);
    process.exit(1);
  }
}

resetPinSetup();