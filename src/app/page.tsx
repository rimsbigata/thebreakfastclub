
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useClub } from '@/context/ClubContext';
import HomePage from '@/components/dashboard/HomePage'; // Re-exporting original dashboard content
import { SplashScreen } from '@/components/layout/SplashScreen';

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isSessionActive } = useClub();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/auth');
    } else if (!isUserLoading && user && userProfile && !isSessionActive && userProfile.role === 'player') {
      router.replace('/auth/session');
    }
  }, [user, isUserLoading, userProfile, isSessionActive, router]);

  if (isUserLoading || !user) {
    return <SplashScreen />;
  }

  // If we are here, we are authenticated. 
  // If player, they should have been redirected to session if not active.
  // If admin, they can see the dashboard immediately.
  
  return <HomePage />;
}
