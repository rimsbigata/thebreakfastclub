'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PlayerMatchAlerts } from '@/components/player/PlayerMatchAlerts';
import { useUser } from '@/firebase';
import { useClub } from '@/context/ClubContext';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const { isProfileLoading, isSessionActive, role } = useClub();

  // Routes where global layout elements should be hidden
  const isAuthPage = pathname?.startsWith('/auth') && pathname !== '/auth/session';

  // Logic to hide header during transition states or when on auth pages
  const showNav = !isAuthPage && !isUserLoading && user && !isProfileLoading;

  // Hide nav for non-admin users when there's no active session
  // Admins can access global Rankings, Players, Fees tabs even without active session
  // /auth/session page should always show nav for players to navigate
  // Global tabs (rankings, players, fees, match-history, player-stats) should show nav even without active session
  const isGlobalTab = pathname?.startsWith('/rankings') || pathname?.startsWith('/players') || pathname?.startsWith('/fees') || pathname?.startsWith('/match-history') || pathname?.startsWith('/player-stats');
  const shouldHideNavForSession = !isSessionActive && role !== 'admin' && pathname !== '/auth/session' && !isGlobalTab;

  return (
    <div className="flex flex-col min-h-screen w-full overflow-hidden">
      {showNav && !shouldHideNavForSession && <Header />}
      {showNav && !shouldHideNavForSession && <PlayerMatchAlerts />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
