'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PlayerMatchAlerts } from '@/components/player/PlayerMatchAlerts';
import { PushNotificationInitializer } from '@/components/firebase/PushNotificationInitializer';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes where global layout elements should be hidden
  const isAuthPage = pathname?.startsWith('/auth');

  return (
    <div className="flex flex-col min-h-screen w-full overflow-hidden">
      {!isAuthPage && <Header />}
      {!isAuthPage && <PlayerMatchAlerts />}
      {!isAuthPage && <PushNotificationInitializer />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
