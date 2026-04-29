import { NextResponse } from 'next/server';

export function legacySqlApiResponse() {
  return NextResponse.json(
    {
      error: 'This legacy SQL API is no longer used. Club data now lives in Firebase sessions.',
    },
    { status: 410 },
  );
}
