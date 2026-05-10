
"use client"

import { useState, useEffect, useCallback } from 'react'
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { doc, setDoc } from 'firebase/firestore'
import { useFirebase } from '@/firebase'

const firebaseConfig = {
  apiKey: "AIzaSyAKGYRP8SjvCq-hT2w5yNDIJEOhjaJGvw8",
  authDomain: "studio-8289009920-31c2b.firebaseapp.com",
  projectId: "studio-8289009920-31c2b",
  storageBucket: "studio-8289009920-31c2b.firebasestorage.app",
  messagingSenderId: "380629825062",
  appId: "1:380629825062:web:e595813b55ac4626ddd8e7",
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export function useFcmToken() {
  const { user, firestore } = useFirebase()
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

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

  const requestPermissionAndGetToken = useCallback(async () => {
    if (!isSupported) throw new Error('Not supported')

    setIsLoading(true)
    setError(null)

    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') {
        throw new Error('Permission denied')
      }

      const messaging = getMessaging(app)
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

      if (!vapidKey) {
        throw new Error('VAPID key missing')
      }

      const currentToken = await getToken(messaging, { vapidKey })

      if (currentToken) {
        setToken(currentToken)
        if (user && firestore) {
          await setDoc(doc(firestore, 'userProfiles', user.uid), { fcmToken: currentToken }, { merge: true })
        }
        return currentToken
      }
      throw new Error('No token generated')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      console.error('FCM Error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user, firestore])

  const deleteFcmToken = useCallback(async () => {
    if (!token) return
    try {
      const messaging = getMessaging(app)
      await deleteToken(messaging)
      setToken(null)
      if (user && firestore) {
        await setDoc(doc(firestore, 'userProfiles', user.uid), { fcmToken: null }, { merge: true })
      }
    } catch (err) {
      console.error('Delete token failed:', err)
    }
  }, [token, user, firestore])

  useEffect(() => {
    if (!isSupported || permission !== 'granted') return
    const messaging = getMessaging(app)
    const unsubscribe = onMessage(messaging, (payload) => {
      if (payload.notification) {
        new Notification(payload.notification.title || 'The Breakfast Club', {
          body: payload.notification.body,
          icon: '/icon.png',
        })
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
