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
 * Send 'Match Queued' notification with partner info
 */
export async function sendMatchQueuedNotification(
  playerIds: string[],
  teamANames: string,
  teamBNames: string,
  matchId: string
): Promise<void> {
  await sendNotification({
    playerIds,
    title: '🏸 Match Queued!',
    body: `${teamANames} vs ${teamBNames}. Waiting for court.`,
    data: {
      type: 'match_queued',
      matchId,
    },
  });
}

/**
 * Send 'Court Assigned' notification with full matchup
 */
export async function sendCourtAssignedNotification(
  playerIds: string[],
  teamANames: string,
  teamBNames: string,
  courtName: string,
  matchId: string
): Promise<void> {
  await sendNotification({
    playerIds,
    title: `🏸 Court Ready: ${courtName}`,
    body: `${teamANames} vs ${teamBNames}. Your turn!`,
    data: {
      type: 'court_assigned',
      courtName,
      matchId,
    },
  });
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
    title: '🏸 Match Starting!',
    body: `Ready${courtInfo}? Let's go!`,
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
    title: '🏸 Your Turn!',
    body: `Head to ${courtName || 'your court'}.`,
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
