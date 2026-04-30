import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

for (const path of ['.env.local', '.env', 'local.env']) {
  config({ path, override: false });
}

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

async function getCollectionCount(collectionRef) {
  const snapshot = await collectionRef.count().get();
  return snapshot.data().count;
}

async function main() {
  initializeAdminApp();
  const firestore = getFirestore();
  const sessions = await firestore.collection('sessions').get();

  console.log(`sessions: ${sessions.size}`);

  for (const session of sessions.docs) {
    const data = session.data();
    const code = data.code || 'no-code';
    const status = data.status || 'no-status';
    const counts = {};

    for (const subcollection of SESSION_SUBCOLLECTIONS) {
      counts[subcollection] = await getCollectionCount(session.ref.collection(subcollection));
    }

    console.log(`${session.id} code=${code} status=${status} ${JSON.stringify(counts)}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
