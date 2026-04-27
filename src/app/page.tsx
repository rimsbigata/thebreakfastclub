
"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trophy, Trash2, Timer, Play, Zap, ArrowLeftRight, Activity, Users, DoorOpen, Hand, Check, ListOrdered, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateDeterministicMatch } from '@/lib/matchmaking';
import { MatchScoreDialog } from '@/components/match/MatchScoreDialog';

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
    <div className="flex items-center gap-1.5 text-primary font-mono text-[10px] font-bold animate-pulse">
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
    <Badge variant="secondary" className="gap-1 text-[8px] h-3.5 py-0 px-1 font-bold">
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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 border-b bg-card shrink-0">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight leading-none">Command Center</h1>
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Live Club Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddCourtOpen} onOpenChange={setIsAddCourtOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Court</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Court Name / Number</Label>
                  <Input placeholder="e.g. 1, 2, A, B" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCourtAction()} />
                </div>
                <Button className="w-full h-10 font-bold" onClick={handleAddCourtAction}>Save Court</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 font-bold h-8 text-xs">
                <Hand className="h-3.5 w-3.5" /> Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Manual Match</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">1. Select Court</Label>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant={selectedCourtId === 'waiting' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCourtId('waiting')}>Wait for court</Button>
                    {courts.map(court => (
                      <Button key={court.id} variant={selectedCourtId === court.id ? 'default' : 'outline'} size="sm" disabled={court.status === 'occupied'} onClick={() => setSelectedCourtId(court.id)}>{court.name}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground">2. Select Players ({selectedPlayerIds.length}/4)</Label>
                    <Badge variant="outline" className="text-[8px]">{availablePlayersCount} Available</Badge>
                  </div>
                  <ScrollArea className="h-[250px] border rounded-md p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availablePlayers.map(player => {
                        const isSelected = selectedPlayerIds.includes(player.id);
                        return (
                          <Button key={player.id} variant={isSelected ? 'secondary' : 'outline'} className={cn("justify-between h-auto py-2 px-3 transition-all", isSelected && "ring-2 ring-primary border-primary bg-primary/10")} onClick={() => setSelectedPlayerIds(prev => isSelected ? prev.filter(id => id !== player.id) : (prev.length < 4 ? [...prev, player.id] : prev))}>
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-bold text-[11px] flex items-center gap-1.5">{player.name}{isSelected && <Check className="h-3 w-3 text-primary" />}</span>
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
                <Button className="w-full h-10 font-bold" disabled={selectedPlayerIds.length !== 4} onClick={handleManualMatchSubmit}>{selectedCourtId === 'waiting' ? 'Add to Waiting Queue' : 'Start Match'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleAutoMatch} disabled={availablePlayersCount < 4} size="sm" className="gap-1.5 bg-primary font-bold h-8 text-xs shadow-md shadow-primary/20">
            <Zap className="h-3.5 w-3.5 fill-white" /> Quick Match
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-secondary/5">
        <div className="md:col-span-2 border-r flex flex-col h-full overflow-hidden bg-background/50">
          <div className="p-2.5 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Users className="h-3 w-3 text-primary" /> The Bench</h2>
            <Badge variant="outline" className="text-[8px] h-4 px-1">{availablePlayersCount}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1.5">
              {availablePlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 border rounded-lg bg-background hover:border-primary/50 transition-all group">
                  <div className="flex flex-col">
                    <span className="font-bold text-[11px] truncate max-w-[80px]">{player.name}</span>
                    <span className="text-[7px] uppercase font-black text-muted-foreground">Lvl {player.skillLevel}</span>
                  </div>
                  <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                </div>
              ))}
              {availablePlayers.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground text-[9px] gap-1.5 italic opacity-40">
                  <User className="h-5 w-5" /> Empty
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="md:col-span-3 border-r flex flex-col h-full overflow-hidden bg-background/50">
          <div className="p-2.5 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><ListOrdered className="h-3 w-3 text-orange-500" /> Queue</h2>
            <Badge variant="outline" className="text-[8px] h-4 px-1 bg-orange-500/5 text-orange-600 border-orange-200">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {waitingMatches.map(match => {
                const teamA = match.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
                const teamB = match.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
                return (
                  <Card key={match.id} className="border-orange-500/20 bg-orange-500/5 shadow-sm overflow-hidden">
                    <CardHeader className="p-1.5 flex flex-row justify-between items-center bg-orange-500/10 border-b border-orange-500/5">
                      <span className="text-[8px] font-black uppercase text-orange-600">Queued</span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" className="h-5 w-5 bg-orange-500 hover:bg-orange-600" disabled={availableCourts.length === 0}><DoorOpen className="h-3 w-3" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Assign Court</DialogTitle></DialogHeader>
                          <div className="grid grid-cols-2 gap-2 py-4">
                            {availableCourts.map(c => (
                              <Button key={c.id} variant="outline" className="h-14 font-bold" onClick={() => { assignMatchToCourt(match.id, c.id); toast({ title: "Assigned to " + c.name }); }}>{c.name}</Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <div className="flex flex-col text-left space-y-0.5">{teamA.map(p => <span key={p?.id} className="truncate max-w-[60px]">{p?.name}</span>)}</div>
                        <span className="text-[8px] text-muted-foreground opacity-50 px-1 font-black">VS</span>
                        <div className="flex flex-col text-right space-y-0.5">{teamB.map(p => <span key={p?.id} className="truncate max-w-[60px]">{p?.name}</span>)}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {waitingMatches.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground text-[9px] gap-1.5 italic opacity-40">
                  <ListOrdered className="h-5 w-5" /> Clear
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="md:col-span-7 flex flex-col h-full overflow-hidden">
          <div className="p-2.5 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><DoorOpen className="h-3 w-3 text-primary" /> Active Courts</h2>
            <Badge variant="outline" className="text-[8px] h-4 px-1">{occupiedCourtsCount}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courts.map(court => {
                const activeMatch = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const teamAPlayers = activeMatch?.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
                const teamBPlayers = activeMatch?.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
                const isTimerRunning = !!activeMatch?.startTime;

                return (
                  <Card key={court.id} className="border-2 shadow-sm flex flex-col h-fit transition-all hover:shadow-md group">
                    <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0 bg-secondary/10 border-b">
                      <CardTitle className="text-[11px] font-black uppercase tracking-tight truncate">{court.name}</CardTitle>
                      <Badge variant={court.status === 'available' ? 'outline' : 'default'} className={cn("text-[7px] font-black h-3.5 px-1", court.status === 'available' ? 'text-green-600 border-green-200' : 'bg-primary')}>
                        {court.status.toUpperCase()}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-2.5 flex-1 min-h-[100px]">
                      {court.status === 'occupied' && activeMatch ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <LiveTimer startTime={activeMatch?.startTime} />
                            <Badge variant="outline" className="text-[7px] font-bold uppercase animate-pulse border-primary/30 text-primary h-3.5 px-1">Live</Badge>
                          </div>
                          <div className="space-y-1.5">
                            <div className="p-1.5 bg-primary/5 rounded border-l-2 border-primary space-y-1">
                              <p className="text-[6px] font-black uppercase text-primary tracking-widest">Team A</p>
                              {teamAPlayers?.map(p => (
                                <div key={p?.id} className="flex justify-between items-center group/player">
                                  <div className="flex flex-col text-[10px] font-bold leading-none">
                                    <span className="truncate max-w-[70px]">{p?.name}</span>
                                    <span className="text-[6px] text-muted-foreground opacity-60">L{p?.skillLevel}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-4 w-4 text-muted-foreground hover:bg-primary hover:text-white transition-opacity opacity-0 group-hover/player:opacity-100"
                                    onClick={() => setSwapping({ matchId: activeMatch.id, oldPlayerId: p?.id! })}
                                  >
                                    <ArrowLeftRight className="h-2 w-2" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="p-1.5 bg-secondary/20 rounded border-l-2 border-muted space-y-1">
                              <p className="text-[6px] font-black uppercase text-muted-foreground tracking-widest">Team B</p>
                              {teamBPlayers?.map(p => (
                                <div key={p?.id} className="flex justify-between items-center group/player">
                                  <div className="flex flex-col text-[10px] font-bold leading-none">
                                    <span className="truncate max-w-[70px]">{p?.name}</span>
                                    <span className="text-[6px] text-muted-foreground opacity-60">L{p?.skillLevel}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-4 w-4 text-muted-foreground hover:bg-primary hover:text-white transition-opacity opacity-0 group-hover/player:opacity-100"
                                    onClick={() => setSwapping({ matchId: activeMatch.id, oldPlayerId: p?.id! })}
                                  >
                                    <ArrowLeftRight className="h-2 w-2" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-[9px] py-4 opacity-30 italic gap-1">
                          <Trophy className="h-4 w-4" /> Idle
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-1.5 border-t bg-secondary/5 mt-auto">
                      {court.status === 'occupied' ? (
                        <div className="flex gap-1 w-full">
                          {!isTimerRunning ? (
                            <Button onClick={() => startTimer(court.id)} size="sm" className="w-full h-7 text-[8px] font-black uppercase bg-green-600 hover:bg-green-700"><Play className="h-3 w-3 mr-1" /> Start</Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setScoringCourtId(court.id)} className="w-full h-7 text-[8px] font-black uppercase hover:bg-primary hover:text-white">End Match</Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-destructive hover:text-white" onClick={() => deleteCourt(court.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-destructive hover:text-white ml-auto" onClick={() => deleteCourt(court.id)}><Trash2 className="h-3 w-3" /></Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={!!swapping} onOpenChange={(open) => !open && setSwapping(null)}>
        <DialogContent><DialogHeader><DialogTitle>Swap Player</DialogTitle></DialogHeader>
          <div className="py-2 text-xs text-muted-foreground uppercase font-black tracking-widest mb-2">Select Replacement:</div>
          <ScrollArea className="h-[250px] p-1">
            {availablePlayers.map(player => (
              <Button key={player.id} variant="outline" className="w-full justify-between h-10 mb-2 px-3 hover:border-primary hover:bg-primary/5" onClick={() => handleSwap(player.id)}>
                <div className="flex flex-col items-start"><span className="font-bold text-[11px]">{player.name}</span><span className="text-[8px] text-muted-foreground uppercase">Lvl {player.skillLevel}</span></div>
                <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
              </Button>
            ))}
            {availablePlayers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm italic">No players available on the bench.</div>
            )}
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
          <MatchScoreDialog open={!!scoringCourtId} onOpenChange={(open) => !open && setScoringCourtId(null)} teamA={teamA} teamB={teamB} onScoreSubmit={handleScoreSubmit} />
        );
      })()}
    </div>
  );
}
