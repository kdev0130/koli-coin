/**
 * Import ALBIRO contracts into donationContracts for one account.
 *
 * Target account:
 *   albina.sabillo@deped.gov.ph
 *
 * Logic requested:
 * - Contract start dates are based on Feb day in the table (1..28 of Feb 2026)
 * - Contract status is already approved
 * - Monthly contracts deposited on or before Feb 12 are marked as already withdrawn once
 * - reviewNote contains the number of persons for each contract
 *
 * Usage:
 *   node scripts/importAlbiroContracts.mjs               # dry run (no writes)
 *   node scripts/importAlbiroContracts.mjs --commit      # write to Firestore
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
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

const START_YEAR = 2026;
const START_MONTH_INDEX = 1; // February (0-based index)
const MONTHLY_WITHDRAWAL_CUTOFF_DAY = 12; // on/before Feb 12 => 1 withdrawal already

const rows = [
  { day: 1, monthly: 10000, monthlyPersons: 2 },
  { day: 2, monthly: 65000, monthlyPersons: 2 },
  { day: 3, six: 5000, sixPersons: 1 },
  { day: 4, monthly: 25000, monthlyPersons: 2 },
  { day: 5, monthly: 50000, monthlyPersons: 1, six: 5000, sixPersons: 1 },
  { day: 6, monthly: 30000, monthlyPersons: 2 },
  { day: 7, monthly: 20000, monthlyPersons: 1 },
  { day: 8, monthly: 170000, monthlyPersons: 4 },
  { day: 11, monthly: 55000, monthlyPersons: 2 },
  { day: 12, monthly: 6500, monthlyPersons: 1 },
  { day: 14, contracts: [
    { type: 'monthly', amount: 40000, persons: 1 },
    { type: 'monthly', amount: 100000, persons: 1 },
  ]},
  { day: 15, contracts: [
    { type: 'monthly', amount: 150000, persons: 1 },
    { type: 'monthly', amount: 70000, persons: 2 },
  ]},
  { day: 17, monthly: 50000, monthlyPersons: 1, six: 20000, sixPersons: 1 },
  { day: 20, six: 25000, sixPersons: 2 },
  { day: 21, monthly: 90000, monthlyPersons: 2, six: 10000, sixPersons: 1 },
  { day: 22, six: 15000, sixPersons: 1 },
  { day: 23, monthly: 35000, monthlyPersons: 3, six: 20000, sixPersons: 1 },
  { day: 24, monthly: 10000, monthlyPersons: 1, six: 110000, sixPersons: 2 },
  { day: 26, monthly: 300000, monthlyPersons: 4, six: 35000, sixPersons: 2 },
  { day: 27, monthly: 25000, monthlyPersons: 1 },
  { day: 28, monthly: 180000, monthlyPersons: 6, six: 35000, sixPersons: 2 },
];

function toIsoUtc(year, monthIndex, day, hour = 12, minute = 0, second = 0) {
  return new Date(Date.UTC(year, monthIndex, day, hour, minute, second)).toISOString();
}

function addMonthsUtc(isoDate, months) {
  const d = new Date(isoDate);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

function buildMonthlyContract(userId, day, amount, persons) {
  const donationStartDate = toIsoUtc(START_YEAR, START_MONTH_INDEX, day, 11, 42, 29);
  const approvedAt = donationStartDate;
  const createdAt = toIsoUtc(START_YEAR, START_MONTH_INDEX, day, 7, 22, 14);
  const contractEndDate = addMonthsUtc(donationStartDate, 12);

  const alreadyWithdrawnOne = day <= MONTHLY_WITHDRAWAL_CUTOFF_DAY;
  const firstWithdrawalAmount = amount * 0.3;

  return {
    userId,
    donationAmount: amount,
    contractType: "monthly_12_no_principal",
    donationStartDate,
    contractEndDate,

    status: "approved",
    approvedAt,
    approvedBy: null,

    verifiedAmount: amount,
    discrepancyAmount: 0,
    hasDiscrepancy: false,
    reviewOutcome: "approved_exact",
    reviewNote: `${persons} ${persons === 1 ? 'Person' : 'Persons'}`,
    reviewedAt: approvedAt,
    reviewedBy: "script_import_albiro",
    rejectionReason: "",

    withdrawalsCount: alreadyWithdrawnOne ? 1 : 0,
    totalWithdrawn: alreadyWithdrawnOne ? firstWithdrawalAmount : 0,
    lastWithdrawalDate: alreadyWithdrawnOne
      ? toIsoUtc(2026, 2, 12, 12, 0, 0) // Mar 12, 2026
      : null,

    paymentMethod: "bank:BDO",
    receiptPath: "",
    receiptURL: "",

    createdAt,
  };
}

function buildSixMonthContract(userId, day, amount, persons) {
  const donationStartDate = toIsoUtc(START_YEAR, START_MONTH_INDEX, day, 11, 42, 29);
  const approvedAt = donationStartDate;
  const createdAt = toIsoUtc(START_YEAR, START_MONTH_INDEX, day, 7, 22, 14);
  const contractEndDate = addMonthsUtc(donationStartDate, 6);

  return {
    userId,
    donationAmount: amount,
    contractType: "lockin_6_compound",
    donationStartDate,
    contractEndDate,

    status: "approved",
    approvedAt,
    approvedBy: null,

    verifiedAmount: amount,
    discrepancyAmount: 0,
    hasDiscrepancy: false,
    reviewOutcome: "approved_exact",
    reviewNote: `${persons} ${persons === 1 ? 'Person' : 'Persons'}`,
    reviewedAt: approvedAt,
    reviewedBy: "script_import_albiro",
    rejectionReason: "",

    withdrawalsCount: 0,
    totalWithdrawn: 0,
    lastWithdrawalDate: null,

    paymentMethod: "bank:BDO",
    receiptPath: "",
    receiptURL: "",

    createdAt,
  };
}

function buildOneYearContract(userId, day, amount, persons) {
  const donationStartDate = toIsoUtc(START_YEAR, START_MONTH_INDEX, day, 11, 42, 29);
  const approvedAt = donationStartDate;
  const createdAt = toIsoUtc(START_YEAR, START_MONTH_INDEX, day, 7, 22, 14);
  const contractEndDate = addMonthsUtc(donationStartDate, 12);

  return {
    userId,
    donationAmount: amount,
    contractType: "lockin_12_compound",
    donationStartDate,
    contractEndDate,

    status: "approved",
    approvedAt,
    approvedBy: null,

    verifiedAmount: amount,
    discrepancyAmount: 0,
    hasDiscrepancy: false,
    reviewOutcome: "approved_exact",
    reviewNote: `${persons} ${persons === 1 ? 'Person' : 'Persons'}`,
    reviewedAt: approvedAt,
    reviewedBy: "script_import_albiro",
    rejectionReason: "",

    withdrawalsCount: 0,
    totalWithdrawn: 0,
    lastWithdrawalDate: null,

    paymentMethod: "bank:BDO",
    receiptPath: "",
    receiptURL: "",

    createdAt,
  };
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
  console.log("\n📥 ALBIRO donationContracts import");
  console.log("=".repeat(60));
  console.log(`Mode: ${SHOULD_COMMIT ? "COMMIT (writes enabled)" : "DRY RUN (no writes)"}`);
  console.log(`Target email: ${TARGET_EMAIL}`);

  const userId = await resolveUserIdByEmail(TARGET_EMAIL);
  console.log(`Resolved userId: ${userId}`);

  const payloads = [];
  for (const row of rows) {
    if (row.contracts) {
      // Handle special multi-contract days (e.g., day 28 with multiple entries)
      for (const contract of row.contracts) {
        if (contract.type === 'monthly') {
          payloads.push(buildMonthlyContract(userId, row.day, contract.amount, contract.persons));
        } else if (contract.type === 'six') {
          payloads.push(buildSixMonthContract(userId, row.day, contract.amount, contract.persons));
        } else if (contract.type === 'year') {
          payloads.push(buildOneYearContract(userId, row.day, contract.amount, contract.persons));
        }
      }
    } else {
      // Handle normal single contract days
      if (row.monthly !== undefined) {
        payloads.push(buildMonthlyContract(userId, row.day, row.monthly, row.monthlyPersons));
      }
      if (row.six !== undefined) {
        payloads.push(buildSixMonthContract(userId, row.day, row.six, row.sixPersons));
      }
      if (row.year !== undefined) {
        payloads.push(buildOneYearContract(userId, row.day, row.year, row.yearPersons));
      }
    }
  }

  const monthlyCount = payloads.filter((p) => p.contractType === "monthly_12_no_principal").length;
  const sixMonthCount = payloads.filter((p) => p.contractType === "lockin_6_compound").length;
  const oneYearCount = payloads.filter((p) => p.contractType === "lockin_12_compound").length;
  const oneWithdrawalCount = payloads.filter((p) => p.contractType === "monthly_12_no_principal" && p.withdrawalsCount === 1).length;

  const totalPrincipal = payloads.reduce((sum, p) => sum + Number(p.donationAmount || 0), 0);

  console.log("\nSummary:");
  console.log(`- Total contracts to insert: ${payloads.length}`);
  console.log(`- Monthly contracts: ${monthlyCount}`);
  console.log(`- 6-month contracts: ${sixMonthCount}`);
  console.log(`- 1-year contracts: ${oneYearCount}`);
  console.log(`- Monthly with 1 withdrawal already: ${oneWithdrawalCount}`);
  console.log(`- Total principal: ₱${totalPrincipal.toLocaleString()}`);

  if (!SHOULD_COMMIT) {
    console.log("\nDry run complete. Re-run with --commit to write to Firestore.");
    return;
  }

  console.log("\nWriting contracts...");
  let inserted = 0;
  for (const payload of payloads) {
    await addDoc(collection(db, "donationContracts"), payload);
    inserted += 1;

    if (inserted % 10 === 0 || inserted === payloads.length) {
      console.log(`  Inserted ${inserted}/${payloads.length}`);
    }
  }

  console.log("\n✅ Import complete.");
  console.log(`Inserted ${inserted} contracts to donationContracts for ${TARGET_EMAIL}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Import failed:", error.message || error);
    process.exit(1);
  });
