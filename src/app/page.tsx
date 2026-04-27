"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trophy, Trash2, Timer, CheckCircle2, Play, Zap, ArrowLeftRight, Activity, Users, DoorOpen, Hand, Check, ListOrdered } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateDeterministicMatch } from '@/lib/matchmaking';
import { SKILL_LEVELS } from '@/lib/types';
import { MatchScoreDialog } from '@/components/match/MatchScoreDialog';
import { MatchResults } from '@/components/match/MatchResults';
import Image from 'next/image';
import tbcLogo from '@/assets/images/tbclogo.jpg';

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
    <div className="flex items-center gap-1.5 text-primary font-mono text-sm font-bold animate-pulse">
      <Timer className="h-4 w-4" />
      {elapsed}
    </div>
  );
}

function WaitTimeBadge({ lastAvailableAt }: { lastAvailableAt?: number }) {
  const [mins, setMins] = useState(0);

  useEffect(() => {
    if (!lastAvailableAt) return;
    const update = () => setMins(Math.floor((Date.now() - lastAvailableAt) / 60000));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [lastAvailableAt]);

  return (
    <Badge variant="secondary" className="gap-1 text-[10px] h-5">
      <Timer className="h-3 w-3" /> {mins}m wait
    </Badge>
  );
}

export default function HomePage() {
  const { courts, players, matches, addCourt, deleteCourt, startMatch, startTimer, endMatch, swapPlayer, assignMatchToCourt } = useClub();
  const { toast } = useToast();
  const [newCourtName, setNewCourtName] = useState('');
  const [swapping, setSwapping] = useState<{ matchId: string; oldPlayerId: string } | null>(null);
  const [scoringCourtId, setScoringCourtId] = useState<string | null>(null);
  const [showWinButtons, setShowWinButtons] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  
  // Manual Match State
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('waiting');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const availablePlayersCount = players.filter(p => p.status === 'available').length;
  const occupiedCourtsCount = courts.filter(c => c.status === 'occupied').length;
  const waitingMatches = matches.filter(m => !m.isCompleted && !m.courtId);
  const availableCourts = courts.filter(c => c.status === 'available');

  if (!mounted) return null;

  const handleAddCourtAction = () => {
    if (!newCourtName) return;
    
    const formattedName = `Court ${newCourtName}`;
    const exists = courts.some(c => c.name.toLowerCase() === formattedName.toLowerCase());
    
    if (exists) {
      toast({ 
        title: "Court already exists", 
        description: `There is already a court named "${formattedName}".`,
        variant: "destructive"
      });
      return;
    }

    addCourt(newCourtName);
    setNewCourtName('');
    toast({ title: "Court Added" });
  };

  const handleAutoMatch = () => {
    const availablePlayers = players.filter(p => p.status === 'available');
    const availableCourtsList = courts.filter(c => c.status === 'available');

    const result = generateDeterministicMatch(availablePlayers, availableCourtsList);

    if (result.matchCreated && result.teamA && result.teamB) {
      startMatch({
        teamA: result.teamA,
        teamB: result.teamB,
        courtId: result.courtId,
      });
      toast({ 
        title: result.courtId ? "Match Created!" : "Match Queued!", 
        description: result.analysis || "No courts available, added to waiting queue."
      });
    } else {
      toast({ title: "Matchmaking Error", description: result.error || "Could not generate a match.", variant: "destructive" });
    }
  };

  const handleManualMatchSubmit = () => {
    if (selectedPlayerIds.length !== 4) return;
    
    const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id))
      .sort((a, b) => (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0));

    startMatch({
      teamA: [selectedPlayers[0].id, selectedPlayers[1].id],
      teamB: [selectedPlayers[2].id, selectedPlayers[3].id],
      courtId: selectedCourtId === 'waiting' ? undefined : selectedCourtId,
    });

    setIsManualOpen(false);
    setSelectedPlayerIds([]);
    setSelectedCourtId('waiting');
    toast({ title: selectedCourtId === 'waiting' ? "Match Added to Queue" : "Manual Match Started" });
  };

  const handleSwap = (newPlayerId: string) => {
    if (!swapping) return;
    swapPlayer(swapping.matchId, swapping.oldPlayerId, newPlayerId);
    setSwapping(null);
    toast({ title: "Player Swapped" });
  };

  const handleScoreSubmit = (teamAScore: number | undefined, teamBScore: number | undefined, winner: 'teamA' | 'teamB') => {
    if (scoringCourtId) {
      endMatch(scoringCourtId, winner, teamAScore, teamBScore);
      setScoringCourtId(null);
      toast({ title: "Match Recorded" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 rounded-lg overflow-hidden shadow-md md:hidden border-2 border-primary">
            <Image 
              src={tbcLogo} 
              alt="TBC Logo" 
              fill 
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live court status and deterministic matchmaking.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 font-bold hover:bg-secondary transition-all active:scale-95">
                <Hand className="h-4 w-4" /> Manual Match
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Manual Match</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <Label>1. Select Court (Optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedCourtId === 'waiting' ? 'default' : 'outline'}
                      className="h-10 px-4 transition-all"
                      onClick={() => setSelectedCourtId('waiting')}
                    >
                      Wait for available
                    </Button>
                    {courts.map(court => (
                      <Button
                        key={court.id}
                        variant={selectedCourtId === court.id ? 'default' : 'outline'}
                        className="h-10 px-4 transition-all"
                        disabled={court.status === 'occupied'}
                        onClick={() => setSelectedCourtId(court.id)}
                      >
                        {court.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>2. Select 4 Players ({selectedPlayerIds.length}/4)</Label>
                    <Badge variant="outline">{availablePlayersCount} Available</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto p-1 custom-scrollbar">
                    {players
                      .filter(p => p.status === 'available')
                      .sort((a, b) => (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0))
                      .map(player => {
                        const isSelected = selectedPlayerIds.includes(player.id);
                        return (
                          <Button
                            key={player.id}
                            variant={isSelected ? 'secondary' : 'outline'}
                            className={cn(
                              "justify-between h-auto py-3 px-4 transition-all hover:border-primary/50",
                              isSelected && "ring-2 ring-primary border-primary bg-primary/10"
                            )}
                            onClick={() => {
                              setSelectedPlayerIds(prev => 
                                isSelected 
                                  ? prev.filter(id => id !== player.id) 
                                  : (prev.length < 4 ? [...prev, player.id] : prev)
                              );
                            }}
                          >
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-bold flex items-center gap-2">
                                {player.name}
                                {isSelected && <Check className="h-3 w-3 text-primary animate-in zoom-in" />}
                              </span>
                              <span className="text-[10px] uppercase text-muted-foreground font-black">
                                Lvl {player.skillLevel} • {player.gamesPlayed} Games
                              </span>
                            </div>
                            <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                          </Button>
                        );
                      })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="w-full h-12 font-bold text-lg active:scale-95 transition-transform" 
                  disabled={selectedPlayerIds.length !== 4}
                  onClick={handleManualMatchSubmit}
                >
                  {selectedCourtId === 'waiting' ? 'Add to Waiting Queue' : 'Start Match'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={handleAutoMatch} 
            disabled={availablePlayersCount < 4} 
            className="gap-2 bg-primary font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
          >
            <Zap className="h-4 w-4 fill-white" />
            Quick Match
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-none shadow-none transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
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
        <Card className="bg-orange-500/10 border-none shadow-none transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600">
              <ListOrdered className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Waiting Matches</p>
              <p className="text-2xl font-black">{waitingMatches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/20 border-none shadow-none transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
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
        <Card className="bg-green-500/10 dark:bg-green-500/20 border-none shadow-none transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Total Players</p>
              <p className="text-2xl font-black">{players.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {waitingMatches.length > 0 && (
        <section className="space-y-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-black uppercase tracking-tight">Waiting Match Queue</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {waitingMatches.map(match => {
              const teamA = match.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
              const teamB = match.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
              return (
                <Card key={match.id} className="border-orange-500/20 bg-orange-500/5 shadow-sm">
                  <CardHeader className="p-4 flex flex-row justify-between items-center">
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 uppercase text-[10px]">Waiting for court</Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="default" className="h-7 bg-orange-500 hover:bg-orange-600 text-[10px] font-bold uppercase gap-1" disabled={availableCourts.length === 0}>
                           Assign Court
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Assign Court to Waiting Match</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                           <Label>Select an Available Court</Label>
                           <div className="flex flex-wrap gap-2">
                              {availableCourts.map(c => (
                                <Button key={c.id} variant="outline" className="h-12 px-6" onClick={() => {
                                  assignMatchToCourt(match.id, c.id);
                                  toast({ title: "Match Assigned", description: `Assigned to ${c.name}` });
                                }}>
                                  {c.name}
                                </Button>
                              ))}
                              {availableCourts.length === 0 && <p className="text-sm text-muted-foreground italic">No courts available yet.</p>}
                           </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                       <div className="flex flex-col">
                          {teamA.map(p => <span key={p?.id}>{p?.name}</span>)}
                       </div>
                       <span className="text-muted-foreground italic">vs</span>
                       <div className="flex flex-col text-right">
                          {teamB.map(p => <span key={p?.id}>{p?.name}</span>)}
                       </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courts.map(court => {
          const activeMatch = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
          const teamAPlayers = activeMatch?.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
          const teamBPlayers = activeMatch?.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
          const isTimerRunning = !!activeMatch?.startTime;
          const isManualWinMode = showWinButtons[court.id];

          return (
            <Card key={court.id} className="border-2 shadow-sm relative group overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-secondary/10">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-black uppercase tracking-tight">{court.name}</CardTitle>
                  {court.status === 'occupied' && isTimerRunning && (
                    <LiveTimer startTime={activeMatch?.startTime} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                    onClick={() => deleteCourt(court.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Badge variant={court.status === 'available' ? 'outline' : 'default'} className={cn(
                    "font-black tracking-widest text-[10px]",
                    court.status === 'available' ? 'text-green-600 border-green-200 bg-green-500/5' : 'bg-primary'
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
                          {(isTimerRunning || isManualWinMode) && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="h-7 px-2 text-[10px] font-black uppercase gap-1 hover:bg-primary hover:text-white transition-all active:scale-95"
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
                                className="h-6 w-6 text-muted-foreground hover:bg-primary hover:text-white transition-all active:scale-90"
                                onClick={() => setSwapping({ matchId: activeMatch.id, oldPlayerId: p!.id })}
                              >
                                <ArrowLeftRight className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-center -my-2 relative">
                        <div className="bg-background px-3 py-1 border rounded-full text-[10px] font-black text-muted-foreground italic z-10 shadow-sm">VS</div>
                      </div>
                      <div className="p-4 bg-secondary/20 rounded-xl border-l-4 border-muted space-y-3 relative">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Team B</p>
                          {(isTimerRunning || isManualWinMode) && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="h-7 px-2 text-[10px] font-black uppercase gap-1 hover:bg-primary hover:text-white transition-all active:scale-95"
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
                                className="h-6 w-6 text-muted-foreground hover:bg-primary hover:text-white transition-all active:scale-90"
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
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-secondary/5 transition-all hover:bg-secondary/10">
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
                          className="w-full gap-2 bg-green-600 hover:bg-green-700 h-10 font-bold uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-green-500/10"
                        >
                          <Play className="h-4 w-4" /> Start Match
                        </Button>
                      ) : (
                        <>
                          <p className="text-[10px] font-black uppercase text-primary animate-pulse tracking-widest flex items-center gap-1">
                             <Activity className="h-3 w-3" /> Match In Progress
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setScoringCourtId(court.id)}
                            className="text-xs font-bold uppercase transition-all hover:bg-primary hover:text-white"
                          >
                            End Match
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

      <section className="pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <MatchResults matches={matches} players={players} limit={5} />
      </section>

      <Dialog open={!!swapping} onOpenChange={(open) => !open && setSwapping(null)}>
        <DialogContent className="animate-in zoom-in duration-300">
          <DialogHeader><DialogTitle>Swap Player</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <Label className="text-xs text-muted-foreground">Select replacement from available players:</Label>
            {players.filter(p => p.status === 'available').map(player => (
              <Button 
                key={player.id} 
                variant="outline" 
                className="w-full justify-between h-14 transition-all hover:border-primary/50 group" 
                onClick={() => handleSwap(player.id)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold group-hover:text-primary transition-colors">{player.name}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">{player.skillLevel} - {SKILL_LEVELS[player.skillLevel]}</span>
                </div>
                <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {scoringCourtId && (() => {
        const court = courts.find(c => c.id === scoringCourtId);
        const match = matches.find(m => m.id === court?.currentMatchId);
        if (!match) return null;
        
        const teamA = players.filter(p => match.teamA.includes(p.id));
        const teamB = players.filter(p => match.teamB.includes(p.id));

        return (
          <MatchScoreDialog
            open={!!scoringCourtId}
            onOpenChange={(open) => !open && setScoringCourtId(null)}
            teamA={teamA}
            teamB={teamB}
            onScoreSubmit={handleScoreSubmit}
            onSkip={() => {
              if (scoringCourtId) {
                setShowWinButtons(prev => ({ ...prev, [scoringCourtId]: true }));
              }
            }}
          />
        );
      })()}
    </div>
  );
}
