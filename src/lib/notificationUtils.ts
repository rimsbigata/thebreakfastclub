interface SendNotificationParams {
  playerIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Client-side utility to send push notifications via the API
 * Wrapped in try/catch for reliability - notification failures won't crash the app
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('Failed to send notification:', await response.text());
    }
  } catch (error) {
    // Silently fail - notification errors shouldn't crash the app
    console.error('Error sending notification:', error);
  }
}

/**
 * Send 'Match Starting' notification to all match participants
 */
export async function sendMatchStartingNotification(
  playerIds: string[],
  courtId?: string,
  courtName?: string
): Promise<void> {
  const courtInfo = courtName ? ` on ${courtName}` : '';
  await sendNotification({
    playerIds,
    title: 'The Breakfast Club',
    body: `Match Starting${courtInfo}! Get ready.`,
    data: {
      type: 'match_starting',
      ...(courtId && { courtId }),
    },
  });
}

/**
 * Send 'Your Turn!' notification to specific players
 */
export async function sendYourTurnNotification(
  playerIds: string | string[],
  courtId?: string,
  courtName?: string
): Promise<void> {
  const courtInfo = courtName ? ` on ${courtName}` : '';
  const ids = Array.isArray(playerIds) ? playerIds : [playerIds];
  await sendNotification({
    playerIds: ids,
    title: 'The Breakfast Club',
    body: `Your Turn${courtInfo}! Head to the court.`,
    data: {
      type: 'your_turn',
      ...(courtId && { courtId }),
    },
  });
}

/**
 * Send 'Session Update' notification to all session participants
 */
export async function sendSessionUpdateNotification(
  playerIds: string[],
  message: string
): Promise<void> {
  await sendNotification({
    playerIds,
    title: 'The Breakfast Club',
    body: `Session Update: ${message}`,
    data: {
      type: 'session_update',
    },
  });
}
