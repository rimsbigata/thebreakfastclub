
"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trophy, Trash2, Timer, Play, Zap, ArrowLeftRight, Users, DoorOpen, Hand, Check, ListOrdered, User, Clock, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { generateDeterministicMatch } from '@/lib/matchmaking';
import { MatchScoreDialog } from '@/components/match/MatchScoreDialog';
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
  
  // Drag and Drop States
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);
  const [draftPlayerIds, setDraftPlayerIds] = useState<string[]>([]);
  const [isQueueOver, setIsQueueOver] = useState(false);
  const [overCourtId, setOverCourtId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const availablePlayers = players
    .filter(p => p.status === 'available')
    .sort((a, b) => (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0));
  
  const availablePlayersCount = availablePlayers.length;
  const occupiedCourtsCount = courts.filter(c => c.status === 'occupied').length;
  const waitingMatches = matches.filter(m => !m.isCompleted && !m.courtId);
  const availableCourts = courts.filter(c => c.status === 'available');

  const logoSrc = clubLogo || "/assets/image/tbc_logo_loading.png";

  if (!mounted) return null;

  // Handlers
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

  // HTML5 Drag and Drop Handlers
  const onDragStartPlayer = (e: React.DragEvent, playerId: string) => {
    setDraggedPlayerId(playerId);
    e.dataTransfer.setData("playerId", playerId);
  };

  const onDragStartMatch = (e: React.DragEvent, matchId: string) => {
    setDraggedMatchId(matchId);
    e.dataTransfer.setData("matchId", matchId);
  };

  const onDropInQueue = (e: React.DragEvent) => {
    e.preventDefault();
    setIsQueueOver(false);
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;

    if (draftPlayerIds.includes(playerId)) {
      toast({ title: "Player already in draft", variant: "destructive" });
      return;
    }

    const newDraft = [...draftPlayerIds, playerId];
    if (newDraft.length === 4) {
      // Create a waiting match
      startMatch({
        teamA: [newDraft[0], newDraft[1]],
        teamB: [newDraft[2], newDraft[3]],
        courtId: undefined,
      });
      setDraftPlayerIds([]);
      toast({ title: "Match Queued via Drag & Drop" });
    } else {
      setDraftPlayerIds(newDraft);
      toast({ title: `Drafting: ${newDraft.length}/4 players ready` });
    }
  };

  const onDropInCourt = (e: React.DragEvent, courtId: string) => {
    e.preventDefault();
    setOverCourtId(null);
    const matchId = e.dataTransfer.getData("matchId");
    if (!matchId) return;

    const court = courts.find(c => c.id === courtId);
    if (court?.status === 'occupied') {
      toast({ title: "Court occupied", variant: "destructive" });
      return;
    }

    assignMatchToCourt(matchId, courtId);
    toast({ title: `Match assigned to ${court?.name}` });
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border-2 border-primary bg-white shadow-sm">
            <img src={logoSrc} alt="Club Logo" className="object-cover h-full w-full" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight leading-none">Command Center</h1>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Live Drag & Drop Operations</p>
          </div>
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
                  <Input placeholder="e.g. 1, 2, A, B" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} />
                </div>
                <Button className="w-full h-10 font-bold" onClick={handleAddCourtAction}>Save Court</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleAutoMatch} disabled={availablePlayersCount < 4} size="sm" className="gap-1.5 bg-primary font-bold h-8 text-xs shadow-md shadow-primary/20">
            <Zap className="h-3.5 w-3.5 fill-white" /> Quick Match
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-secondary/5">
        
        {/* PANEL 1: THE BENCH */}
        <div className="md:col-span-3 border-r flex flex-col h-full overflow-hidden bg-background/50">
          <div className="p-2.5 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">The Bench</h2>
            <Badge variant="outline" className="text-[8px] h-4 px-1">{availablePlayersCount}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {availablePlayers.map((player) => (
                <div 
                  key={player.id} 
                  draggable 
                  onDragStart={(e) => onDragStartPlayer(e, player.id)}
                  className="flex flex-col p-3 border rounded-xl bg-background hover:border-primary/50 transition-all group cursor-grab active:cursor-grabbing shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs truncate max-w-[120px] group-hover:text-primary transition-colors">{player.name}</span>
                      <span className="text-[8px] uppercase font-black text-muted-foreground">{SKILL_LEVELS[player.skillLevel]}</span>
                    </div>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 border-t pt-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7px] uppercase font-black text-muted-foreground/60">Games</span>
                      <span className="text-[10px] font-bold">{player.gamesPlayed}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                      <span className="text-[7px] uppercase font-black text-muted-foreground/60">Time</span>
                      <span className="text-[10px] font-bold">{player.totalPlayTimeMinutes}m</span>
                    </div>
                  </div>
                </div>
              ))}
              {availablePlayers.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-[10px] gap-2 italic opacity-40">
                  <User className="h-8 w-8" />
                  No players waiting
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* PANEL 2: MATCH QUEUE */}
        <div 
          className={cn(
            "md:col-span-3 border-r flex flex-col h-full overflow-hidden transition-all",
            isQueueOver ? "bg-primary/5 border-primary/50" : "bg-background/50"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsQueueOver(true); }}
          onDragLeave={() => setIsQueueOver(false)}
          onDrop={onDropInQueue}
        >
          <div className="p-2.5 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">Match Queue</h2>
            <Badge variant="outline" className="text-[8px] h-4 px-1 bg-orange-500/5 text-orange-600 border-orange-200">
              {waitingMatches.length}
            </Badge>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3">
              {/* Drafting Area */}
              {draftPlayerIds.length > 0 && (
                <Card className="border-dashed border-2 border-primary/30 bg-primary/5 shadow-none">
                  <CardHeader className="p-2 border-b border-primary/10">
                    <span className="text-[8px] font-black uppercase text-primary">Drafting Match ({draftPlayerIds.length}/4)</span>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1">
                    {draftPlayerIds.map(id => {
                      const p = players.find(player => player.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between bg-background p-1.5 rounded border text-[10px] font-bold">
                          {p?.name}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 text-muted-foreground hover:text-destructive"
                            onClick={() => setDraftPlayerIds(prev => prev.filter(pid => pid !== id))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Waiting Matches */}
              {waitingMatches.map(match => {
                const teamA = match.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
                const teamB = match.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
                return (
                  <Card 
                    key={match.id} 
                    draggable 
                    onDragStart={(e) => onDragStartMatch(e, match.id)}
                    className="border-orange-500/20 bg-orange-500/5 shadow-sm overflow-hidden cursor-grab active:cursor-grabbing hover:border-orange-500/40 transition-all"
                  >
                    <CardHeader className="p-1.5 flex flex-row justify-between items-center bg-orange-500/10 border-b border-orange-500/5">
                      <span className="text-[8px] font-black uppercase text-orange-600">Waiting for Court</span>
                      <DoorOpen className="h-3 w-3 text-orange-400" />
                    </CardHeader>
                    <CardContent className="p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-0.5 text-left">
                          {teamA.map(p => <span key={p?.id} className="text-[10px] font-bold truncate max-w-[80px]">{p?.name}</span>)}
                        </div>
                        <Badge variant="outline" className="text-[8px] h-4 px-1 font-black opacity-50">VS</Badge>
                        <div className="flex flex-col space-y-0.5 text-right">
                          {teamB.map(p => <span key={p?.id} className="text-[10px] font-bold truncate max-w-[80px]">{p?.name}</span>)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {waitingMatches.length === 0 && draftPlayerIds.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-[10px] gap-2 italic opacity-40">
                  <ListOrdered className="h-8 w-8" />
                  Queue is empty
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* PANEL 3: ACTIVE COURTS */}
        <div className="md:col-span-6 flex flex-col h-full overflow-hidden">
          <div className="p-2.5 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">Active Courts</h2>
            <Badge variant="outline" className="text-[8px] h-4 px-1">{occupiedCourtsCount}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
              {courts.map(court => {
                const activeMatch = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const teamAPlayers = activeMatch?.teamA.map(id => players.find(p => p.id === id)).filter(Boolean);
                const teamBPlayers = activeMatch?.teamB.map(id => players.find(p => p.id === id)).filter(Boolean);
                const isTimerRunning = !!activeMatch?.startTime;
                const isOver = overCourtId === court.id;

                return (
                  <Card 
                    key={court.id} 
                    onDragOver={(e) => { e.preventDefault(); if (court.status === 'available') setOverCourtId(court.id); }}
                    onDragLeave={() => setOverCourtId(null)}
                    onDrop={(e) => onDropInCourt(e, court.id)}
                    className={cn(
                      "border-2 shadow-sm flex flex-col h-fit transition-all duration-200",
                      isOver ? "border-primary bg-primary/5 scale-105 shadow-xl z-20" : "border-border",
                      court.status === 'occupied' ? "bg-background" : "bg-secondary/5"
                    )}
                  >
                    <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0 bg-secondary/10 border-b">
                      <CardTitle className="text-xs font-black uppercase tracking-tight truncate">{court.name}</CardTitle>
                      <Badge 
                        variant={court.status === 'available' ? 'outline' : 'default'} 
                        className={cn("text-[7px] font-black h-4 px-1.5", court.status === 'available' ? 'text-green-600 border-green-200' : 'bg-primary')}
                      >
                        {court.status.toUpperCase()}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-3 flex-1 min-h-[140px]">
                      {court.status === 'occupied' && activeMatch ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <LiveTimer startTime={activeMatch?.startTime} />
                            <Badge variant="outline" className="text-[7px] font-bold uppercase animate-pulse border-primary/30 text-primary h-4 px-1.5">Live</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 bg-primary/5 rounded-xl border-l-4 border-primary space-y-1.5">
                              <p className="text-[7px] font-black uppercase text-primary tracking-widest mb-1">Team A</p>
                              {teamAPlayers?.map(p => (
                                <div key={p?.id} className="flex justify-between items-center group/player">
                                  <div className="flex flex-col text-[11px] font-bold leading-tight">
                                    <span className="truncate max-w-[80px]">{p?.name}</span>
                                    <span className="text-[8px] text-muted-foreground opacity-60">Lvl {p?.skillLevel}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 text-muted-foreground hover:bg-primary hover:text-white transition-opacity opacity-0 group-hover/player:opacity-100"
                                    onClick={() => setSwapping({ matchId: activeMatch.id, oldPlayerId: p?.id! })}
                                  >
                                    <ArrowLeftRight className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="p-2 bg-secondary/30 rounded-xl border-l-4 border-muted space-y-1.5">
                              <p className="text-[7px] font-black uppercase text-muted-foreground tracking-widest mb-1">Team B</p>
                              {teamBPlayers?.map(p => (
                                <div key={p?.id} className="flex justify-between items-center group/player">
                                  <div className="flex flex-col text-[11px] font-bold leading-tight">
                                    <span className="truncate max-w-[80px]">{p?.name}</span>
                                    <span className="text-[8px] text-muted-foreground opacity-60">Lvl {p?.skillLevel}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 text-muted-foreground hover:bg-primary hover:text-white transition-opacity opacity-0 group-hover/player:opacity-100"
                                    onClick={() => setSwapping({ matchId: activeMatch.id, oldPlayerId: p?.id! })}
                                  >
                                    <ArrowLeftRight className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8 gap-3 opacity-30 italic">
                          <DoorOpen className={cn("h-10 w-10 transition-transform", isOver && "scale-110 text-primary opacity-100")} />
                          <p className="text-[10px] font-bold uppercase tracking-widest">
                            {isOver ? "Release to Assign" : "Drop Match Here"}
                          </p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-2 border-t bg-secondary/10 mt-auto">
                      {court.status === 'occupied' ? (
                        <div className="flex gap-2 w-full">
                          {!isTimerRunning ? (
                            <Button onClick={() => startTimer(court.id)} size="sm" className="w-full h-8 text-[10px] font-black uppercase bg-green-600 hover:bg-green-700">
                              <Play className="h-3.5 w-3.5 mr-1.5" /> Start Timer
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setScoringCourtId(court.id)} className="w-full h-8 text-[10px] font-black uppercase hover:bg-primary hover:text-white">
                              End & Score
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white" onClick={() => deleteCourt(court.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white ml-auto" onClick={() => deleteCourt(court.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* MODALS */}
      <Dialog open={!!swapping} onOpenChange={(open) => !open && setSwapping(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Swap Player</DialogTitle></DialogHeader>
          <div className="py-2 text-xs text-muted-foreground uppercase font-black tracking-widest mb-2">Select Replacement:</div>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {availablePlayers.map(player => (
                <Button 
                  key={player.id} 
                  variant="outline" 
                  className="w-full justify-between h-auto py-3 px-4 hover:border-primary hover:bg-primary/5 transition-all" 
                  onClick={() => handleSwap(player.id)}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-bold text-sm">{player.name}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-black">Lvl {player.skillLevel} • {player.gamesPlayed} Games</span>
                  </div>
                  <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                </Button>
              ))}
              {availablePlayers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm italic border-2 border-dashed rounded-xl">
                  No players available on the bench.
                </div>
              )}
            </div>
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
