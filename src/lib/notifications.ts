import { getFirebaseAdminFirestore, getFirebaseAdminMessaging } from './firebaseAdmin';

interface SendNotificationParams {
  playerIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function getPushTokensForPlayers(playerIds: string[]) {
  const firestore = getFirebaseAdminFirestore();
  const tokens = await Promise.all(
    playerIds.map(async (playerId) => {
      const tokenDoc = await firestore.collection('pushTokens').doc(playerId).get();
      if (!tokenDoc.exists) {
        return null;
      }
      const data = tokenDoc.data();
      return typeof data?.token === 'string' ? data.token : null;
    }),
  );

  return tokens.filter((token): token is string => Boolean(token));
}

export async function sendPushNotificationToPlayers({ playerIds, title, body, data }: SendNotificationParams) {
  const tokens = await getPushTokensForPlayers(playerIds);
  if (!tokens.length) {
    return {
      message: 'No push tokens available for selected players.',
      successCount: 0,
      failureCount: 0,
      responses: [],
    };
  }

  const messaging = getFirebaseAdminMessaging();
  const response = await messaging.sendEachForMulticast({
    notification: { title, body },
    data: data ?? {},
    tokens,
  });

  return {
    message: 'Push notification request sent.',
    successCount: response.successCount,
    failureCount: response.failureCount,
    responses: response.responses.map((item) => ({ success: item.success, error: item.error?.message })),
  };
}

export async function sendMatchAssignedNotifications(matchId: string, playerIds: string[], courtId?: string) {
  const title = 'Court assigned';
  const body = courtId
    ? `Court ${courtId} is ready. You can now play.`
    : 'A court is ready for your match.';

  return sendPushNotificationToPlayers({
    playerIds,
    title,
    body,
    data: {
      type: 'match_assigned',
      matchId,
      courtId: courtId ?? '',
    },
  });
}
