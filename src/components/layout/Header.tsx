'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Trophy, Banknote, Settings, Plus, Zap, Swords, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useClub } from '@/context/ClubContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateDeterministicMatch } from '@/lib/matchmaking';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getSkillColor, SKILL_LEVELS_SHORT } from '@/lib/types';
import Image from 'next/image';

export function Header() {
  const pathname = usePathname();
  const { courts, players, addCourt, startMatch, clubLogo } = useClub();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('queue');

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Players', href: '/players', icon: Users },
    { label: 'Rankings', href: '/rankings', icon: Trophy },
    { label: 'Fees', href: '/fees', icon: Banknote },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const logoSrc = clubLogo || "/assets/image/tbc_logo_loading.png";

  const handleQuickMatch = () => {
    const availablePlayers = players.filter(p => p.status === 'available');
    const availableCourts = courts.filter(c => c.status === 'available');
    const result = generateDeterministicMatch(availablePlayers, availableCourts);
    
    if (result.matchCreated && result.teamA && result.teamB) {
      startMatch({ teamA: result.teamA, teamB: result.teamB, courtId: result.courtId });
      toast({ title: result.courtId ? "Match Started!" : "Match Queued!" });
    } else {
      toast({ title: "Matchmaking Error", description: result.error || "Need 4 players.", variant: "destructive" });
    }
  };

  const handleManualMatchSubmit = () => {
    if (selectedPlayerIds.length !== 4) return;
    
    startMatch({
      teamA: [selectedPlayerIds[0], selectedPlayerIds[1]],
      teamB: [selectedPlayerIds[2], selectedPlayerIds[3]],
      courtId: selectedCourtId === 'queue' ? undefined : selectedCourtId
    });
    
    setIsManualOpen(false);
    setSelectedPlayerIds([]);
    toast({ title: "Manual Match Created" });
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 shadow-md z-50 transition-colors">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm bg-white">
            <Image 
              src={logoSrc} 
              alt="TheBreakfastClub Logo" 
              fill 
              className="object-cover"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-black uppercase tracking-tighter leading-none text-primary">Command Center</h1>
            <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.25em] mt-1">The Breakfast Club</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 ml-6 border-l pl-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "h-11 w-11 transition-all",
                    isActive ? "shadow-md shadow-primary/20 scale-105" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                  title={item.label}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 text-muted-foreground hover:text-primary transition-colors"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 border-2 hover:bg-secondary px-4">
              <Swords className="h-4 w-4" /> Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="text-lg font-black uppercase">Manual Match Selection</DialogTitle></DialogHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Target Court</Label>
                <Select value={selectedCourtId} onValueChange={setSelectedCourtId}>
                  <SelectTrigger className="h-12 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="queue" className="font-bold">Send to Queue</SelectItem>
                    {courts.filter(c => c.status === 'available').map(c => (
                      <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Select 4 Players ({selectedPlayerIds.length}/4)</Label>
                <ScrollArea className="h-80 border-2 rounded-xl p-3">
                  <div className="space-y-2">
                    {players.filter(p => p.status === 'available').map(player => (
                      <div key={player.id} className="flex items-center space-x-3 p-3 hover:bg-secondary rounded-xl transition-colors">
                        <Checkbox 
                          id={player.id}
                          checked={selectedPlayerIds.includes(player.id)}
                          className="h-6 w-6"
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (selectedPlayerIds.length < 4) setSelectedPlayerIds([...selectedPlayerIds, player.id]);
                            } else {
                              setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== player.id));
                            }
                          }}
                        />
                        <label htmlFor={player.id} className="text-sm font-black cursor-pointer flex-1 flex items-center justify-between">
                          <span>{player.name}</span>
                          <Badge variant="outline" className={cn("text-[10px] font-black uppercase px-2 h-5", getSkillColor(player.skillLevel))}>
                            {SKILL_LEVELS_SHORT[player.skillLevel]}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Button 
                className="w-full font-black uppercase h-16 text-base shadow-xl shadow-primary/20" 
                disabled={selectedPlayerIds.length !== 4}
                onClick={handleManualMatchSubmit}
              >
                Create Manual Match
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={handleQuickMatch} className="gap-2 bg-primary font-black uppercase text-[10px] tracking-widest h-10 px-4 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          <Zap className="h-4 w-4 fill-white" /> Quick
        </Button>

        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 border-2 hover:bg-secondary"
          onClick={() => {
            addCourt();
            toast({ title: "Court Added" });
          }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}