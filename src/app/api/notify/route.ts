import { NextRequest, NextResponse } from 'next/server'
import { getMessaging } from 'firebase-admin/messaging'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Initialize Firebase Admin (only once)
let adminApp: any = null

if (getApps().length === 0) {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (credentialsPath) {
    try {
      adminApp = initializeApp({
        credential: cert(credentialsPath),
      })
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error)
    }
  }
}

const messaging = adminApp ? getMessaging(adminApp) : null

interface NotificationPayload {
  token: string
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    if (!messaging) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized - check GOOGLE_APPLICATION_CREDENTIALS' },
        { status: 500 }
      )
    }

    const payload: NotificationPayload = await request.json()

    // Validate required fields
    if (!payload.token || !payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Missing required fields: token, title, body' },
        { status: 400 }
      )
    }

    const message = {
      token: payload.token,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: payload.data || {},
      webpush: {
        fcmOptions: {
          link: payload.data?.url || '/',
        },
        notification: {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: 'breakfastclub-notification',
          requireInteraction: false,
        },
      },
      android: {
        notification: {
          icon: '/favicon.svg',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    }

    // Send the message
    const response = await messaging.send(message)
    console.log('Successfully sent message:', response)

    return NextResponse.json(
      { success: true, messageId: response },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error sending notification:', error)

    // Handle specific FCM errors
    if (error instanceof Error) {
      if (error.message.includes('registration-token-not-registered')) {
        return NextResponse.json(
          { error: 'Invalid or expired FCM token' },
          { status: 404 }
        )
      }
      if (error.message.includes('message-too-large')) {
        return NextResponse.json(
          { error: 'Message payload too large' },
          { status: 413 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
