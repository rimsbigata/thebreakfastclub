'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GripVertical, Trash2, Timer, Play, User, DoorOpen, ListOrdered, ShieldAlert, PlayCircle, KeyRound, ShieldCheck, Zap, X, ArrowLeftRight, Trophy, Ban } from 'lucide-react';
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
    courts, players, matches, deleteCourt, startMatch, startTimer,
    updateMatchScore, endMatch, swapPlayer, assignMatchToCourt,
    createCourtAndAssignMatch, addCourt, deleteMatch, defaultWinningScore,
    role, isSessionActive, createSession, joinSession
  } = useClub();

  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [sortOption, setSortOption] = useState<string>('default');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);
  const [dragOverCourtId, setDragOverCourtId] = useState<string | null>(null);
  const [draftPlayerIds, setDraftPlayerIds] = useState<string[]>([]);
  const [courtDrafts, setCourtDrafts] = useState<Record<string, string[]>>({});
  const [isQueueOver, setIsQueueOver] = useState(false);
  const [isCourtPanelOver, setIsCourtPanelOver] = useState(false);
  const [swapping, setSwapping] = useState<{ matchId: string; oldPlayerId: string } | null>(null);
  const [winningTeam, setWinningTeam] = useState<{ courtId: string; team: 'teamA' | 'teamB' } | null>(null);
  const [loserScore, setLoserScore] = useState('');
  const loserScoreInputRef = useRef<HTMLInputElement>(null);
  const [pendingMatchFinish, setPendingMatchFinish] = useState<{
    courtId: string;
    winner: 'teamA' | 'teamB';
    scoreA: number;
    scoreB: number;
  } | null>(null);

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

  const allDraftedIds = useMemo(() => [
    ...draftPlayerIds,
    ...Object.values(courtDrafts).flat(),
  ], [courtDrafts, draftPlayerIds]);

  const sortedAvailablePlayers = useMemo(() => {
    return players
      .filter(p => p.status === 'available' && !allDraftedIds.includes(p.id))
      .sort((a, b) => {
        let result = 0;
        const skillA = a.skillLevel || 3;
        const skillB = b.skillLevel || 3;
        switch (sortOption) {
          case 'skill-asc': result = skillA - skillB; break;
          case 'skill-desc': result = skillB - skillA; break;
          case 'name-asc': result = a.name.localeCompare(b.name); break;
          case 'name-desc': result = b.name.localeCompare(a.name); break;
        }
        return result || (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0);
      });
  }, [players, allDraftedIds, sortOption]);

  const waitingMatches = useMemo(() => {
    return matches.filter(m => !m.isCompleted && !m.courtId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [matches]);

  const isAdmin = role === 'admin';

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

  const handleAssignMatchToCourt = async (matchId: string, courtId: string) => {
    if (!isAdmin) return;

    const targetCourt = courts.find(court => court.id === courtId);
    if (!targetCourt || targetCourt.status !== 'available') {
      toast({
        title: "Court unavailable",
        description: "Drop the match on an available court.",
        variant: "destructive",
      });
      return;
    }

    try {
      await assignMatchToCourt(matchId, courtId);
      setDraggedMatchId(null);
      setDragOverCourtId(null);
      toast({ title: "Match assigned", description: `${targetCourt.name} is now occupied.` });
    } catch (error) {
      toast({
        title: "Could not assign match",
        description: error instanceof Error ? error.message : "Database write failed.",
        variant: "destructive",
      });
    }
  };

  const handleMatchDragStart = (event: React.DragEvent<HTMLElement>, matchId: string) => {
    if (!isAdmin) return;

    event.dataTransfer.setData('application/x-tbc-match-id', matchId);
    event.dataTransfer.setData('text/plain', matchId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedMatchId(matchId);
  };

  const getDraggedMatchId = (event: React.DragEvent<HTMLElement>) => {
    return event.dataTransfer.getData('application/x-tbc-match-id') || event.dataTransfer.getData('text/plain') || draggedMatchId;
  };

  const onDragStartPlayer = (event: React.DragEvent<HTMLElement>, playerId: string) => {
    if (!isAdmin) return;
    event.dataTransfer.setData('application/x-tbc-player-id', playerId);
    event.dataTransfer.setData('playerId', playerId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const getDraggedPlayerId = (event: React.DragEvent<HTMLElement>) => {
    return event.dataTransfer.getData('application/x-tbc-player-id') || event.dataTransfer.getData('playerId');
  };

  const skillLevelOf = (player: { skillLevel?: number }) => player.skillLevel || 3;

  const createMatchFromDraft = async (playerIds: string[], courtId?: string) => {
    if (playerIds.length !== 4) return;
    await startMatch({
      teamA: [playerIds[0], playerIds[1]],
      teamB: [playerIds[2], playerIds[3]],
      ...(courtId ? { courtId } : {}),
    });
    toast({ title: courtId ? "Match Started" : "Match Drafted" });
  };

  const onDropInQueue = async (event: React.DragEvent<HTMLElement>) => {
    if (!isAdmin) return;
    event.preventDefault();
    setIsQueueOver(false);

    const playerId = getDraggedPlayerId(event);
    if (!playerId || allDraftedIds.includes(playerId)) return;

    const nextDraft = [...draftPlayerIds, playerId];
    if (nextDraft.length === 4) {
      await createMatchFromDraft(nextDraft);
      setDraftPlayerIds([]);
    } else {
      setDraftPlayerIds(nextDraft);
    }
  };

  const onDropInCourt = async (event: React.DragEvent<HTMLElement>, courtId: string) => {
    if (!isAdmin) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOverCourtId(null);

    const court = courts.find(c => c.id === courtId);
    if (!court || court.status === 'occupied') return;

    const matchId = getDraggedMatchId(event);
    if (matchId) {
      await handleAssignMatchToCourt(matchId, courtId);
      return;
    }

    const playerId = getDraggedPlayerId(event);
    if (!playerId || allDraftedIds.includes(playerId)) return;

    const currentDraft = courtDrafts[courtId] || [];
    const nextDraft = [...currentDraft, playerId];
    if (nextDraft.length === 4) {
      await createMatchFromDraft(nextDraft, courtId);
      setCourtDrafts(prev => {
        const next = { ...prev };
        delete next[courtId];
        return next;
      });
    } else {
      setCourtDrafts(prev => ({ ...prev, [courtId]: nextDraft }));
    }
  };

  const onDropInCourtPanel = async (event: React.DragEvent<HTMLElement>) => {
    if (!isAdmin) return;
    event.preventDefault();
    setIsCourtPanelOver(false);

    const matchId = getDraggedMatchId(event);
    if (matchId) {
      await createCourtAndAssignMatch(matchId);
      toast({ title: "Court Added", description: "Queued match assigned to the new court." });
      return;
    }

    const playerId = getDraggedPlayerId(event);
    if (!playerId || allDraftedIds.includes(playerId)) return;

    const newCourtId = await addCourt();
    setCourtDrafts(prev => ({ ...prev, [newCourtId]: [playerId] }));
    toast({ title: "Court Added" });
  };

  const handleDeleteMatch = async (matchId: string) => {
    await deleteMatch(matchId);
    toast({ title: "Match Removed" });
  };

  const handleSwap = async (newPlayerId: string) => {
    if (!swapping) return;
    await swapPlayer(swapping.matchId, swapping.oldPlayerId, newPlayerId);
    setSwapping(null);
    toast({ title: "Player Swapped" });
  };

  const handleScoreChange = async (matchId: string, scoreA: number, scoreB: number) => {
    await updateMatchScore(matchId, Math.max(0, scoreA), Math.max(0, scoreB));
  };

  const validateMatchScore = (scoreA: number, scoreB: number) => {
    const higher = Math.max(scoreA, scoreB);
    const lower = Math.min(scoreA, scoreB);

    if (higher < defaultWinningScore) {
      return { valid: false, message: `Winning score (${defaultWinningScore}) not reached.` };
    }
    if (scoreA === scoreB) {
      return { valid: false, message: "Scores cannot be equal." };
    }
    if (higher === defaultWinningScore && lower === defaultWinningScore - 1) {
      return { valid: false, message: `Must win by 2 points.` };
    }
    if (higher > defaultWinningScore && higher - lower < 2) {
      return { valid: false, message: "Must win by 2 points in deuce." };
    }
    return { valid: true };
  };

  const completeMatch = async (courtId: string, winner: 'teamA' | 'teamB', scoreA: number, scoreB: number) => {
    await endMatch(courtId, 'completed', winner, scoreA, scoreB);
    setPendingMatchFinish(null);
    setWinningTeam(null);
    setLoserScore('');
    toast({ title: "Match Completed" });
  };

  const handleFinishMatch = async (courtId: string, scoreA: number, scoreB: number) => {
    const validation = validateMatchScore(scoreA, scoreB);
    if (!validation.valid) {
      toast({ title: "Cannot Finish Match", description: validation.message, variant: "destructive" });
      return;
    }

    const winner = scoreA > scoreB ? 'teamA' : 'teamB';
    if ((winner === 'teamA' ? scoreB : scoreA) === 0) {
      setPendingMatchFinish({ courtId, winner, scoreA, scoreB });
      return;
    }

    await completeMatch(courtId, winner, scoreA, scoreB);
  };

  const handleWinSubmit = async () => {
    if (!winningTeam) return;
    const losingScore = parseInt(loserScore, 10) || 0;
    const scoreA = winningTeam.team === 'teamA' ? defaultWinningScore : losingScore;
    const scoreB = winningTeam.team === 'teamB' ? defaultWinningScore : losingScore;

    const validation = validateMatchScore(scoreA, scoreB);
    if (!validation.valid) {
      toast({ title: "Invalid Score", description: validation.message, variant: "destructive" });
      return;
    }

    if (losingScore === 0) {
      setPendingMatchFinish({ courtId: winningTeam.courtId, winner: winningTeam.team, scoreA, scoreB });
      setWinningTeam(null);
      return;
    }

    await completeMatch(winningTeam.courtId, winningTeam.team, scoreA, scoreB);
  };

  if (!mounted) return null;

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
                  draggable={isAdmin}
                  onDragStart={(event) => onDragStartPlayer(event, player.id)}
                  className={cn(
                    "p-3 border-2 shadow-sm group bg-card min-w-0",
                    isAdmin && "cursor-grab active:cursor-grabbing hover:border-primary"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-black text-compact truncate flex-1 leading-tight">{player.name}</span>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                  <div className="flex justify-between items-center opacity-80 gap-1">
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-4 px-1.5 truncate", getSkillColor(skillLevelOf(player)))}>
                      {SKILL_LEVELS_SHORT[skillLevelOf(player)]}
                    </Badge>
                    <span className="text-[10px] font-black shrink-0">{player.gamesPlayed} G</span>
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
        <div
          className={cn(
            "md:col-span-3 border-r flex flex-col bg-background transition-all min-h-0",
            isQueueOver && "ring-4 ring-inset ring-primary/20 bg-primary/5"
          )}
          onDragOver={(event) => {
            if (!isAdmin) return;
            event.preventDefault();
            setIsQueueOver(true);
          }}
          onDragLeave={() => setIsQueueOver(false)}
          onDrop={onDropInQueue}
        >
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-orange-500" /> Queue
            </h2>
            <Badge variant="secondary" className="font-black h-6 px-2.5 text-compact bg-orange-500 text-white border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3 pb-24">
              {draftPlayerIds.length > 0 && (
                <Card className="border-dashed border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-primary">Drafting ({draftPlayerIds.length}/4)</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setDraftPlayerIds([])}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {draftPlayerIds.map(id => {
                      const player = players.find(p => p.id === id);
                      return (
                        <div key={id} className="text-[11px] font-black bg-card p-2 rounded border flex flex-col gap-1 group relative overflow-hidden">
                          <span className="truncate pr-4">{player?.name}</span>
                          <X className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-100 cursor-pointer text-destructive" onClick={() => setDraftPlayerIds(prev => prev.filter(playerId => playerId !== id))} />
                          {player && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(skillLevelOf(player)))}>{SKILL_LEVELS_SHORT[skillLevelOf(player)]}</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
              {waitingMatches.map((match, index) => (
                <Card
                  key={match.id}
                  onDragEnd={() => {
                    setDraggedMatchId(null);
                    setDragOverCourtId(null);
                  }}
                  className={cn(
                    "border-2 border-orange-500/30 bg-orange-500/5 shadow-sm overflow-hidden group relative",
                    draggedMatchId === match.id && "opacity-60"
                  )}
                >
                  <div className="absolute top-1 left-1 z-10">
                    <Badge variant="secondary" className="bg-orange-500 text-white text-[9px] h-4 px-1 font-black">
                      #{index + 1}
                    </Badge>
                  </div>
                  <div className="p-3 pt-6 flex flex-col gap-3">
                    {isAdmin && (
                      <div
                        draggable
                        onDragStart={(event) => handleMatchDragStart(event, match.id)}
                        className="absolute top-1 right-1 h-7 w-7 cursor-grab active:cursor-grabbing rounded-md border border-orange-500/20 bg-background/80 text-orange-600 flex items-center justify-center hover:bg-orange-500/10"
                        title="Drag match to an available court"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-9 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-white z-10"
                        onClick={() => handleDeleteMatch(match.id)}
                        title="Remove match"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col space-y-1.5 flex-1 min-w-0 border-l-4 border-orange-500/20 pl-2">
                        {match.teamA.map(id => {
                          const p = players.find(player => player.id === id);
                          return (
                            <div key={id} className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                  <ArrowLeftRight className="h-3 w-3" />
                                </Button>
                              )}
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
                              {isAdmin && (
                                <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                  <ArrowLeftRight className="h-3 w-3" />
                                </Button>
                              )}
                              <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="pt-2 border-t border-orange-500/10">
                        <Select onValueChange={(courtId) => handleAssignMatchToCourt(match.id, courtId)}>
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
              {waitingMatches.length === 0 && draftPlayerIds.length === 0 && (
                <div className="py-20 text-center text-muted-foreground font-bold italic opacity-20 text-compact">Queue Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ACTIVE COURTS */}
        <div
          className={cn(
            "md:col-span-6 flex flex-col transition-all min-h-0",
            isCourtPanelOver ? "bg-green-500/5" : "bg-secondary/5"
          )}
          onDragOver={(event) => {
            if (!isAdmin) return;
            event.preventDefault();
            setIsCourtPanelOver(true);
          }}
          onDragLeave={() => setIsCourtPanelOver(false)}
          onDrop={onDropInCourtPanel}
        >
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
                const draft = courtDrafts[court.id];
                const teamAScore = match?.teamAScore || 0;
                const teamBScore = match?.teamBScore || 0;

                return (
                  <Card
                    key={court.id}
                    onDragOver={(event) => {
                      if (!isAdmin || isOccupied) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDragEnter={(event) => {
                      if (!isAdmin || isOccupied) return;
                      event.preventDefault();
                      event.stopPropagation();
                      setDragOverCourtId(court.id);
                    }}
                    onDragLeave={(event) => {
                      if (!isAdmin || isOccupied) return;
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setDragOverCourtId(null);
                      }
                    }}
                    onDrop={(event) => {
                      if (!isAdmin || isOccupied) return;
                      setDraggedMatchId(null);
                      setDragOverCourtId(null);
                      onDropInCourt(event, court.id);
                    }}
                    className={cn(
                      "border-2 transition-all duration-200 overflow-hidden flex flex-col min-h-[380px]",
                      isOccupied ? "bg-card border-primary/20" : "bg-muted/10 border-border",
                      isAdmin && !isOccupied && draggedMatchId && "border-orange-500 bg-orange-500/10",
                      dragOverCourtId === court.id && "ring-2 ring-orange-500 ring-offset-2"
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
                            {isAdmin && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="h-6 text-[8px] font-black px-1.5" disabled={!match.startTime} onClick={() => setWinningTeam({ courtId: court.id, team: 'teamA' })}>
                                  T1 WIN
                                </Button>
                                <Button size="sm" variant="outline" className="h-6 text-[8px] font-black px-1.5" disabled={!match.startTime} onClick={() => setWinningTeam({ courtId: court.id, team: 'teamB' })}>
                                  T2 WIN
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-2 flex-1">
                            <div className={cn("p-3 rounded-lg border-l-4 space-y-1.5 transition-colors", teamAScore > teamBScore ? "border-primary bg-primary/5" : "border-muted-foreground/10 bg-muted/10")}>
                              {match.teamA.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center gap-1 group/p">
                                    <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(p)))}>{SKILL_LEVELS_SHORT[skillLevelOf(p)]}</Badge>}
                                    {isAdmin && <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/p:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}><ArrowLeftRight className="h-3 w-3" /></Button>}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-center py-1 opacity-20"><span className="text-[10px] font-black">VS</span></div>
                            <div className={cn("p-3 rounded-lg border-l-4 space-y-1.5 transition-colors", teamBScore > teamAScore ? "border-primary bg-primary/5" : "border-muted-foreground/10 bg-muted/10")}>
                              {match.teamB.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center gap-1 group/p">
                                    <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(p)))}>{SKILL_LEVELS_SHORT[skillLevelOf(p)]}</Badge>}
                                    {isAdmin && <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/p:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}><ArrowLeftRight className="h-3 w-3" /></Button>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : draft ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase text-primary">Drafting ({draft.length}/4)</p>
                          <div className="space-y-1.5">
                            {draft.map(id => {
                              const player = players.find(p => p.id === id);
                              return (
                                <div key={id} className="text-[11px] font-black bg-background p-2 rounded border flex items-center justify-between gap-1 overflow-hidden">
                                  <span className="truncate flex-1">{player?.name}</span>
                                  {player && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(player)))}>{SKILL_LEVELS_SHORT[skillLevelOf(player)]}</Badge>}
                                </div>
                              );
                            })}
                          </div>
                          <Button variant="ghost" size="sm" className="w-full h-8 text-[9px] font-black" onClick={() => setCourtDrafts(prev => {
                            const next = { ...prev };
                            delete next[court.id];
                            return next;
                          })}>
                            CANCEL
                          </Button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-8">
                          <Zap className="h-10 w-10 mb-2" />
                          <p className="text-tiny font-black uppercase text-center tracking-widest">Available</p>
                        </div>
                      )}
                    </CardContent>

                    {isOccupied && match && isAdmin && (
                      <div className="p-3 bg-secondary/20 border-t space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase opacity-40 text-center">T1</span>
                            <Input
                              type="number"
                              min="0"
                              className={cn("h-12 text-2xl font-black text-center border-2 no-spinner", teamAScore > teamBScore ? "border-primary bg-primary/5" : "bg-card")}
                              value={teamAScore === 0 ? "" : teamAScore}
                              placeholder="0"
                              onChange={(event) => handleScoreChange(match.id, parseInt(event.target.value, 10) || 0, teamBScore)}
                            />
                          </div>
                          <div className="text-lg font-black opacity-20 mt-4 shrink-0">VS</div>
                          <div className="flex-1 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase opacity-40 text-center">T2</span>
                            <Input
                              type="number"
                              min="0"
                              className={cn("h-12 text-2xl font-black text-center border-2 no-spinner", teamBScore > teamAScore ? "border-primary bg-primary/5" : "bg-card")}
                              value={teamBScore === 0 ? "" : teamBScore}
                              placeholder="0"
                              onChange={(event) => handleScoreChange(match.id, teamAScore, parseInt(event.target.value, 10) || 0)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <CardFooter className="p-2.5 border-t mt-auto gap-2">
                      {isOccupied && match && isAdmin ? (
                        !match.startTime ? (
                          <Button onClick={() => startTimer(court.id)} className="w-full h-10 bg-green-600 hover:bg-green-700 font-black text-tiny uppercase px-2 truncate">
                            <Play className="h-3.5 w-3.5 mr-1.5 shrink-0" /> START
                          </Button>
                        ) : (
                          <div className="flex w-full gap-2">
                            <Button onClick={() => handleFinishMatch(court.id, teamAScore, teamBScore)} className="flex-1 h-10 bg-primary font-black text-tiny uppercase px-2 truncate">
                              FINISH
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => endMatch(court.id, 'cancelled')} className="h-10 w-10 p-0 border-2 shrink-0">
                              <Ban className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        )
                      ) : (
                        <div className="flex w-full justify-between items-center px-1 h-10">
                          <p className="text-[9px] font-black uppercase opacity-40 truncate">{isOccupied ? "Match Ongoing" : "Ready"}</p>
                          {isAdmin && !isOccupied && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white shrink-0" onClick={() => deleteCourt(court.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* MODALS */}
      <Dialog open={!!swapping} onOpenChange={(open) => !open && setSwapping(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-compact font-black uppercase">Swap Player</DialogTitle></DialogHeader>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3 p-1">
              {players.filter(player => player.status === 'available').map(player => (
                <Button key={player.id} variant="outline" className="w-full justify-between h-auto py-3 px-4 border-2 group hover:border-primary" onClick={() => handleSwap(player.id)}>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="font-black text-compact truncate w-full text-left">{player.name}</span>
                    <Badge variant="outline" className={cn("text-[9px] uppercase font-black h-4 mt-1.5", getSkillColor(skillLevelOf(player)))}>
                      {SKILL_LEVELS_SHORT[skillLevelOf(player)]} - {player.gamesPlayed} G
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!winningTeam} onOpenChange={(open) => !open && setWinningTeam(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Confirm Winner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/20 text-center">
              <p className="text-[10px] font-black uppercase text-primary opacity-60">Winner Team</p>
              <h3 className="text-2xl font-black uppercase">{winningTeam?.team === 'teamA' ? 'Team 1' : 'Team 2'}</h3>
              <div className="mt-2 text-3xl font-black text-primary">{defaultWinningScore}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase opacity-60">Losing Team's Score</Label>
              <Input
                ref={loserScoreInputRef}
                type="number"
                min="0"
                placeholder="0"
                value={loserScore}
                onChange={(event) => setLoserScore(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleWinSubmit()}
                className="h-16 text-3xl font-black text-center border-2 no-spinner"
                autoFocus
              />
            </div>
          </div>
          <Button className="w-full h-14 font-black uppercase" onClick={handleWinSubmit}>Confirm Result</Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingMatchFinish} onOpenChange={(open) => !open && setPendingMatchFinish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase text-lg">Zero Score Confirmation</AlertDialogTitle>
            <AlertDialogDescription className="font-bold">
              The losing team has a score of 0. Is this correct?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingMatchFinish(null)} className="font-black uppercase">
              Edit Score
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (pendingMatchFinish) {
                  completeMatch(
                    pendingMatchFinish.courtId,
                    pendingMatchFinish.winner,
                    pendingMatchFinish.scoreA,
                    pendingMatchFinish.scoreB
                  );
                }
              }}
              className="bg-primary font-black uppercase"
            >
              Yes, Correct
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
