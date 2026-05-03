importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKGYRP8SjvCq-hT2w5yNDIJEOhjaJGvw8",
  authDomain: "studio-8289009920-31c2b.firebaseapp.com",
  projectId: "studio-8289009920-31c2b",
  storageBucket: "studio-8289009920-31c2b.firebasestorage.app",
  messagingSenderId: "380629825062",
  appId: "1:380629825062:web:e595813b55ac4626ddd8e7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw] Received background message:', payload);

  // Robust null checks for payload and notification
  if (!payload) {
    console.warn('[firebase-messaging-sw] Received null or undefined payload');
    return;
  }

  if (!payload.notification) {
    console.warn('[firebase-messaging-sw] Payload has no notification object');
    return;
  }

  const notificationTitle = payload.notification.title || 'TheBreakfastClub Alert';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new club update.',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'breakfastclub-notification',
    renotify: true,
    requireInteraction: false,
    data: payload.data || {},
    actions: payload.data?.actions || [],
  };

  // Only show notification if we have valid data
  if (notificationTitle || notificationOptions.body) {
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
  console.log('[firebase-messaging-sw] Notification clicked:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function (clientList) {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if no existing window found
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', function (event) {
  console.log('[firebase-messaging-sw] Push subscription changed');

  // Robust null check for oldSubscription and options
  if (!event.oldSubscription || !event.oldSubscription.options || !event.oldSubscription.options.applicationServerKey) {
    console.warn('[firebase-messaging-sw] Cannot resubscribe: old subscription or options missing');
    return;
  }

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription.options.applicationServerKey
    })
  );
});
