import { Court as AppCourt } from '@/lib/types';
import { sql } from '../db';

interface DbCourt {
  id: string;
  name: string;
  status: string;
  current_match_id: string | null;
  queue: string[];
  estimated_wait_minutes: number;
  current_players: string[];
}

function toAppCourt(court: DbCourt): AppCourt {
  return {
    id: court.id,
    name: court.name,
    status: court.status as AppCourt['status'],
    currentMatchId: court.current_match_id,
    queue: court.queue,
    estimatedWaitMinutes: court.estimated_wait_minutes,
    currentPlayers: court.current_players,
  };
}

export async function getCourts(): Promise<AppCourt[]> {
  const result = await sql`SELECT * FROM courts ORDER BY name`;
  return (result as DbCourt[]).map(toAppCourt);
}

export async function createCourt(name: string): Promise<AppCourt> {
  const result = await sql`
    INSERT INTO courts (name)
    VALUES (${name})
    RETURNING *
  `;
  return toAppCourt(result[0] as DbCourt);
}

export async function deleteCourtById(id: string): Promise<void> {
  await sql`DELETE FROM matches WHERE court_id = ${id}`;
  await sql`DELETE FROM courts WHERE id = ${id}`;
}

export async function updateCourtCurrentMatch(id: string, currentMatchId: string | null): Promise<AppCourt> {
  const status = currentMatchId ? 'occupied' : 'available';
  const result = await sql`
    UPDATE courts
    SET current_match_id = ${currentMatchId}, status = ${status}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return toAppCourt(result[0] as DbCourt);
}
