
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, User, TrendingUp, PieChart, Users, Trash2, Award, Clock, Timer, Pencil } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { SKILL_LEVELS, Player } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function StatusBadge({ status }: { status: string }) {
  const colors = {
    available: "bg-green-500 text-white",
    playing: "bg-primary text-white animate-pulse",
    resting: "bg-muted text-muted-foreground"
  };
  return (
    <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-5", colors[status as keyof typeof colors])}>
      {status}
    </Badge>
  );
}

export default function PlayersPage() {
  const { players, addPlayer, updatePlayer, deletePlayer } = useClub();
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState('3');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editSkill, setEditSkill] = useState('3');

  const skillDistribution = useMemo(() => {
    return Object.keys(SKILL_LEVELS).map(level => ({
      level: `L${level}`,
      count: players.filter(p => p.skillLevel === parseInt(level)).length,
    }));
  }, [players]);

  const handleAddPlayerAction = () => {
    if (!newName) return;
    addPlayer({ name: newName, skillLevel: parseInt(newSkill) });
    setNewName('');
    setNewSkill('3');
    toast({ title: "Player Added" });
  };

  const handleEditPlayerAction = () => {
    if (!editingPlayer || !editName) return;
    updatePlayer(editingPlayer.id, { name: editName, skillLevel: parseInt(editSkill) });
    setEditingPlayer(null);
    toast({ title: "Player Updated" });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 animate-in fade-in duration-700 max-w-7xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" /> Player Roster
        </h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Manage members and skills</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 border-2 shadow-sm bg-card h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Register Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</Label>
              <Input placeholder="Enter Name" value={newName} onChange={e => setNewName(e.target.value)} className="h-10 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Skill Tier</Label>
              <Select value={newSkill} onValueChange={setNewSkill}>
                <SelectTrigger className="h-10 font-bold">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                    <SelectItem key={val} value={val} className="font-bold">{val} - {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-2 font-black uppercase shadow-lg shadow-primary/20" onClick={handleAddPlayerAction} disabled={!newName}>Add Player</Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-2 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <PieChart className="h-3 w-3" /> Skill Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillDistribution}>
                  <XAxis dataKey="level" fontSize={10} tickLine={false} axisLine={false} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {skillDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> Club Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 py-4">
               <div className="text-center p-3 bg-card rounded-xl border-2">
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Members</p>
                 <p className="text-3xl font-black text-primary">{players.length}</p>
               </div>
               <div className="text-center p-3 bg-card rounded-xl border-2">
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Avg Skill</p>
                 <p className="text-3xl font-black text-primary">
                   {players.length ? (players.reduce((acc, p) => acc + p.skillLevel, 0) / players.length).toFixed(1) : '0.0'}
                 </p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          Registered Members <Badge variant="secondary" className="font-black bg-primary/10 text-primary border-none">{players.length}</Badge>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {players.map((player, idx) => (
            <Card key={player.id} className="p-4 border-2 shadow-sm bg-card group hover:border-primary transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-secondary border-2 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-black text-base group-hover:text-primary transition-colors">{player.name}</p>
                    <StatusBadge status={player.status} />
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => { setEditingPlayer(player); setEditName(player.name); setEditSkill(player.skillLevel.toString()); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 text-destructive" onClick={() => deletePlayer(player.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t pt-4">
                <div className="space-y-0.5">
                   <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Skill Tier</p>
                   <p className="text-xs font-black">Lvl {player.skillLevel}</p>
                </div>
                <div className="space-y-0.5">
                   <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Games</p>
                   <p className="text-xs font-black">{player.gamesPlayed}</p>
                </div>
                <div className="space-y-0.5 text-right">
                   <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Total Play</p>
                   <p className="text-xs font-black">{player.totalPlayTimeMinutes}m</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Skill Level</Label>
              <Select value={editSkill} onValueChange={setEditSkill}>
                <SelectTrigger className="font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                    <SelectItem key={val} value={val} className="font-bold">{val} - {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full font-black uppercase" onClick={handleEditPlayerAction}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
