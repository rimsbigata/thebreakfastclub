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
    // 1. If auth state is determined and no user exists, go to Login
    if (!isUserLoading && !user) {
      router.replace('/auth');
      return;
    }

    // 2. If user exists and profile is loaded
    if (!isUserLoading && user && !isProfileLoading) {
      // If no profile found in DB (edge case), could redirect to a setup page, 
      // but for now we wait or show error.
      if (!userProfile) return;

      // 3. If Player and no active session, go to Session Gate
      if (userProfile.role === 'player' && !isSessionActive) {
        router.replace('/auth/session');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, isSessionActive, router]);

  // Priority 1: Show Splash while determining Auth state
  if (isUserLoading) {
    return <SplashScreen />;
  }

  // Priority 2: If no user, we are redirecting to /auth (return null to hide content)
  if (!user) {
    return null;
  }

  // Priority 3: Show Splash while loading user profile data
  if (isProfileLoading) {
    return <SplashScreen />;
  }

  // Priority 4: If Player and no session, we are redirecting to /auth/session
  if (userProfile?.role === 'player' && !isSessionActive) {
    return null;
  }

  // Final: Render Dashboard (Admin or Player with Session)
  return <HomePage />;
}
