"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Trash2, Timer, Play, Zap, ArrowLeftRight, User, DoorOpen, ListOrdered, X, CheckCircle2, Ban, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';

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
    <div className="flex items-center gap-2 text-primary font-mono text-base font-black animate-pulse bg-primary/10 px-4 py-1.5 rounded-full">
      <Timer className="h-5 w-5" />
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
    <Badge variant="secondary" className="gap-1 text-xs h-6 px-2.5 font-black uppercase tracking-tighter bg-secondary border shadow-sm">
      {mins}m
    </Badge>
  );
}

export default function HomePage() {
  const { 
    courts, players, matches, deleteCourt, startMatch, startTimer, 
    endMatch, swapPlayer, assignMatchToCourt, createCourtAndAssignMatch,
    updateMatchScore, addCourt
  } = useClub();
  const { toast } = useToast();
  const [swapping, setSwapping] = useState<{ matchId: string; oldPlayerId: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const [draftPlayerIds, setDraftPlayerIds] = useState<string[]>([]);
  const [courtDrafts, setCourtDrafts] = useState<Record<string, string[]>>({}); 
  
  const [isQueueOver, setIsQueueOver] = useState(false);
  const [overCourtId, setOverCourtId] = useState<string | null>(null);
  const [isCourtPanelOver, setIsCourtPanelOver] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allDraftedIds = [
    ...draftPlayerIds,
    ...Object.values(courtDrafts).flat()
  ];

  const availablePlayers = players
    .filter(p => p.status === 'available' && !allDraftedIds.includes(p.id))
    .sort((a, b) => (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0));
  
  const waitingMatches = matches.filter(m => !m.isCompleted && !m.courtId);

  if (!mounted) return null;

  const onDragStartPlayer = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
  };

  const onDragStartMatch = (e: React.DragEvent, matchId: string) => {
    e.dataTransfer.setData("matchId", matchId);
  };

  const onDropInQueue = (e: React.DragEvent) => {
    e.preventDefault();
    setIsQueueOver(false);
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId || allDraftedIds.includes(playerId)) return;

    const newDraft = [...draftPlayerIds, playerId];
    if (newDraft.length === 4) {
      startMatch({ teamA: [newDraft[0], newDraft[1]], teamB: [newDraft[2], newDraft[3]], courtId: undefined });
      setDraftPlayerIds([]);
      toast({ title: "Match Drafted", description: "Created in queue." });
    } else {
      setDraftPlayerIds(newDraft);
    }
  };

  const onDropInCourt = (e: React.DragEvent, courtId: string) => {
    e.preventDefault();
    setOverCourtId(null);
    
    const matchId = e.dataTransfer.getData("matchId");
    const playerId = e.dataTransfer.getData("playerId");

    if (matchId) {
      const court = courts.find(c => c.id === courtId);
      if (court?.status === 'occupied') return;
      assignMatchToCourt(matchId, courtId);
      return;
    }

    if (playerId) {
      if (allDraftedIds.includes(playerId)) return;
      const court = courts.find(c => c.id === courtId);
      if (court?.status === 'occupied') return;

      const currentDraft = courtDrafts[courtId] || [];
      const newDraft = [...currentDraft, playerId];

      if (newDraft.length === 4) {
        startMatch({ teamA: [newDraft[0], newDraft[1]], teamB: [newDraft[2], newDraft[3]], courtId });
        setCourtDrafts(prev => {
          const next = { ...prev };
          delete next[courtId];
          return next;
        });
      } else {
        setCourtDrafts(prev => ({ ...prev, [courtId]: newDraft }));
      }
    }
  };

  const onDropInCourtPanel = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCourtPanelOver(false);
    
    const matchId = e.dataTransfer.getData("matchId");
    const playerId = e.dataTransfer.getData("playerId");

    if (matchId) {
      createCourtAndAssignMatch(matchId);
      return;
    }

    if (playerId) {
      if (allDraftedIds.includes(playerId)) return;
      const newCourtId = addCourt();
      setCourtDrafts(prev => ({ ...prev, [newCourtId]: [playerId] }));
    }
  };

  const handleSwap = (newPlayerId: string) => {
    if (!swapping) return;
    swapPlayer(swapping.matchId, swapping.oldPlayerId, newPlayerId);
    setSwapping(null);
  };

  const handleScoreChange = (matchId: string, scoreA: number, scoreB: number) => {
    const validA = Math.max(0, scoreA);
    const validB = Math.max(0, scoreB);
    updateMatchScore(matchId, validA, validB);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        
        {/* THE BENCH */}
        <div className="md:col-span-3 border-r flex flex-col min-h-0 bg-secondary/5">
          <div className="p-4 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> The Bench
            </h2>
            <Badge variant="outline" className="font-black h-6 px-3 text-sm">{availablePlayers.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-2 gap-3 pb-24">
              {availablePlayers.map((player) => (
                <Card 
                  key={player.id} 
                  draggable 
                  onDragStart={(e) => onDragStartPlayer(e, player.id)}
                  className="p-4 cursor-grab active:cursor-grabbing hover:border-primary transition-all border-2 shadow-sm group bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-base truncate leading-tight">{player.name}</span>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                  <div className="flex justify-between items-center opacity-80">
                    <Badge variant="outline" className={cn("text-[11px] font-black uppercase h-5 px-2", getSkillColor(player.skillLevel))}>
                      {SKILL_LEVELS_SHORT[player.skillLevel]}
                    </Badge>
                    <span className="text-sm font-black">{player.gamesPlayed} Gms</span>
                  </div>
                </Card>
              ))}
              {availablePlayers.length === 0 && (
                <div className="col-span-2 py-32 text-center text-muted-foreground text-base font-bold italic opacity-30">The bench is empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* MATCH QUEUE */}
        <div 
          className={cn(
            "md:col-span-3 border-r flex flex-col min-h-0 bg-background transition-all",
            isQueueOver ? "ring-4 ring-inset ring-primary/20 bg-primary/5" : ""
          )}
          onDragOver={(e) => { e.preventDefault(); setIsQueueOver(true); }}
          onDragLeave={() => setIsQueueOver(false)}
          onDrop={onDropInQueue}
        >
          <div className="p-4 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-orange-500" /> Match Queue
            </h2>
            <Badge variant="secondary" className="font-black h-6 px-3 text-sm bg-orange-500 text-white border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4 pb-24">
              {draftPlayerIds.length > 0 && (
                <Card className="border-dashed border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-black uppercase text-primary">Drafting ({draftPlayerIds.length}/4)</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setDraftPlayerIds([])}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {draftPlayerIds.map(id => {
                      const p = players.find(player => player.id === id);
                      return (
                        <div key={id} className="text-sm font-black bg-card p-3 rounded-lg border flex flex-col gap-1.5 group">
                          <div className="flex justify-between items-center">
                            <span className="truncate">{p?.name}</span>
                            <X className="h-4 w-4 opacity-0 group-hover:opacity-100 cursor-pointer text-destructive" onClick={() => setDraftPlayerIds(prev => prev.filter(pId => pId !== id))} />
                          </div>
                          {p && (
                            <Badge variant="outline" className={cn("text-[10px] h-4.5 px-2 w-fit", getSkillColor(p.skillLevel))}>
                              {SKILL_LEVELS_SHORT[p.skillLevel]}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
              {waitingMatches.map(match => (
                <Card 
                  key={match.id} 
                  draggable 
                  onDragStart={(e) => onDragStartMatch(e, match.id)}
                  className="border-2 border-orange-500/30 bg-orange-500/5 cursor-grab active:cursor-grabbing hover:border-orange-500 transition-all shadow-sm"
                >
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex flex-col space-y-3 flex-1">
                      {match.teamA.map(id => {
                        const p = players.find(player => player.id === id);
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <span className="text-sm font-black truncate leading-tight">{p?.name}</span>
                            {p && <Badge variant="outline" className={cn("text-[10px] h-4.5 px-2", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-xs font-black opacity-30">VS</div>
                    <div className="flex flex-col space-y-3 flex-1 text-right items-end">
                      {match.teamB.map(id => {
                        const p = players.find(player => player.id === id);
                        return (
                          <div key={id} className="flex items-center gap-2 justify-end">
                            {p && <Badge variant="outline" className={cn("text-[10px] h-4.5 px-2", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                            <span className="text-sm font-black truncate leading-tight">{p?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
              {waitingMatches.length === 0 && !draftPlayerIds.length && (
                <div className="py-32 text-center text-muted-foreground text-base font-bold italic opacity-30">No matches queued</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ACTIVE COURTS */}
        <div 
          className={cn(
            "md:col-span-6 flex flex-col min-h-0 transition-all",
            isCourtPanelOver ? "bg-green-500/5" : "bg-secondary/5"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsCourtPanelOver(true); }}
          onDragLeave={() => setIsCourtPanelOver(false)}
          onDrop={onDropInCourtPanel}
        >
          <div className="p-4 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-green-600" /> Active Courts
            </h2>
            <Badge variant="outline" className="font-black h-6 px-3 text-sm">{courts.filter(c => c.status === 'occupied').length}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-2 gap-4 pb-24">
              {courts.map(court => {
                const match = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const isOver = overCourtId === court.id;
                const draft = courtDrafts[court.id];
                const teamAScore = match?.teamAScore || 0;
                const teamBScore = match?.teamBScore || 0;
                
                return (
                  <Card 
                    key={court.id} 
                    onDragOver={(e) => { 
                      e.stopPropagation(); 
                      e.preventDefault(); 
                      if (court.status === 'available') setOverCourtId(court.id); 
                    }}
                    onDragLeave={() => setOverCourtId(null)}
                    onDrop={(e) => {
                      e.stopPropagation();
                      onDropInCourt(e, court.id);
                    }}
                    className={cn(
                      "border-2 transition-all duration-200 overflow-hidden flex flex-col min-h-[380px]",
                      isOver ? "border-primary bg-primary/5 scale-102 shadow-lg" : "border-border shadow-md",
                      court.status === 'occupied' ? "bg-card" : "bg-muted/10"
                    )}
                  >
                    <div className={cn(
                      "p-3 flex justify-between items-center border-b",
                      court.status === 'occupied' ? "bg-primary/5" : "bg-muted"
                    )}>
                      <span className="text-base font-black uppercase tracking-tight">{court.name}</span>
                      <Badge variant={court.status === 'available' ? 'outline' : 'default'} className="text-[11px] font-black uppercase px-2.5 h-6">
                        {court.status}
                      </Badge>
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col space-y-5">
                      {court.status === 'occupied' && match ? (
                        <>
                          <div className="flex justify-between items-center">
                            <LiveTimer startTime={match.startTime} />
                            <Trophy className="h-6 w-6 text-yellow-500 opacity-20" />
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            {/* TEAM A */}
                            <div className={cn(
                              "p-4 rounded-xl border-l-4 transition-colors space-y-3",
                              teamAScore > teamBScore ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-muted/20"
                            )}>
                               <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-black uppercase text-muted-foreground">Team A</span>
                               </div>
                              {match.teamA.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center group/p">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-base font-black truncate max-w-[140px] leading-tight">{p?.name}</span>
                                      {p && <Badge variant="outline" className={cn("text-[10px] h-4.5 px-2", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/p:opacity-100" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                      <ArrowLeftRight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                            {/* TEAM B */}
                            <div className={cn(
                              "p-4 rounded-xl border-l-4 transition-colors space-y-3",
                              teamBScore > teamAScore ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-muted/20"
                            )}>
                               <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-black uppercase text-muted-foreground">Team B</span>
                                </div>
                              {match.teamB.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center group/p">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-base font-black truncate max-w-[140px] leading-tight">{p?.name}</span>
                                      {p && <Badge variant="outline" className={cn("text-[10px] h-4.5 px-2", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/p:opacity-100" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                      <ArrowLeftRight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : draft ? (
                        <div className="space-y-3">
                          <p className="text-xs font-black uppercase text-primary">Drafting ({draft.length}/4)</p>
                          <div className="space-y-2">
                            {draft.map(id => {
                              const p = players.find(player => player.id === id);
                              return (
                                <div key={id} className="text-sm font-black bg-background p-2.5 rounded-lg border flex items-center justify-between">
                                  <span className="truncate max-w-[160px]">{p?.name}</span>
                                  {p && <Badge variant="outline" className={cn("text-[10px] h-4.5 px-2", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                </div>
                              );
                            })}
                          </div>
                          <Button variant="ghost" size="sm" className="w-full h-10 text-xs font-black" onClick={() => setCourtDrafts(prev => { const n = {...prev}; delete n[court.id]; return n; })}>CANCEL DRAFT</Button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
                          <Zap className={cn("h-14 w-14 mb-3", isOver && "text-primary opacity-100 scale-125")} />
                          <p className="text-sm font-black uppercase text-center tracking-widest">Available Court</p>
                        </div>
                      )}
                    </CardContent>
                    
                    {/* SCORING SECTION */}
                    {court.status === 'occupied' && match && (
                      <div className="p-4 bg-secondary/30 border-t space-y-4">
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex-1 flex flex-col gap-2">
                            <span className="text-[11px] font-black uppercase opacity-50 text-center">T1</span>
                            <Input 
                              type="number" 
                              min="0"
                              className={cn(
                                "h-16 text-4xl font-black text-center border-2 transition-all no-spinner",
                                teamAScore > teamBScore ? "border-primary bg-primary/10" : "bg-card"
                              )}
                              value={match.teamAScore || 0}
                              onChange={(e) => handleScoreChange(match.id, parseInt(e.target.value) || 0, match.teamBScore || 0)}
                              onBlur={(e) => handleScoreChange(match.id, parseInt(e.target.value) || 0, match.teamBScore || 0)}
                            />
                          </div>
                          <div className="text-2xl font-black opacity-30 mt-6">VS</div>
                          <div className="flex-1 flex flex-col gap-2">
                            <span className="text-[11px] font-black uppercase opacity-50 text-center">T2</span>
                            <Input 
                              type="number" 
                              min="0"
                              className={cn(
                                "h-16 text-4xl font-black text-center border-2 transition-all no-spinner",
                                teamBScore > teamAScore ? "border-primary bg-primary/10" : "bg-card"
                              )}
                              value={match.teamBScore || 0}
                              onChange={(e) => handleScoreChange(match.id, match.teamAScore || 0, parseInt(e.target.value) || 0)}
                              onBlur={(e) => handleScoreChange(match.id, match.teamAScore || 0, parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <CardFooter className="p-3 border-t mt-auto gap-3">
                      {court.status === 'occupied' && match ? (
                        <>
                          {!match.startTime ? (
                            <Button onClick={() => startTimer(court.id)} className="w-full h-12 bg-green-600 hover:bg-green-700 font-black text-sm uppercase">
                              <Play className="h-5 w-5 mr-2" /> Start Timer
                            </Button>
                          ) : (
                            <div className="flex w-full gap-3">
                               <Button onClick={() => endMatch(court.id, 'completed', teamAScore >= teamBScore ? 'teamA' : 'teamB', teamAScore, teamBScore)} className="flex-1 h-12 bg-primary font-black text-sm uppercase">
                                  <CheckCircle2 className="h-5 w-5 mr-2" /> Finish Match
                               </Button>
                               <Button variant="outline" size="icon" onClick={() => endMatch(court.id, 'cancelled')} className="h-12 w-12 p-0 border-2">
                                  <Ban className="h-5 w-5 text-destructive" />
                               </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex w-full justify-between items-center px-1">
                          <p className="text-[11px] font-black uppercase opacity-40">Ready for Match</p>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-destructive hover:text-white" onClick={() => deleteCourt(court.id)}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
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
          <DialogHeader><DialogTitle className="text-xl font-black uppercase">Swap Player</DialogTitle></DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {players.filter(p => p.status === 'available').map(p => (
                <Button key={p.id} variant="outline" className="w-full justify-between h-auto py-5 px-8 hover:border-primary hover:bg-primary/5 transition-all border-2" onClick={() => handleSwap(p.id)}>
                  <div className="flex flex-col items-start">
                    <span className="font-black text-lg">{p.name}</span>
                    <Badge variant="outline" className={cn("text-[11px] uppercase font-black px-2.5 h-6 mt-2", getSkillColor(p.skillLevel))}>
                      {SKILL_LEVELS_SHORT[p.skillLevel]} • {p.gamesPlayed} Games
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}