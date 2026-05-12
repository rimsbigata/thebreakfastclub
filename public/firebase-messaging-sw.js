
// This script runs in the background to handle push notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// These credentials should match your firebaseConfig.ts
// In production, these are often injected, but for a prototype we can use the project defaults
firebase.initializeApp({
  apiKey: "AIzaSyAKGYRP8SjvCq-hT2w5yNDIJEOhjaJGvw8",
  authDomain: "studio-8289009920-31c2b.firebaseapp.com",
  projectId: "studio-8289009920-31c2b",
  storageBucket: "studio-8289009920-31c2b.firebasestorage.app",
  messagingSenderId: "380629825062",
  appId: "1:380629825062:web:e595813b55ac4626ddd8e7"
});

const messaging = firebase.messaging();

// Handle service worker activation - claim all clients immediately
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating');
  event.waitUntil(clients.claim());
});

// Handle service worker installation - skip waiting
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing');
  self.skipWaiting();
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Extract title and body from payload, checking both notification and data fields
  const notificationTitle = payload.notification?.title || payload.data?.title || 'The Breakfast Club';
  const notificationBody = payload.notification?.body || payload.data?.body || '';
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/icon.png',
    badge: '/icon.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to find an existing window with the URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
