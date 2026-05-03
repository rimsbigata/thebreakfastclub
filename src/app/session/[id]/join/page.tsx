'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useClub } from '@/context/ClubContext';
import { useUser, useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function JoinSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { joinSession, isRestoringSession } = useClub();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleJoin = async () => {
      // If not authenticated, redirect to auth with redirect back to this page
      if (!user) {
        const redirectUrl = `/session/${resolvedParams.id}/join`;
        // Store redirect URL in sessionStorage to preserve it through auth flow
        sessionStorage.setItem('redirectAfterAuth', redirectUrl);
        router.push(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
        return;
      }

      if (!firestore) {
        setError('Firebase not initialized');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Query Firestore to find session by code
        const sessionsQuery = query(
          collection(firestore, 'sessions'),
          where('code', '==', resolvedParams.id.toUpperCase()),
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(sessionsQuery);

        if (querySnapshot.empty) {
          setError('Session not found or not active');
          setLoading(false);
          return;
        }

        const sessionDoc = querySnapshot.docs[0];
        const sessionId = sessionDoc.id;

        // Join the session using the session code
        await joinSession(resolvedParams.id, true, false);

        setLoading(false);

        // Wait a moment for context to update, then redirect to session
        setTimeout(() => {
          router.push(`/session/${sessionId}`);
        }, 100);
      } catch (err: any) {
        setError(err.message || 'Failed to join session');
        setLoading(false);
      }
    };

    // Only proceed if not restoring session
    if (!isRestoringSession) {
      handleJoin();
    }
  }, [user, resolvedParams.id, router, firestore, joinSession, isRestoringSession]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-lg font-black uppercase text-destructive mb-4">Error</p>
          <p className="text-sm font-medium mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/session')}
            className="text-sm font-black uppercase text-primary hover:underline"
          >
            Go to Session Gate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <p className="text-lg font-black uppercase">Joining Session...</p>
      </div>
    </div>
  );
}
