
import type { Metadata, Viewport } from 'next';
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
  // Explicitly link to your manifest file in the public folder
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    // Mandatory for iOS "Add to Home Screen" support
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TBC Badminton',
  },
};

export const viewport: Viewport = {
  themeColor: '#f59e0b',
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
