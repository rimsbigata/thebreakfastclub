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
    const base64String = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64

    if (!base64String) {
      throw new Error('Missing Firebase Admin environment variable. Please set FIREBASE_SERVICE_ACCOUNT_BASE64.')
    }

    // Decode from Base64 to a JSON string, then parse into an object
    const serviceAccount = JSON.parse(
      Buffer.from(base64String, 'base64').toString('utf8')
    )

    adminApp = initializeApp({
      credential: cert(serviceAccount),
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
