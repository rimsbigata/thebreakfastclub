import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

function createAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp();
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!serviceAccount) {
    throw new Error(
      'Missing Firebase admin credentials. Set FIREBASE_ADMIN_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS.',
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(serviceAccount);
  } catch (error) {
    throw new Error('Invalid JSON in FIREBASE_ADMIN_CREDENTIALS.');
  }

  return initializeApp({ credential: cert(parsed) });
}

const adminApp = createAdminApp();

export function getFirebaseAdminFirestore(): Firestore {
  return getFirestore(adminApp);
}

export function getFirebaseAdminMessaging(): Messaging {
  return getMessaging(adminApp);
}
