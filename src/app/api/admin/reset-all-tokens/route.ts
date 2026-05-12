import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const auth = getFirebaseAdminAuth();
    const firestore = getFirebaseAdminFirestore();
    
    // Verify the request is from an authenticated admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user is admin (you may need to adjust this based on your auth logic)
    // For now, we'll just verify they're authenticated
    if (!decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all user profiles
    const userProfilesSnapshot = await firestore.collection('userProfiles').get();
    
    // Clear fcmToken for all users
    const batch = firestore.batch();
    userProfilesSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { fcmToken: null });
    });
    
    await batch.commit();
    
    console.log(`Cleared FCM tokens for ${userProfilesSnapshot.size} users`);
    
    return NextResponse.json({ 
      message: 'All notification tokens cleared',
      count: userProfilesSnapshot.size 
    });
  } catch (error) {
    console.error('Error resetting all tokens:', error);
    return NextResponse.json(
      { error: 'Failed to reset tokens' },
      { status: 500 }
    );
  }
}
