import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/queries/settings';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const current = await getSettings();
  const settings = await saveSettings({ ...current, ...body });
  return NextResponse.json({ settings });
}
