import { NextResponse } from 'next/server';
import { generateSessionCode } from '@/lib/queries/player-auth';
import { getSettings, saveSettings } from '@/lib/queries/settings';

export async function POST() {
  const settings = await getSettings();
  const queueSessionCode = generateSessionCode();
  const nextSettings = await saveSettings({ ...settings, queueSessionCode });
  return NextResponse.json({ settings: nextSettings });
}
