
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useClub } from '@/context/ClubContext';
import HomePage from '@/components/dashboard/HomePage';
import { SplashScreen } from '@/components/layout/SplashScreen';

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isSessionActive, isProfileLoading } = useClub();
  const router = useRouter();

  useEffect(() => {
    // If auth state is determined and no user exists, redirect to auth immediately
    if (!isUserLoading && !user) {
      router.replace('/auth');
      return;
    }

    // If auth is settled and user exists, check profile and session
    if (!isUserLoading && user) {
      // If profile is also settled
      if (!isProfileLoading) {
        // If profile loaded successfully but no session, and user is a player
        if (userProfile && !isSessionActive && userProfile.role === 'player') {
          router.replace('/auth/session');
        }
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, isSessionActive, router]);

  // Show splash only while determining initial auth state or profile state for an existing user
  if (isUserLoading || (user && isProfileLoading)) {
    return <SplashScreen />;
  }

  // If we're waiting for redirect to auth
  if (!user) {
    return null;
  }

  // If we're waiting for redirect to session (for players)
  if (userProfile?.role === 'player' && !isSessionActive) {
    return null;
  }

  return <HomePage />;
}
