'use client';

import { useState, useEffect, useMemo } from 'react';
import { useClub } from '@/context/ClubContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Timer, User, DoorOpen, ListOrdered, ShieldAlert, PlayCircle, KeyRound, ShieldCheck, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';
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
    <div className="flex items-center gap-2 text-primary font-mono font-black animate-pulse bg-primary/10 px-3 py-1 rounded-full text-compact">
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
    <Badge variant="secondary" className="gap-1 text-tiny h-5 px-1.5 font-black uppercase tracking-tighter bg-secondary border shadow-sm">
      {mins}min
    </Badge>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { 
    courts, players, matches, endMatch, assignMatchToCourt,
    role, isSessionActive, createSession, joinSession
  } = useClub();
  
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [sortOption, setSortOption] = useState<string>('default');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Scoring Modal State
  const [scoringCourtId, setScoringCourtId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'score' | 'zeroConfirm' | null>(null);
  const [pendingScore, setPendingScore] = useState<{
    courtId: string;
    teamAScore: number;
    teamBScore: number;
    winner: 'teamA' | 'teamB';
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sortedAvailablePlayers = useMemo(() => {
    return players
      .filter(p => p.status === 'available')
      .sort((a, b) => {
        let result = 0;
        switch (sortOption) {
          case 'skill-asc': result = a.skillLevel - b.skillLevel; break;
          case 'skill-desc': result = b.skillLevel - a.skillLevel; break;
          case 'name-asc': result = a.name.localeCompare(b.name); break;
          case 'name-desc': result = b.name.localeCompare(a.name); break;
        }
        return result || (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0);
      });
  }, [players, sortOption]);
  
  const waitingMatches = useMemo(() => {
    return matches.filter(m => !m.isCompleted && !m.courtId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [matches]);

  const handleScoreSubmit = (
    teamAScore: number | undefined,
    teamBScore: number | undefined,
    winner: 'teamA' | 'teamB'
  ) => {
    if (!scoringCourtId) return;

    const a = teamAScore ?? 0;
    const b = teamBScore ?? 0;
    const losingScore = winner === 'teamA' ? b : a;

    if (losingScore === 0) {
      setPendingScore({ courtId: scoringCourtId, teamAScore: a, teamBScore: b, winner });
      setActiveModal('zeroConfirm');
      return;
    }

    endMatch(scoringCourtId, 'completed', winner, a, b);
    setActiveModal(null);
    setScoringCourtId(null);
    toast({ title: "Match Recorded" });
  };

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const code = await createSession();
      toast({ title: "Session Created!", description: `Code: ${code}` });
    } catch (error: any) {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSessionAsAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setIsJoining(true);
    try {
      await joinSession(joinCode, false);
      toast({ title: "Session Joined as Admin" });
      setJoinCode('');
    } catch (error: any) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinSessionAsPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setIsJoining(true);
    try {
      await joinSession(joinCode, true);
      toast({ title: "Joined Session!" });
      setJoinCode('');
    } catch (error: any) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  if (!mounted) return null;

  const isAdmin = role === 'admin';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background overflow-hidden relative">
      {!isSessionActive && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-2 border-primary/20 shadow-2xl">
            <CardHeader className="text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-primary mb-2" />
              <CardTitle className="text-xl font-black uppercase">No Active Session</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm font-bold opacity-60">
              Please join or create a session to access the command center.
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {isAdmin ? (
                <div className="space-y-4 w-full">
                  <Button className="w-full h-12 font-black uppercase" onClick={handleCreateSession} disabled={isCreating || isJoining}>
                    {isCreating ? "Initializing..." : "Start New Session"} <PlayCircle className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-background px-2 text-muted-foreground font-black">OR JOIN EXISTING</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Input 
                      value={joinCode} 
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE" 
                      className="text-center font-black h-12"
                      maxLength={6}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={handleJoinSessionAsAdmin} className="h-12 font-black uppercase border-2 text-[10px]" disabled={isCreating || isJoining || !joinCode}>
                        {isJoining ? "Joining..." : "Join as Admin"} <ShieldCheck className="ml-1 h-3 w-3" />
                      </Button>
                      <Button variant="outline" onClick={handleJoinSessionAsPlayer} className="h-12 font-black uppercase border-2 text-[10px]" disabled={isCreating || isJoining || !joinCode}>
                        {isJoining ? "Joining..." : "Join as Player"} <User className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button className="w-full h-12 font-black uppercase" variant="outline" onClick={() => router.push('/auth/session')}>
                  Go to Session Gate <KeyRound className="ml-2 h-5 w-5" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
        
        {/* THE BENCH */}
        <div className="md:col-span-3 border-r flex flex-col bg-secondary/5 min-h-0">
          <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10 gap-2 h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
              <User className="h-4 w-4 text-primary" /> Bench
            </h2>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-7 text-[9px] font-black uppercase tracking-widest border-2 w-[100px] bg-background px-2">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-[9px] font-bold uppercase">Default</SelectItem>
                  <SelectItem value="skill-asc" className="text-[9px] font-bold uppercase">Skill ↑</SelectItem>
                  <SelectItem value="skill-desc" className="text-[9px] font-bold uppercase">Skill ↓</SelectItem>
                  <SelectItem value="name-asc" className="text-[9px] font-bold uppercase">A-Z</SelectItem>
                  <SelectItem value="name-desc" className="text-[9px] font-bold uppercase">Z-A</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="font-black h-7 px-2 text-tiny shrink-0">{sortedAvailablePlayers.length}</Badge>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 grid grid-cols-2 gap-2 pb-24">
              {sortedAvailablePlayers.map((player) => (
                <Card 
                  key={player.id} 
                  className="p-3 border-2 shadow-sm group bg-card min-w-0"
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-black text-compact truncate flex-1 leading-tight">{player.name}</span>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                  <div className="flex justify-between items-center opacity-80 gap-1">
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-4 px-1.5 truncate", getSkillColor(player.skillLevel))}>
                      {SKILL_LEVELS_SHORT[player.skillLevel]}
                    </Badge>
                  </div>
                </Card>
              ))}
              {sortedAvailablePlayers.length === 0 && (
                <div className="col-span-2 py-20 text-center text-muted-foreground font-bold italic opacity-20 text-compact">Bench Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* MATCH QUEUE */}
        <div className="md:col-span-3 border-r flex flex-col bg-background transition-all min-h-0">
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-orange-500" /> Queue
            </h2>
            <Badge variant="secondary" className="font-black h-6 px-2.5 text-compact bg-orange-500 text-white border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3 pb-24">
              {waitingMatches.map((match, index) => (
                <Card 
                  key={match.id} 
                  className="border-2 border-orange-500/30 bg-orange-500/5 shadow-sm overflow-hidden group relative"
                >
                  <div className="absolute top-1 left-1 z-10">
                    <Badge variant="secondary" className="bg-orange-500 text-white text-[9px] h-4 px-1 font-black">
                       #{index + 1}
                    </Badge>
                  </div>
                  <div className="p-3 pt-6 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col space-y-1.5 flex-1 min-w-0 border-l-4 border-orange-500/20 pl-2">
                        {match.teamA.map(id => {
                          const p = players.find(player => player.id === id);
                          return (
                            <div key={id} className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[9px] font-black opacity-30 px-1 shrink-0">VS</div>
                      <div className="flex flex-col space-y-1.5 flex-1 min-w-0 items-end text-right border-r-4 border-orange-500/20 pr-2">
                        {match.teamB.map(id => {
                          const p = players.find(player => player.id === id);
                          return (
                            <div key={id} className="flex items-center gap-1.5 min-w-0 justify-end">
                              <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="pt-2 border-t border-orange-500/10">
                        <Select onValueChange={(courtId) => assignMatchToCourt(match.id, courtId)}>
                          <SelectTrigger className="h-8 text-[9px] font-black uppercase tracking-widest bg-orange-500/10 border-orange-500/20 text-orange-600">
                            <SelectValue placeholder="Assign Court" />
                          </SelectTrigger>
                          <SelectContent>
                            {courts.filter(c => c.status === 'available').map(c => (
                              <SelectItem key={c.id} value={c.id} className="text-[9px] font-bold uppercase">{c.name}</SelectItem>
                            ))}
                            {courts.filter(c => c.status === 'available').length === 0 && (
                              <SelectItem value="none" disabled>No Courts Free</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              {waitingMatches.length === 0 && (
                <div className="py-20 text-center text-muted-foreground font-bold italic opacity-20 text-compact">Queue Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ACTIVE COURTS */}
        <div className="md:col-span-6 flex flex-col bg-secondary/5 min-h-0">
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-green-600" /> Courts
            </h2>
            <Badge variant="outline" className="font-black h-6 px-2.5 text-compact">{courts.filter(c => c.status === 'occupied').length}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-24">
              {courts.map(court => {
                const match = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const isOccupied = court.status === 'occupied';
                
                return (
                  <Card 
                    key={court.id} 
                    className={cn(
                      "border-2 transition-all duration-200 overflow-hidden flex flex-col min-h-[340px]",
                      isOccupied ? "bg-card border-primary/20" : "bg-muted/10 border-border"
                    )}
                  >
                    <div className={cn("p-2 px-3 flex justify-between items-center border-b", isOccupied ? "bg-primary/5" : "bg-muted/20")}>
                      <span className="text-compact font-black uppercase truncate max-w-[120px]">{court.name}</span>
                      <Badge variant={court.status === 'available' ? 'outline' : 'default'} className="text-[9px] font-black uppercase px-2 h-5 shrink-0">
                        {court.status}
                      </Badge>
                    </div>
                    <CardContent className="p-3 flex-1 flex flex-col space-y-3 min-h-0">
                      {isOccupied && match ? (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <LiveTimer startTime={match.startTime || match.timestamp} />
                          </div>
                          <div className="grid grid-cols-1 gap-2 flex-1">
                            <div className="p-3 rounded-lg border-l-4 border-primary/20 bg-primary/5 space-y-1.5">
                              {match.teamA.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center gap-1">
                                    <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-center py-1 opacity-20"><span className="text-[10px] font-black">VS</span></div>
                            <div className="p-3 rounded-lg border-l-4 border-primary/20 bg-primary/5 space-y-1.5">
                              {match.teamB.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center gap-1">
                                    <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-8">
                          <Zap className="h-10 w-10 mb-2" />
                          <p className="text-tiny font-black uppercase text-center tracking-widest">Available</p>
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="p-2.5 border-t mt-auto gap-2">
                      {isOccupied && isAdmin ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full font-black uppercase text-[10px] h-9 border-2"
                          onClick={() => {
                            setScoringCourtId(court.id);
                            setActiveModal('score');
                          }}
                        >
                          End Match & Score
                        </Button>
                      ) : (
                        <p className="text-[8px] font-bold uppercase opacity-30 text-center w-full">
                          {isOccupied ? "Match Ongoing" : "Ready for Play"}
                        </p>
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
      {scoringCourtId && (() => {
        const court = courts.find(c => c.id === scoringCourtId);
        const match = matches.find(m => m.id === court?.currentMatchId);
        if (!match) return null;

        const teamA = players.filter(p => match.teamA.includes(p.id));
        const teamB = players.filter(p => match.teamB.includes(p.id));

        return (
          <MatchScoreDialog
            open={activeModal === 'score'}
            onOpenChange={(open) => {
              if (!open) {
                setActiveModal(null);
                setScoringCourtId(null);
              }
            }}
            teamA={teamA}
            teamB={teamB}
            onScoreSubmit={handleScoreSubmit}
            onSkip={() => {
              endMatch(scoringCourtId, 'completed');
              setActiveModal(null);
              setScoringCourtId(null);
            }}
          />
        );
      })()}

      {activeModal === 'zeroConfirm' && (
        <Dialog open={true} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase">Confirm Zero Score</DialogTitle>
            </DialogHeader>
            <p className="text-sm font-medium">The losing team has a score of 0. Is this correct?</p>
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1 font-black uppercase"
                onClick={() => {
                  if (pendingScore) {
                    endMatch(pendingScore.courtId, 'completed', pendingScore.winner, pendingScore.teamAScore, pendingScore.teamBScore);
                  }
                  setActiveModal(null);
                  setScoringCourtId(null);
                  toast({ title: "Results Confirmed" });
                }}
              >
                Yes, Confirm
              </Button>
              <Button variant="outline" className="flex-1 font-black uppercase" onClick={() => setActiveModal('score')}>
                Edit Score
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
