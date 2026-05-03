'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClub } from '@/context/ClubContext';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function JoinSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { joinSession, loadSessionById, activeSession, isRestoringSession } = useClub();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleJoin = async () => {
      // If not authenticated, redirect to auth with redirect back to this page
      if (!user) {
        const redirectUrl = encodeURIComponent(`/session/${params.id}/join`);
        router.push(`/auth?redirect=${redirectUrl}`);
        return;
      }

      try {
        setLoading(true);
        // Load the session by ID to get the session code
        await loadSessionById(params.id);
        
        // Join the session using the loaded session's code
        if (activeSession) {
          await joinSession(activeSession.code, true, false);
          // Redirect to the session page
          router.push(`/session/${params.id}`);
        } else {
          setError('Session not found or inactive');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to join session');
      } finally {
        setLoading(false);
      }
    };

    // Only proceed if not restoring session
    if (!isRestoringSession) {
      handleJoin();
    }
  }, [user, params.id, router, loadSessionById, joinSession, activeSession, isRestoringSession]);

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
