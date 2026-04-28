'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

export async function registerPushMessagingToken(firebaseApp: FirebaseApp): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return null;
  }

  if (!VAPID_KEY) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY environment variable for Firebase Cloud Messaging.');
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const { getMessaging, getToken } = await import('firebase/messaging');
  const messaging = getMessaging(firebaseApp);

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }

  return await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
}

export async function savePushTokenForPlayer(
  firestore: Firestore,
  playerId: string,
  token: string,
): Promise<void> {
  const tokenRef = doc(firestore, 'pushTokens', playerId);
  await setDoc(
    tokenRef,
    {
      playerId,
      token,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listenForForegroundPushMessages(
  firebaseApp: FirebaseApp,
  onMessageCallback: (payload: any) => void,
): Promise<() => void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return () => {};
  }

  const { getMessaging, onMessage } = await import('firebase/messaging');
  const messaging = getMessaging(firebaseApp);
  return onMessage(messaging, onMessageCallback);
}
