import { Fee, PaymentMethod } from '@/lib/types';
import { sql } from '../db';

export interface AppSettings {
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  clubLogo: string | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
  queueSessionCode: string;
}

const defaultSettings: AppSettings = {
  fees: [],
  paymentMethods: [],
  clubLogo: null,
  defaultWinningScore: 21,
  autoAdvanceEnabled: true,
  queueSessionCode: 'TBC001',
};

async function ensureSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}

export async function getSettings(): Promise<AppSettings> {
  await ensureSettingsTable();
  const result = await sql`SELECT value FROM app_settings WHERE key = 'club' LIMIT 1`;
  return {
    ...defaultSettings,
    ...(result[0]?.value as Partial<AppSettings> | undefined),
  };
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  await ensureSettingsTable();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('club', ${JSON.stringify(settings)}, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  return settings;
}
