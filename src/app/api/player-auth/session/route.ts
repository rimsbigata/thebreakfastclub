import { NextResponse } from 'next/server';
import { joinQueueSession } from '@/lib/queries/player-auth';
import { getSettings } from '@/lib/queries/settings';

export async function POST(request: Request) {
  const body = await request.json();
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';
  const code = typeof body.code === 'string' ? body.code : '';

  if (!playerId || !code) {
    return NextResponse.json({ error: 'Player and session code are required.' }, { status: 400 });
  }

  const settings = await getSettings();
  const player = await joinQueueSession(playerId, code, settings.queueSessionCode);
  return NextResponse.json({ player });
}
