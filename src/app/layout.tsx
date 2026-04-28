
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ClubProvider } from '@/context/ClubContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Header } from '@/components/layout/Header';

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
        <FirebaseClientProvider>
          <ThemeProvider>
            <ClubProvider>
              <div className="flex flex-col min-h-screen w-full overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto">
                  {children}
                </main>
              </div>
              <Toaster />
            </ClubProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
