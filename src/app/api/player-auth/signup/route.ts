import { NextResponse } from 'next/server';
import { signUpPlayer } from '@/lib/queries/player-auth';

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  const skillLevel = Number(body.skillLevel);

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  if (pin.length < 4) {
    return NextResponse.json({ error: 'PIN must be at least 4 digits.' }, { status: 400 });
  }

  if (!Number.isInteger(skillLevel) || skillLevel < 1 || skillLevel > 7) {
    return NextResponse.json({ error: 'Skill level must be between 1 and 7.' }, { status: 400 });
  }

  const player = await signUpPlayer({
    name,
    pin,
    skillLevel,
    playStyle: typeof body.playStyle === 'string' ? body.playStyle : 'Unknown',
    selfAssessment: body.selfAssessment,
  });

  return NextResponse.json({ player }, { status: 201 });
}
