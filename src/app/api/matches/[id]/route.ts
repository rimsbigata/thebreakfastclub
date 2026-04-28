import { NextResponse } from 'next/server';
import { updateCourtCurrentMatch } from '@/lib/queries/courts';
import { deleteMatchById, updateMatchById } from '@/lib/queries/matches';
import { updatePlayerById } from '@/lib/queries/players';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const match = await updateMatchById(id, body);

  if (body.courtId !== undefined) {
    await updateCourtCurrentMatch(body.courtId, id);
  }

  if (body.releaseCourtId) {
    await updateCourtCurrentMatch(body.releaseCourtId, null);
  }

  if (body.players) {
    await Promise.all(body.players.map((player: { id: string; updates: Record<string, unknown> }) =>
      updatePlayerById(player.id, player.updates)
    ));
  }

  return NextResponse.json({ match });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await deleteMatchById(id);
  return NextResponse.json({ ok: true });
}
