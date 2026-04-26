
"use client";

import { useState, useMemo } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, User, TrendingUp, PieChart, Users, Trash2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function PlayersPage() {
  const { players, addPlayer, deletePlayer } = useClub();
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState('3');

  const skillDistribution = useMemo(() => {
    const dist: Record<number, number> = {};
    players.forEach(p => {
      dist[p.skillLevel] = (dist[p.skillLevel] || 0) + 1;
    });
    return Object.entries(dist).map(([level, count]) => ({
      level: `Lvl ${level}`,
      count,
    }));
  }, [players]);

  const handleAddPlayerAction = () => {
    if (!newName) return;
    addPlayer({
      name: newName,
      skillLevel: parseInt(newSkill)
    });
    setNewName('');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Players
        </h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Player
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register New Player</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Player Name" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Skill Level (1-7)</Label>
                <Input type="number" min="1" max="7" value={newSkill} onChange={e => setNewSkill(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleAddPlayerAction}>Save Player</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" /> Skill Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillDistribution}>
                <XAxis dataKey="level" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                 <span className="text-sm">Total Players</span>
                 <span className="font-bold">{players.length}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                 <span className="text-sm">Avg Skill</span>
                 <span className="font-bold">
                   {players.length ? (players.reduce((acc, p) => acc + p.skillLevel, 0) / players.length).toFixed(1) : 0}
                 </span>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-bold">Player List</h2>
        <div className="grid grid-cols-1 gap-2">
          {players.map(player => (
            <Card key={player.id} className="flex items-center justify-between p-4 group">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold leading-none mb-1">{player.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Games: {player.gamesPlayed} | {player.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Lvl {player.skillLevel}</Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  onClick={() => deletePlayer(player.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          {players.length === 0 && (
            <p className="text-center py-10 text-muted-foreground italic text-sm">No players registered.</p>
          )}
        </div>
      </div>
    </div>
  );
}
