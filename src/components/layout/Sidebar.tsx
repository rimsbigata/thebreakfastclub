
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Trophy, Banknote, Settings, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClub } from '@/context/ClubContext';
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarFooter,
  SidebarSeparator
} from '@/components/ui/sidebar';

export function Sidebar() {
  const pathname = usePathname();
  const { clubLogo } = useClub();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Players', href: '/players', icon: Users },
    { label: 'Rankings', href: '/rankings', icon: Trophy },
    { label: 'Fees', href: '/fees', icon: Banknote },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <SidebarComponent collapsible="icon" className="border-r bg-card">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative h-8 w-8 shrink-0 rounded-lg overflow-hidden border-2 border-primary bg-primary/10 flex items-center justify-center">
            {clubLogo ? (
              <img 
                src={clubLogo} 
                alt="Club Logo" 
                className="object-cover h-full w-full"
              />
            ) : (
              <div className="relative h-full w-full flex items-center justify-center">
                 <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="object-cover h-full w-full absolute inset-0"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                 />
                 <Activity className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <h1 className="font-black text-base tracking-tighter text-primary truncate animate-in fade-in slide-in-from-left-2 duration-300">
              TheBreakfastClub
            </h1>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarSeparator />
      
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    "transition-all font-medium h-10 px-3",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("h-5 w-5", isActive ? "animate-pulse" : "")} />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarSeparator />

      <SidebarFooter className="p-2 flex items-center justify-center">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all" />
      </SidebarFooter>
    </SidebarComponent>
  );
}
