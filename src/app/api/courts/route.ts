import { NextResponse } from 'next/server';
import { createCourt, getCourts } from '@/lib/queries/courts';

export async function GET() {
  const courts = await getCourts();
  return NextResponse.json({ courts });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'Court name is required.' }, { status: 400 });
  }

  const court = await createCourt(name);
  return NextResponse.json({ court }, { status: 201 });
}
