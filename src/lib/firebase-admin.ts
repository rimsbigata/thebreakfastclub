import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getMessaging, Messaging } from 'firebase-admin/messaging'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
let adminApp: App
let adminMessaging: Messaging
let adminFirestore: Firestore

export function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0]
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.')
    }

    // Handle escaped newlines in private key
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n')

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    })
  }

  adminMessaging = getMessaging(adminApp)
  adminFirestore = getFirestore(adminApp)

  return {
    app: adminApp,
    messaging: adminMessaging,
    firestore: adminFirestore,
  }
}

// Get admin instances (lazy initialization)
export function getAdminMessaging(): Messaging {
  if (!adminMessaging) {
    initializeFirebaseAdmin()
  }
  return adminMessaging
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    initializeFirebaseAdmin()
  }
  return adminFirestore
}
