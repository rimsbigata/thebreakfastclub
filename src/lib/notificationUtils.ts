
interface SendNotificationParams {
  playerIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Client-side utility to send push notifications via the API
 */
export async function sendNotification(params: SendNotificationParams): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();
    return response.ok && result.result?.successCount > 0;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
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
    body: `${teamANames} vs ${teamBNames}. Waiting for court assignment.`,
    data: {
      type: 'match_queued',
      matchId,
      tag: `match-${matchId}`
    },
  });
}

/**
 * Send 'Court Assigned' notification
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
    body: `${teamANames} vs ${teamBNames}. Head to the court now!`,
    data: {
      type: 'court_assigned',
      courtName,
      matchId,
      tag: `match-${matchId}`
    },
  });
}

/**
 * Send 'Your Turn!' notification
 */
export async function sendYourTurnNotification(
  playerIds: string | string[],
  courtId?: string,
  courtName?: string
): Promise<void> {
  const ids = Array.isArray(playerIds) ? playerIds : [playerIds];
  await sendNotification({
    playerIds: ids,
    title: '🏸 Your Turn!',
    body: `You have been assigned to ${courtName || 'a court'}.`,
    data: {
      type: 'your_turn',
      tag: 'court-assignment'
    },
  });
}
