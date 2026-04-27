"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trophy, Trash2, Timer, CheckCircle2, Play, Zap, ArrowLeftRight, Activity, Users, DoorOpen, Hand, Check, ListOrdered, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateDeterministicMatch } from '@/lib/matchmaking';
import { SKILL_LEVELS } from '@/lib/types';
import { MatchScoreDialog } from '@/components/match/MatchScoreDialog';
import { MatchResults } from '@/components/match/MatchResults';

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
    <div className="flex items-center gap-1.5 text-primary font-mono text-xs font-bold animate-pulse">
      <Timer className="h-3 w-3" />
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
    <Badge variant="secondary" className="gap-1 text-[9px] h-4 py-0">
      <Timer className="h-2 w-2" /> {mins}m
    </Badge>
  );
}

export default function HomePage() {
  const { courts, players, matches, clubLogo, addCourt, deleteCourt, startMatch, startTimer, endMatch, swapPlayer, assignMatchToCourt } = useClub();
  const { toast } = useToast();
  const [newCourtName, setNewCourtName] = useState('');
  const [swapping, setSwapping] = useState<{ matchId: string; oldPlayerId: string } | null>(null);
  const [scoringCourtId, setScoringCourtId] = useState<string | null>(null);
  const [showWinButtons, setShowWinButtons] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [isAddCourtOpen, setIsAddCourtOpen] = useState(false);
  
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('waiting');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const availablePlayers = players.filter(p => p.status === 'available').sort((a, b) => (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0));
  const availablePlayersCount = availablePlayers.length;
  const occupiedCourtsCount = courts.filter(c => c.status === 'occupied').length;
  const waitingMatches = matches.filter(m => !m.isCompleted && !m.courtId);
  const availableCourts = courts.filter(c => c.status === 'available');

  if (!mounted) return null;

  const handleAddCourtAction = () => {
    if (!newCourtName) return;
    const formattedName = `Court ${newCourtName}`;
    const exists = courts.some(c => c.name.toLowerCase() === formattedName.toLowerCase());
    if (exists) {
      toast({ title: "Court already exists", variant: "destructive" });
      return;
    }
    addCourt(newCourtName);
    setNewCourtName('');
    setIsAddCourtOpen(false);
    toast({ title: "Court Added" });
  };

  const handleAutoMatch = () => {
    const availablePlayersList = players.filter(p => p.status === 'available');
    const availableCourtsList = courts.filter(c => c.status === 'available');
    const result = generateDeterministicMatch(availablePlayersList, availableCourtsList);
    if (result.matchCreated && result.teamA && result.teamB) {
      startMatch({ teamA: result.teamA, teamB: result.teamB, courtId: result.courtId });
      toast({ title: result.courtId ? "Match Created!" : "Match Queued!" });
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
    <div className="flex flex-col h-screen overflow-hidden animate-in fade-in duration-700">
      {/* Dashboard Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border-2 border-primary bg-primary/10 flex items-center justify-center md:hidden">
            {clubLogo ? <img src={clubLogo} alt="TBC Logo" className="object-cover h-full w-full" /> : <Activity className="h-6 w-6 text-primary" />}
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight leading-none">Command Center</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Live Club Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddCourtOpen} onOpenChange={setIsAddCourtOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Court</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Court Name / Number</Label>
                  <Input placeholder="e.g. 1, 2, A, B" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCourtAction()} />
                </div>
                <Button className="w-full h-11 font-bold" onClick={handleAddCourtAction}>Save Court</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 font-bold h-9">
                <Hand className="h-4 w-4" /> Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Manual Match</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-black text-muted-foreground">1. Select Court</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant={selectedCourtId === 'waiting' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCourtId('waiting')}>Wait for court</Button>
                    {courts.map(court => (
                      <Button key={court.id} variant={selectedCourtId === court.id ? 'default' : 'outline'} size="sm" disabled={court.status === 'occupied'} onClick={() => setSelectedCourtId(court.id)}>{court.name}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase font-black text-muted-foreground">2. Select Players ({selectedPlayerIds.length}/4)</Label>
                    <Badge variant="outline" className="text-[9px]">{availablePlayersCount} Available</Badge>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-md p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availablePlayers.map(player => {
                        const isSelected = selectedPlayerIds.includes(player.id);
                        return (
                          <Button key={player.id} variant={isSelected ? 'secondary' : 'outline'} className={cn("justify-between h-auto py-2.5 px-3 transition-all", isSelected && "ring-2 ring-primary border-primary bg-primary/10")} onClick={() => setSelectedPlayerIds(prev => isSelected ? prev.filter(id => id !== player.id) : (prev.length < 4 ? [...prev, player.id] : prev))}>
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-bold text-xs flex items-center gap-1.5">{player.name}{isSelected && <Check className="h-3 w-3 text-primary" />}</span>
                              <span className="text-[8px] uppercase text-muted-foreground font-black">Lvl {player.skillLevel} • {player.gamesPlayed} Games</span>
                            </div>
                            <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full h-11 font-bold" disabled={selectedPlayerIds.length !== 4} onClick={handleManualMatchSubmit}>{selectedCourtId === 'waiting' ? 'Add to Waiting Queue' : 'Start Match'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleAutoMatch} disabled={availablePlayersCount < 4} size="sm" className="gap-2 bg-primary font-bold h-9 shadow-lg shadow-primary/20">
            <Zap className="h-4 w-4 fill-white" /> Quick Match
          </Button>
        </div>
      </header>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-secondary/5">
        
        {/* Left Column: Bench & Queue */}
        <div className="lg:col-span-4 border-r flex flex-col h-full overflow-hidden">
          {/* Bench Section */}
          <section className="flex-1 flex flex-col min-h-0 border-b">
            <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary" /> The Bench</h2>
              <Badge variant="outline" className="text-[9px] px-1.5">{availablePlayersCount}</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {availablePlayers.map((player, idx) => (
                  <div key={player.id} className="flex items-center justify-between p-2.5 border rounded-lg bg-background hover:border-primary/50 transition-all">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">{player.name}</span>
                      <span className="text-[8px] uppercase font-black text-muted-foreground tracking-tight">Lvl {player.skillLevel} • {player.gamesPlayed} Games</span>
                    </div>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                ))}
                {availablePlayers.length === 0 && (
                  <div className="py-8 flex flex-col items-center justify-center text-muted-foreground text-[10px] gap-2">
                    <User className="h-6 w-6 opacity-10" /> No one on the bench.
                  </div>
                )}
              </div>
            </ScrollArea>
          </section>

          {/* Queue Section */}
          <section className="flex-1 flex flex-col min-h-0">
            <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><ListOrdered className="h-3.5 w-3.5 text-orange-500" /> Match Queue</h2>
              <Badge variant="outline" className="text-[9px] px-1.5 bg-orange-500/5 text-orange-600 border-orange-200">{waitingMatches.length}</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {waitingMatches.map(match => {
                  const teamA = match.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
                  const teamB = match.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
                  return (
                    <Card key={match.id} className="border-orange-500/20 bg-orange-500/5 shadow-sm overflow-hidden">
                      <CardHeader className="p-2 flex flex-row justify-between items-center bg-orange-500/10 border-b border-orange-500/5">
                        <span className="text-[9px] font-black uppercase text-orange-600">Pending Match</span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" className="h-6 w-6 bg-orange-500 hover:bg-orange-600" disabled={availableCourts.length === 0}><DoorOpen className="h-3 w-3" /></Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Assign Court</DialogTitle></DialogHeader>
                            <div className="grid grid-cols-2 gap-2 py-4">
                              {availableCourts.map(c => (
                                <Button key={c.id} variant="outline" className="h-14 font-bold" onClick={() => { assignMatchToCourt(match.id, c.id); toast({ title: "Assigned to " + c.name }); }}>{c.name}</Button>
                              ))}
                              {availableCourts.length === 0 && <p className="col-span-2 text-center py-4 text-sm text-muted-foreground italic">No courts available.</p>}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardHeader>
                      <CardContent className="p-2.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <div className="flex flex-col text-left">{teamA.map(p => <span key={p?.id}>{p?.name}</span>)}</div>
                          <span className="text-[9px] text-muted-foreground opacity-50 px-2 italic">VS</span>
                          <div className="flex flex-col text-right">{teamB.map(p => <span key={p?.id}>{p?.name}</span>)}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {waitingMatches.length === 0 && (
                  <div className="py-8 flex flex-col items-center justify-center text-muted-foreground text-[10px] gap-2 italic">
                    Queue is clear.
                  </div>
                )}
              </div>
            </ScrollArea>
          </section>
        </div>

        {/* Right Column: Active Courts */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><DoorOpen className="h-3.5 w-3.5 text-primary" /> Active Courts</h2>
            <Badge variant="outline" className="text-[9px] px-1.5">{occupiedCourtsCount}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courts.map(court => {
                const activeMatch = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const teamAPlayers = activeMatch?.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
                const teamBPlayers = activeMatch?.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
                const isTimerRunning = !!activeMatch?.startTime;

                return (
                  <Card key={court.id} className="border-2 shadow-sm flex flex-col h-fit transition-all hover:shadow-md">
                    <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 bg-secondary/10 border-b">
                      <CardTitle className="text-sm font-black uppercase tracking-tight truncate">{court.name}</CardTitle>
                      <Badge variant={court.status === 'available' ? 'outline' : 'default'} className={cn("text-[8px] font-black h-4 px-1.5", court.status === 'available' ? 'text-green-600 border-green-200' : 'bg-primary')}>
                        {court.status.toUpperCase()}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-3 flex-1 min-h-[140px]">
                      {court.status === 'occupied' && activeMatch ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <LiveTimer startTime={activeMatch?.startTime} />
                            <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-tight animate-pulse border-primary/30 text-primary">Live</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="p-2 bg-primary/5 rounded-lg border-l-2 border-primary space-y-1">
                              <p className="text-[7px] font-black uppercase text-primary tracking-widest">Team A</p>
                              {teamAPlayers?.map(p => (
                                <div key={p?.id} className="flex justify-between text-[10px] font-bold truncate">
                                  <span>{p?.name}</span>
                                  <span className="text-[8px] text-muted-foreground opacity-60">L{p?.skillLevel}</span>
                                </div>
                              ))}
                            </div>
                            <div className="p-2 bg-secondary/20 rounded-lg border-l-2 border-muted space-y-1">
                              <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Team B</p>
                              {teamBPlayers?.map(p => (
                                <div key={p?.id} className="flex justify-between text-[10px] font-bold truncate">
                                  <span>{p?.name}</span>
                                  <span className="text-[8px] text-muted-foreground opacity-60">L{p?.skillLevel}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-[10px] py-8 opacity-40 italic gap-2">
                          <Trophy className="h-5 w-5" /> Idle
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-2 border-t bg-secondary/5 mt-auto">
                      {court.status === 'occupied' ? (
                        <div className="flex gap-1 w-full">
                          {!isTimerRunning ? (
                            <Button onClick={() => startTimer(court.id)} className="w-full h-8 text-[9px] font-black uppercase bg-green-600 hover:bg-green-700"><Play className="h-3 w-3 mr-1" /> Start</Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setScoringCourtId(court.id)} className="w-full h-8 text-[9px] font-black uppercase hover:bg-primary hover:text-white">End Match</Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white" onClick={() => deleteCourt(court.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white ml-auto" onClick={() => deleteCourt(court.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Global Dialogs */}
      <Dialog open={!!swapping} onOpenChange={(open) => !open && setSwapping(null)}>
        <DialogContent><DialogHeader><DialogTitle>Swap Player</DialogTitle></DialogHeader>
          <ScrollArea className="h-[300px] p-2">
            {availablePlayers.map(player => (
              <Button key={player.id} variant="outline" className="w-full justify-between h-12 mb-2" onClick={() => handleSwap(player.id)}>
                <div className="flex flex-col items-start"><span className="font-bold text-xs">{player.name}</span><span className="text-[9px] text-muted-foreground uppercase">Lvl {player.skillLevel}</span></div>
                <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
              </Button>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {scoringCourtId && (() => {
        const court = courts.find(c => c.id === scoringCourtId);
        const match = matches.find(m => m.id === court?.currentMatchId);
        if (!match) return null;
        const teamA = players.filter(p => match.teamA.includes(p.id));
        const teamB = players.filter(p => match.teamB.includes(p.id));
        return (
          <MatchScoreDialog open={!!scoringCourtId} onOpenChange={(open) => !open && setScoringCourtId(null)} teamA={teamA} teamB={teamB} onScoreSubmit={handleScoreSubmit} onSkip={() => { if (scoringCourtId) setShowWinButtons(prev => ({ ...prev, [scoringCourtId]: true })); }} />
        );
      })()}
    </div>
  );
}
