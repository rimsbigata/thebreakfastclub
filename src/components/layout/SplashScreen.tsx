'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import clubLogo from '@/assets/images/tbc_logo_loading.png';

interface SplashScreenProps {
  logo?: string | null;
}

export function SplashScreen({ logo }: SplashScreenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary text-primary-foreground">
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-black tracking-tighter leading-none mb-1">The Breakfast Club</h1>
        </div>
      </div>
    );
  }

  const displayLogo = logo || clubLogo.src;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary text-primary-foreground animate-in fade-in duration-300">
      <div className="relative mb-8 flex flex-col items-center">
        <div className="relative h-32 w-32 rounded-2xl border-4 border-white/30 p-1 bg-white/10 backdrop-blur-sm overflow-hidden shadow-2xl">
          {displayLogo ? (
            <Image
              src={displayLogo}
              alt="Club Logo"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-white/20">
              <span className="text-2xl font-black">BC</span>
            </div>
          )}
        </div>
        <div className="absolute -bottom-2 bg-background text-primary px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
          EST. 2025
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-white tracking-tighter leading-none mb-1">
            The Breakfast Club
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">
            Badminton Club
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Loader2 className="h-5 w-5 animate-spin opacity-80" />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
            Initializing System...
          </span>
        </div>
      </div>

      <div className="absolute bottom-8 text-[10px] font-bold opacity-40 uppercase tracking-widest">
        Built with ❤️ by Rimuel
      </div>
    </div>
  );
}