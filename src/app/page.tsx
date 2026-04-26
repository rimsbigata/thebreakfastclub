"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Sparkles, Loader2, Users2, Trophy, Trash2, Timer, CheckCircle2, Play } from 'lucide-react';
import { generateMatch } from '@/ai/flows/ai-match-suggestions-flow';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const { courts, players, matches, addCourt, deleteCourt, startMatch, startTimer, endMatch } = useClub();
  const { toast } = useToast();
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');

  const handleAddCourtAction = () => {
    if (!newCourtName) return;
    addCourt(newCourtName);
    setNewCourtName('');
  };

  const handleGenerateMatch = async () => {
    const availablePlayers = players.filter(p => p.status === 'available');
    const availableCourts = courts.filter(c => c.status === 'available');

    if (availablePlayers.length < 4) {
      toast({ title: "Not enough players", description: "Need at least 4 available players.", variant: "destructive" });
      return;
    }
    if (availableCourts.length === 0) {
      toast({ title: "No courts", description: "All courts are occupied or none exist.", variant: "destructive" });
      return;
    }

    setLoadingMatch(true);
    try {
      const result = await generateMatch({
        availablePlayers: availablePlayers.map(p => ({
          id: p.id,
          name: p.name,
          skillLevel: p.skillLevel,
          gamesPlayed: p.gamesPlayed,
          partnerHistory: p.partnerHistory,
        })),
        availableCourts: availableCourts.map(c => ({ id: c.id, name: c.name })),
      });

      if (result.matchFound && result.courtId) {
        startMatch({
          teamA: result.teamA,
          teamB: result.teamB,
          courtId: result.courtId,
        });
        toast({ title: "Match Assigned!", description: `${result.courtName} ready. Click START to begin timer.` });
      } else {
        toast({ title: "No optimal match", description: "AI couldn't find a balance with current rules." });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "AI Error", description: "Failed to generate match logic.", variant: "destructive" });
    } finally {
      setLoadingMatch(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courts</h1>
          <p className="text-sm text-muted-foreground">Real-time play and AI matchmaking.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateMatch} 
            disabled={loadingMatch || !courts.length || !players.length} 
            className="gap-2 bg-primary"
          >
            {loadingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Match
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon"><Plus className="h-4 w-4" /></Button>
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

      {!courts.length ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-card/50">
          <Trophy className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-bold text-muted-foreground">No courts registered</p>
          <p className="text-sm text-muted-foreground mb-6">Click the + button to add your first court.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courts.map(court => {
            const activeMatch = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
            const teamAPlayers = activeMatch?.teamA.map(id => players.find(p => p.id === id)?.name).join(' & ');
            const teamBPlayers = activeMatch?.teamB.map(id => players.find(p => p.id === id)?.name).join(' & ');
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
                  {court.status === 'occupied' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-primary/5 rounded-xl border-l-4 border-primary space-y-2 relative">
                          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Team A</p>
                          <div className="text-sm font-bold truncate pr-12">{teamAPlayers || 'Unknown Players'}</div>
                          {isTimerRunning && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="absolute right-2 top-2 h-7 px-2 text-[10px] font-black uppercase gap-1"
                              onClick={() => endMatch(court.id, 'teamA')}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Win
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center justify-center -my-2">
                          <div className="bg-background px-3 py-1 border rounded-full text-[10px] font-black text-muted-foreground italic">VS</div>
                        </div>
                        <div className="p-4 bg-secondary/20 rounded-xl border-l-4 border-muted space-y-2 relative">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Team B</p>
                          <div className="text-sm font-bold truncate pr-12">{teamBPlayers || 'Unknown Players'}</div>
                          {isTimerRunning && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="absolute right-2 top-2 h-7 px-2 text-[10px] font-black uppercase gap-1"
                              onClick={() => endMatch(court.id, 'teamB')}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Win
                            </Button>
                          )}
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
    </div>
  );
}
