
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useClub } from '@/context/ClubContext';
import HomePage from '@/components/dashboard/HomePage';
import { SplashScreen } from '@/components/layout/SplashScreen';

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isSessionActive } = useClub();
  const router = useRouter();

  useEffect(() => {
    // If auth state is settled and no user exists, send to login immediately
    if (!isUserLoading && !user) {
      router.replace('/auth');
      return;
    }

    // If auth is settled, user exists, but no profile or no session (for players)
    if (!isUserLoading && user) {
      // Wait for profile to load before making session-based redirect decisions
      if (userProfile && !isSessionActive && userProfile.role === 'player') {
        router.replace('/auth/session');
      }
    }
  }, [user, isUserLoading, userProfile, isSessionActive, router]);

  // Show splash only while explicitly determining auth state
  if (isUserLoading) {
    return <SplashScreen />;
  }

  // If we know user is null, we are redirecting in useEffect. Return null to keep UI clear.
  if (!user) {
    return null;
  }

  // If user exists but profile is still fetching (handled by ClubProvider)
  if (!userProfile) {
    return <SplashScreen />;
  }

  return <HomePage />;
}
