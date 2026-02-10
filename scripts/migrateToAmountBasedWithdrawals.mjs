#!/usr/bin/env node

/**
 * Migration Script: Convert from period-based to amount-based withdrawals
 * 
 * This script updates existing contracts to use the new totalWithdrawn field
 * based on their current withdrawalsCount.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBemMQx3Y8rGZJXhBvDkuV7JXxglxPMh0s",
  authDomain: "koli-2bad9.firebaseapp.com",
  projectId: "koli-2bad9",
  storageBucket: "koli-2bad9.firebasestorage.app",
  messagingSenderId: "1092768867673",
  appId: "1:1092768867673:web:5c0a7fbb2fcaf26d7c5cee",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateContracts() {
  console.log("🔄 Starting migration: period-based → amount-based withdrawals\n");

  try {
    // Get all donation contracts
    const contractsRef = collection(db, "donationContracts");
    const snapshot = await getDocs(contractsRef);

    if (snapshot.empty) {
      console.log("✅ No contracts found to migrate");
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const docSnap of snapshot.docs) {
      const contract = docSnap.data();
      const contractId = docSnap.id;

      // Skip if already has totalWithdrawn field
      if (contract.totalWithdrawn !== undefined) {
        console.log(`⏭️  Skipping ${contractId} - already migrated`);
        skipped++;
        continue;
      }

      try {
        // Calculate totalWithdrawn from withdrawalsCount
        const amountPerPeriod = contract.donationAmount * 0.3;
        const totalWithdrawn = amountPerPeriod * (contract.withdrawalsCount || 0);

        // Update contract with new field
        const docRef = doc(db, "donationContracts", contractId);
        await updateDoc(docRef, {
          totalWithdrawn: totalWithdrawn,
        });

        console.log(
          `✅ Migrated ${contractId}:`,
          `\n   Donation: ₱${contract.donationAmount.toFixed(2)}`,
          `\n   Periods used: ${contract.withdrawalsCount || 0}`,
          `\n   Total withdrawn: ₱${totalWithdrawn.toFixed(2)}`
        );
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating ${contractId}:`, error.message);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("Migration Summary:");
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log("=".repeat(50));

    if (errors === 0) {
      console.log("\n🎉 Migration completed successfully!");
    } else {
      console.log("\n⚠️  Migration completed with errors");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateContracts()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
