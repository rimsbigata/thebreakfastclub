import { Match as AppMatch } from '@/lib/types';
import { sql } from '../db';

export interface Match {
  id: string;
  team_a: string[];
  team_b: string[];
  team_a_snapshots: any;
  team_b_snapshots: any;
  team_a_score: number | null;
  team_b_score: number | null;
  court_id: string | null;
  timestamp: string;
  start_time: string | null;
  end_time: string | null;
  is_completed: boolean;
  status: string;
  winner: string | null;
  created_at: string;
  updated_at: string;
}

function toAppMatch(match: Match): AppMatch {
  return {
    id: match.id,
    teamA: match.team_a,
    teamB: match.team_b,
    teamASnapshots: match.team_a_snapshots ?? undefined,
    teamBSnapshots: match.team_b_snapshots ?? undefined,
    teamAScore: match.team_a_score ?? undefined,
    teamBScore: match.team_b_score ?? undefined,
    courtId: match.court_id ?? undefined,
    timestamp: match.timestamp,
    startTime: match.start_time ?? undefined,
    endTime: match.end_time ?? undefined,
    isCompleted: match.is_completed,
    status: match.status as AppMatch['status'],
    winner: match.winner as AppMatch['winner'],
  };
}

export async function getMatches(): Promise<AppMatch[]> {
  try {
    const result = await sql`SELECT * FROM matches ORDER BY timestamp DESC`;
    return (result as Match[]).map(toAppMatch);
  } catch (error) {
    console.error('Error fetching matches:', error);
    throw new Error('Failed to fetch matches');
  }
}

export async function createMatch(
  teamA: string[],
  teamB: string[],
  courtId?: string,
  teamASnapshots?: unknown,
  teamBSnapshots?: unknown
): Promise<AppMatch> {
  try {
    const result = await sql`
      INSERT INTO matches (team_a, team_b, court_id, team_a_snapshots, team_b_snapshots)
      VALUES (${teamA}, ${teamB}, ${courtId ?? null}, ${teamASnapshots ? JSON.stringify(teamASnapshots) : null}, ${teamBSnapshots ? JSON.stringify(teamBSnapshots) : null})
      RETURNING *
    `;
    return toAppMatch(result[0] as Match);
  } catch (error) {
    console.error('Error creating match:', error);
    throw new Error('Failed to create match');
  }
}

export async function updateMatchById(id: string, updates: Partial<AppMatch>): Promise<AppMatch> {
  const current = await sql`SELECT * FROM matches WHERE id = ${id} LIMIT 1`;
  if (!current[0]) {
    throw new Error('Match not found');
  }

  const existing = toAppMatch(current[0] as Match);
  const next = { ...existing, ...updates };

  const result = await sql`
    UPDATE matches
    SET
      team_a = ${next.teamA},
      team_b = ${next.teamB},
      team_a_snapshots = ${next.teamASnapshots ? JSON.stringify(next.teamASnapshots) : null},
      team_b_snapshots = ${next.teamBSnapshots ? JSON.stringify(next.teamBSnapshots) : null},
      team_a_score = ${next.teamAScore ?? null},
      team_b_score = ${next.teamBScore ?? null},
      court_id = ${next.courtId ?? null},
      start_time = ${next.startTime ? new Date(next.startTime) : null},
      end_time = ${next.endTime ? new Date(next.endTime) : null},
      is_completed = ${next.isCompleted},
      status = ${next.status},
      winner = ${next.winner ?? null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return toAppMatch(result[0] as Match);
}

export async function deleteMatchById(id: string): Promise<void> {
  await sql`DELETE FROM matches WHERE id = ${id}`;
}
