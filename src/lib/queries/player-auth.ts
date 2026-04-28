import { createHash, randomUUID } from 'crypto';
import { Player } from '@/lib/types';
import { sql } from '../db';
import { createPlayer, getPlayerById } from './players';

function hashPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
}

async function ensurePlayerAuthColumns() {
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS pin_hash TEXT`;
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS self_assessment JSONB`;
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS active_session_code TEXT`;
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS session_joined_at TIMESTAMP WITH TIME ZONE`;
}

export async function signUpPlayer(input: {
  name: string;
  pin: string;
  skillLevel: number;
  playStyle?: string;
  selfAssessment?: unknown;
}): Promise<Player> {
  await ensurePlayerAuthColumns();
  const player = await createPlayer(input.name, input.skillLevel, input.playStyle ?? 'Unknown');
  await sql`
    UPDATE players
    SET pin_hash = ${hashPin(input.pin)}, self_assessment = ${input.selfAssessment ? JSON.stringify(input.selfAssessment) : null}
    WHERE id = ${player.id}
  `;
  return getPlayerById(player.id);
}

export async function logInPlayer(name: string, pin: string): Promise<Player> {
  await ensurePlayerAuthColumns();
  const result = await sql`
    SELECT id FROM players
    WHERE lower(name) = lower(${name}) AND pin_hash = ${hashPin(pin)}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!result[0]) {
    throw new Error('Invalid player name or PIN.');
  }

  return getPlayerById(result[0].id as string);
}

export async function joinQueueSession(playerId: string, code: string, activeCode: string): Promise<Player> {
  await ensurePlayerAuthColumns();
  if (code.trim().toUpperCase() !== activeCode.trim().toUpperCase()) {
    throw new Error('Invalid session code.');
  }

  await sql`
    UPDATE players
    SET status = 'available', active_session_code = ${activeCode}, session_joined_at = NOW(), last_available_at = NOW()
    WHERE id = ${playerId}
  `;

  return getPlayerById(playerId);
}

export function generateSessionCode() {
  return randomUUID().slice(0, 6).toUpperCase();
}
