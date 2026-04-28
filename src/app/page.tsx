
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useClub } from '@/context/ClubContext';
import HomePage from '@/components/dashboard/HomePage';
import { SplashScreen } from '@/components/layout/SplashScreen';

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isSessionActive, isProfileLoading, role, isAdminRoleLoading } = useClub();
  const router = useRouter();

  useEffect(() => {
    // 1. If auth state is determined and no user exists, go to Login
    if (!isUserLoading && !user) {
      router.replace('/auth');
      return;
    }

    // 2. If user exists and critical profile/role data is loaded
    if (!isUserLoading && user && !isProfileLoading && !isAdminRoleLoading) {
      // If no profile found in DB (edge case), wait for it or redirect
      if (!userProfile) return;

      // 3. Access Control Logic
      // Admins are never redirected to session gate - they can see the dashboard anytime.
      // Players without an active session are forced to the session gate.
      if (role === 'player' && !isSessionActive) {
        router.replace('/auth/session');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, isSessionActive, role, isAdminRoleLoading, router]);

  // Priority 1: Show Splash while determining basic state
  if (isUserLoading || isProfileLoading || isAdminRoleLoading) {
    return <SplashScreen />;
  }

  // Priority 2: If no user, we are redirecting to /auth
  if (!user) {
    return null;
  }

  // Priority 3: If Player and no session, we are redirecting to /auth/session
  if (role === 'player' && !isSessionActive) {
    return null;
  }

  // Final: Render Dashboard (Admin or Player with Session)
  return <HomePage />;
}
