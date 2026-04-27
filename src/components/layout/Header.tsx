
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Trophy, Banknote, Settings, Plus, Zap, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useClub } from '@/context/ClubContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateDeterministicMatch } from '@/lib/matchmaking';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Header() {
  const pathname = usePathname();
  const { courts, players, addCourt, startMatch } = useClub();
  const { toast } = useToast();
  
  const [newCourtName, setNewCourtName] = useState('');
  const [isAddCourtOpen, setIsAddCourtOpen] = useState(false);
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

  const handleAddCourtAction = () => {
    if (!newCourtName) return;
    addCourt(newCourtName);
    setNewCourtName('');
    setIsAddCourtOpen(false);
    toast({ title: "Court Added" });
  };

  const handleQuickMatch = () => {
    const availablePlayers = players.filter(p => p.status === 'available');
    const availableCourts = courts.filter(c => c.status === 'available');
    const result = generateDeterministicMatch(availablePlayers, availableCourts);
    
    if (result.matchCreated && result.teamA && result.teamB) {
      startMatch({ teamA: result.teamA, teamB: result.teamB, courtId: result.courtId });
      toast({ title: result.courtId ? "Match Created!" : "Match Queued!" });
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
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 shadow-sm z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/assets/image/tbc_logo_loading.png" alt="Logo" className="h-10 w-10 object-contain" />
          <div className="hidden sm:block">
            <h1 className="text-lg font-black uppercase tracking-tighter leading-none">Command Center</h1>
            <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-0.5">The Breakfast Club</p>
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
                    "h-10 w-10 transition-all",
                    isActive ? "shadow-lg shadow-primary/20 scale-110" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Manual Match Dialog */}
        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 font-black uppercase text-[10px] tracking-widest h-9 border-2 hover:bg-secondary">
              <Swords className="h-3.5 w-3.5" /> Manual Match
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Manual Match Selection</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Target Court</Label>
                <Select value={selectedCourtId} onValueChange={setSelectedCourtId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="queue">Send to Queue</SelectItem>
                    {courts.filter(c => c.status === 'available').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Select 4 Players ({selectedPlayerIds.length}/4)</Label>
                <ScrollArea className="h-64 border rounded-md p-2">
                  <div className="space-y-1">
                    {players.filter(p => p.status === 'available').map(player => (
                      <div key={player.id} className="flex items-center space-x-2 p-2 hover:bg-secondary rounded-md">
                        <Checkbox 
                          id={player.id}
                          checked={selectedPlayerIds.includes(player.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (selectedPlayerIds.length < 4) setSelectedPlayerIds([...selectedPlayerIds, player.id]);
                            } else {
                              setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== player.id));
                            }
                          }}
                        />
                        <label htmlFor={player.id} className="text-xs font-black cursor-pointer flex-1">
                          {player.name} <span className="text-[10px] text-muted-foreground ml-1">Lvl {player.skillLevel}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Button 
                className="w-full font-black uppercase h-12" 
                disabled={selectedPlayerIds.length !== 4}
                onClick={handleManualMatchSubmit}
              >
                Create Manual Match
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={handleQuickMatch} className="gap-2 bg-primary font-black uppercase text-[10px] tracking-widest h-9 px-4 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          <Zap className="h-3.5 w-3.5 fill-white" /> Quick Match
        </Button>

        <Dialog open={isAddCourtOpen} onOpenChange={setIsAddCourtOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 border-2 hover:bg-secondary">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Court</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Court Identifier</Label>
                <Input placeholder="e.g. 1, 2, Blue" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} />
              </div>
              <Button className="w-full font-bold" onClick={handleAddCourtAction}>Save Court</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
