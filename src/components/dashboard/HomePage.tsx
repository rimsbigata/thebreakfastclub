'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GripVertical, Trash2, Timer, Play, User, DoorOpen, ListOrdered, ShieldAlert, PlayCircle, KeyRound, ShieldCheck, Zap, X, ArrowLeftRight, Trophy, Ban, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';
import { MatchScoreDialog } from '@/components/match/MatchScoreDialog';
import { Switch } from '@radix-ui/react-switch';
import { NotificationPermissionButton } from '@/components/NotificationPermissionButton';
import { useFcmToken } from '@/hooks/useFcmToken';

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
  const { user } = useUser();
  const { token, permission } = useFcmToken();
  const {
    courts, players, matches, deleteCourt, startMatch, startTimer,
    updateMatchScore, endMatch, swapPlayer, assignMatchToCourt,
    createCourtAndAssignMatch, addCourt, deleteMatch, defaultWinningScore,
    role, isSessionActive, createSession, joinSession, deuceEnabled, upcomingBoost
  } = useClub();

  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [sortOption, setSortOption] = useState<string>('default');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverCourtId, setDragOverCourtId] = useState<string | null>(null);
  const [dragOverTeam, setDragOverTeam] = useState<'teamA' | 'teamB' | null>(null);
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
  const [isDoubleStarSession, setIsDoubleStarSession] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [notificationBannerDismissed, setNotificationBannerDismissed] = useState(false);

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
  const isQueueMaster = role === 'queueMaster';
  const isStaff = isAdmin || isQueueMaster;

  const handleScoreSubmit = (
    teamAScore: number | undefined,
    teamBScore: number | undefined,
    winner: 'teamA' | 'teamB'
  ) => {
    if (!scoringCourtId) return;

    const a = teamAScore ?? 0;
    const b = teamBScore ?? 0;

    // Validate scores
    const validation = validateMatchScore(a, b);
    if (!validation.valid) {
      toast({ title: "Invalid Score", description: validation.message, variant: "destructive" });
      return;
    }

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
      const code = await createSession(isDoubleStarSession, sessionCodeInput);
      toast({ title: "Session Created!", description: `Code: ${code}${isDoubleStarSession ? ' (Double Star Active!)' : ''}` });
      setIsDoubleStarSession(false);
      setSessionCodeInput('');
    } catch (error: any) {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSessionAsAdmin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    try {
      await joinSession(code, false);
      toast({ title: "Session Joined as Admin" });
      setJoinCode('');
    } catch (error: any) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinSessionAsPlayer = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    try {
      await joinSession(code, true);
      toast({ title: "Joined Session!" });
      setJoinCode('');
    } catch (error: any) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const handleAssignMatchToCourt = async (matchId: string, courtId: string) => {
    if (!isStaff) return;

    const targetCourt = courts.find(court => court.id === courtId);
    if (!targetCourt || targetCourt.status !== 'available') {
      try {
        toast({
          title: "Court unavailable",
          description: "Drop the match on an available court.",
          variant: "destructive",
        });
      } catch (toastError) {
        console.error('Toast error:', toastError);
      }
      return;
    }

    try {
      // Logic centralized in ClubContext - will trigger notifications automatically
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
    if (!isStaff) return;

    event.dataTransfer.setData('application/x-tbc-match-id', matchId);
    event.dataTransfer.setData('text/plain', matchId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedMatchId(matchId);
  };

  const onDragStartPlayer = (event: React.DragEvent, playerId: string) => {
    event.dataTransfer.setData('application/x-tbc-player-id', playerId);
    event.dataTransfer.setData('playerId', playerId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedPlayerId(playerId);
  };

  const onDragEndPlayer = () => {
    setDraggedPlayerId(null);
    setDragOverTeam(null);
  };

  const getDraggedPlayerId = (event: React.DragEvent<HTMLElement>) => {
    return event.dataTransfer.getData('application/x-tbc-player-id') || event.dataTransfer.getData('playerId');
  };

  const getDraggedMatchId = (event: React.DragEvent<HTMLElement>) => {
    return event.dataTransfer.getData('application/x-tbc-match-id') || event.dataTransfer.getData('text/plain');
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

  const handleDraftDrop = async (event: React.DragEvent<HTMLElement>, targetTeam: 'teamA' | 'teamB') => {
    if (!isStaff) return;
    event.preventDefault();
    event.stopPropagation();

    const playerId = getDraggedPlayerId(event);
    if (!playerId) return;

    // Remove player from current position if already in draft
    let nextDraft = draftPlayerIds.filter(id => id !== playerId);

    const teamASlots = nextDraft.slice(0, 2);
    const teamBSlots = nextDraft.slice(2);

    if (targetTeam === 'teamA') {
      if (teamASlots.length < 2) {
        teamASlots.push(playerId);
      } else {
        teamBSlots.push(playerId);
      }
    } else {
      if (teamBSlots.length < 2) {
        teamBSlots.push(playerId);
      } else {
        teamASlots.push(playerId);
      }
    }

    nextDraft = [...teamASlots, ...teamBSlots];

    if (nextDraft.length === 4) {
      const availableCourt = courts.find(c => c.status === 'available');
      await createMatchFromDraft(nextDraft, availableCourt?.id);
      setDraftPlayerIds([]);
    } else {
      setDraftPlayerIds(nextDraft);
    }
    setDragOverTeam(null);
  };

  const handleCourtDraftDrop = async (event: React.DragEvent<HTMLElement>, courtId: string, targetTeam: 'teamA' | 'teamB') => {
    if (!isStaff) return;
    event.preventDefault();
    event.stopPropagation();

    const playerId = getDraggedPlayerId(event);
    if (!playerId) return;

    const currentDraft = courtDrafts[courtId] || [];
    // Remove player from current position if already in draft
    let nextDraft = currentDraft.filter(id => id !== playerId);

    const teamASlots = nextDraft.slice(0, 2);
    const teamBSlots = nextDraft.slice(2);

    if (targetTeam === 'teamA') {
      if (teamASlots.length < 2) {
        teamASlots.push(playerId);
      } else {
        teamBSlots.push(playerId);
      }
    } else {
      if (teamBSlots.length < 2) {
        teamBSlots.push(playerId);
      } else {
        teamASlots.push(playerId);
      }
    }

    nextDraft = [...teamASlots, ...teamBSlots];

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
    setDragOverTeam(null);
  };

  const onDropInQueue = async (event: React.DragEvent<HTMLElement>) => {
    if (!isStaff) return;
    event.preventDefault();

    if (draftPlayerIds.length > 0 || dragOverTeam) {
      setIsQueueOver(false);
      setDraggedPlayerId(null);
      setDragOverTeam(null);
      return;
    }

    setIsQueueOver(false);
    setDraggedPlayerId(null);
    setDragOverTeam(null);

    const playerId = getDraggedPlayerId(event);
    if (!playerId || allDraftedIds.includes(playerId)) return;

    const nextDraft = [...draftPlayerIds, playerId];

    if (nextDraft.length === 4) {
      const availableCourt = courts.find(c => c.status === 'available');
      await createMatchFromDraft(nextDraft, availableCourt?.id);
      setDraftPlayerIds([]);
    } else {
      setDraftPlayerIds(nextDraft);
    }
  };

  const onDropInCourt = async (event: React.DragEvent<HTMLElement>, courtId: string) => {
    if (!isStaff) return;
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const teamBox = target.closest('[data-team-box]');
    if (teamBox) {
      setDragOverCourtId(null);
      setDragOverTeam(null);
      return;
    }

    if (courtDrafts[courtId] && courtDrafts[courtId].length > 0) {
      setDragOverCourtId(null);
      setDragOverTeam(null);
      return;
    }

    setDragOverCourtId(null);
    setDragOverTeam(null);

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
    if (!isStaff) return;
    event.preventDefault();
    setIsCourtPanelOver(false);
    setDraggedPlayerId(null);
    setDragOverTeam(null);

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
    const clampedScoreA = Math.max(0, scoreA);
    const clampedScoreB = Math.max(0, scoreB);

    if (clampedScoreA > 0 && clampedScoreB > 0) {
      const validation = validateMatchScore(clampedScoreA, clampedScoreB);
      if (!validation.valid) {
        toast({ title: "Invalid Score", description: validation.message, variant: "destructive" });
      }
    }

    await updateMatchScore(matchId, clampedScoreA, clampedScoreB);
  };

  const validateMatchScore = (scoreA: number, scoreB: number) => {
    const higher = Math.max(scoreA, scoreB);
    const lower = Math.min(scoreA, scoreB);

    if (scoreA === scoreB) {
      return { valid: false, message: "Scores cannot be equal." };
    }
    if (higher < defaultWinningScore) {
      return { valid: false, message: `Winning score (${defaultWinningScore}) not reached.` };
    }
    if (!deuceEnabled && higher > defaultWinningScore) {
      return { valid: false, message: `Winner's score cannot exceed ${defaultWinningScore}.` };
    }
    if (deuceEnabled) {
      if (higher === defaultWinningScore && lower === defaultWinningScore - 1) {
        return { valid: false, message: `Must win by 2 points.` };
      }
      if (higher > defaultWinningScore && higher - lower < 2) {
        return { valid: false, message: "Must win by 2 points in deuce." };
      }
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
      {upcomingBoost && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b-2 border-yellow-500/30 px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <Target className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-500">
              Double Star Boost on {new Date(upcomingBoost.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}! ⭐️ x2
            </p>
          </div>
        </div>
      )}
      {isSessionActive && !notificationBannerDismissed && (permission !== 'granted' || !token) && (
        <div className="bg-primary/5 border-b-2 border-primary/20 px-4 py-2 relative">
          <div className="flex items-center justify-center gap-2">
            <NotificationPermissionButton />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => setNotificationBannerDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {!isSessionActive && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-2 border-primary/20 shadow-2xl">
            <CardHeader className="text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-primary mb-2" />
              <CardTitle className="text-xl font-black uppercase">No Active Session</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm font-bold opacity-60">
              Start a new club session, or enter an existing session code to unlock the command center.
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {isAdmin ? (
                <div className="space-y-4 w-full">
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Target className="h-4 w-4 fill-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">Double Star Boost</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">2x stars for all matches</p>
                      </div>
                    </div>
                    <Switch checked={isDoubleStarSession} onCheckedChange={setIsDoubleStarSession} />
                  </div>

                  {isDoubleStarSession && (
                    <div className="space-y-2 p-3 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg">
                      <Label className="text-[9px] font-black uppercase text-yellow-700 dark:text-yellow-500">Session Code (Optional)</Label>
                      <Input
                        value={sessionCodeInput}
                        onChange={e => setSessionCodeInput(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="text-center font-mono font-black h-10 border-yellow-500/30"
                        maxLength={6}
                      />
                      <p className="text-[8px] text-muted-foreground font-bold text-center">Optional: Enter code from scheduled boost to link session</p>
                    </div>
                  )}

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
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                      Have a code already?
                    </p>
                    <Input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="text-center font-black h-12"
                      maxLength={6}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={handleJoinSessionAsAdmin} className="h-12 font-black uppercase border-2 text-[10px]" disabled={isCreating || isJoining || !joinCode.trim()}>
                        {isJoining ? "Joining..." : "Join as Admin"} <ShieldCheck className="ml-1 h-3 w-3" />
                      </Button>
                      <Button type="button" variant="outline" onClick={handleJoinSessionAsPlayer} className="h-12 font-black uppercase border-2 text-[10px]" disabled={isCreating || isJoining || !joinCode.trim()}>
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

        {isStaff && (
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
                    draggable={isStaff}
                    onDragStart={(event) => onDragStartPlayer(event, player.id)}
                    onDragEnd={onDragEndPlayer}
                    className={cn(
                      "p-3 border-2 shadow-sm group bg-card min-w-0",
                      isStaff && "cursor-grab active:cursor-grabbing hover:border-primary"
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
        )}

        <div
          className={cn(
            "md:col-span-3 border-r flex flex-col bg-background transition-all min-h-0",
            isQueueOver && "ring-4 ring-inset ring-primary/20 bg-primary/5"
          )}
          onDragOver={(event) => {
            if (!isStaff) return;
            const target = event.target as HTMLElement;
            if (target.closest('[data-team-box]')) return;
            event.preventDefault();
            setIsQueueOver(true);
          }}
          onDragLeave={(event) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-team-box]')) {
              setIsQueueOver(false);
            }
          }}
          onDrop={draftPlayerIds.length > 0 ? undefined : onDropInQueue}
        >
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-orange-500" /> Queue
            </h2>
            <Badge variant="secondary" className="font-black h-6 px-2.5 text-compact bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950 border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3 pb-24">
              {draftPlayerIds.length > 0 && (
                <Card className={cn("border-dashed border-2 bg-primary/5 p-3 space-y-2", isQueueOver && "border-primary/60 bg-primary/10")}>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-primary">Drafting ({draftPlayerIds.length}/4)</p>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setDraftPlayerIds([])}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div
                      data-team-box="teamA"
                      className={cn(
                        "p-3 rounded-lg border-2 border-dashed transition-all",
                        dragOverTeam === 'teamA' ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted/5"
                      )}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTeam('teamA'); }}
                      onDragLeave={() => setDragOverTeam(null)}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDraftDrop(e, 'teamA'); }}
                    >
                      <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Team 1</p>
                      <div className="grid grid-cols-2 gap-2">
                        {draftPlayerIds.slice(0, 2).map(id => {
                          const player = players.find(p => p.id === id);
                          return (
                            <div
                              key={id}
                              draggable
                              onDragStart={(e) => onDragStartPlayer(e, id)}
                              onDragEnd={onDragEndPlayer}
                              className="text-[11px] font-black bg-card p-2 rounded border flex flex-col gap-1 group relative overflow-hidden cursor-grab active:cursor-grabbing"
                            >
                              <span className="truncate pr-4">{player?.name}</span>
                              <X className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-100 cursor-pointer text-destructive" onClick={(e) => { e.stopPropagation(); setDraftPlayerIds(prev => prev.filter(playerId => playerId !== id)); }} />
                              {player && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(skillLevelOf(player)))}>{SKILL_LEVELS_SHORT[skillLevelOf(player)]}</Badge>}
                            </div>
                          );
                        })}
                        {draftPlayerIds.slice(0, 2).length < 2 && (
                          <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                            Empty
                          </div>
                        )}
                      </div>
                    </div>
                    {draftPlayerIds.slice(0, 2).length === 2 && (
                      <div
                        data-team-box="teamB"
                        className={cn(
                          "p-3 rounded-lg border-2 border-dashed transition-all",
                          dragOverTeam === 'teamB' ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted/5"
                        )}
                        onDragOver={(e) => { e.preventDefault(); setDragOverTeam('teamB'); }}
                        onDragLeave={() => setDragOverTeam(null)}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDraftDrop(e, 'teamB'); }}
                      >
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Team 2</p>
                        <div className="grid grid-cols-2 gap-2">
                          {draftPlayerIds.slice(2).map(id => {
                            const player = players.find(p => p.id === id);
                            return (
                              <div
                                key={id}
                                draggable
                                onDragStart={(e) => onDragStartPlayer(e, id)}
                                onDragEnd={onDragEndPlayer}
                                className="text-[11px] font-black bg-card p-2 rounded border flex flex-col gap-1 group relative overflow-hidden cursor-grab active:cursor-grabbing"
                              >
                                <span className="truncate pr-4">{player?.name}</span>
                                <X className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-100 cursor-pointer text-destructive" onClick={(e) => { e.stopPropagation(); setDraftPlayerIds(prev => prev.filter(playerId => playerId !== id)); }} />
                                {player && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(skillLevelOf(player)))}>{SKILL_LEVELS_SHORT[skillLevelOf(player)]}</Badge>}
                              </div>
                            );
                          })}
                          {draftPlayerIds.slice(2).length < 2 && (
                            <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                              Empty
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {waitingMatches.map((match, index) => {
                const isPlayerInMatch = user?.uid && (match.teamA.includes(user.uid) || match.teamB.includes(user.uid));
                return (
                  <Card
                    key={match.id}
                    onDragEnd={() => {
                      setDraggedMatchId(null);
                      setDragOverCourtId(null);
                    }}
                    className={cn(
                      "border-2 shadow-sm overflow-hidden group relative",
                      isPlayerInMatch ? "border-primary bg-primary/10" : "border-orange-500/30 bg-orange-500/5",
                      draggedMatchId === match.id && "opacity-60"
                    )}
                  >
                    <div className="absolute top-1 left-1 z-10">
                      <Badge variant="secondary" className={cn(
                        "text-[9px] h-4 px-1 font-black",
                        isPlayerInMatch ? "bg-primary text-primary-foreground" : "bg-orange-500 text-white dark:bg-orange-400 dark:text-orange-950"
                      )}>
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="p-3 pt-6 flex flex-col gap-3">
                      {isStaff && (
                        <div
                          draggable
                          onDragStart={(event) => handleMatchDragStart(event, match.id)}
                          className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                      )}
                      {isStaff && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteMatch(match.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col space-y-1.5 flex-1 min-w-0 border-l-4 border-orange-500/20 pl-2">
                          {match.teamA.map((id: string) => {
                            const p = players.find(player => player.id === id);
                            return (
                              <div key={id} className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                                <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit shrink-0", getSkillColor(skillLevelOf(p || { skillLevel: 3 })))}>{SKILL_LEVELS_SHORT[skillLevelOf(p || { skillLevel: 3 })]}</Badge>
                                {isStaff && (
                                  <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                    <ArrowLeftRight className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          {match.teamB.map((id) => {
                            const p = players.find(player => player.id === id);
                            return (
                              <div key={id} className="flex items-center gap-1.5 min-w-0 justify-end">
                                {isStaff && (
                                  <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}>
                                    <ArrowLeftRight className="h-3 w-3" />
                                  </Button>
                                )}
                                <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                                <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit shrink-0", getSkillColor(skillLevelOf(p || { skillLevel: 3 })))}>{SKILL_LEVELS_SHORT[skillLevelOf(p || { skillLevel: 3 })]}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {isStaff && (
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
                );
              })}
              {waitingMatches.length === 0 && draftPlayerIds.length === 0 && (
                <div className="py-20 text-center text-muted-foreground font-bold italic opacity-20 text-compact">Queue Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div
          className={cn(
            "md:col-span-6 flex flex-col transition-all min-h-0",
            isCourtPanelOver ? "bg-green-500/5" : "bg-secondary/5"
          )}
          onDragOver={(event) => {
            if (!isStaff) return;
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
                const isPlayerOnCourt = user?.uid && match && (match.teamA.includes(user.uid) || match.teamB.includes(user.uid));

                return (
                  <Card
                    key={court.id}
                    onDragEnter={(event) => {
                      if (!isStaff || isOccupied) return;
                      event.preventDefault();
                      event.stopPropagation();
                      setDragOverCourtId(court.id);
                    }}
                    onDragLeave={(event) => {
                      if (!isStaff || isOccupied) return;
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setDragOverCourtId(null);
                      }
                    }}
                    onDragEnd={() => {
                      setDragOverCourtId(null);
                      setDragOverTeam(null);
                    }}
                    onClick={() => {
                      setDragOverCourtId(null);
                      setDragOverTeam(null);
                    }}
                    onDrop={(event) => {
                      if (!isStaff || isOccupied) return;
                      if (courtDrafts[court.id] && courtDrafts[court.id].length > 0) return;
                      setDraggedMatchId(null);
                      setDragOverCourtId(null);
                      onDropInCourt(event, court.id);
                    }}
                    className={cn(
                      "border-2 transition-all duration-200 overflow-hidden flex flex-col min-h-[380px]",
                      isPlayerOnCourt ? "border-green-500/50 bg-green-500/5" : isOccupied ? "bg-card border-primary/20" : "bg-muted/10 border-border",
                      isStaff && !isOccupied && draggedMatchId && "border-orange-500 bg-orange-500/10",
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
                            {isStaff && (
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
                              {match.teamA.map((id: string) => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center gap-1 group/p">
                                    <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(p)))}>{SKILL_LEVELS_SHORT[skillLevelOf(p)]}</Badge>}
                                    {isStaff && <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/p:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}><ArrowLeftRight className="h-3 w-3" /></Button>}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-center py-1 opacity-20"><span className="text-[10px] font-black">VS</span></div>
                            <div className={cn("p-3 rounded-lg border-l-4 space-y-1.5 transition-colors", teamBScore > teamAScore ? "border-primary bg-primary/5" : "border-muted-foreground/10 bg-muted/10")}>
                              {match.teamB.map((id: string) => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center gap-1 group/p">
                                    <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(p)))}>{SKILL_LEVELS_SHORT[skillLevelOf(p)]}</Badge>}
                                    {isStaff && <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/p:opacity-100 shrink-0" onClick={() => setSwapping({ matchId: match.id, oldPlayerId: id })}><ArrowLeftRight className="h-3 w-3" /></Button>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : draft ? (
                        <div className="space-y-2 w-full">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black uppercase text-primary">Drafting ({draft.length}/4)</p>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setCourtDrafts(prev => {
                              const next = { ...prev };
                              delete next[court.id];
                              return next;
                            })}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div
                              data-team-box="teamA"
                              className={cn(
                                "p-3 rounded-lg border-2 border-dashed transition-all",
                                dragOverTeam === 'teamA' ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted/5"
                              )}
                              onDragOver={(e) => { e.preventDefault(); setDragOverTeam('teamA'); }}
                              onDragLeave={() => setDragOverTeam(null)}
                              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleCourtDraftDrop(e, court.id, 'teamA'); }}
                            >
                              <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Team 1</p>
                              <div className="space-y-1.5">
                                {draft.slice(0, 2).map((id: string) => {
                                  const player = players.find(p => p.id === id);
                                  return (
                                    <div key={id} className="text-[11px] font-black bg-background p-2 rounded border flex items-center justify-between gap-1 overflow-hidden">
                                      <span className="truncate flex-1">{player?.name}</span>
                                      {player && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(player)))}>{SKILL_LEVELS_SHORT[skillLevelOf(player)]}</Badge>}
                                    </div>
                                  );
                                })}
                                {draft.slice(0, 2).length < 2 && (
                                  <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                                    Empty
                                  </div>
                                )}
                              </div>
                            </div>
                            {draft.slice(0, 2).length === 2 && (
                              <div
                                data-team-box="teamB"
                                className={cn(
                                  "p-3 rounded-lg border-2 border-dashed transition-all",
                                  dragOverTeam === 'teamB' ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted/5"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setDragOverTeam('teamB'); }}
                                onDragLeave={() => setDragOverTeam(null)}
                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleCourtDraftDrop(e, court.id, 'teamB'); }}
                              >
                                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Team 2</p>
                                <div className="space-y-1.5">
                                  {draft.slice(2).map((id: string) => {
                                    const player = players.find(p => p.id === id);
                                    return (
                                      <div key={id} className="text-[11px] font-black bg-background p-2 rounded border flex items-center justify-between gap-1 overflow-hidden">
                                        <span className="truncate flex-1">{player?.name}</span>
                                        {player && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(player)))}>{SKILL_LEVELS_SHORT[skillLevelOf(player)]}</Badge>}
                                      </div>
                                    );
                                  })}
                                  {draft.slice(2).length < 2 && (
                                    <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                                      Empty
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-8">
                          {(() => {
                            const currentDraft = courtDrafts[court.id] || [];
                            const draftLength = currentDraft.length;
                            const showDropZones = draggedPlayerId && dragOverCourtId === court.id && draftLength < 4;
                            if (!showDropZones) {
                              return (
                                <div className="flex flex-col items-center justify-center opacity-10">
                                  <Zap className="h-10 w-10 mb-2" />
                                  <p className="text-tiny font-black uppercase text-center tracking-widest">Available</p>
                                </div>
                              );
                            }
                            return (
                              <>
                                {draftLength > 0 && (
                                  <div className="space-y-2 w-full mb-4">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[10px] font-black uppercase text-primary">Drafting ({draftLength}/4)</p>
                                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setCourtDrafts(prev => {
                                        const next = { ...prev };
                                        delete next[court.id];
                                        return next;
                                      })}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="space-y-2">
                                      <div
                                        data-team-box="teamA"
                                        className={cn(
                                          "p-3 rounded-lg border-2 border-dashed transition-all",
                                          dragOverTeam === 'teamA' ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted/5"
                                        )}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverTeam('teamA'); }}
                                        onDragLeave={() => setDragOverTeam(null)}
                                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleCourtDraftDrop(e, court.id, 'teamA'); }}
                                      >
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Team 1</p>
                                        <div className="space-y-1.5">
                                          {currentDraft.slice(0, 2).map((id: string) => {
                                            const player = players.find(p => p.id === id);
                                            return (
                                              <div key={id} className="text-[11px] font-black bg-background p-2 rounded border flex items-center justify-between gap-1 overflow-hidden">
                                                <span className="truncate flex-1">{player?.name}</span>
                                                {player && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(player)))}>{SKILL_LEVELS_SHORT[skillLevelOf(player)]}</Badge>
                                              </div>
                                            );
                                          })}
                                          {currentDraft.slice(0, 2).length < 2 && (
                                            <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                                              Empty
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {currentDraft.slice(0, 2).length === 2 && (
                                        <div
                                          data-team-box="teamB"
                                          className={cn(
                                            "p-3 rounded-lg border-2 border-dashed transition-all",
                                            dragOverTeam === 'teamB' ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted/5"
                                          )}
                                          onDragOver={(e) => { e.preventDefault(); setDragOverTeam('teamB'); }}
                                          onDragLeave={() => setDragOverTeam(null)}
                                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleCourtDraftDrop(e, court.id, 'teamB'); }}
                                        >
                                          <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Team 2</p>
                                          <div className="space-y-1.5">
                                            {currentDraft.slice(2).map((id: string) => {
                                              const player = players.find(p => p.id === id);
                                              return (
                                                <div key={id} className="text-[11px] font-black bg-background p-2 rounded border flex items-center justify-between gap-1 overflow-hidden">
                                                  <span className="truncate flex-1">{player?.name}</span>
                                                  {player && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(skillLevelOf(player)))}>{SKILL_LEVELS_SHORT[skillLevelOf(player)]}</Badge>
                                                </div>
                                              );
                                            })}
                                            {currentDraft.slice(2).length < 2 && (
                                              <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                                                Empty
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {draftLength === 0 && (
                                  <div className="space-y-2 w-full">
                                    <div
                                      className={cn(
                                        "p-3 rounded-lg border-2 border-dashed transition-all",
                                        dragOverTeam === 'teamA' ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted/5"
                                      )}
                                      onDragOver={(e) => { e.preventDefault(); setDragOverTeam('teamA'); }}
                                      onDragLeave={() => setDragOverTeam(null)}
                                    >
                                      <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Team 1</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                                          Empty
                                        </div>
                                        <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                                          Empty
                                        </div>
                                      </div>
                                    </div>
                                    <div
                                      className={cn(
                                        "p-3 rounded-lg border-2 border-dashed transition-all",
                                        dragOverTeam === 'teamB' ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted/5"
                                      )}
                                      onDragOver={(e) => { e.preventDefault(); setDragOverTeam('teamB'); }}
                                      onDragLeave={() => setDragOverTeam(null)}
                                    >
                                      <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Team 2</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                                          Empty
                                        </div>
                                        <div className="text-[11px] font-black bg-muted/10 p-2 rounded border border-dashed flex items-center justify-center text-muted-foreground/40">
                                          Empty
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>

                    {isOccupied && match && isStaff && (
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
                      {isOccupied && match && isStaff ? (
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

      <Dialog open={!!swapping} onOpenChange={(open) => !open && setSwapping(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-compact font-black uppercase">Swap Player</DialogTitle>
            <DialogDescription className="sr-only">
              Select a player to swap into the match
            </DialogDescription>
          </DialogHeader>
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
            <DialogDescription className="sr-only">
              Confirm which team won the match
            </DialogDescription>
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
              defaultWinningScore={defaultWinningScore}
              deuceEnabled={deuceEnabled}
            />
          );
        })()}

      {activeModal === 'zeroConfirm' && (
          <Dialog open={true} onOpenChange={(open) => !open && setActiveModal(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase">Confirm Zero Score</DialogTitle>
                <DialogDescription className="sr-only">
                  Confirm that the losing team has a score of zero
                </DialogDescription>
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
    </div >
  );
}
