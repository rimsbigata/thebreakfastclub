
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Trophy, Banknote, Settings, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useClub } from '@/context/ClubContext';

export function Sidebar() {
  const pathname = usePathname();
  const { clubLogo } = useClub();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Players', href: '/players', icon: Users },
    { label: 'Rankings', href: '/rankings', icon: Trophy },
    { label: 'Fees', href: '/fees', icon: Banknote },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="relative h-10 w-10 rounded-xl overflow-hidden border-2 border-primary bg-primary/10 flex items-center justify-center">
          {clubLogo ? (
            <Image 
              src={clubLogo} 
              alt="Club Logo" 
              fill 
              className="object-cover"
            />
          ) : (
            <Activity className="h-6 w-6 text-primary" />
          )}
        </div>
        <h1 className="font-black text-lg tracking-tighter text-primary">TheBreakfastClub</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium active:scale-95",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "animate-pulse" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest opacity-50">
          TBC Cloud Edition v2.0
        </p>
      </div>
    </aside>
  );
}
