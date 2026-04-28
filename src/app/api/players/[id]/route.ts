import { NextResponse } from 'next/server';
import { deletePlayerById, updatePlayerById } from '@/lib/queries/players';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const updates = await request.json();
  const player = await updatePlayerById(id, updates);
  return NextResponse.json({ player });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await deletePlayerById(id);
  return NextResponse.json({ ok: true });
}
