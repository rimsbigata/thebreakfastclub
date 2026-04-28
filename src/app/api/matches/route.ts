import { sql } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get matches with their players
    const matches = await sql`
      SELECT
        m.*,
        COALESCE(
          JSON_AGG(
            CASE
              WHEN mp.team = 'T1' THEN mp.player_id::text
            END
          ) FILTER (WHERE mp.team = 'T1'),
          '[]'::json
        ) as team1_player_ids,
        COALESCE(
          JSON_AGG(
            CASE
              WHEN mp.team = 'T2' THEN mp.player_id::text
            END
          ) FILTER (WHERE mp.team = 'T2'),
          '[]'::json
        ) as team2_player_ids
      FROM matches m
      LEFT JOIN match_players mp ON m.id = mp.match_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `;
    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teamA, teamB, courtId } = await request.json();

    if (!teamA || !teamB || !Array.isArray(teamA) || !Array.isArray(teamB)) {
      return NextResponse.json({ error: 'teamA and teamB are required and must be arrays' }, { status: 400 });
    }

    // Start transaction
    await sql`BEGIN`;

    try {
      // Create match
      const [match] = await sql`
        INSERT INTO matches (court_id, status, queue_position)
        VALUES (${courtId || null}, 'queued', (
          SELECT COALESCE(MAX(queue_position), 0) + 1 FROM matches WHERE status = 'queued'
        ))
        RETURNING *
      `;

      // Insert team players
      const playerInserts = [];
      teamA.forEach(playerId => {
        playerInserts.push(sql`INSERT INTO match_players (match_id, player_id, team) VALUES (${match.id}, ${playerId}, 'T1')`);
      });
      teamB.forEach(playerId => {
        playerInserts.push(sql`INSERT INTO match_players (match_id, player_id, team) VALUES (${match.id}, ${playerId}, 'T2')`);
      });

      await Promise.all(playerInserts);

      await sql`COMMIT`;

      return NextResponse.json({ match }, { status: 201 });
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Error creating match:', error);
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
  }
}