import { db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Script to migrate existing users from 'users' collection to 'members' collection
const existingUserIds = [
  "1OxOOKLsrcOflZSrP0QynmFoePu1",
  "RJRqW6oXiyRfhXbP6xFZyDklFG33"
];

async function migrateUsers() {
  console.log("Starting migration...");
  
  for (const userId of existingUserIds) {
    try {
      // Check if user exists in old 'users' collection
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      
      let userData;
      if (userDoc.exists()) {
        console.log(`Found user ${userId} in users collection`);
        userData = userDoc.data();
      } else {
        console.log(`User ${userId} not found in users collection, creating default data`);
        userData = {
          name: "Member",
          email: `member_${userId.substring(0, 8)}@koli.io`,
          createdAt: new Date().toISOString(),
          balance: 0,
          totalInvested: 0,
          totalEarnings: 0,
        };
      }
      
      // Add to members collection
      await setDoc(doc(db, "members", userId), {
        ...userData,
        role: "member",
        migratedAt: new Date().toISOString(),
      });
      
      console.log(`✓ Successfully migrated user ${userId} to members collection`);
    } catch (error) {
      console.error(`✗ Error migrating user ${userId}:`, error);
    }
  }
  
  console.log("Migration completed!");
}

// Run the migration
migrateUsers();
