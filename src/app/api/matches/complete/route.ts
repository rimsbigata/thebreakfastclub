import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { match_id, winner, team1_score, team2_score } = await request.json();

    if (!match_id) {
      return NextResponse.json({ error: 'match_id is required' }, { status: 400 });
    }

    if (winner && !['T1', 'T2'].includes(winner)) {
      return NextResponse.json({ error: 'winner must be T1 or T2' }, { status: 400 });
    }

    const [match] = await sql`
      UPDATE matches
      SET status = 'completed',
          winner = ${winner || null},
          team1_score = ${team1_score || 0},
          team2_score = ${team2_score || 0},
          completed_at = NOW()
      WHERE id = ${match_id}
      RETURNING *
    `;

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ match });
  } catch (error) {
    console.error('Error completing match:', error);
    return NextResponse.json({ error: 'Failed to complete match' }, { status: 500 });
  }
}