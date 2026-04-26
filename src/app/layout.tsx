import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { BottomNav } from '@/components/layout/BottomNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { ClubProvider } from '@/context/ClubContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'TheBreakfastClub | Badminton Club',
  description: 'Badminton court queuing and matching for TheBreakfastClub.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <ThemeProvider>
          <ClubProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 pb-20 md:pb-0">
                {children}
              </main>
            </div>
            <BottomNav />
            <Toaster />
          </ClubProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
