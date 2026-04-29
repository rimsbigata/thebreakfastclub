import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

for (const path of ['.env.local', '.env', 'local.env']) {
  config({ path, override: false });
}

const LEGACY_COLLECTIONS = ['users', 'courts'];

function initializeAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp();
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

  for (const collectionName of LEGACY_COLLECTIONS) {
    const snapshot = await firestore.collection(collectionName).count().get();
    console.log(`${collectionName}: ${snapshot.data().count}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
