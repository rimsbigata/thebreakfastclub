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
import { SKILL_LEVELS, SKILL_LEVELS_SHORT, getSkillColor, Player } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

function StatusBadge({ status }: { status: string }) {
  const colors = {
    available: "bg-green-600 text-white dark:bg-green-500 dark:text-green-950",
    playing: "bg-primary text-primary-foreground animate-pulse",
    resting: "bg-muted text-muted-foreground"
  };
  return (
    <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-4 px-1.5 shrink-0", colors[status as keyof typeof colors])}>
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

  const handleAddPlayerAction = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const isDuplicate = players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      toast({ title: "Duplicate Name", description: `${trimmedName} is already in the roster.`, variant: "destructive" });
      return;
    }
    try {
      await addPlayer({ name: trimmedName, skillLevel: parseInt(newSkill), playStyle: 'Unknown' });
      setNewName('');
      inputRef.current?.focus();
      toast({ title: "Player Added" });
    } catch (error) {
      toast({
        title: "Could not add player",
        description: error instanceof Error ? error.message : "Database write failed.",
        variant: "destructive"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddPlayerAction();
  };

  const handleEditPlayerAction = async () => {
    if (!editingPlayer || !editName.trim()) return;
    try {
      await updatePlayer(editingPlayer.id, { name: editName.trim(), skillLevel: parseInt(editSkill) });
      setEditingPlayer(null);
      toast({ title: "Profile Updated" });
    } catch (error) {
      toast({
        title: "Could not update player",
        description: error instanceof Error ? error.message : "Database write failed.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-24 max-w-7xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> Roster
          </h1>
          <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">
            {players.length} Members
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search roster..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-compact font-bold bg-secondary/20 border-none"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-6">
          <Card className="border-2 shadow-sm bg-card overflow-hidden">
            <CardHeader className="p-4 bg-primary/5 border-b">
              <CardTitle className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4 w-4" /> Quick Reg
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Full Name</Label>
                <Input 
                  ref={inputRef}
                  placeholder="Enter name..." 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  className="h-10 text-compact font-bold border-2" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Skill Tier</Label>
                <Select value={newSkill} onValueChange={setNewSkill}>
                  <SelectTrigger className="h-10 text-compact font-bold border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="font-bold text-compact">{val} - {label as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full font-black uppercase text-compact h-12" onClick={handleAddPlayerAction} disabled={!newName.trim()}>
                Add Member
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm hidden md:block">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillDistribution}>
                  <XAxis dataKey="level" fontSize={9} tickLine={false} axisLine={false} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
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
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2 pr-2 pb-24">
              {filteredPlayers.map((player) => (
                <Card key={player.id} className="border-2 shadow-sm bg-card group hover:border-primary transition-all duration-200 overflow-hidden min-w-0">
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-1.5 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-compact truncate leading-tight group-hover:text-primary transition-colors">
                          {player.name}
                        </p>
                        <div className="mt-1">
                          <StatusBadge status={player.status} />
                        </div>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingPlayer(player); setEditName(player.name); setEditSkill(player.skillLevel.toString()); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                          deletePlayer(player.id).catch(error => {
                            toast({
                              title: "Could not delete player",
                              description: error instanceof Error ? error.message : "Database delete failed.",
                              variant: "destructive"
                            });
                          });
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-dashed min-w-0">
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[8px] font-black uppercase text-muted-foreground truncate mb-1">Skill</p>
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-1.5 h-4 truncate w-full", getSkillColor(player.skillLevel))}>
                          {SKILL_LEVELS_SHORT[player.skillLevel]}
                        </Badge>
                      </div>
                      <div className="text-right min-w-0">
                        <p className="text-[8px] font-black uppercase text-muted-foreground truncate mb-1">Games</p>
                        <p className="text-compact font-black truncate">{player.gamesPlayed}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="col-span-full py-20 text-center border-4 border-dashed rounded-2xl bg-secondary/5">
                  <User className="h-10 w-10 mx-auto mb-2 opacity-10" />
                  <p className="text-[10px] font-black uppercase text-muted-foreground opacity-40">No matching members</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-compact font-black uppercase">Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase opacity-60">Full Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-10 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase opacity-60">Skill Tier</Label>
              <Select value={editSkill} onValueChange={setEditSkill}>
                <SelectTrigger className="h-10 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                    <SelectItem key={val} value={val} className="font-bold text-compact">{val} - {label as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full font-black uppercase text-compact h-12" onClick={handleEditPlayerAction}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
