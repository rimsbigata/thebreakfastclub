
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ClubProvider } from '@/context/ClubContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'TheBreakfastClub | Badminton Club',
  description: 'Badminton court queuing and matching for TheBreakfastClub.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
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
        <FirebaseClientProvider>
          <ThemeProvider>
            <ClubProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
              <Toaster />
            </ClubProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
