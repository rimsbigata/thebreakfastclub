import { Player as AppPlayer } from '@/lib/types';
import { sql } from '../db';

export interface Player {
  id: string;
  name: string;
  skill_level: number;
  wins: number;
  games_played: number;
  partner_history: string[];
  status: string;
  improvement_score: number;
  total_play_time_minutes: number;
  last_available_at: string | null;
  play_style: string;
  created_at: string;
  updated_at: string;
}

function toAppPlayer(player: Player): AppPlayer {
  return {
    id: player.id,
    name: player.name,
    skillLevel: player.skill_level,
    wins: player.wins,
    gamesPlayed: player.games_played,
    partnerHistory: player.partner_history,
    status: player.status as AppPlayer['status'],
    improvementScore: player.improvement_score,
    totalPlayTimeMinutes: player.total_play_time_minutes,
    lastAvailableAt: player.last_available_at ? new Date(player.last_available_at).getTime() : undefined,
    playStyle: player.play_style,
  };
}

export async function getPlayers(): Promise<AppPlayer[]> {
  try {
    const result = await sql`SELECT * FROM players ORDER BY name`;
    return (result as Player[]).map(toAppPlayer);
  } catch (error) {
    console.error('Error fetching players:', error);
    throw new Error('Failed to fetch players');
  }
}

export async function getPlayerById(id: string): Promise<AppPlayer> {
  const result = await sql`SELECT * FROM players WHERE id = ${id} LIMIT 1`;
  if (!result[0]) {
    throw new Error('Player not found');
  }
  return toAppPlayer(result[0] as Player);
}

export async function createPlayer(name: string, skillLevel: number, playStyle = 'Unknown'): Promise<AppPlayer> {
  try {
    const result = await sql`
      INSERT INTO players (name, skill_level, play_style, last_available_at)
      VALUES (${name}, ${skillLevel}, ${playStyle}, NOW())
      RETURNING *
    `;
    return toAppPlayer(result[0] as Player);
  } catch (error) {
    console.error('Error creating player:', error);
    throw new Error('Failed to create player');
  }
}

export async function updatePlayerById(id: string, updates: Partial<AppPlayer>): Promise<AppPlayer> {
  const current = await sql`SELECT * FROM players WHERE id = ${id} LIMIT 1`;
  if (!current[0]) {
    throw new Error('Player not found');
  }

  const existing = toAppPlayer(current[0] as Player);
  const next = { ...existing, ...updates };
  const lastAvailableAt = next.lastAvailableAt ? new Date(next.lastAvailableAt) : null;

  const result = await sql`
    UPDATE players
    SET
      name = ${next.name},
      skill_level = ${next.skillLevel},
      wins = ${next.wins},
      games_played = ${next.gamesPlayed},
      partner_history = ${next.partnerHistory},
      status = ${next.status},
      improvement_score = ${next.improvementScore},
      total_play_time_minutes = ${next.totalPlayTimeMinutes},
      last_available_at = ${lastAvailableAt},
      play_style = ${next.playStyle},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return toAppPlayer(result[0] as Player);
}

export async function deletePlayerById(id: string): Promise<void> {
  await sql`DELETE FROM players WHERE id = ${id}`;
}
