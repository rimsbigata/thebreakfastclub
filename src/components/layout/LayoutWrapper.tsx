'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PlayerMatchAlerts } from '@/components/player/PlayerMatchAlerts';
import { PushNotificationInitializer } from '@/components/firebase/PushNotificationInitializer';
import { useUser } from '@/firebase';
import { useClub } from '@/context/ClubContext';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { isProfileLoading, isSessionActive, userProfile } = useClub();
  
  // Routes where global layout elements should be hidden
  const isAuthPage = pathname?.startsWith('/auth');

  // Logic to hide header during transition states or when on auth pages
  const showNav = !isAuthPage && !isUserLoading && user && !isProfileLoading;
  
  // Players shouldn't see the nav if they haven't joined a session yet
  const shouldHideNavForSession = userProfile?.role === 'player' && !isSessionActive;

  return (
    <div className="flex flex-col min-h-screen w-full overflow-hidden">
      {showNav && !shouldHideNavForSession && <Header />}
      {showNav && !shouldHideNavForSession && <PlayerMatchAlerts />}
      {showNav && !shouldHideNavForSession && <PushNotificationInitializer />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
