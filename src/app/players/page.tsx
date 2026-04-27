
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, User, TrendingUp, PieChart, Users, Trash2, Award, Clock, Timer, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { SKILL_LEVELS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function WaitTimeText({ lastAvailableAt, status }: { lastAvailableAt?: number, status: string }) {
  const [mins, setMins] = useState(0);

  useEffect(() => {
    if (!lastAvailableAt || status !== 'available') return;
    const update = () => setMins(Math.floor((Date.now() - lastAvailableAt) / 60000));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [lastAvailableAt, status]);

  if (status !== 'available') return null;

  return (
    <div className="flex items-center gap-1 text-[9px] font-black uppercase text-primary animate-pulse">
      <Timer className="h-2.5 w-2.5" /> Bench: {mins}m
    </div>
  );
}

export default function PlayersPage() {
  const { players, addPlayer, deletePlayer } = useClub();
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState('3');
  const [today, setToday] = useState<string>('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString());
  }, []);

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
    
    // Validation: Duplicate name check
    const exists = players.some(p => p.name.trim().toLowerCase() === newName.trim().toLowerCase());
    if (exists) {
      toast({
        title: "Duplicate Player",
        description: `"${newName}" is already in the roster.`,
        variant: "destructive"
      });
      return;
    }

    addPlayer({
      name: newName,
      skillLevel: parseInt(newSkill)
    });
    setNewName('');
    setNewSkill('3');
    toast({ title: "Player Added", description: `"${newName}" was successfully added to the roster.` });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 animate-in fade-in duration-700">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Players
        </h1>
        <p className="text-sm text-muted-foreground">Manage your club roster and player skills.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-primary/20 shadow-sm h-fit transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Add a Player
            </CardTitle>
            <CardDescription>Enter details to register a member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Name</Label>
              <Input 
                id="player-name"
                placeholder="Full Name" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="bg-background focus:ring-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-level">Skill Level</Label>
              <Select value={newSkill} onValueChange={setNewSkill}>
                <SelectTrigger id="skill-level" className="transition-all hover:bg-secondary/50">
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {val} - {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-2 transition-all active:scale-95 shadow-md shadow-primary/10" onClick={handleAddPlayerAction} disabled={!newName}>
              Add Player
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                <PieChart className="h-3 w-3" /> Skill Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillDistribution}>
                  <XAxis dataKey="level" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} hide />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} className="animate-in slide-in-from-bottom duration-1000">
                    {skillDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} 
                        fillOpacity={0.8}
                        className="transition-all hover:fill-opacity-100"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2 tracking-widest">
                <TrendingUp className="h-3 w-3" /> Club Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                 <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg transition-all hover:bg-secondary/30">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Players</span>
                     <span className="text-xl font-black">{players.length}</span>
                     <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">{today || '...'}</span>
                   </div>
                   <Users className="h-8 w-8 text-primary/20" />
                 </div>
                 <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg transition-all hover:bg-secondary/30">
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            Player Roster <Badge variant="secondary" className="animate-in zoom-in">{players.length}</Badge>
          </h2>
          <p className="text-[10px] font-bold uppercase text-muted-foreground italic">Longest wait time is prioritized for matches</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {players
            .sort((a, b) => {
               if (a.status === 'playing' && b.status !== 'playing') return 1;
               if (a.status !== 'playing' && b.status === 'playing') return -1;
               return (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0);
            })
            .map((player, idx) => (
            <Card key={player.id} className="flex flex-col p-4 group hover:border-primary/40 transition-all duration-300 shadow-sm space-y-3 hover:shadow-lg animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/5 transition-colors group-hover:bg-primary/20">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold leading-none mb-1 text-sm group-hover:text-primary transition-colors">{player.name}</p>
                    <div className="flex flex-col gap-0.5">
                      <p className={cn(
                        "text-[9px] uppercase font-bold tracking-tighter",
                        player.status === 'playing' ? 'text-primary animate-pulse' : 'text-muted-foreground'
                      )}>
                        {player.status}
                      </p>
                      <WaitTimeText lastAvailableAt={player.lastAvailableAt} status={player.status} />
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90"
                  onClick={() => deletePlayer(player.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between border-t pt-3">
                <div className="space-y-1">
                   <div className="flex items-center gap-1 text-[9px] font-black uppercase text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" /> Total Time
                   </div>
                   <p className="text-xs font-bold">{player.totalPlayTimeMinutes || 0} mins</p>
                </div>
                <div className="text-right space-y-1">
                   <div className="text-[9px] font-black uppercase text-muted-foreground">Games</div>
                   <p className="text-xs font-bold">{player.gamesPlayed}</p>
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-bold border-primary/20 transition-all group-hover:bg-primary group-hover:text-white group-hover:border-primary">
                  {player.skillLevel} - {SKILL_LEVELS[player.skillLevel]}
                </Badge>
              </div>
            </Card>
          ))}
          {players.length === 0 && (
            <div className="col-span-full py-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground animate-in zoom-in">
              <User className="h-10 w-10 mb-2 opacity-10" />
              <p className="text-sm font-medium">No players found. Use the panel above to register.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
