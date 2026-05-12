import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

function createAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const base64String = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!base64String) {
    throw new Error(
      'Missing Firebase admin credentials. Set FIREBASE_SERVICE_ACCOUNT_BASE64.',
    );
  }

  // Decode from Base64 to a JSON string, then parse into an object
  const serviceAccount = JSON.parse(
    Buffer.from(base64String, 'base64').toString('utf8')
  );

  // Fix private key line breaks for Vercel
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  return initializeApp({ credential: cert(serviceAccount) });
}

const adminApp = createAdminApp();

export function getFirebaseAdminFirestore(): Firestore {
  return getFirestore(adminApp);
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(adminApp);
}

export function getFirebaseAdminMessaging(): Messaging {
  return getMessaging(adminApp);
}
