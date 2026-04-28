import { NextResponse } from 'next/server';
import { logInPlayer } from '@/lib/queries/player-auth';

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';

  if (!name || !pin) {
    return NextResponse.json({ error: 'Name and PIN are required.' }, { status: 400 });
  }

  const player = await logInPlayer(name, pin);
  return NextResponse.json({ player });
}
