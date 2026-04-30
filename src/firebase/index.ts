'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(getApp());
  }

  let firebaseApp: FirebaseApp;

  // Use the explicit config by default to avoid the "no-options" error.
  // This is the safest approach for both local dev and most production builds.
  try {
    // If you specifically want to attempt App Hosting auto-init first:
    if (process.env.NODE_ENV === "production" && (process.env.FIREBASE_CONFIG || process.env.FIREBASE_WEBAPP_CONFIG)) {
      firebaseApp = initializeApp();
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }
  } catch (e) {
    console.warn("Automatic initialization failed, falling back to firebaseConfig.", e);
    firebaseApp = initializeApp(firebaseConfig);
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
