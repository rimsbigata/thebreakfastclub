"use client";

import { useState, useMemo, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, User, TrendingUp, Users, Trash2, Pencil, Search } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Cell } from 'recharts';
import { SKILL_LEVELS_FULL, SKILL_LEVELS_SHORT, getSkillColor, Player } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

function StatusBadge({ status }: { status: string }) {
  const colors = {
    available: "bg-green-500 text-white",
    playing: "bg-primary text-white animate-pulse",
    resting: "bg-muted text-muted-foreground"
  };
  return (
    <Badge className={cn("text-[10px] font-black uppercase tracking-widest h-5 px-2", colors[status as keyof typeof colors])}>
      {status}
    </Badge>
  );
}

export default function PlayersPage() {
  const { players, addPlayer, updatePlayer, deletePlayer } = useClub();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState('3');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editSkill, setEditSkill] = useState('3');

  const filteredPlayers = useMemo(() => {
    return players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [players, searchQuery]);

  const skillDistribution = useMemo(() => {
    return Object.keys(SKILL_LEVELS_SHORT).map(level => ({
      level: `L${level}`,
      count: players.filter(p => p.skillLevel === parseInt(level)).length,
    }));
  }, [players]);

  const handleAddPlayerAction = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const isDuplicate = players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      toast({
        title: "Duplicate Name",
        description: `${trimmedName} is already in the roster.`,
        variant: "destructive"
      });
      return;
    }

    addPlayer({ name: trimmedName, skillLevel: parseInt(newSkill) });
    setNewName('');
    inputRef.current?.focus();
    toast({ title: "Player Added", description: `${trimmedName} joined the club.` });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPlayerAction();
    }
  };

  const handleEditPlayerAction = () => {
    if (!editingPlayer || !editName.trim()) return;
    updatePlayer(editingPlayer.id, { name: editName.trim(), skillLevel: parseInt(editSkill) });
    setEditingPlayer(null);
    toast({ title: "Profile Updated" });
  };

  return (
    <div className="container mx-auto px-6 py-10 space-y-8 pb-32 max-w-7xl animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Users className="h-10 w-10 text-primary" /> Player Roster
          </h1>
          <p className="text-xs text-muted-foreground font-black uppercase tracking-widest opacity-60">
            {players.length} Registered Members
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search roster..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-sm font-bold bg-secondary/20 border-none"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-8">
          <Card className="border-2 shadow-md bg-card overflow-hidden">
            <CardHeader className="p-5 bg-primary/5 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
                <Plus className="h-5 w-5" /> Quick Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-60">Full Name</Label>
                <Input 
                  ref={inputRef}
                  placeholder="Type name and press Enter..." 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  className="h-12 text-lg font-bold border-2 focus-visible:ring-primary" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest opacity-60">Skill Tier</Label>
                <Select value={newSkill} onValueChange={setNewSkill}>
                  <SelectTrigger className="h-12 font-bold border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SKILL_LEVELS_FULL).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="font-bold text-sm">{val} - {label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full font-black uppercase text-sm h-14 shadow-lg shadow-primary/10" 
                onClick={handleAddPlayerAction} 
                disabled={!newName.trim()}
              >
                Add Member
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-md">
            <CardHeader className="p-5 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3">
                <TrendingUp className="h-5 w-5" /> Skill Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillDistribution}>
                  <XAxis dataKey="level" fontSize={11} tickLine={false} axisLine={false} fontVariant="bold" />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {skillDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </aside>

        <div className="lg:col-span-8">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 pr-4">
              {filteredPlayers.map((player) => (
                <Card key={player.id} className="border-2 shadow-md bg-card group hover:border-primary transition-all duration-200 overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-lg truncate leading-tight group-hover:text-primary transition-colors">
                          {player.name}
                        </p>
                        <div className="mt-1">
                          <StatusBadge status={player.status} />
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-primary/10" 
                          onClick={() => { setEditingPlayer(player); setEditName(player.name); setEditSkill(player.skillLevel.toString()); }}
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-destructive/10 text-destructive" 
                          onClick={() => deletePlayer(player.id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1.5">Skill</p>
                        <Badge variant="outline" className={cn("text-[11px] font-black uppercase px-2 h-5", getSkillColor(player.skillLevel))}>
                          {SKILL_LEVELS_SHORT[player.skillLevel]}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-black uppercase text-muted-foreground leading-none">Games</p>
                        <p className="text-base font-black">{player.gamesPlayed}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="col-span-full py-32 text-center border-4 border-dashed rounded-3xl bg-secondary/5">
                  <User className="h-14 w-14 mx-auto mb-4 opacity-10" />
                  <p className="text-xs font-black uppercase text-muted-foreground tracking-widest opacity-40">
                    No matching members
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-black uppercase tracking-tight">Edit Member Profile</DialogTitle></DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-60">Full Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-12 font-bold text-lg" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-60">Skill Level</Label>
              <Select value={editSkill} onValueChange={setEditSkill}>
                <SelectTrigger className="h-12 font-bold text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LEVELS_FULL).map(([val, label]) => (
                    <SelectItem key={val} value={val} className="font-bold text-sm">{val} - {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full font-black uppercase text-sm h-14" onClick={handleEditPlayerAction}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}