import { NextResponse } from 'next/server';
import { updateCourtCurrentMatch } from '@/lib/queries/courts';
import { createMatch, getMatches } from '@/lib/queries/matches';
import { updatePlayerById } from '@/lib/queries/players';
import { sendMatchAssignedNotifications } from '@/lib/notifications';

export async function GET() {
  const matches = await getMatches();
  return NextResponse.json({ matches });
}

export async function POST(request: Request) {
  const body = await request.json();
  const teamA = Array.isArray(body.teamA) ? body.teamA : [];
  const teamB = Array.isArray(body.teamB) ? body.teamB : [];

  if (teamA.length !== 2 || teamB.length !== 2) {
    return NextResponse.json({ error: 'A match needs two players on each team.' }, { status: 400 });
  }

  const match = await createMatch(
    teamA,
    teamB,
    body.courtId,
    body.teamASnapshots,
    body.teamBSnapshots
  );

  if (match.courtId) {
    await updateCourtCurrentMatch(match.courtId, match.id);
  }

  await Promise.all([...teamA, ...teamB].map(id => updatePlayerById(id, {
    status: 'playing',
    lastAvailableAt: undefined,
  })));

  sendMatchAssignedNotifications(match.id, [...teamA, ...teamB], match.courtId).catch((error) => {
    console.error('Failed to send match notifications:', error);
  });

  return NextResponse.json({ match }, { status: 201 });
}
