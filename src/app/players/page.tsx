
"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, User, TrendingUp, PieChart, Users } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

export default function PlayersPage() {
  const db = useFirestore();
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState('3');

  const playersRef = useMemoFirebase(() => collection(db, 'players'), [db]);
  const { data: players } = useCollection<Player>(playersRef);

  const skillDistribution = useMemo(() => {
    if (!players) return [];
    const dist: Record<number, number> = {};
    players.forEach(p => {
      dist[p.skillLevel] = (dist[p.skillLevel] || 0) + 1;
    });
    return Object.entries(dist).map(([level, count]) => ({
      level: `Level ${level}`,
      count,
      fill: `hsl(var(--primary))`
    }));
  }, [players]);

  const handleAddPlayer = () => {
    if (!newName) return;
    const id = Math.random().toString(36).substring(7);
    addDocumentNonBlocking(playersRef, {
      id,
      name: newName,
      skillLevel: parseInt(newSkill),
      gamesPlayed: 0,
      partnerHistory: [],
      status: 'available',
      improvementScore: 0,
      wins: 0,
      losses: 0
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
              <Button className="w-full" onClick={handleAddPlayer}>Save Player</Button>
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
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillDistribution}>
                <XAxis dataKey="level" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Active Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                 <span>Total Registered</span>
                 <span className="font-bold">{players?.length || 0}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                 <span>Average Skill</span>
                 <span className="font-bold">
                   {players?.length ? (players.reduce((acc, p) => acc + p.skillLevel, 0) / players.length).toFixed(1) : 0}
                 </span>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-bold">Player List</h2>
        <div className="grid grid-cols-1 gap-2">
          {players?.map(player => (
            <Card key={player.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{player.name}</p>
                  <p className="text-xs text-muted-foreground">Games: {player.gamesPlayed} | WR: {player.wins && (player.wins + (player.losses || 0)) > 0 ? ((player.wins / (player.wins + (player.losses || 0))) * 100).toFixed(0) : 0}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Lvl {player.skillLevel}</Badge>
                <Badge className={player.status === 'available' ? 'bg-green-500' : player.status === 'playing' ? 'bg-orange-500' : 'bg-slate-400'}>
                  {player.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
