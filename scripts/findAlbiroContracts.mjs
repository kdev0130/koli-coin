/**
 * Find all contracts with reviewedBy: "script_import_albiro"
 *
 * Target account:
 *   albina.sabillo@deped.gov.ph
 *
 * Usage:
 *   node scripts/findAlbiroContracts.mjs
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

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

const TARGET_EMAIL = "albina.sabillo@deped.gov.ph";

async function resolveUserIdByEmail(email) {
  const q = query(collection(db, "members"), where("email", "==", email));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(`No member found with email: ${email}`);
  }

  if (snap.size > 1) {
    const ids = snap.docs.map((d) => d.id);
    throw new Error(`Multiple members found for ${email}: ${ids.join(", ")}`);
  }

  return snap.docs[0].id;
}

async function run() {
  console.log("\n🔍 Find ALBIRO imported contracts");
  console.log("=".repeat(60));
  console.log(`Target email: ${TARGET_EMAIL}`);

  const userId = await resolveUserIdByEmail(TARGET_EMAIL);
  console.log(`Resolved userId: ${userId}\n`);

  const q = query(
    collection(db, "donationContracts"), 
    where("userId", "==", userId),
    where("reviewedBy", "==", "script_import_albiro")
  );
  
  const snap = await getDocs(q);

  if (snap.empty) {
    console.log("No contracts found with reviewedBy: 'script_import_albiro'");
    return;
  }

  console.log(`Found ${snap.size} contracts:\n`);

  const contracts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Sort by donationStartDate
  contracts.sort((a, b) => (a.donationStartDate || "").localeCompare(b.donationStartDate || ""));

  const monthly = [];
  const sixMonth = [];
  const oneYear = [];

  contracts.forEach((contract, index) => {
    const date = contract.donationStartDate ? contract.donationStartDate.substring(0, 10) : "N/A";
    const amount = contract.donationAmount || 0;
    const type = contract.contractType || "unknown";
    const persons = contract.reviewNote || "";
    const withdrawn = contract.withdrawalsCount || 0;
    
    console.log(`${index + 1}. ${contract.id}`);
    console.log(`   Type: ${type}`);
    console.log(`   Amount: ₱${amount.toLocaleString()}`);
    console.log(`   Start: ${date}`);
    console.log(`   Persons: ${persons}`);
    console.log(`   Withdrawn: ${withdrawn} times`);
    console.log();

    if (type === "monthly_12_no_principal") {
      monthly.push(contract);
    } else if (type === "lockin_6_compound") {
      sixMonth.push(contract);
    } else if (type === "lockin_12_compound") {
      oneYear.push(contract);
    }
  });

  const totalPrincipal = contracts.reduce((sum, c) => sum + Number(c.donationAmount || 0), 0);

  console.log("=".repeat(60));
  console.log("Summary:");
  console.log(`- Total contracts: ${contracts.length}`);
  console.log(`- Monthly (monthly_12_no_principal): ${monthly.length}`);
  console.log(`- 6-month (lockin_6_compound): ${sixMonth.length}`);
  console.log(`- 1-year (lockin_12_compound): ${oneYear.length}`);
  console.log(`- Total principal: ₱${totalPrincipal.toLocaleString()}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Query failed:", error.message || error);
    process.exit(1);
  });
