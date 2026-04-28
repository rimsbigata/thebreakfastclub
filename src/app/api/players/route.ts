import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const players = await sql`SELECT * FROM players ORDER BY created_at DESC`;
    return NextResponse.json({ players });
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, skillLevel = 3 } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required and must be a string' }, { status: 400 });
    }

    if (skillLevel < 1 || skillLevel > 7) {
      return NextResponse.json({ error: 'Skill level must be between 1 and 7' }, { status: 400 });
    }

    const [player] = await sql`INSERT INTO players (name, skill_level) VALUES (${name}, ${skillLevel}) RETURNING *`;
    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}