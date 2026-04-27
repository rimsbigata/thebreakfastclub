
"use client";

import { useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Trash2, Timer, Play, Zap, ArrowLeftRight, User, DoorOpen, ListOrdered, X, CheckCircle2, Ban } from 'lucide-react';
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
    <div className="flex items-center gap-1.5 text-primary font-mono text-[9px] font-black animate-pulse bg-primary/10 px-2 py-0.5 rounded-full">
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
    <Badge variant="secondary" className="gap-1 text-[8px] h-3.5 px-1 font-black uppercase tracking-tighter bg-secondary border shadow-sm">
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

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-background">
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
        
        {/* THE BENCH */}
        <div className="md:col-span-3 border-r flex flex-col h-full bg-secondary/5">
          <div className="p-2 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <User className="h-3 w-3 text-primary" /> The Bench
            </h2>
            <Badge variant="outline" className="font-black h-4 px-1 text-[9px]">{availablePlayers.length}</Badge>
          </div>
          <ScrollArea className="flex-1 p-1">
            <div className="grid grid-cols-2 gap-1 pb-8">
              {availablePlayers.map((player) => (
                <Card 
                  key={player.id} 
                  draggable 
                  onDragStart={(e) => onDragStartPlayer(e, player.id)}
                  className="p-1.5 cursor-grab active:cursor-grabbing hover:border-primary transition-all border shadow-sm group bg-card"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-black text-[10px] truncate max-w-[70px] leading-tight">{player.name}</span>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                  <div className="flex justify-between items-center opacity-80">
                    <Badge variant="outline" className={cn("text-[6px] font-black uppercase h-3.5 px-1.5", getSkillColor(player.skillLevel))}>
                      {SKILL_LEVELS_SHORT[player.skillLevel]}
                    </Badge>
                    <span className="text-[7px] font-black">{player.gamesPlayed} Gms</span>
                  </div>
                </Card>
              ))}
              {availablePlayers.length === 0 && (
                <div className="col-span-2 py-12 text-center text-muted-foreground text-[10px] font-bold italic opacity-30">Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* MATCH QUEUE */}
        <div 
          className={cn(
            "md:col-span-3 border-r flex flex-col h-full bg-background transition-all",
            isQueueOver ? "ring-2 ring-inset ring-primary/20 bg-primary/5" : ""
          )}
          onDragOver={(e) => { e.preventDefault(); setIsQueueOver(true); }}
          onDragLeave={() => setIsQueueOver(false)}
          onDrop={onDropInQueue}
        >
          <div className="p-2 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <ListOrdered className="h-3 w-3 text-orange-500" /> Match Queue
            </h2>
            <Badge variant="secondary" className="font-black h-4 px-1 text-[9px] bg-orange-500 text-white border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1 p-1">
            <div className="space-y-1.5 pb-8">
              {draftPlayerIds.length > 0 && (
                <Card className="border-dashed border-2 border-primary/40 bg-primary/5 p-1.5 space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[7px] font-black uppercase text-primary">Drafting ({draftPlayerIds.length}/4)</p>
                    <Button variant="ghost" size="icon" className="h-3 w-3" onClick={() => setDraftPlayerIds([])}>
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {draftPlayerIds.map(id => {
                      const p = players.find(player => player.id === id);
                      return (
                        <div key={id} className="text-[8px] font-black bg-card p-1 rounded border flex flex-col gap-1 group">
                          <div className="flex justify-between items-center">
                            <span className="truncate max-w-[40px]">{p?.name}</span>
                            <X className="h-2 w-2 opacity-0 group-hover:opacity-100 cursor-pointer text-destructive" onClick={() => setDraftPlayerIds(prev => prev.filter(pId => pId !== id))} />
                          </div>
                          {p && (
                            <Badge variant="outline" className={cn("text-[5px] h-3 px-1 w-fit", getSkillColor(p.skillLevel))}>
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
                  className="border border-orange-500/30 bg-orange-500/5 cursor-grab active:cursor-grabbing hover:border-orange-500 transition-all"
                >
                  <div className="p-1.5 flex items-center justify-between gap-1">
                    <div className="flex flex-col space-y-1 flex-1">
                      {match.teamA.map(id => {
                        const p = players.find(player => player.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1">
                            <span className="text-[9px] font-black truncate leading-tight">{p?.name}</span>
                            {p && <Badge variant="outline" className={cn("text-[5px] h-3 px-1", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[7px] font-black opacity-30">VS</div>
                    <div className="flex flex-col space-y-1 flex-1 text-right items-end">
                      {match.teamB.map(id => {
                        const p = players.find(player => player.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1 justify-end">
                            {p && <Badge variant="outline" className={cn("text-[5px] h-3 px-1", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                            <span className="text-[9px] font-black truncate leading-tight">{p?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* ACTIVE COURTS */}
        <div 
          className={cn(
            "md:col-span-6 flex flex-col h-full transition-all",
            isCourtPanelOver ? "bg-green-500/5" : "bg-secondary/5"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsCourtPanelOver(true); }}
          onDragLeave={() => setIsCourtPanelOver(false)}
          onDrop={onDropInCourtPanel}
        >
          <div className="p-2 bg-card border-b flex items-center justify-between sticky top-0 z-10">
            <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <DoorOpen className="h-3 w-3 text-green-600" /> Active Courts
            </h2>
            <Badge variant="outline" className="font-black h-4 px-1 text-[9px]">{courts.filter(c => c.status === 'occupied').length}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 pb-8">
              {courts.map(court => {
                const match = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const isOver = overCourtId === court.id;
                const draft = courtDrafts[court.id];
                
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
                      "border-2 transition-all duration-200 overflow-hidden flex flex-col min-h-[180px]",
                      isOver ? "border-primary bg-primary/5 scale-102 shadow-md" : "border-border shadow-sm",
                      court.status === 'occupied' ? "bg-card" : "bg-muted/10"
                    )}
                  >
                    <div className={cn(
                      "p-1 flex justify-between items-center border-b",
                      court.status === 'occupied' ? "bg-primary/5" : "bg-muted"
                    )}>
                      <span className="text-[9px] font-black uppercase tracking-tight">{court.name}</span>
                      <Badge variant={court.status === 'available' ? 'outline' : 'default'} className="text-[6px] font-black uppercase px-1 h-3.5">
                        {court.status}
                      </Badge>
                    </div>
                    <CardContent className="p-1.5 flex-1 flex flex-col space-y-2">
                      {court.status === 'occupied' && match ? (
                        <>
                          <div className="flex justify-between items-center">
                            <LiveTimer startTime={match.startTime} />
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {/* TEAM A */}
                            <div className="p-1 bg-primary/5 rounded border-l-2 border-primary space-y-1">
                               <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[7px] font-black uppercase text-primary/60">Team A</span>
                                  <Input 
                                    type="number" 
                                    className="h-5 w-8 text-[9px] font-black p-0 text-center bg-white" 
                                    value={match.teamAScore || 0}
                                    onChange={(e) => updateMatchScore(match.id, parseInt(e.target.value) || 0, match.teamBScore || 0)}
                                  />
                               </div>
                              {match.teamA.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center group/p">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[9px] font-black truncate max-w-[45px] leading-tight">{p?.name}</span>
                                      {p && <Badge variant="outline" className={cn("text-[5px] h-3 px-1", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-3 w-3 opacity-0 group-hover/p:opacity-100" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                      <ArrowLeftRight className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                            {/* TEAM B */}
                            <div className="p-1 bg-muted/30 rounded border-l-2 border-muted-foreground/30 space-y-1">
                               <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[7px] font-black uppercase opacity-60">Team B</span>
                                  <Input 
                                    type="number" 
                                    className="h-5 w-8 text-[9px] font-black p-0 text-center bg-white" 
                                    value={match.teamBScore || 0}
                                    onChange={(e) => updateMatchScore(match.id, match.teamAScore || 0, parseInt(e.target.value) || 0)}
                                  />
                               </div>
                              {match.teamB.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center group/p">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[9px] font-black truncate max-w-[45px] leading-tight">{p?.name}</span>
                                      {p && <Badge variant="outline" className={cn("text-[5px] h-3 px-1", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-3 w-3 opacity-0 group-hover/p:opacity-100" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                      <ArrowLeftRight className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : draft ? (
                        <div className="space-y-1">
                          <p className="text-[7px] font-black uppercase text-primary">Drafting ({draft.length}/4)</p>
                          <div className="space-y-0.5">
                            {draft.map(id => {
                              const p = players.find(player => player.id === id);
                              return (
                                <div key={id} className="text-[8px] font-black bg-background p-0.5 rounded border flex items-center justify-between">
                                  <span className="truncate max-w-[60px]">{p?.name}</span>
                                  {p && <Badge variant="outline" className={cn("text-[5px] h-3 px-1", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                </div>
                              );
                            })}
                          </div>
                          <Button variant="ghost" size="sm" className="w-full h-4 text-[7px] font-black" onClick={() => setCourtDrafts(prev => { const n = {...prev}; delete n[court.id]; return n; })}>CANCEL</Button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-4">
                          <Zap className={cn("h-4 w-4 mb-0.5", isOver && "text-primary opacity-100 scale-110")} />
                          <p className="text-[7px] font-black uppercase text-center">Ready</p>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-1 border-t mt-auto gap-1">
                      {court.status === 'occupied' && match ? (
                        <>
                          {!match.startTime ? (
                            <Button onClick={() => startTimer(court.id)} size="sm" className="w-full h-7 bg-green-600 hover:bg-green-700 font-black text-[8px] uppercase">
                              <Play className="h-2.5 w-2.5 mr-1" /> Start
                            </Button>
                          ) : (
                            <div className="flex w-full gap-1">
                               <Button size="sm" onClick={() => endMatch(court.id, 'completed', (match.teamAScore || 0) >= (match.teamBScore || 0) ? 'teamA' : 'teamB', match.teamAScore, match.teamBScore)} className="flex-1 h-7 bg-primary font-black text-[8px] uppercase">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Finish
                               </Button>
                               <Button variant="outline" size="sm" onClick={() => endMatch(court.id, 'cancelled')} className="h-7 w-7 p-0">
                                  <Ban className="h-2.5 w-2.5 text-destructive" />
                               </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => deleteCourt(court.id)}>
                          <Trash2 className="h-3 w-3" />
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
              {players.filter(p => p.status === 'available').map(p => (
                <Button key={p.id} variant="outline" className="w-full justify-between h-auto py-3 px-4 hover:border-primary hover:bg-primary/5 transition-all" onClick={() => handleSwap(p.id)}>
                  <div className="flex flex-col items-start">
                    <span className="font-black text-sm">{p.name}</span>
                    <Badge variant="outline" className={cn("text-[8px] uppercase font-black px-1.5 h-4 mt-1", getSkillColor(p.skillLevel))}>
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
