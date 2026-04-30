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

async function clearSession(sessionId: string, deleteSessionDocument: boolean) {
  const firestore = getFirebaseAdminFirestore();
  const deletedByCollection: Record<string, number> = {};

  for (const subcollection of SESSION_SUBCOLLECTIONS) {
    deletedByCollection[subcollection] = await deleteCollection(`sessions/${sessionId}/${subcollection}`);
  }

  if (deleteSessionDocument) {
    await firestore.doc(`sessions/${sessionId}`).delete();
  }

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

    const { sessionId, scope } = await request.json();
    const firestore = getFirebaseAdminFirestore();

    if (scope === 'allSessions') {
      const sessions = await firestore.collection('sessions').get();
      const results = [];

      for (const session of sessions.docs) {
        results.push(await clearSession(session.id, true));
      }

      return NextResponse.json({
        ok: true,
        adminUid,
        scope,
        sessionsCleared: results.length,
        deletedTotal: results.reduce((sum, result) => sum + result.deletedTotal, 0),
        results,
      });
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const sessionRef = firestore.doc(`sessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.get();

    if (!sessionSnapshot.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const result = await clearSession(sessionId, false);

    return NextResponse.json({
      ok: true,
      adminUid,
      sessionId,
      deletedByCollection: result.deletedByCollection,
      deletedTotal: result.deletedTotal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear club data.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
