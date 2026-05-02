"use client"

import { useState, useEffect, useCallback } from 'react'
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging'
import { initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: "AIzaSyAKGYRP8SjvCq-hT2w5yNDIJEOhjaJGvw8",
  authDomain: "studio-8289009920-31c2b.firebaseapp.com",
  projectId: "studio-8289009920-31c2b",
  storageBucket: "studio-8289009920-31c2b.firebasestorage.app",
  messagingSenderId: "380629825062",
  appId: "1:380629825062:web:e595813b55ac4626ddd8e7",
}

// Initialize Firebase app (only once)
const app = initializeApp(firebaseConfig)

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  // Check browser support on mount
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window
      setIsSupported(supported)
      
      if (supported) {
        setPermission(Notification.permission)
      }
    }

    checkSupport()
  }, [])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser')
    }

    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      console.log('Service Worker registered successfully:', registration)
      return registration
    } catch (err) {
      console.error('Service Worker registration failed:', err)
      throw new Error('Failed to register service worker')
    }
  }, [isSupported])

  // Request permission and get token
  const requestPermissionAndGetToken = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser')
    }

    if (permission === 'granted') {
      // If already granted, just get the token
      return await getTokenInternal()
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') {
        throw new Error('Notification permission denied')
      }

      // Register service worker
      await registerServiceWorker()

      // Get FCM token
      const fcmToken = await getTokenInternal()
      return fcmToken
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get FCM token'
      setError(errorMessage)
      console.error('Failed to request permission/get token:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, permission, registerServiceWorker])

  // Internal function to get FCM token
  const getTokenInternal = async () => {
    const messaging = getMessaging(app)
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''
    
    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js'),
      vapidKey: vapidKey,
    })

    if (!currentToken) {
      throw new Error('No registration token available')
    }

    setToken(currentToken)
    console.log('FCM Token:', currentToken)
    return currentToken
  }

  // Delete token (for cleanup)
  const deleteFcmToken = useCallback(async () => {
    if (!token) return

    try {
      const messaging = getMessaging(app)
      await deleteToken(messaging)
      setToken(null)
      console.log('FCM Token deleted successfully')
    } catch (err) {
      console.error('Failed to delete FCM token:', err)
      throw err
    }
  }, [token])

  // Listen for incoming messages (when app is in foreground)
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return

    const messaging = getMessaging(app)
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload)
      
      // Show notification in foreground
      if (payload.notification) {
        const notification = new Notification(payload.notification.title || 'TheBreakfastClub Alert', {
          body: payload.notification.body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          data: payload.data,
        })

        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      }
    })

    return () => unsubscribe()
  }, [isSupported, permission])

  return {
    token,
    permission,
    isLoading,
    error,
    isSupported,
    requestPermissionAndGetToken,
    deleteFcmToken,
  }
}
