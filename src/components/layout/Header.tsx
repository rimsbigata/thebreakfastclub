'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Trophy, Banknote, Settings, Plus, Zap, Swords, Sun, Moon, LogOut, Loader2, Target, KeyRound, History, Menu, X, Award, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useClub } from '@/context/ClubContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getSkillColor, SKILL_LEVELS_SHORT } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { generateDeterministicMatch } from '@/lib/matchmaking';
import Image from 'next/image';
import tbcLogo from '@/assets/images/tbc_logo_loading.png';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { auth } = useFirebase();
  const {
    courts, players, addCourt, startMatch, role, activeSession
  } = useClub();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const isInSession = pathname?.startsWith('/session/');

  const [isManualOpen, setIsManualOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('queue');
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = role === 'admin';
  const isQueueMaster = role === 'queueMaster';
  const isStaff = isAdmin || isQueueMaster;
  const isPlayer = role === 'player';
  const skillLevelOf = (player: { skillLevel?: number }) => player.skillLevel || 3;

  const navItems = [];

  // Session tab only when not inside a session route
  if (!isInSession) {
    navItems.push({ label: 'Session', href: '/auth/session', icon: KeyRound });
  }

  // Dashboard tab only when inside a session route
  if (isInSession && activeSession) {
    navItems.push({ label: 'Dashboard', href: `/session/${activeSession.id}`, icon: LayoutDashboard });
  }

  // Rankings, Fees, Players, and Match History for all roles
  navItems.push({ label: 'Rankings', href: activeSession ? `/session/${activeSession.id}/rankings` : '/rankings', icon: Trophy });
  navItems.push({ label: 'Fees', href: activeSession ? `/session/${activeSession.id}/fees` : '/fees', icon: Banknote });
  navItems.push({ label: 'Players', href: activeSession ? `/session/${activeSession.id}/players` : '/players', icon: Users });
  navItems.push({ label: 'Match History', href: activeSession ? `/session/${activeSession.id}/match-history` : '/match-history', icon: History });
  
  // Profile access
  navItems.push({ label: 'My Profile', href: '/profile', icon: UserCircle });
  
  // Player Stats only for players
  if (isPlayer) {
    navItems.push({ label: 'Performance', href: '/player-stats', icon: Award });
  }
  
  if (isAdmin) {
    navItems.push({ label: 'Settings', href: activeSession ? `/session/${activeSession.id}/settings` : '/settings', icon: Settings });
  }

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/auth');
    }
  };

  const handleManualMatchSubmit = async () => {
    if (selectedPlayerIds.length !== 4) return;

    await startMatch({
      teamA: [selectedPlayerIds[0], selectedPlayerIds[1]],
      teamB: [selectedPlayerIds[2], selectedPlayerIds[3]],
      courtId: selectedCourtId === 'queue' ? undefined : selectedCourtId
    });

    setIsManualOpen(false);
    setSelectedPlayerIds([]);
    toast({ title: "Manual Match Created" });
  };

  const handleQuickMatch = async () => {
    const availablePlayers = players.filter(p => p.status === 'available');
    const availableCourts = courts.filter(c => c.status === 'available');

    if (availablePlayers.length < 4) {
      toast({
        title: "Not enough players",
        description: "Need at least 4 players on the bench.",
        variant: "destructive"
      });
      return;
    }

    setLoadingMatch(true);
    try {
      const result = generateDeterministicMatch(availablePlayers, availableCourts);

      if (result.matchCreated && result.teamA && result.teamB) {
        await startMatch({
          teamA: result.teamA,
          teamB: result.teamB,
          courtId: result.courtId,
        });
        toast({ title: "Match Started!", description: result.analysis });
      } else {
        toast({
          title: "No optimal match",
          description: result.error || "Logic engine couldn't find a balance."
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Matchmaking Error",
        description: "Failed to generate match logic.",
        variant: "destructive"
      });
    } finally {
      setLoadingMatch(false);
    }
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-md z-50 transition-colors">
      <div className="flex items-center gap-4 lg:gap-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="relative h-10 w-10">
            <Image src={tbcLogo} alt="TBC Logo" fill sizes="40px" className="object-contain" />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 ml-6 border-l pl-6">
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

        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-10 w-10 text-muted-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-card border-b lg:hidden p-4 space-y-2 z-40">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-12 transition-all",
                    isActive ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 lg:gap-3">
        {activeSession && (
          <Badge variant="outline" className="hidden lg:flex gap-2 font-black uppercase text-[10px] tracking-widest px-3 h-8 border-2 bg-secondary/50">
            Session: <span className="text-primary">{activeSession.code}</span>
          </Badge>
        )}
        {activeSession?.isDoubleStar && (
          <Badge variant="outline" className="hidden lg:flex gap-1.5 font-black uppercase text-[10px] tracking-widest px-3 h-8 border-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500">
            <Target className="h-3 w-3 fill-yellow-500" /> Double Star
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground hover:text-primary transition-colors"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {isStaff && activeSession && (
          <>
            <Button
              onClick={handleQuickMatch}
              disabled={loadingMatch}
              variant="default"
              className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 shadow-md shadow-primary/10 px-4 hidden md:flex"
            >
              {loadingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-primary-foreground" />}
              Quick Match
            </Button>

            <Button
              onClick={handleQuickMatch}
              disabled={loadingMatch}
              variant="default"
              size="icon"
              className="h-10 w-10 shadow-md shadow-primary/10 md:hidden"
              title="Quick Match"
            >
              {loadingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-primary-foreground" />}
            </Button>

            <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 border-2 hover:bg-secondary px-4 hidden md:flex">
                  <Swords className="h-4 w-4" /> Match
                </Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 border-2 hover:bg-secondary md:hidden" title="Manual Match">
                  <Swords className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black uppercase">Manual Match Selection</DialogTitle>
                  <DialogDescription className="sr-only">
                    Manually select players and assign them to a court
                  </DialogDescription>
                </DialogHeader>
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
                              <Badge variant="outline" className={cn("text-[10px] font-black uppercase px-2 h-5", getSkillColor(skillLevelOf(player)))}>
                                {SKILL_LEVELS_SHORT[skillLevelOf(player)]}
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

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-2 hover:bg-secondary"
              onClick={async () => {
                try {
                  await addCourt();
                  toast({ title: "Court Added" });
                } catch (error) {
                  toast({
                    title: "Could not add court",
                    description: error instanceof Error ? error.message : "Database write failed.",
                    variant: "destructive"
                  });
                }
              }}
              title="Add Court"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </>
        )}

        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="hidden lg:flex text-muted-foreground hover:text-destructive">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}