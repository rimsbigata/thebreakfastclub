import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

for (const path of ['.env.local', '.env', 'local.env']) {
  config({ path, override: false });
}

function initializeAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  // Check for firebase-key.json in root
  if (fs.existsSync('./firebase-key.json')) {
    const serviceAccount = JSON.parse(fs.readFileSync('./firebase-key.json', 'utf8'));
    return initializeApp({ credential: cert(serviceAccount) });
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!serviceAccount) {
    throw new Error('Missing Firebase admin credentials.');
  }

  return initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
}

async function main() {
  initializeAdminApp();
  const firestore = getFirestore();
  const profiles = await firestore.collection('userProfiles').limit(10).get();

  console.log(`userProfiles total estimate: ${profiles.size} (limited to 10 for inspection)`);

  for (const doc of profiles.docs) {
    const data = doc.data();
    console.log(`ID: ${doc.id}, Name: ${data.name}, CreatedAt: ${data.createdAt}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
