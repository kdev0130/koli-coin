/**
 * Remove ALBIRO contracts imported by scripts/importAlbiroContracts.mjs
 *
 * Target account:
 *   albina.sabillo@deped.gov.ph
 *
 * Safety:
 * - Dry run by default (no deletes)
 * - Deletes only contracts that match import-script fingerprints
 *
 * Usage:
 *   node scripts/removeAlbiroContracts.mjs            # dry run
 *   node scripts/removeAlbiroContracts.mjs --commit   # perform delete
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
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
const SHOULD_COMMIT = process.argv.includes("--commit");

function isImportedAlbiroContract(data) {
  const isTargetType =
    data.contractType === "monthly_12_no_principal" ||
    data.contractType === "lockin_6_compound" ||
    data.contractType === "lockin_12_compound";

  const looksLikeImportTag = data.reviewedBy === "script_import_albiro";
  const startDateInFeb2026 = typeof data.donationStartDate === "string" && data.donationStartDate.startsWith("2026-02-");
  const createdInFeb2026 = typeof data.createdAt === "string" && data.createdAt.startsWith("2026-02-");

  const importedFieldShape =
    data.status === "approved" &&
    data.reviewOutcome === "approved_exact" &&
    data.paymentMethod === "bank:BDO";

  return isTargetType && looksLikeImportTag && startDateInFeb2026 && createdInFeb2026 && importedFieldShape;
}

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
  console.log("\n🧹 Remove ALBIRO imported contracts");
  console.log("=".repeat(60));
  console.log(`Mode: ${SHOULD_COMMIT ? "COMMIT (deletes enabled)" : "DRY RUN (no deletes)"}`);
  console.log(`Target email: ${TARGET_EMAIL}`);

  const userId = await resolveUserIdByEmail(TARGET_EMAIL);
  console.log(`Resolved userId: ${userId}`);

  const q = query(collection(db, "donationContracts"), where("userId", "==", userId));
  const snap = await getDocs(q);

  const candidates = snap.docs
    .map((d) => ({ id: d.id, data: d.data() }))
    .filter((row) => isImportedAlbiroContract(row.data));

  const monthly = candidates.filter((c) => c.data.contractType === "monthly_12_no_principal").length;
  const sixMonth = candidates.filter((c) => c.data.contractType === "lockin_6_compound").length;
  const oneYear = candidates.filter((c) => c.data.contractType === "lockin_12_compound").length;
  const totalPrincipal = candidates.reduce((sum, row) => sum + Number(row.data.donationAmount || 0), 0);

  console.log("\nMatching contracts:");
  console.log(`- Total matched: ${candidates.length}`);
  console.log(`- Monthly matched: ${monthly}`);
  console.log(`- 6-month matched: ${sixMonth}`);
  console.log(`- 1-year matched: ${oneYear}`);
  console.log(`- Total principal matched: ₱${totalPrincipal.toLocaleString()}`);

  if (candidates.length === 0) {
    console.log("\nNothing matched. No action taken.");
    return;
  }

  if (!SHOULD_COMMIT) {
    console.log("\nDry run complete. Re-run with --commit to delete matched contracts.");
    return;
  }

  console.log("\nDeleting contracts...");

  const BATCH_LIMIT = 450;
  let deleted = 0;

  for (let i = 0; i < candidates.length; i += BATCH_LIMIT) {
    const slice = candidates.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);

    for (const row of slice) {
      batch.delete(doc(db, "donationContracts", row.id));
    }

    await batch.commit();
    deleted += slice.length;
    console.log(`  Deleted ${deleted}/${candidates.length}`);
  }

  console.log("\n✅ Removal complete.");
  console.log(`Deleted ${deleted} contracts for ${TARGET_EMAIL}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Removal failed:", error.message || error);
    process.exit(1);
  });
