
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const result = await response.json();
    console.log('Notification API Result:', result);
    return response.ok && (result.result?.successCount > 0 || result.successCount > 0);
  } catch (error) {
    console.error('Error sending notification:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Notification request timed out');
    }
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
