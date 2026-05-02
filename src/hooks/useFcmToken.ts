"use client"

import { useState, useEffect, useCallback } from 'react'
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { useFirebase } from '@/firebase'

const firebaseConfig = {
  apiKey: "AIzaSyAKGYRP8SjvCq-hT2w5yNDIJEOhjaJGvw8",
  authDomain: "studio-8289009920-31c2b.firebaseapp.com",
  projectId: "studio-8289009920-31c2b",
  storageBucket: "studio-8289009920-31c2b.firebasestorage.app",
  messagingSenderId: "380629825062",
  appId: "1:380629825062:web:e595813b55ac4626ddd8e7",
}

// Initialize Firebase app (only once, check if already exists)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export function useFcmToken() {
  const { user, firestore } = useFirebase()
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

  // Save FCM token to Firestore
  const saveTokenToFirestore = useCallback(async (fcmToken: string) => {
    if (!user || !firestore) {
      console.warn('Cannot save token: User not authenticated or Firestore not available')
      return
    }

    try {
      const userDocRef = doc(firestore, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)

      // Check if token has changed
      const currentStoredToken = userDoc.data()?.fcmToken
      if (currentStoredToken === fcmToken) {
        console.log('FCM token unchanged, skipping Firestore update')
        return
      }

      // Update the token in Firestore
      await setDoc(userDocRef, { fcmToken }, { merge: true })
      console.log('FCM token saved to Firestore for user:', user.uid)
    } catch (error) {
      console.error('Failed to save FCM token to Firestore:', error)
      // Don't throw error - token saving failure shouldn't block notification functionality
    }
  }, [user, firestore])

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser')
    }

    try {
      // Check if service worker is already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')

      if (existingRegistration) {
        console.log('Service Worker already registered:', existingRegistration)

        // If it's waiting, skip waiting to activate it immediately
        if (existingRegistration.waiting) {
          existingRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        // Ensure it's ready
        await navigator.serviceWorker.ready
        console.log('Service Worker is ready and active')
        return existingRegistration
      }

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      console.log('Service Worker registered successfully:', registration)

      // Ensure the service worker is ready
      await navigator.serviceWorker.ready
      console.log('Service Worker is ready and active')

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
  }, [isSupported, permission, registerServiceWorker, saveTokenToFirestore])

  // Internal function to get FCM token
  const getTokenInternal = async () => {
    const messaging = getMessaging(app)
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

    // Log VAPID key for debugging (without exposing the full key)
    console.log('VAPID Key present:', !!vapidKey, 'Length:', vapidKey?.length)

    if (!vapidKey) {
      throw new Error('NEXT_PUBLIC_FIREBASE_VAPID_KEY environment variable is missing')
    }

    // Ensure service worker is ready before getting token
    const serviceWorkerRegistration = await navigator.serviceWorker.ready

    // Verify service worker controller exists
    if (!navigator.serviceWorker.controller) {
      throw new Error('Service worker controller not available')
    }

    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: serviceWorkerRegistration,
      vapidKey: vapidKey,
    })

    if (!currentToken) {
      throw new Error('No registration token available')
    }

    setToken(currentToken)
    console.log('FCM Token:', currentToken)

    // Save token to Firestore after successful generation
    await saveTokenToFirestore(currentToken)

    return currentToken
  }

  // Delete token (for cleanup)
  const deleteFcmToken = useCallback(async () => {
    if (!token) return

    try {
      // Ensure service worker is ready before deleting token
      await navigator.serviceWorker.ready

      // Verify service worker controller exists
      if (!navigator.serviceWorker.controller) {
        throw new Error('Service worker controller not available')
      }

      const messaging = getMessaging(app)
      await deleteToken(messaging)
      setToken(null)
      console.log('FCM Token deleted successfully')

      // Remove token from Firestore
      if (user && firestore) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid)
          await setDoc(userDocRef, { fcmToken: null }, { merge: true })
          console.log('FCM token removed from Firestore for user:', user.uid)
        } catch (error) {
          console.error('Failed to remove FCM token from Firestore:', error)
        }
      }
    } catch (err) {
      console.error('Failed to delete FCM token:', err)
      throw err
    }
  }, [token, user, firestore])

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
          icon: '/icon.png',
          badge: '/icon.png',
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
