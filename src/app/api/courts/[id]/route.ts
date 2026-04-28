import { NextResponse } from 'next/server';
import { deleteCourtById, updateCourtCurrentMatch } from '@/lib/queries/courts';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const court = await updateCourtCurrentMatch(id, body.currentMatchId ?? null);
  return NextResponse.json({ court });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await deleteCourtById(id);
  return NextResponse.json({ ok: true });
}
