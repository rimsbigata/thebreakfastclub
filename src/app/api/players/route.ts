import { NextResponse } from 'next/server';
import { createPlayer, getPlayers } from '@/lib/queries/players';

export async function GET() {
  const players = await getPlayers();
  return NextResponse.json({ players });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const skillLevel = Number(body.skillLevel);
  const playStyle = typeof body.playStyle === 'string' ? body.playStyle : 'Unknown';

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  if (!Number.isInteger(skillLevel) || skillLevel < 1 || skillLevel > 7) {
    return NextResponse.json({ error: 'Skill level must be between 1 and 7.' }, { status: 400 });
  }

  const player = await createPlayer(name, skillLevel, playStyle);
  return NextResponse.json({ player }, { status: 201 });
}
