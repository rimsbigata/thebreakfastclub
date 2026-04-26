
"use client";

import { useState, useMemo } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, User, TrendingUp, PieChart, Users, Trash2, Award } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { SKILL_LEVELS } from '@/lib/types';

export default function PlayersPage() {
  const { players, addPlayer, deletePlayer } = useClub();
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState('3');

  const skillDistribution = useMemo(() => {
    const dist = Object.keys(SKILL_LEVELS).map(level => ({
      level: `L${level}`,
      fullName: SKILL_LEVELS[parseInt(level)],
      count: players.filter(p => p.skillLevel === parseInt(level)).length,
      levelNum: parseInt(level)
    }));
    return dist;
  }, [players]);

  const handleAddPlayerAction = () => {
    if (!newName) return;
    addPlayer({
      name: newName,
      skillLevel: parseInt(newSkill)
    });
    setNewName('');
    setNewSkill('3');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Players
        </h1>
        <p className="text-sm text-muted-foreground">Manage your club roster and player skills.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Panel - Persistent Card */}
        <Card className="lg:col-span-1 border-primary/20 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Add a Player
            </CardTitle>
            <CardDescription>Add a player to the club list.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Name</Label>
              <Input 
                id="player-name"
                placeholder="Full Name" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-level">Skill Level</Label>
              <Select value={newSkill} onValueChange={setNewSkill}>
                <SelectTrigger id="skill-level">
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {val}: {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-2" onClick={handleAddPlayerAction} disabled={!newName}>
              Add Player
            </Button>
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                <PieChart className="h-3 w-3" /> Skill Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillDistribution}>
                  <XAxis dataKey="level" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} hide />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {skillDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} 
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                <TrendingUp className="h-3 w-3" /> Club Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                 <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Members</span>
                     <span className="text-xl font-black">{players.length}</span>
                   </div>
                   <Users className="h-8 w-8 text-primary/20" />
                 </div>
                 <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-muted-foreground uppercase">Average Skill</span>
                     <span className="text-xl font-black">
                       {players.length ? (players.reduce((acc, p) => acc + p.skillLevel, 0) / players.length).toFixed(1) : '0.0'}
                     </span>
                   </div>
                   <Award className="h-8 w-8 text-primary/20" />
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          Player List <Badge variant="secondary">{players.length}</Badge>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {players.map(player => (
            <Card key={player.id} className="flex items-center justify-between p-4 group hover:border-primary/40 transition-colors shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/5">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold leading-none mb-1 text-sm">{player.name}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                    Played: {player.gamesPlayed} | {player.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-bold border-primary/20">
                    LVL {player.skillLevel}
                  </Badge>
                  <span className="text-[8px] font-black uppercase text-primary/70">{SKILL_LEVELS[player.skillLevel]}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                  onClick={() => deletePlayer(player.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          {players.length === 0 && (
            <div className="col-span-full py-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground">
              <User className="h-10 w-10 mb-2 opacity-10" />
              <p className="text-sm font-medium">No players found. Use the panel above to register.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
