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
    // If auth state is settled and no user exists, send to login
    if (!isUserLoading && !user) {
      router.replace('/auth');
      return;
    }

    // If auth is settled, user exists, but no profile or no session (for players)
    if (!isUserLoading && user) {
      if (userProfile && !isSessionActive && userProfile.role === 'player') {
        router.replace('/auth/session');
      }
    }
  }, [user, isUserLoading, userProfile, isSessionActive, router]);

  if (isUserLoading || !user) {
    return <SplashScreen />;
  }

  // If user exists but profile is still fetching (handled by ClubProvider splash)
  if (!userProfile) {
    return <SplashScreen />;
  }

  return <HomePage />;
}
