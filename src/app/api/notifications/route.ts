import { NextResponse } from 'next/server';
import { sendPushNotificationToPlayers } from '@/lib/notifications';

export async function POST(request: Request) {
  console.log('[API] Notification request received');
  
  try {
    const body = await request.json();
    console.log('[API] Request body:', JSON.stringify(body));
    
    const playerIds = Array.isArray(body.playerIds) ? body.playerIds : [];
    const title = typeof body.title === 'string' ? body.title : '';
    const messageBody = typeof body.body === 'string' ? body.body : '';
    const data = typeof body.data === 'object' && body.data !== null ? body.data : undefined;

    if (!playerIds.length || !title || !messageBody) {
      console.error('[API] Invalid request: missing required fields');
      return NextResponse.json(
        { error: 'playerIds, title, and body are required.', errorCode: 'INVALID_REQUEST' },
        { status: 400 },
      );
    }

    console.log('[API] Sending notification to players:', playerIds);
    const result = await sendPushNotificationToPlayers({
      playerIds,
      title,
      body: messageBody,
      data,
    });

    console.log('[API] Notification sent successfully:', result);
    return NextResponse.json({ 
      result,
      successCount: result.successCount,
      failureCount: result.failureCount
    });
  } catch (error) {
    console.error('[API] Notification API Error:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Extract Firebase error code if available
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = 'Failed to send notification';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('registration-token-not-registered')) {
        errorCode = 'TOKEN_NOT_REGISTERED';
      } else if (error.message.includes('messaging/invalid-argument')) {
        errorCode = 'INVALID_ARGUMENT';
      } else if (error.message.includes('messaging/invalid-recipient')) {
        errorCode = 'INVALID_RECIPIENT';
      } else if (error.message.includes('messaging/sender-id-mismatch')) {
        errorCode = 'SENDER_ID_MISMATCH';
      } else if (error.message.includes('messaging/quota-exceeded')) {
        errorCode = 'QUOTA_EXCEEDED';
      } else if (error.message.includes('Missing Firebase admin credentials')) {
        errorCode = 'MISSING_CREDENTIALS';
      } else if (error.message.includes('Invalid JSON')) {
        errorCode = 'INVALID_CREDENTIALS';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, errorCode },
      { status: 500 }
    );
  }
}
