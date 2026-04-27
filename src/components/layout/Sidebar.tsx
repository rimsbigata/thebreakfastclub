
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Trophy, Banknote, Settings } from 'lucide-react';
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
    <SidebarComponent collapsible="icon" className="border-r bg-card shadow-2xl">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-4 overflow-hidden">
          {!isCollapsed && (
            <>
              <img src="/assets/image/tbc_logo_loading.png" alt="Logo" className="h-10 w-10 object-contain shrink-0 animate-in zoom-in duration-300" />
              <div className="flex flex-col">
                <h1 className="font-black text-lg tracking-tighter text-primary truncate leading-none">THE CLUB</h1>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground">Est. 2025</p>
              </div>
            </>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarSeparator className="mx-4 opacity-50" />
      
      <SidebarContent className="px-3 py-6">
        <SidebarMenu className="gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    "transition-all font-black uppercase tracking-tight h-12 px-4 text-xs",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("h-5 w-5", isActive ? "animate-pulse" : "")} />
                    <span className={cn(isCollapsed && "hidden")}>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="p-4 flex items-center justify-center border-t bg-secondary/10">
        <SidebarTrigger className="h-10 w-10 text-primary hover:bg-primary hover:text-white transition-all rounded-full shadow-sm" />
      </SidebarFooter>
    </SidebarComponent>
  );
}
