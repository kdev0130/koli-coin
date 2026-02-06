/**
 * Initialize MANA Reward Pool in Firestore
 * 
 * Run this script to create the initial reward pool structure
 * Usage: node scripts/initManaReward.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function initializeRewardPool() {
  try {
    console.log('🎁 Initializing MANA Reward Pool...\n');

    // Generate a random code
    const codes = ['KOLI_BOOST', 'MANA_DAILY', 'KINGDOM_WIN', 'CRYPTO_LUCKY', 'GOLD_RUSH'];
    const randomCode = codes[Math.floor(Math.random() * codes.length)];

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const rewardData = {
      activeCode: randomCode,
      totalPool: 1500,
      remainingPool: 1500,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create/update the reward pool document
    await setDoc(doc(db, 'globalRewards', 'currentActiveReward'), rewardData);

    console.log('✅ Reward pool initialized successfully!\n');
    console.log('📋 Details:');
    console.log('─'.repeat(60));
    console.log(`Secret Code:     ${randomCode}`);
    console.log(`Total Pool:      ₱${rewardData.totalPool.toLocaleString()}`);
    console.log(`Remaining:       ₱${rewardData.remainingPool.toLocaleString()}`);
    console.log(`Expires At:      ${expiresAt.toLocaleString()}`);
    console.log('─'.repeat(60));
    console.log('\n💡 Share this code on your Telegram channel!');
    console.log(`\n📱 Test URL: http://localhost:8082/`);
    console.log('\n🔄 To update the code, run this script again.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// Run the initialization
initializeRewardPool()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
