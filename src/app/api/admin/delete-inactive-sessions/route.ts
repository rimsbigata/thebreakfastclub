import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const SESSION_SUBCOLLECTIONS = [
  'players',
  'courts',
  'matches',
  'fees',
  'paymentMethods',
  'settings',
] as const;

async function verifyAdmin(request: NextRequest) {
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    return null;
  }

  const auth = getFirebaseAdminAuth();
  const firestore = getFirebaseAdminFirestore();
  const decodedToken = await auth.verifyIdToken(token);
  const adminRole = await firestore.doc(`admin_roles/${decodedToken.uid}`).get();

  return adminRole.exists ? decodedToken.uid : null;
}

async function deleteCollection(path: string) {
  const firestore = getFirebaseAdminFirestore();
  let deletedCount = 0;

  while (true) {
    const snapshot = await firestore.collection(path).limit(450).get();

    if (snapshot.empty) {
      return deletedCount;
    }

    const batch = firestore.batch();
    snapshot.docs.forEach(document => batch.delete(document.ref));
    await batch.commit();
    deletedCount += snapshot.size;
  }
}

async function deleteSession(sessionId: string) {
  const firestore = getFirebaseAdminFirestore();
  const deletedByCollection: Record<string, number> = {};

  for (const subcollection of SESSION_SUBCOLLECTIONS) {
    deletedByCollection[subcollection] = await deleteCollection(`sessions/${sessionId}/${subcollection}`);
  }

  await firestore.doc(`sessions/${sessionId}`).delete();

  return {
    sessionId,
    deletedByCollection,
    deletedTotal: Object.values(deletedByCollection).reduce((sum, count) => sum + count, 0),
  };
}

export async function POST(request: NextRequest) {
  try {
    const adminUid = await verifyAdmin(request);

    if (!adminUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const firestore = getFirebaseAdminFirestore();

    // Query for inactive sessions
    const inactiveSessions = await firestore
      .collection('sessions')
      .where('status', '==', 'inactive')
      .get();

    if (inactiveSessions.empty) {
      return NextResponse.json({
        ok: true,
        adminUid,
        message: 'No inactive sessions found',
        sessionsDeleted: 0,
        deletedTotal: 0,
      });
    }

    const results = [];

    for (const session of inactiveSessions.docs) {
      const result = await deleteSession(session.id);
      results.push(result);
    }

    return NextResponse.json({
      ok: true,
      adminUid,
      sessionsDeleted: results.length,
      deletedTotal: results.reduce((sum, result) => sum + result.deletedTotal, 0),
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete inactive sessions.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
