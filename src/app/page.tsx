
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useClub } from '@/context/ClubContext';
import HomePage from '@/components/dashboard/HomePage';
import { SplashScreen } from '@/components/layout/SplashScreen';

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isSessionActive, isProfileLoading, role, isAdminRoleLoading, activeSession } = useClub();
  const router = useRouter();
  const [hasSplashDelayElapsed, setHasSplashDelayElapsed] = useState(false);

  useEffect(() => {
    const splashDelay = window.setTimeout(() => {
      setHasSplashDelayElapsed(true);
    }, 3000);

    return () => window.clearTimeout(splashDelay);
  }, []);

  useEffect(() => {
    if (!hasSplashDelayElapsed) {
      return;
    }

    // 1. If auth state is determined and no user exists, go to Login
    if (!isUserLoading && !user) {
      router.replace('/auth');
      return;
    }

    // 2. If user exists and critical profile/role data is loaded
    if (!isUserLoading && user && !isProfileLoading && !isAdminRoleLoading) {
      // Access Control Logic
      // Admins are never redirected to session gate - they can see the dashboard anytime.
      // Players without an active session are forced to the session gate.
      if (role === 'player' && !isSessionActive) {
        router.replace('/auth/session');
      }
      // If session is active, redirect to session page
      if (isSessionActive && activeSession) {
        router.replace(`/session/${activeSession.id}`);
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, isSessionActive, activeSession, role, isAdminRoleLoading, router, hasSplashDelayElapsed]);

  // Priority 1: Show Splash while determining basic state
  if (!hasSplashDelayElapsed || isUserLoading || isProfileLoading || isAdminRoleLoading) {
    return <SplashScreen />;
  }

  // Priority 2: If no user, we are redirecting to /auth
  if (!user) {
    return null;
  }

  // Priority 3: Show homepage for admins or players with active session
  if (role === 'admin' || isSessionActive) {
    return <HomePage />;
  }

  // Priority 4: Players without active session will be redirected by useEffect
  return null;
}
