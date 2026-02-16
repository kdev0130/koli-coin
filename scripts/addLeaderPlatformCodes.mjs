/**
 * Bulk-create platform codes for leaders in Firestore.
 *
 * Usage:
 *   node scripts/addLeaderPlatformCodes.mjs
 *   node scripts/addLeaderPlatformCodes.mjs --force
 *
 * Notes:
 * - Requires serviceAccountKey.json at project root.
 * - Writes to collection: platformCodes
 * - Uses auto-generated Firestore document IDs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const leaders = [
  'Bronwen Tangaro',
  'Crisol Calixton',
  'Maribel Murcia',
  'Ruel Fernandez',
  'Jerry Ramos',
  'Joselito Estillore',
  'Alfredo Albiro',
  'Dinah Alcontin',
  'Ernil Arubo',
  'Albina Sabillo',
  'Nene Balboa',
  'Jhon Lumapat',
  'Felix Morales Jr.',
  'Hendler Jabilles',
  'Jun Coloma',
  'MJ Almanon',
  'Jusie Daig',
  'Myla Lara',
  'Annabel Bernaldez',
  'Florante Coloma',
  'Narit',
  'Zaldy Calatao',
  'Maribeth Ejida',
  'Rentry Ginoo',
  'Joey Rogue',
  'Lanie de Asis',
  'Annabel Tangaro',
  'Rosal Gomez',
  'Noemi Villaflor',
  'Blanchie Laput',
  'Yvonne Flores',
  'Jennet Plaza',
  'May Andales',
  'Chona Concinimo',
  'Cherry Alo',
  'Caryl E. Tangaro',
  'Leonardo Concinimo',
  'Boy Esparaguera',
  'Rey Naga',
  'Gaylord Murcia',
  'Rhanni Espiritu',
  'Mercedita Plaza',
  'Rey Pablo',
  'Eliezer Dapiawen',
  'Limuel Cabiao',
  'Bernarx Flores',
  'Enrique Dagandan',
  'Rey Cardinal',
  'El Professor',
  'Nancy Cuarentas',
  'Jason Flores',
  'Emmer Son Elizondo',
  'Domingo Corales',
  'Allan Pergura',
  'Christ Noreen Fernandez',
  'Nena Gamayon',
  'Benjamin Biloy',
];

const FORCE_REGENERATE = process.argv.includes('--force');
const COLLECTION_NAME = 'platformCodes';

function normalizeLeaderId(name) {
  return `leader_${name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;
}

function randomSuffix(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function generatePlatformCode() {
  return randomSuffix(6);
}

async function codeExists(db, code) {
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where('code', '==', code)
    .limit(1)
    .get();
  return !snapshot.empty;
}

async function generateUniqueCode(db, maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const code = generatePlatformCode();
    const exists = await codeExists(db, code);
    if (!exists) {
      return code;
    }
  }
  throw new Error('Failed to generate a unique platform code after multiple attempts.');
}

function loadServiceAccount() {
  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const rootDefaultPath = join(__dirname, '..', 'serviceAccountKey.json');

  const candidates = [];
  if (explicitPath) {
    candidates.push(explicitPath);
  }
  candidates.push(rootDefaultPath);

  const scriptDirKeys = readdirSync(__dirname)
    .filter((name) => /firebase-adminsdk.*\.json$/i.test(name))
    .map((name) => join(__dirname, name));
  candidates.push(...scriptDirKeys);

  for (const filePath of candidates) {
    if (!filePath || !existsSync(filePath)) {
      continue;
    }

    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
      if (parsed?.type === 'service_account' && parsed?.private_key && parsed?.client_email) {
        console.log(`🔐 Using service account key: ${filePath}`);
        return parsed;
      }
    } catch {
      // Try next candidate
    }
  }

  console.error('❌ Error: No valid Firebase service account key found.');
  console.log('Looked for:');
  console.log('- GOOGLE_APPLICATION_CREDENTIALS path (if set)');
  console.log('- serviceAccountKey.json at project root');
  console.log('- firebase-adminsdk*.json inside scripts folder');
  process.exit(1);
}

async function main() {
  const serviceAccount = loadServiceAccount();

  initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore();
  let createdCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;

  console.log('🚀 Creating leader platform codes...');
  console.log(`Collection: ${COLLECTION_NAME}`);
  console.log(`Force regenerate: ${FORCE_REGENERATE ? 'YES' : 'NO'}`);
  console.log('─'.repeat(80));

  for (const rawName of leaders) {
    const leaderName = rawName.trim();
    const leaderId = normalizeLeaderId(leaderName);
    const existingSnapshot = await db
      .collection(COLLECTION_NAME)
      .where('leaderId', '==', leaderId)
      .limit(1)
      .get();
    const existing = existingSnapshot.empty ? null : existingSnapshot.docs[0];

    if (existing && !FORCE_REGENERATE) {
      skippedCount += 1;
      const existingCode = existing.data()?.code || '(no code field)';
      console.log(`⏭️  Skipped ${leaderName} (${leaderId}) -> ${existingCode}`);
      continue;
    }

    const code = await generateUniqueCode(db);
    const payload = {
      code,
      createdAt: Timestamp.now(),
      description: 'Community Access Code 2026',
      isActive: true,
      leaderId,
      leaderName,
      maxUses: null,
      usageCount: 0,
    };

    if (existing) {
      await existing.ref.set(payload, { merge: false });
    } else {
      await db.collection(COLLECTION_NAME).add(payload);
    }

    if (existing) {
      updatedCount += 1;
      console.log(`🔁 Updated ${leaderName} (${leaderId}) -> ${code}`);
    } else {
      createdCount += 1;
      console.log(`✅ Created ${leaderName} (${leaderId}) -> ${code}`);
    }
  }

  console.log('─'.repeat(80));
  console.log('🎉 Done!');
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Total leaders processed: ${leaders.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
