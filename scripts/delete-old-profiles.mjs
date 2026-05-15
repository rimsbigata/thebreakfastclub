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
  
  const cutoffDate = new Date('2026-05-14T00:00:00Z');
  console.log(`Deleting profiles created before: ${cutoffDate.toISOString()}`);

  const snapshot = await firestore.collection('userProfiles').get();
  let deletedCount = 0;
  let keptCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.createdAt) {
      console.log(`Skipping profile ${doc.id} (no createdAt)`);
      keptCount++;
      continue;
    }

    const createdAt = new Date(data.createdAt);
    if (createdAt < cutoffDate) {
      console.log(`Deleting: ID=${doc.id}, Name=${data.name}, CreatedAt=${data.createdAt}`);
      await doc.ref.delete();
      deletedCount++;
    } else {
      console.log(`Keeping: ID=${doc.id}, Name=${data.name}, CreatedAt=${data.createdAt}`);
      keptCount++;
    }
  }

  console.log(`\nDeletion Complete!`);
  console.log(`Deleted: ${deletedCount}`);
  console.log(`Kept: ${keptCount}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
