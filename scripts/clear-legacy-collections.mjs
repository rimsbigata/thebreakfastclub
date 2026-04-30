import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

for (const path of ['.env.local', '.env', 'local.env']) {
  config({ path, override: false });
}

const CONFIRM_FLAG = '--confirm-clear-legacy-collections';
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

async function deleteCollection(collectionRef) {
  let deleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(450).get();
    if (snapshot.empty) return deleted;

    const batch = collectionRef.firestore.batch();
    snapshot.docs.forEach(document => batch.delete(document.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
}

async function main() {
  const shouldDelete = process.argv.includes(CONFIRM_FLAG);
  initializeAdminApp();
  const firestore = getFirestore();

  for (const collectionName of LEGACY_COLLECTIONS) {
    const collectionRef = firestore.collection(collectionName);
    const countSnapshot = await collectionRef.count().get();
    const count = countSnapshot.data().count;

    if (!shouldDelete) {
      console.log(`${collectionName}: ${count}`);
      continue;
    }

    const deleted = await deleteCollection(collectionRef);
    console.log(`${collectionName}: deleted ${deleted}`);
  }

  if (!shouldDelete) {
    console.log(`Dry run only. Re-run with ${CONFIRM_FLAG} to delete legacy collections.`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
