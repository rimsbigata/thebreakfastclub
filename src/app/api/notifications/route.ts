import { NextResponse } from 'next/server';
import { sendPushNotificationToPlayers } from '@/lib/notifications';

export async function POST(request: Request) {
  const body = await request.json();
  const playerIds = Array.isArray(body.playerIds) ? body.playerIds : [];
  const title = typeof body.title === 'string' ? body.title : '';
  const messageBody = typeof body.body === 'string' ? body.body : '';
  const data = typeof body.data === 'object' && body.data !== null ? body.data : undefined;

  if (!playerIds.length || !title || !messageBody) {
    return NextResponse.json(
      { error: 'playerIds, title, and body are required.' },
      { status: 400 },
    );
  }

  const result = await sendPushNotificationToPlayers({
    playerIds,
    title,
    body: messageBody,
    data,
  });

  return NextResponse.json({ result });
}
