
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
