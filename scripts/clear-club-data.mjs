import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

for (const path of ['.env.local', '.env', 'local.env']) {
  config({ path, override: false });
}

const CONFIRM_FLAG = '--confirm-clear-club-data';
const SESSION_SUBCOLLECTIONS = [
  'players',
  'courts',
  'matches',
  'fees',
  'paymentMethods',
  'settings',
];

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
  const sessions = await firestore.collection('sessions').get();

  console.log(`sessions found: ${sessions.size}`);

  if (!shouldDelete) {
    console.log(`Dry run only. Re-run with ${CONFIRM_FLAG} to delete all sessions and session subcollections.`);
    return;
  }

  let deletedSubcollectionDocs = 0;

  for (const session of sessions.docs) {
    for (const subcollection of SESSION_SUBCOLLECTIONS) {
      deletedSubcollectionDocs += await deleteCollection(session.ref.collection(subcollection));
    }

    await session.ref.delete();
  }

  console.log(`deleted session documents: ${sessions.size}`);
  console.log(`deleted session subcollection documents: ${deletedSubcollectionDocs}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
