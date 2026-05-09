'use server'

import { getAdminMessaging, getAdminFirestore } from '@/lib/firebase-admin'

/**
 * Check if current time is within quiet hours window
 * @param quietStart - Start time in format "HH:MM" (24-hour)
 * @param quietEnd - End time in format "HH:MM" (24-hour)
 * @returns true if current time is within quiet hours
 */
function isWithinQuietHours(quietStart: string, quietEnd: string): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentMinutes = currentHour * 60 + currentMinute

  const [startHour, startMinute] = quietStart.split(':').map(Number)
  const [endHour, endMinute] = quietEnd.split(':').map(Number)

  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  // Handle midnight crossing (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    // Window crosses midnight: current time is quiet if it's >= start OR <= end
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes
  } else {
    // Normal window: current time is quiet if it's >= start AND <= end
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }
}

/**
 * Sends a push notification to a player when they are assigned to a court
 * @param playerId - The ID of the player to notify
 * @param courtName - The name of the court they were assigned to
 */
export async function notifyPlayerOfAssignment(playerId: string, courtName: string) {
  try {
    const firestore = getAdminFirestore()
    const messaging = getAdminMessaging()

    // Fetch the player's data from Firestore
    const playerDoc = await firestore.collection('userProfiles').doc(playerId).get()

    if (!playerDoc.exists) {
      console.warn(`Player ${playerId} not found in Firestore`)
      return { success: false, error: 'Player not found' }
    }

    const playerData = playerDoc.data()
    const fcmToken = playerData?.fcmToken
    const preferences = playerData?.preferences

    if (!fcmToken) {
      console.warn(`Player ${playerId} has no FCM token registered`)
      return { success: false, error: 'No FCM token registered' }
    }

    // Check if notifications are disabled
    if (preferences?.enabled === false) {
      console.log(`Player ${playerId} has notifications disabled`)
      return { success: false, error: 'Notifications disabled by user' }
    }

    // Check quiet hours
    if (preferences?.quietStart && preferences?.quietEnd) {
      if (isWithinQuietHours(preferences.quietStart, preferences.quietEnd)) {
        console.log(`Quiet hours active for player ${playerId} (${preferences.quietStart} - ${preferences.quietEnd})`)
        return { success: false, error: 'Quiet hours active' }
      }
    }

    // Send the notification
    const message = {
      token: fcmToken,
      notification: {
        title: '🏸 Court Assigned!',
        body: `You've been assigned to ${courtName}`,
      },
      data: {
        type: 'court_assignment',
        courtName: courtName,
        playerId: playerId,
      },
      webpush: {
        fcmOptions: {
          link: '/',
        },
        notification: {
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'court-assignment',
          requireInteraction: false,
        },
      },
      android: {
        notification: {
          icon: '/icon.png',
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

    const response = await messaging.send(message)
    console.log(`Successfully sent notification to player ${playerId}:`, response)

    return { success: true, messageId: response }
  } catch (error) {
    console.error('Failed to send notification to player:', error)

    // Handle specific FCM errors
    if (error instanceof Error) {
      if (error.message.includes('registration-token-not-registered')) {
        console.warn(`FCM token for player ${playerId} is invalid or expired`)
        return { success: false, error: 'Invalid or expired FCM token' }
      }
      if (error.message.includes('message-too-large')) {
        return { success: false, error: 'Message payload too large' }
      }
    }

    return { success: false, error: 'Failed to send notification' }
  }
}

/**
 * Sends notifications to multiple players for court assignments
 * @param assignments - Array of { playerId, courtName } objects
 */
export async function notifyPlayersOfAssignments(assignments: Array<{ playerId: string; courtName: string }>) {
  const results = await Promise.allSettled(
    assignments.map(({ playerId, courtName }) => notifyPlayerOfAssignment(playerId, courtName))
  )

  const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - successful

  console.log(`Notification batch complete: ${successful} successful, ${failed} failed`)

  return {
    total: results.length,
    successful,
    failed,
  }
}
