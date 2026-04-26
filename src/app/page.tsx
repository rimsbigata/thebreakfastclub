"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trophy, Trash2, Timer, CheckCircle2, Play, UserPlus, Zap, ArrowLeftRight, Activity, Users, DoorOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateDeterministicMatch } from '@/lib/matchmaking';
import { SKILL_LEVELS } from '@/lib/types';

function LiveTimer({ startTime }: { startTime?: string }) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-1.5 text-primary font-mono text-sm font-bold">
      <Timer className="h-4 w-4" />
      {elapsed}
    </div>
  );
}

export default function HomePage() {
  const { courts, players, matches, addCourt, deleteCourt, startMatch, startTimer, endMatch, swapPlayer } = useClub();
  const { toast } = useToast();
  const [newCourtName, setNewCourtName] = useState('');
  const [swapping, setSwapping] = useState<{ matchId: string; oldPlayerId: string } | null>(null);
  const [today, setToday] = useState<string>('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString());
  }, []);

  const availablePlayersCount = players.filter(p => p.status === 'available').length;
  const occupiedCourtsCount = courts.filter(c => c.status === 'occupied').length;

  const handleAddCourtAction = () => {
    if (!newCourtName) return;
    addCourt(newCourtName);
    setNewCourtName('');
  };

  const handleAutoMatch = () => {
    const availablePlayers = players.filter(p => p.status === 'available');
    const availableCourts = courts.filter(c => c.status === 'available');

    const result = generateDeterministicMatch(availablePlayers, availableCourts);

    if (result.matchCreated && result.courtId && result.teamA && result.teamB) {
      startMatch({
        teamA: result.teamA,
        teamB: result.teamB,
        courtId: result.courtId,
      });
      toast({ 
        title: "Match Created!", 
        description: result.analysis || "Optimal pairing found based on games played and history." 
      });
    } else {
      toast({ 
        title: "Matchmaking Error", 
        description: result.error || "Could not generate a match.",
        variant: "destructive"
      });
    }
  };

  const handleSwap = (newPlayerId: string) => {
    if (!swapping) return;
    swapPlayer(swapping.matchId, swapping.oldPlayerId, newPlayerId);
    setSwapping(null);
    toast({ title: "Player Swapped" });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live court status and FIFO matchmaking.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAutoMatch} 
            disabled={!courts.length || availablePlayersCount < 4} 
            className="gap-2 bg-primary font-bold shadow-lg shadow-primary/20"
          >
            <Zap className="h-4 w-4 fill-white" />
            Quick Match
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Court</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Court Identifier</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground bg-secondary px-3 py-2 rounded-md">Court</span>
                    <Input 
                      placeholder="e.g. 1, A, or Blue" 
                      value={newCourtName} 
                      onChange={e => setNewCourtName(e.target.value)} 
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleAddCourtAction}>Create Court</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-none shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">In Queue</p>
              <p className="text-2xl font-black">{availablePlayersCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/20 border-none shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-secondary/30 flex items-center justify-center text-foreground">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Busy Courts</p>
              <p className="text-2xl font-black">{occupiedCourtsCount}/{courts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 dark:bg-green-500/20 border-none shadow-none">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Total Players</p>
              <p className="text-2xl font-black">{players.length}</p>
              <p className="text-[8px] font-bold uppercase text-muted-foreground/60">
                {today ? today : '...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!courts.length ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-card/50">
          <Trophy className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-bold text-muted-foreground">No courts registered</p>
          <p className="text-sm text-muted-foreground mb-6">Add a court to start matchmaking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courts.map(court => {
            const activeMatch = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
            const teamAPlayers = activeMatch?.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
            const teamBPlayers = activeMatch?.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
            const isTimerRunning = !!activeMatch?.startTime;

            return (
              <Card key={court.id} className="border-2 shadow-sm relative group overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-secondary/10">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">{court.name}</CardTitle>
                    {court.status === 'occupied' && isTimerRunning && (
                      <LiveTimer startTime={activeMatch?.startTime} />
                    )}
                    {court.status === 'occupied' && !isTimerRunning && (
                      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-sm font-bold italic">
                        Ready to Start
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteCourt(court.id)}
                    >
                      <Trash2 className="h-4 w-4 transition-colors group-hover:text-white" />
                    </Button>
                    <Badge variant={court.status === 'available' ? 'outline' : 'default'} className={cn(
                      "font-black tracking-widest text-[10px]",
                      court.status === 'available' ? 'text-green-600 border-green-200' : 'bg-primary'
                    )}>
                      {court.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {court.status === 'occupied' && activeMatch ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-primary/5 rounded-xl border-l-4 border-primary space-y-3 relative">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Team A</p>
                            {isTimerRunning && (
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 px-2 text-[10px] font-black uppercase gap-1"
                                onClick={() => endMatch(court.id, 'teamA')}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Win
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {teamAPlayers?.map(p => (
                              <div key={p?.id} className="flex items-center justify-between text-sm font-bold bg-background/50 p-2 rounded-lg border border-primary/10">
                                <div className="flex flex-col">
                                  <span>{p?.name}</span>
                                  <span className="text-[8px] uppercase text-muted-foreground tracking-tighter">{p?.skillLevel} - {SKILL_LEVELS[p?.skillLevel!]}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={() => setSwapping({ matchId: activeMatch.id, oldPlayerId: p!.id })}
                                >
                                  <ArrowLeftRight className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-center -my-2">
                          <div className="bg-background px-3 py-1 border rounded-full text-[10px] font-black text-muted-foreground italic z-10">VS</div>
                        </div>
                        <div className="p-4 bg-secondary/20 rounded-xl border-l-4 border-muted space-y-3 relative">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Team B</p>
                            {isTimerRunning && (
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-7 px-2 text-[10px] font-black uppercase gap-1"
                                onClick={() => endMatch(court.id, 'teamB')}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Win
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {teamBPlayers?.map(p => (
                              <div key={p?.id} className="flex items-center justify-between text-sm font-bold bg-background/50 p-2 rounded-lg border border-muted/20">
                                <div className="flex flex-col">
                                  <span>{p?.name}</span>
                                  <span className="text-[8px] uppercase text-muted-foreground tracking-tighter">{p?.skillLevel} - {SKILL_LEVELS[p?.skillLevel!]}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={() => setSwapping({ matchId: activeMatch.id, oldPlayerId: p!.id })}
                                >
                                  <ArrowLeftRight className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-secondary/5">
                       <Trophy className="h-8 w-8 text-muted-foreground/20 mb-3" />
                       <p className="text-sm font-bold text-muted-foreground italic">Available for Matching</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-4 bg-secondary/5">
                   {court.status === 'occupied' ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        {!isTimerRunning ? (
                          <Button 
                            onClick={() => startTimer(court.id)} 
                            className="w-full gap-2 bg-green-600 hover:bg-green-700 h-10 font-bold uppercase"
                          >
                            <Play className="h-4 w-4" /> Start Match
                          </Button>
                        ) : (
                          <>
                            <p className="text-[10px] font-black uppercase text-primary animate-pulse tracking-widest">Match In Progress</p>
                            <Button variant="ghost" size="sm" onClick={() => endMatch(court.id)} className="text-xs font-bold uppercase text-muted-foreground hover:text-destructive">
                              Force End
                            </Button>
                          </>
                        )}
                      </div>
                   ) : (
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Court Idle</p>
                   )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!swapping} onOpenChange={(open) => !open && setSwapping(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Swap Player</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <Label className="text-xs text-muted-foreground">Select replacement from available players:</Label>
            {players.filter(p => p.status === 'available').map(player => (
              <Button 
                key={player.id} 
                variant="outline" 
                className="w-full justify-between h-14" 
                onClick={() => handleSwap(player.id)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold">{player.name}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">{player.skillLevel} - {SKILL_LEVELS[player.skillLevel]}</span>
                </div>
                <Badge variant="secondary">Wait: {player.lastAvailableAt ? Math.floor((Date.now() - player.lastAvailableAt) / 60000) : 0}m</Badge>
              </Button>
            ))}
            {players.filter(p => p.status === 'available').length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <UserPlus className="h-8 w-8 opacity-20" />
                <p className="text-sm italic">No players available to swap.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
