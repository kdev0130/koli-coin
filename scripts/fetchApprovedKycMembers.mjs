import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.join(__dirname, 'koli-2bad9-firebase-adminsdk-fbsvc-1d9e7b37ff.json');

function initializeFirebaseAdmin() {
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    return initializeApp({ credential: cert(serviceAccount) });
  }

  return initializeApp({ credential: applicationDefault() });
}

async function fetchApprovedKycMembers() {
  try {
    initializeFirebaseAdmin();
    const db = getFirestore();

    console.log('🔍 Fetching all members and grouping by KYC submission...\n');

    const snapshot = await db.collection('members').get();

    if (snapshot.empty) {
      console.log('No members found.');
      return;
    }

    const rows = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        firstName: (data.firstName ?? '').toString().trim(),
        lastName: (data.lastName ?? '').toString().trim(),
        kycStatus: (data.kycStatus ?? 'NOT_SUBMITTED').toString().trim(),
      };
    });

    const submittedRows = rows.filter((member) => member.kycStatus !== 'NOT_SUBMITTED');
    const nonSubmittedRows = rows.filter((member) => member.kycStatus === 'NOT_SUBMITTED');

    console.log(`✅ Found ${rows.length} total member(s).\n`);
    console.log(`KYC Submitted: ${submittedRows.length}`);
    console.log(`Non-KYC Submitted: ${nonSubmittedRows.length}\n`);

    console.log('📌 KYC Submitted\n');
    submittedRows.forEach((member, index) => {
      const firstName = member.firstName || 'N/A';
      const lastName = member.lastName || 'N/A';
      console.log(`${index + 1}. ${firstName} ${lastName}`);
    });

    console.log('\n📌 Non-KYC Submitted\n');
    nonSubmittedRows.forEach((member, index) => {
      const firstName = member.firstName || 'N/A';
      const lastName = member.lastName || 'N/A';
      console.log(`${index + 1}. ${firstName} ${lastName}`);
    });

    console.log('\nDone.');
  } catch (error) {
    console.error('❌ Failed to fetch and group members by KYC status:', error);
    process.exitCode = 1;
  }
}

fetchApprovedKycMembers();
