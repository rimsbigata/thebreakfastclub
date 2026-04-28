import { NextResponse } from 'next/server';
import { getCourts } from '@/lib/queries/courts';
import { getMatches } from '@/lib/queries/matches';
import { getPlayers } from '@/lib/queries/players';
import { getSettings, saveSettings } from '@/lib/queries/settings';
import { sql } from '@/lib/db';

export async function GET() {
  const [players, courts, matches, settings] = await Promise.all([
    getPlayers(),
    getCourts(),
    getMatches(),
    getSettings(),
  ]);

  return NextResponse.json({ players, courts, matches, settings });
}

export async function PATCH() {
  await sql`
    UPDATE matches
    SET is_completed = TRUE, status = 'cancelled', end_time = COALESCE(end_time, NOW()), updated_at = NOW()
    WHERE is_completed = FALSE
  `;

  await sql`
    UPDATE players
    SET
      status = 'available',
      wins = 0,
      games_played = 0,
      total_play_time_minutes = 0,
      partner_history = '{}',
      last_available_at = NOW(),
      updated_at = NOW()
  `;

  await sql`
    UPDATE courts
    SET status = 'available', current_match_id = NULL, updated_at = NOW()
  `;

  return GET();
}

export async function DELETE() {
  await sql`DELETE FROM matches`;
  await sql`DELETE FROM courts`;
  await sql`DELETE FROM players`;
  await saveSettings({
    fees: [],
    paymentMethods: [],
    clubLogo: null,
    defaultWinningScore: 21,
    autoAdvanceEnabled: true,
    queueSessionCode: 'TBC001',
  });

  return NextResponse.json({ ok: true });
}
