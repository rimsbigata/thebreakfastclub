'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/firebase';
import { useClub } from '@/context/ClubContext';
import { SplashScreen } from '@/components/layout/SplashScreen';

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const { userProfile, isSessionActive, isProfileLoading, role, isAdminRoleLoading, activeSession, loadSessionById } = useClub();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [hasSplashDelayElapsed, setHasSplashDelayElapsed] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

  useEffect(() => {
    const splashDelay = window.setTimeout(() => {
      setHasSplashDelayElapsed(true);
    }, 3000);

    return () => window.clearTimeout(splashDelay);
  }, []);

  useEffect(() => {
    if (!hasSplashDelayElapsed || isLoadingSession) {
      return;
    }

    // If auth state is determined and no user exists, go to Login
    if (!isUserLoading && !user) {
      router.replace('/auth');
      return;
    }

    // Load session from URL if not already loaded or if ID doesn't match
    if (!isUserLoading && user && !isProfileLoading && !isAdminRoleLoading) {
      if (!activeSession || activeSession.id !== sessionId) {
        setIsLoadingSession(true);
        loadSessionById(sessionId)
          .catch((error) => {
            setSessionLoadError(error.message);
            setTimeout(() => {
              router.replace('/auth/session');
            }, 2000);
          })
          .finally(() => {
            setIsLoadingSession(false);
          });
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, activeSession, sessionId, isAdminRoleLoading, router, hasSplashDelayElapsed, loadSessionById, isLoadingSession]);

  // Priority 1: Show Splash only on initial load or when loading a new session
  // Don't show splash when navigating between tabs of the same session
  if ((!hasSplashDelayElapsed && !activeSession) || isLoadingSession) {
    return <SplashScreen />;
  }

  // Priority 2: If no user, show splash while redirecting to /auth
  if (!user) {
    return <SplashScreen />;
  }

  // Priority 3: If session load error, show splash while redirecting to session gate
  if (sessionLoadError) {
    return <SplashScreen />;
  }

  // Priority 4: If session ID doesn't match, redirect to the correct session
  if (activeSession && activeSession.id !== sessionId) {
    router.replace(`/session/${activeSession.id}`);
    return <SplashScreen />;
  }

  return <>{children}</>;
}
