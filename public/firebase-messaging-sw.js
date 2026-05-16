
// This script runs in the background to handle push notifications
let messaging = null;

try {
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

  messaging = firebase.messaging();
  console.log('[firebase-messaging-sw.js] Firebase messaging initialized successfully');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Error initializing Firebase:', error);
}

// Handle service worker activation - claim all clients immediately
self.addEventListener('activate', (event) => {
  try {
    console.log('[firebase-messaging-sw.js] Service worker activating');
    event.waitUntil(clients.claim());
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error during activation:', error);
  }
});

// Handle service worker installation - skip waiting
self.addEventListener('install', (event) => {
  try {
    console.log('[firebase-messaging-sw.js] Service worker installing');
    self.skipWaiting();
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error during installation:', error);
  }
});

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    try {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      
      // Extract title and body from payload, checking both notification and data fields
      const notificationTitle = payload.notification?.title || payload.data?.title || 'The Breakfast Club';
      const notificationBody = payload.notification?.body || payload.data?.body || '';
      
      // Validate payload data before using it
      const notificationData = {};
      if (payload.data && typeof payload.data === 'object') {
        Object.keys(payload.data).forEach(key => {
          try {
            // Only include primitive types in notification data to avoid serialization issues
            if (payload.data[key] !== null && typeof payload.data[key] !== 'object') {
              notificationData[key] = payload.data[key];
            }
          } catch (e) {
            console.warn('[firebase-messaging-sw.js] Error processing data field:', key, e);
          }
        });
      }
      
      const notificationOptions = {
        body: notificationBody,
        icon: '/icon.png',
        badge: '/icon.png',
        data: notificationData,
        tag: payload.data?.tag || 'default', // Add tag to prevent duplicate notifications
        requireInteraction: false // Don't require interaction on mobile
      };

      // Check if showNotification is available before calling it
      if (self.registration && self.registration.showNotification) {
        try {
          self.registration.showNotification(notificationTitle, notificationOptions);
        } catch (showError) {
          console.error('[firebase-messaging-sw.js] Error showing notification:', showError);
        }
      } else {
        console.error('[firebase-messaging-sw.js] showNotification not available');
      }
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error in background message handler:', error);
      // Don't throw - let the service worker continue running
    }
  });
} else {
  console.error('[firebase-messaging-sw.js] Firebase messaging not initialized, cannot handle background messages');
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  try {
    event.notification.close();
    
    // Get URL from notification data or webpush link, default to root
    const urlToOpen = event.notification.data?.url || event.notification.data?.link || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Try to find an existing window to focus
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          try {
            // Check if the client URL matches or starts with the target URL
            if (client.url === urlToOpen || client.url.startsWith(urlToOpen)) {
              if ('focus' in client) {
                return client.focus();
              }
            }
          } catch (e) {
            console.warn('[firebase-messaging-sw.js] Error checking client URL:', e);
          }
        }
        
        // If no existing window, try to open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }).catch((error) => {
        console.error('[firebase-messaging-sw.js] Error handling notification click:', error);
      })
    );
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error in notification click handler:', error);
  }
});
