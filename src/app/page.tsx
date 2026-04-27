
"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Timer, Play, Zap, ArrowLeftRight, User, DoorOpen, ListOrdered } from 'lucide-react';
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
    <div className="flex items-center gap-1.5 text-primary font-mono text-xs font-black animate-pulse bg-primary/10 px-2 py-0.5 rounded-full">
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
    <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5 font-black uppercase tracking-tighter bg-secondary border shadow-sm">
      {mins}m wait
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
  
  const waitingMatches = matches.filter(m => !m.isCompleted && !m.courtId);

  if (!mounted) return null;

  const handleAddCourtAction = () => {
    if (!newCourtName) return;
    addCourt(newCourtName);
    setNewCourtName('');
    setIsAddCourtOpen(false);
    toast({ title: "Court Added" });
  };

  const handleAutoMatch = () => {
    const result = generateDeterministicMatch(availablePlayers, courts.filter(c => c.status === 'available'));
    if (result.matchCreated && result.teamA && result.teamB) {
      startMatch({ teamA: result.teamA, teamB: result.teamB, courtId: result.courtId });
      toast({ title: result.courtId ? "Match Created!" : "Match Queued!" });
    } else {
      toast({ title: "Matchmaking Error", description: result.error || "Need 4 players.", variant: "destructive" });
    }
  };

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
    if (!playerId || draftPlayerIds.includes(playerId)) return;

    const newDraft = [...draftPlayerIds, playerId];
    if (newDraft.length === 4) {
      startMatch({ teamA: [newDraft[0], newDraft[1]], teamB: [newDraft[2], newDraft[3]], courtId: undefined });
      setDraftPlayerIds([]);
    } else {
      setDraftPlayerIds(newDraft);
    }
  };

  const onDropInCourt = (e: React.DragEvent, courtId: string) => {
    e.preventDefault();
    setOverCourtId(null);
    const matchId = e.dataTransfer.getData("matchId");
    if (!matchId) return;

    const court = courts.find(c => c.id === courtId);
    if (court?.status === 'occupied') return;

    assignMatchToCourt(matchId, courtId);
  };

  const handleSwap = (newPlayerId: string) => {
    if (!swapping) return;
    swapPlayer(swapping.matchId, swapping.oldPlayerId, newPlayerId);
    setSwapping(null);
  };

  const handleScoreSubmit = (teamAScore: number | undefined, teamBScore: number | undefined, winner: 'teamA' | 'teamB') => {
    if (scoringCourtId) {
      endMatch(scoringCourtId, winner, teamAScore, teamBScore);
      setScoringCourtId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden animate-in fade-in duration-700 bg-background text-foreground">
      <header className="flex flex-row items-center justify-between gap-4 p-4 border-b bg-card shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <img src="/assets/image/tbc_logo_loading.png" alt="Club Logo" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Command Center</h1>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Live Club Operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddCourtOpen} onOpenChange={setIsAddCourtOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 border-2 hover:bg-secondary">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Court</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Court Identifier</Label>
                  <Input placeholder="e.g. 1, 2, Blue" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} />
                </div>
                <Button className="w-full font-bold" onClick={handleAddCourtAction}>Save Court</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleAutoMatch} disabled={availablePlayers.length < 4} className="gap-2 bg-primary font-black uppercase text-xs h-9 px-4 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
            <Zap className="h-4 w-4 fill-white" /> Quick Match
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* PANEL 1: THE BENCH */}
        <div className="md:col-span-3 border-r flex flex-col h-full bg-secondary/20">
          <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> The Bench
            </h2>
            <Badge variant="outline" className="font-black h-5 px-1.5 border-primary/20">{availablePlayers.length}</Badge>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-2 pb-10">
              {availablePlayers.map((player) => (
                <Card 
                  key={player.id} 
                  draggable 
                  onDragStart={(e) => onDragStartPlayer(e, player.id)}
                  className="p-3 cursor-grab active:cursor-grabbing hover:border-primary transition-all border-2 bg-card shadow-sm group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="font-black text-sm group-hover:text-primary transition-colors">{player.name}</span>
                      <span className="text-[9px] uppercase font-black text-muted-foreground">{SKILL_LEVELS[player.skillLevel]}</span>
                    </div>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t pt-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase font-black text-muted-foreground">Games</span>
                      <span className="text-xs font-black">{player.gamesPlayed}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] uppercase font-black text-muted-foreground">Total Time</span>
                      <span className="text-xs font-black">{player.totalPlayTimeMinutes}m</span>
                    </div>
                  </div>
                </Card>
              ))}
              {availablePlayers.length === 0 && (
                <div className="py-20 text-center text-muted-foreground text-xs font-bold italic opacity-30">Bench is Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* PANEL 2: MATCH QUEUE */}
        <div 
          className={cn(
            "md:col-span-3 border-r flex flex-col h-full bg-background transition-all",
            isQueueOver ? "ring-4 ring-inset ring-primary/20 bg-primary/5" : ""
          )}
          onDragOver={(e) => { e.preventDefault(); setIsQueueOver(true); }}
          onDragLeave={() => setIsQueueOver(false)}
          onDrop={onDropInQueue}
        >
          <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-orange-500" /> Match Queue
            </h2>
            <Badge variant="secondary" className="font-black h-5 px-1.5 bg-orange-500 text-white border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-3 pb-10">
              {draftPlayerIds.length > 0 && (
                <Card className="border-dashed border-2 border-primary/50 bg-primary/5 p-2 space-y-1">
                  <p className="text-[9px] font-black uppercase text-primary mb-1">Drafting ({draftPlayerIds.length}/4)</p>
                  {draftPlayerIds.map(id => (
                    <div key={id} className="text-xs font-black bg-card p-1.5 rounded border shadow-sm flex justify-between items-center">
                      {players.find(p => p.id === id)?.name}
                      <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setDraftPlayerIds(prev => prev.filter(pid => pid !== id))}>
                        <Plus className="h-3 w-3 rotate-45" />
                      </Button>
                    </div>
                  ))}
                </Card>
              )}
              {waitingMatches.map(match => (
                <Card 
                  key={match.id} 
                  draggable 
                  onDragStart={(e) => onDragStartMatch(e, match.id)}
                  className="border-2 border-orange-500/30 bg-orange-500/5 cursor-grab active:cursor-grabbing hover:border-orange-500 transition-all overflow-hidden"
                >
                  <div className="bg-orange-500/10 p-1 text-center text-[8px] font-black uppercase text-orange-600 tracking-widest">Awaiting Court</div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="flex flex-col space-y-1 flex-1">
                      {match.teamA.map(id => <span key={id} className="text-[11px] font-black truncate">{players.find(p => p.id === id)?.name}</span>)}
                    </div>
                    <div className="text-[10px] font-black opacity-30">VS</div>
                    <div className="flex flex-col space-y-1 flex-1 text-right">
                      {match.teamB.map(id => <span key={id} className="text-[11px] font-black truncate">{players.find(p => p.id === id)?.name}</span>)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* PANEL 3: ACTIVE COURTS */}
        <div className="md:col-span-6 flex flex-col h-full bg-secondary/5">
          <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-green-600" /> Active Courts
            </h2>
            <Badge variant="outline" className="font-black h-5 px-1.5">{courts.filter(c => c.status === 'occupied').length}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-10">
              {courts.map(court => {
                const match = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const isOver = overCourtId === court.id;
                return (
                  <Card 
                    key={court.id} 
                    onDragOver={(e) => { e.preventDefault(); if (court.status === 'available') setOverCourtId(court.id); }}
                    onDragLeave={() => setOverCourtId(null)}
                    onDrop={(e) => onDropInCourt(e, court.id)}
                    className={cn(
                      "border-2 transition-all duration-200 overflow-hidden h-fit flex flex-col",
                      isOver ? "border-primary bg-primary/5 scale-105 z-20 shadow-xl" : "border-border shadow-sm",
                      court.status === 'occupied' ? "bg-card" : "bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "p-2 flex justify-between items-center border-b",
                      court.status === 'occupied' ? "bg-primary/5" : "bg-muted"
                    )}>
                      <span className="text-xs font-black uppercase tracking-tight">{court.name}</span>
                      <Badge variant={court.status === 'available' ? 'outline' : 'default'} className="text-[8px] font-black uppercase px-1.5 h-4">
                        {court.status}
                      </Badge>
                    </div>
                    <CardContent className="p-3 flex-1 min-h-[140px]">
                      {court.status === 'occupied' && match ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <LiveTimer startTime={match.startTime} />
                            <Badge className="bg-primary animate-pulse text-[8px] h-4 font-black">LIVE</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2 p-2 bg-primary/5 rounded-xl border-l-4 border-primary shadow-inner">
                              <p className="text-[8px] font-black uppercase text-primary/60 tracking-widest">Team A</p>
                              {match.teamA.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center group/p">
                                    <span className="text-[11px] font-black truncate max-w-[80px]">{p?.name}</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/p:opacity-100 transition-opacity" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                      <ArrowLeftRight className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="space-y-2 p-2 bg-muted/50 rounded-xl border-l-4 border-muted-foreground/30 shadow-inner">
                              <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Team B</p>
                              {match.teamB.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center group/p">
                                    <span className="text-[11px] font-black truncate max-w-[80px]">{p?.name}</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/p:opacity-100 transition-opacity" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                      <ArrowLeftRight className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full py-10 flex flex-col items-center justify-center opacity-20 italic">
                          <Zap className={cn("h-10 w-10 mb-2 transition-all", isOver ? "scale-125 opacity-100 text-primary" : "")} />
                          <p className="text-[10px] font-black uppercase tracking-widest">{isOver ? "Release to Start" : "Drag Match Here"}</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-2 border-t bg-secondary/10 mt-auto">
                      {court.status === 'occupied' ? (
                        <div className="flex gap-2 w-full">
                          {!match?.startTime ? (
                            <Button onClick={() => startTimer(court.id)} size="sm" className="w-full h-8 bg-green-600 hover:bg-green-700 font-black text-[10px] uppercase">
                              <Play className="h-3.5 w-3.5 mr-1" /> Start Timer
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setScoringCourtId(court.id)} className="w-full h-8 border-2 font-black text-[10px] uppercase hover:bg-primary hover:text-white transition-all">
                              Finish & Score
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive hover:text-white" onClick={() => deleteCourt(court.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive hover:text-white ml-auto" onClick={() => deleteCourt(court.id)}>
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

      <Dialog open={!!swapping} onOpenChange={(open) => !open && setSwapping(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Swap Player</DialogTitle></DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {availablePlayers.map(p => (
                <Button key={p.id} variant="outline" className="w-full justify-between h-auto py-3 px-4 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleSwap(p.id)}>
                  <div className="flex flex-col items-start">
                    <span className="font-black text-sm">{p.name}</span>
                    <span className="text-[9px] uppercase font-black text-muted-foreground">Lvl {p.skillLevel} • {p.gamesPlayed} Games</span>
                  </div>
                  <WaitTimeBadge lastAvailableAt={p.lastAvailableAt} />
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {scoringCourtId && (() => {
        const court = courts.find(c => c.id === scoringCourtId);
        const match = matches.find(m => m.id === court?.currentMatchId);
        if (!match) return null;
        return (
          <MatchScoreDialog open={!!scoringCourtId} onOpenChange={(open) => !open && setScoringCourtId(null)} teamA={players.filter(p => match.teamA.includes(p.id))} teamB={players.filter(p => match.teamB.includes(p.id))} onScoreSubmit={handleScoreSubmit} />
        );
      })()}
    </div>
  );
}
