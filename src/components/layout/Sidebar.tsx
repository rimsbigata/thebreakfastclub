"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Trophy, Banknote, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import tbcLogo from '@/assets/images/tbclogo.jpg';

export function Sidebar() {
  const pathname = usePathname();

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
        <div className="relative h-10 w-10 rounded-xl overflow-hidden border-2 border-primary bg-background">
          <Image 
            src={tbcLogo} 
            alt="The Breakfast Club Logo" 
            fill 
            className="object-cover"
          />
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
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest">
          TBC App Edition v1.0
        </p>
      </div>
    </aside>
  );
}
