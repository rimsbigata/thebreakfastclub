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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GripVertical, Trash2, Timer, Play, User, DoorOpen, ListOrdered, ShieldAlert, PlayCircle, KeyRound, ShieldCheck, Zap, X, Swords, Ban, Target, Loader2, Pencil, Coffee, CheckCircle2, History, Clock, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SKILL_LEVELS_SHORT, getSkillColor, Player } from '@/lib/types';
import { MatchScoreDialog } from '@/components/match/MatchScoreDialog';
import { Switch } from '@/components/ui/switch';
import { NotificationPermissionModal } from '@/components/NotificationPermissionModal';
import { useFcmToken } from '@/hooks/useFcmToken';
import { detectRepeatPartners, generateSwapSuggestions, RepeatPartnerInfo } from '@/lib/repeatPartner';

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

function MatchWaitBadge({ timestamp }: { timestamp: string }) {
  const [mins, setMins] = useState(0);

  useEffect(() => {
    const start = new Date(timestamp).getTime();
    const update = () => setMins(Math.floor((Date.now() - start) / 60000));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
      <Clock className="h-3 w-3" />
      {mins}m WAITING
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useUser();
  const { token, permission, requestPermissionAndGetToken } = useFcmToken();
  const { updateFcmToken } = useClub();
  const {
    courts, players, matches, deleteCourt, startMatch, startTimer,
    updateMatchScore, endMatch, swapPlayer, assignMatchToCourt,
    createCourtAndAssignMatch, addCourt, updateCourt, deleteMatch, defaultWinningScore,
    role, isSessionActive, createSession, joinSession, deuceEnabled, upcomingBoost, updatePlayer
  } = useClub();

  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [sortOption, setSortOption] = useState<string>('default');
  const [benchTab, setBenchTab] = useState<'available' | 'resting'>('available');
  const [isCreating, setIsCreating] = useState(false);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverCourtId, setDragOverCourtId] = useState<string | null>(null);
  const [draftPlayerIds, setDraftPlayerIds] = useState<string[]>([]);
  const [courtDrafts, setCourtDrafts] = useState<Record<string, string[]>>({});
  const [isQueueOver, setIsQueueOver] = useState(false);
  const [isCourtPanelOver, setIsCourtPanelOver] = useState(false);
  const [isDoubleStarSession, setIsDoubleStarSession] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState('');

  const [scoringCourtId, setScoringCourtId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'score' | 'zeroConfirm' | null>(null);
  const [pendingScore, setPendingScore] = useState<{ courtId: string; teamAScore: number; teamBScore: number; winner: 'teamA' | 'teamB' } | null>(null);

  const [editingCourtId, setEditingCourtId] = useState<string | null>(null);
  const [tempCourtName, setTempCourtName] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [repeatPartnerThreshold, setRepeatPartnerThreshold] = useState(() => {
    // Load from localStorage or default to 3
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('repeatPartnerThreshold');
      return saved ? parseInt(saved) : 3;
    }
    return 3;
  });
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [swapSuggestions, setSwapSuggestions] = useState<any>(null);

  // Save threshold to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('repeatPartnerThreshold', repeatPartnerThreshold.toString());
    }
  }, [repeatPartnerThreshold]);

  const handleNotificationModalClose = (open: boolean) => {
    setShowNotificationModal(open);
    if (!open) {
      // Mark modal as seen when closed
      localStorage.setItem('notificationModalSeen', 'true');
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-show notification modal when dashboard loads (only once)
  useEffect(() => {
    if (!mounted || !isSessionActive) return;
    
    // Check if user has already seen the modal
    const hasSeenModal = localStorage.getItem('notificationModalSeen');
    
    // Only show modal if permission is 'default' (not yet asked) and hasn't been seen
    if (permission === 'default' && !hasSeenModal) {
      console.log('Showing notification modal - permission:', permission, 'hasSeenModal:', hasSeenModal);
      const timer = setTimeout(() => {
        setShowNotificationModal(true);
      }, 2000); // Delay by 2 seconds to not interrupt initial load
      
      return () => clearTimeout(timer);
    }
  }, [mounted, isSessionActive, permission]);

  useEffect(() => {
    setCourtDrafts(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(id => {
        if (!courts.find(c => c.id === id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [courts]);

  const allDraftedIds = useMemo(() => [
    ...draftPlayerIds,
    ...Object.values(courtDrafts).flat(),
  ], [courtDrafts, draftPlayerIds]);

  const sortedBenchPlayers = useMemo(() => {
    return players
      .filter(p => p.status === benchTab && !allDraftedIds.includes(p.id))
      .sort((a, b) => {
        let res = 0;
        switch (sortOption) {
          case 'skill-asc': res = a.skillLevel - b.skillLevel; break;
          case 'skill-desc': res = b.skillLevel - a.skillLevel; break;
          case 'wait': res = (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0); break;
          default: res = 0;
        }
        return res || (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0);
      });
  }, [players, allDraftedIds, sortOption, benchTab]);

  const restingCount = useMemo(() => players.filter(p => p.status === 'resting').length, [players]);
  const availableCount = useMemo(() => players.filter(p => p.status === 'available').length, [players]);

  // Detect repeat partners in the main draft
  const draftRepeatPartners = useMemo(() => {
    if (draftPlayerIds.length < 4) return [];
    const teamA = draftPlayerIds.slice(0, 2);
    const teamB = draftPlayerIds.slice(2, 4);
    return detectRepeatPartners(teamA, teamB, players, repeatPartnerThreshold);
  }, [draftPlayerIds, players, repeatPartnerThreshold]);

  // Detect repeat partners in court drafts
  const courtRepeatPartners = useMemo(() => {
    const repeats: Record<string, RepeatPartnerInfo[]> = {};
    Object.entries(courtDrafts).forEach(([courtId, draftIds]) => {
      if (draftIds.length === 4) {
        const teamA = draftIds.slice(0, 2);
        const teamB = draftIds.slice(2, 4);
        repeats[courtId] = detectRepeatPartners(teamA, teamB, players, repeatPartnerThreshold);
      }
    });
    return repeats;
  }, [courtDrafts, players, repeatPartnerThreshold]);

  // Generate unique display name: first name, or first name + surname initial if duplicate
  const getUniqueDisplayName = (playerName: string, allPlayerNames: string[]): string => {
    const firstName = playerName.split(' ')[0];
    const firstNameCount = allPlayerNames.filter(n => n.split(' ')[0] === firstName).length;
    
    if (firstNameCount > 1) {
      const nameParts = playerName.split(' ');
      const surnameInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] : '';
      return surnameInitial ? `${firstName} ${surnameInitial}.` : firstName;
    }
    
    return firstName;
  };

  const allPlayerNames = useMemo(() => players.map(p => p.name), [players]);

  const waitingMatches = useMemo(() => {
    return matches.filter(m => !m.isCompleted && !m.courtId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [matches]);

  const isAdmin = role === 'admin';
  const isQueueMaster = role === 'queueMaster';
  const isStaff = isAdmin || isQueueMaster;

  const handleScoreSubmit = (teamAScore: number | undefined, teamBScore: number | undefined, winner: 'teamA' | 'teamB') => {
    if (!scoringCourtId) return;
    const a = teamAScore ?? 0;
    const b = teamBScore ?? 0;
    const winningScore = Math.max(a, b);
    const losingScore = Math.min(a, b);

    if (winningScore < defaultWinningScore) {
      toast({ title: "Invalid Score", description: `Winning score is ${defaultWinningScore}.`, variant: "destructive" });
      return;
    }

    if (losingScore === 0) {
      setPendingScore({ courtId: scoringCourtId, teamAScore: a, teamBScore: b, winner });
      setActiveModal('zeroConfirm');
      return;
    }

    endMatch(scoringCourtId, 'completed', winner, a, b);
    setActiveModal(null);
    setScoringCourtId(null);
  };

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      await createSession(isDoubleStarSession, sessionCodeInput);
      toast({ title: "Session Created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameCourt = async (courtId: string) => {
    if (!tempCourtName.trim()) {
      setEditingCourtId(null);
      return;
    }
    try {
      await updateCourt(courtId, { name: tempCourtName.trim() });
      setEditingCourtId(null);
      toast({ title: "Court Renamed" });
    } catch (e) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleSetStatus = async (playerId: string, status: Player['status']) => {
    try {
      await updatePlayer(playerId, { status });
      toast({ title: `Status updated to ${status}` });
    } catch (e) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const onDragStartPlayer = (event: React.DragEvent, playerId: string) => {
    if (benchTab === 'resting') {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('playerId', playerId);
    setDraggedPlayerId(playerId);
  };

  const onDropInQueue = async (event: React.DragEvent) => {
    if (!isStaff) return;
    event.preventDefault();
    setIsQueueOver(false);
    const pid = event.dataTransfer.getData('playerId');
    if (!pid || allDraftedIds.includes(pid)) return;

    const nextDraft = [...draftPlayerIds, pid];
    if (nextDraft.length === 4) {
      await startMatch({ teamA: [nextDraft[0], nextDraft[1]], teamB: [nextDraft[2], nextDraft[3]] });
      setDraftPlayerIds([]);
    } else {
      setDraftPlayerIds(nextDraft);
    }
  };

  const onDropInCourt = async (event: React.DragEvent, courtId: string) => {
    if (!isStaff) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOverCourtId(null);
    const matchId = event.dataTransfer.getData('application/x-tbc-match-id');
    if (matchId) {
      await assignMatchToCourt(matchId, courtId);
      return;
    }
    const pid = event.dataTransfer.getData('playerId');
    if (!pid || allDraftedIds.includes(pid)) return;

    const currentDraft = courtDrafts[courtId] || [];
    const nextDraft = [...currentDraft, pid];
    if (nextDraft.length === 4) {
      await startMatch({ teamA: [nextDraft[0], nextDraft[1]], teamB: [nextDraft[2], nextDraft[3]], courtId });
      setCourtDrafts(prev => { const next = { ...prev }; delete next[courtId]; return next; });
    } else {
      setCourtDrafts(prev => ({ ...prev, [courtId]: nextDraft }));
    }
  };

  const onDropInCourtPanel = async (event: React.DragEvent) => {
    if (!isStaff) return;
    if (dragOverCourtId) return;
    
    event.preventDefault();
    setIsCourtPanelOver(false);
    const matchId = event.dataTransfer.getData('application/x-tbc-match-id');
    if (matchId) {
      await createCourtAndAssignMatch(matchId);
      return;
    }
    const pid = event.dataTransfer.getData('playerId');
    if (!pid || allDraftedIds.includes(pid)) return;
    const newId = await addCourt();
    setCourtDrafts(prev => ({ ...prev, [newId]: [pid] }));
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
              Start a new session or join with a code to unlock the Command Center.
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {isAdmin ? (
                <div className="space-y-4 w-full">
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border-2">
                    <div className="flex items-center gap-3">
                      <Target className="h-4 w-4 text-primary" />
                      <p className="text-xs font-black uppercase tracking-tight">Double Star Boost</p>
                    </div>
                    <Switch checked={isDoubleStarSession} onCheckedChange={setIsDoubleStarSession} />
                  </div>
                  <Button className="w-full h-12 font-black uppercase" onClick={handleCreateSession} disabled={isCreating}>
                    {isCreating ? "Initializing..." : "Start New Session"} <PlayCircle className="ml-2 h-5 w-5" />
                  </Button>
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

      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12">
        {isStaff && (
          <div className="md:col-span-3 border-r flex flex-col bg-secondary/5 min-h-0">
            <div className="p-3 bg-card border-b flex flex-col gap-3 sticky top-0 z-10 md:sticky">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Bench
                </h2>
                <div className="flex items-center gap-2">
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="h-7 text-[9px] font-black uppercase border-2 w-[100px] bg-background px-2">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-[9px] font-bold uppercase">Waiting</SelectItem>
                      <SelectItem value="skill-desc" className="text-[9px] font-bold uppercase">Skill ↓</SelectItem>
                      <SelectItem value="name-asc" className="text-[9px] font-bold uppercase">A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={repeatPartnerThreshold.toString()} onValueChange={(v) => setRepeatPartnerThreshold(parseInt(v))}>
                    <SelectTrigger className="h-7 text-[9px] font-black uppercase border-2 w-[80px] bg-background px-2" title="Repeat partner threshold">
                      <SelectValue placeholder="Threshold" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-[9px] font-bold uppercase">1 Game</SelectItem>
                      <SelectItem value="2" className="text-[9px] font-bold uppercase">2 Games</SelectItem>
                      <SelectItem value="3" className="text-[9px] font-bold uppercase">3 Games</SelectItem>
                      <SelectItem value="5" className="text-[9px] font-bold uppercase">5 Games</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Tabs value={benchTab} onValueChange={(v) => setBenchTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8 p-1 bg-secondary/50">
                  <TabsTrigger value="available" className="text-[9px] font-black uppercase h-6">
                    Ready ({availableCount})
                  </TabsTrigger>
                  <TabsTrigger value="resting" className="text-[9px] font-black uppercase h-6">
                    Resting ({restingCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <ScrollArea className="flex-1 hidden md:block">
              <div className="p-2 grid grid-cols-2 gap-2 pb-24">
                {sortedBenchPlayers.map((p) => (
                  <Card
                    key={p.id}
                    draggable={benchTab === 'available'}
                    onDragStart={(e) => onDragStartPlayer(e, p.id)}
                    className={cn(
                      "p-3 border-2 shadow-sm bg-card transition-all group",
                      benchTab === 'available' ? "cursor-grab active:cursor-grabbing hover:border-primary" : "opacity-80 grayscale-[0.5]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="font-black text-compact truncate flex-1">{getUniqueDisplayName(p.name, allPlayerNames)}</span>
                      {benchTab === 'available' ? (
                        <WaitTimeBadge lastAvailableAt={p.lastAvailableAt} />
                      ) : (
                        <Coffee className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-4 px-1.5", getSkillColor(p.skillLevel))}>
                        {SKILL_LEVELS_SHORT[p.skillLevel]}
                      </Badge>
                      <Badge variant="secondary" className="text-[7px] font-black uppercase h-4 px-1 bg-primary/10 text-primary border-primary/20">
                        {p.gamesPlayed || 0}G
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleSetStatus(p.id, benchTab === 'available' ? 'resting' : 'available')}
                        title={benchTab === 'available' ? "Move to resting" : "Ready to play"}
                      >
                        {benchTab === 'available' ? <Coffee className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 grid grid-cols-2 gap-2 pb-24 md:hidden">
              {sortedBenchPlayers.map((p) => (
                <Card
                  key={p.id}
                  draggable={benchTab === 'available'}
                  onDragStart={(e) => onDragStartPlayer(e, p.id)}
                  className={cn(
                    "p-3 border-2 shadow-sm bg-card transition-all group",
                    benchTab === 'available' ? "cursor-grab active:cursor-grabbing hover:border-primary" : "opacity-80 grayscale-[0.5]"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-black text-compact truncate flex-1">{getUniqueDisplayName(p.name, allPlayerNames)}</span>
                    {benchTab === 'available' ? (
                      <WaitTimeBadge lastAvailableAt={p.lastAvailableAt} />
                    ) : (
                      <Coffee className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-4 px-1.5", getSkillColor(p.skillLevel))}>
                      {SKILL_LEVELS_SHORT[p.skillLevel]}
                    </Badge>
                    <Badge variant="secondary" className="text-[7px] font-black uppercase h-4 px-1 bg-primary/10 text-primary border-primary/20">
                      {p.gamesPlayed || 0}G
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleSetStatus(p.id, benchTab === 'available' ? 'resting' : 'available')}
                      title={benchTab === 'available' ? "Move to resting" : "Ready to play"}
                    >
                      {benchTab === 'available' ? <Coffee className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div
          className={cn("md:col-span-3 border-r flex flex-col bg-background transition-all min-h-0", isQueueOver && "ring-4 ring-inset ring-primary/20 bg-primary/5")}
          onDragOver={(e) => { e.preventDefault(); setIsQueueOver(true); }}
          onDragLeave={() => setIsQueueOver(false)}
          onDrop={onDropInQueue}
        >
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-orange-500" /> Queue
            </h2>
            <Badge variant="secondary" className="font-black h-6 px-2.5 bg-orange-500 text-white border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1 hidden md:block">
            <div className="p-2 space-y-3 pb-24">
              {draftPlayerIds.length > 0 && (
                <Card className={cn("border-dashed border-2 p-4 space-y-3", draftRepeatPartners.length > 0 ? "bg-orange-500/5 border-orange-500/30" : "bg-primary/5")}>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      Drafting ({draftPlayerIds.length}/4)
                      {draftRepeatPartners.length > 0 && (
                        <Badge variant="destructive" className="text-[8px] h-5 px-2 font-black uppercase gap-1">
                          <AlertTriangle className="h-3 w-3" /> {draftRepeatPartners.length} Repeat{draftRepeatPartners.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </p>
                    <div className="flex gap-1">
                      {draftRepeatPartners.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-orange-600" onClick={() => {
                          const suggestions = generateSwapSuggestions(
                            draftPlayerIds.slice(0, 2),
                            draftPlayerIds.slice(2, 4),
                            players,
                            allDraftedIds,
                            repeatPartnerThreshold
                          );
                          setSwapSuggestions(suggestions);
                          setShowSwapDialog(true);
                        }}>
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDraftPlayerIds([])}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl border-2 border-dashed bg-muted/5">
                      <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team 1</p>
                      <div className="grid grid-cols-2 gap-2">
                        {draftPlayerIds.slice(0, 2).map(id => {
                          const p = players.find(x => x.id === id);
                          const repeatInfo = draftRepeatPartners.find(r => r.playerId === id);
                          return (
                            <div key={id} className={cn("text-[11px] font-black bg-card p-2 rounded-lg border flex flex-col gap-1 relative", repeatInfo && "border-orange-500/50 bg-orange-500/5")}>
                              <div className="flex items-center justify-between">
                                <span className="truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {draftPlayerIds.length >= 2 && (
                      <div className="p-3 rounded-xl border-2 border-dashed bg-muted/5">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team 2</p>
                        <div className="grid grid-cols-2 gap-2">
                          {draftPlayerIds.slice(2).map(id => {
                            const p = players.find(x => x.id === id);
                            const repeatInfo = draftRepeatPartners.find(r => r.playerId === id);
                            return (
                              <div key={id} className={cn("text-[11px] font-black bg-card p-2 rounded-lg border flex flex-col gap-1 relative", repeatInfo && "border-orange-500/50 bg-orange-500/5")}>
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                  {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                  <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {waitingMatches.map((m, idx) => (
                <Card key={m.id} draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-tbc-match-id', m.id); }} className="p-4 border-2 shadow-sm bg-card hover:border-orange-500/50 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <Badge className="text-[9px] h-4 font-black uppercase bg-orange-500/10 text-orange-600">Queue #{idx + 1}</Badge>
                    <MatchWaitBadge timestamp={m.timestamp} />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMatch(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="space-y-2">
                      {m.teamA.map(id => {
                        const p = players.find(x => x.id === id);
                        return (
                          <div key={id} className="flex flex-col">
                            <span className="text-[11px] font-black truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p && <Badge variant="outline" className={cn("text-[7px] h-3 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                              <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[8px] font-black opacity-30">VS</span>
                    <div className="space-y-2 text-right">
                      {m.teamB.map(id => {
                        const p = players.find(x => x.id === id);
                        return (
                          <div key={id} className="flex flex-col items-end">
                            <span className="text-[11px] font-black truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                              {p && <Badge variant="outline" className={cn("text-[7px] h-3 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 space-y-3 pb-24 md:hidden">
            {draftPlayerIds.length > 0 && (
              <Card className={cn("border-dashed border-2 p-4 space-y-3", draftRepeatPartners.length > 0 ? "bg-orange-500/5 border-orange-500/30" : "bg-primary/5")}>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    Drafting ({draftPlayerIds.length}/4)
                    {draftRepeatPartners.length > 0 && (
                      <Badge variant="destructive" className="text-[8px] h-5 px-2 font-black uppercase gap-1">
                        <AlertTriangle className="h-3 w-3" /> {draftRepeatPartners.length} Repeat{draftRepeatPartners.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </p>
                  <div className="flex gap-1">
                    {draftRepeatPartners.length > 0 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-orange-600" onClick={() => {
                        const suggestions = generateSwapSuggestions(
                          draftPlayerIds.slice(0, 2),
                          draftPlayerIds.slice(2, 4),
                          players,
                          allDraftedIds,
                          repeatPartnerThreshold
                        );
                        setSwapSuggestions(suggestions);
                        setShowSwapDialog(true);
                      }}>
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDraftPlayerIds([])}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border-2 border-dashed bg-muted/5">
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team 1</p>
                    <div className="grid grid-cols-2 gap-2">
                      {draftPlayerIds.slice(0, 2).map(id => {
                        const p = players.find(x => x.id === id);
                        const repeatInfo = draftRepeatPartners.find(r => r.playerId === id);
                        return (
                          <div key={id} className={cn("text-[11px] font-black bg-card p-2 rounded-lg border flex flex-col gap-1 relative", repeatInfo && "border-orange-500/50 bg-orange-500/5")}>
                            <div className="flex items-center justify-between">
                              <span className="truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                              {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                              <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {draftPlayerIds.length >= 2 && (
                    <div className="p-3 rounded-xl border-2 border-dashed bg-muted/5">
                      <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team 2</p>
                      <div className="grid grid-cols-2 gap-2">
                        {draftPlayerIds.slice(2).map(id => {
                          const p = players.find(x => x.id === id);
                          const repeatInfo = draftRepeatPartners.find(r => r.playerId === id);
                          return (
                            <div key={id} className={cn("text-[11px] font-black bg-card p-2 rounded-lg border flex flex-col gap-1 relative", repeatInfo && "border-orange-500/50 bg-orange-500/5")}>
                              <div className="flex items-center justify-between">
                                <span className="truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
            {waitingMatches.map((m, idx) => (
              <Card key={m.id} draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-tbc-match-id', m.id); }} className="p-4 border-2 shadow-sm bg-card hover:border-orange-500/50 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <Badge className="text-[9px] h-4 font-black uppercase bg-orange-500/10 text-orange-600">Queue #{idx + 1}</Badge>
                  <MatchWaitBadge timestamp={m.timestamp} />
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMatch(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="space-y-2">
                    {m.teamA.map(id => {
                      const p = players.find(x => x.id === id);
                      return (
                        <div key={id} className="flex flex-col">
                          <span className="text-[11px] font-black truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p && <Badge variant="outline" className={cn("text-[7px] h-3 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                            <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[8px] font-black opacity-30">VS</span>
                  <div className="space-y-2 text-right">
                    {m.teamB.map(id => {
                      const p = players.find(x => x.id === id);
                      return (
                        <div key={id} className="flex flex-col items-end">
                          <span className="text-[11px] font-black truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                            {p && <Badge variant="outline" className={cn("text-[7px] h-3 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div
          className={cn("md:col-span-6 flex flex-col transition-all min-h-0", isCourtPanelOver ? "bg-green-500/5" : "bg-secondary/5")}
          onDragOver={(e) => { e.preventDefault(); setIsCourtPanelOver(true); }}
          onDragLeave={() => setIsCourtPanelOver(false)}
          onDrop={onDropInCourtPanel}
        >
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-green-600" /> Courts
            </h2>
            <Badge variant="outline" className="font-black h-6 px-2.5 text-compact">{courts.filter(c => c.status === 'occupied').length}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1 hidden md:block">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-24">
              {courts.map(court => {
                const match = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const isOccupied = court.status === 'occupied';
                const currentDraft = courtDrafts[court.id] || [];
                const isEditing = editingCourtId === court.id;

                return (
                  <Card
                    key={court.id}
                    onDragOver={(e) => { e.preventDefault(); if (!isOccupied) setDragOverCourtId(court.id); }}
                    onDragLeave={() => setDragOverCourtId(null)}
                    onDrop={(e) => onDropInCourt(e, court.id)}
                    className={cn("border-2 overflow-hidden flex flex-col h-fit transition-all", isOccupied ? "bg-card border-primary/20 shadow-md" : "bg-muted/5 border-dashed", dragOverCourtId === court.id && "ring-2 ring-orange-500")}
                  >
                    <div className={cn("p-2 px-3 flex justify-between items-center border-b", isOccupied ? "bg-primary/10" : "bg-muted/10")}>
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={tempCourtName}
                          onChange={e => setTempCourtName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRenameCourt(court.id)}
                          onBlur={() => handleRenameCourt(court.id)}
                          className="h-7 text-[10px] font-black uppercase bg-background border-primary w-[120px] px-2"
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-1.5 group/title cursor-pointer"
                          onClick={() => { if (isStaff) { setEditingCourtId(court.id); setTempCourtName(court.name); } }}
                        >
                          <span className="text-compact font-black uppercase truncate max-w-[150px]">{court.name}</span>
                          {isStaff && <Pencil className="h-3 w-3 opacity-0 group-hover/title:opacity-40 transition-opacity" />}
                        </div>
                      )}
                      <Badge className="text-[8px] font-black uppercase px-2 h-4">{court.status}</Badge>
                    </div>
                    <CardContent className="p-4 flex-1">
                      {isOccupied ? (
                        match ? (
                          <div className="space-y-4">
                            <LiveTimer startTime={match.startTime} />
                            {(() => {
                              const matchRepeats = detectRepeatPartners(match.teamA, match.teamB, players, repeatPartnerThreshold);
                              return matchRepeats.length > 0 ? (
                                <div className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/30 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  <span className="text-[9px] font-black uppercase text-orange-600">{matchRepeats.length} Repeat Partner{matchRepeats.length > 1 ? 's' : ''}</span>
                                </div>
                              ) : null;
                            })()}
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                              <div className="space-y-2 p-3 rounded-xl border-l-4 border-primary bg-primary/5">
                                {match.teamA.map(id => {
                                  const p = players.find(x => x.id === id);
                                  const matchRepeats = detectRepeatPartners(match.teamA, match.teamB, players, repeatPartnerThreshold);
                                  const repeatInfo = matchRepeats.find(r => r.playerId === id);
                                  return <div key={id} className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <span className="text-compact font-black truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                      {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                    </div>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                  </div>;
                                })}
                              </div>
                              <span className="text-[10px] font-black opacity-20">VS</span>
                              <div className="space-y-2 p-3 rounded-xl border-r-4 border-primary bg-primary/5 text-right">
                                {match.teamB.map(id => {
                                  const p = players.find(x => x.id === id);
                                  const matchRepeats = detectRepeatPartners(match.teamA, match.teamB, players, repeatPartnerThreshold);
                                  const repeatInfo = matchRepeats.find(r => r.playerId === id);
                                  return <div key={id} className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                      {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                      <span className="text-compact font-black truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                    </div>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                  </div>;
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <p className="text-[9px] font-black uppercase opacity-40">Syncing match...</p>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="space-y-4">
                          {currentDraft.length > 0 ? (
                            <div className="space-y-3">
                              {courtRepeatPartners[court.id]?.length > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/30 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  <span className="text-[9px] font-black uppercase text-orange-600">{courtRepeatPartners[court.id].length} Repeat Partner{courtRepeatPartners[court.id].length > 1 ? 's' : ''}</span>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto text-orange-600" onClick={() => {
                                    const suggestions = generateSwapSuggestions(
                                      currentDraft.slice(0, 2),
                                      currentDraft.slice(2, 4),
                                      players,
                                      [...allDraftedIds, ...currentDraft],
                                      repeatPartnerThreshold
                                    );
                                    setSwapSuggestions(suggestions);
                                    setShowSwapDialog(true);
                                  }}>
                                    <ArrowRightLeft className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              <div className="p-3 rounded-xl border-2 border-dashed bg-muted/5">
                                <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team 1</p>
                                <div className="space-y-2">
                                  {currentDraft.slice(0, 2).map(id => {
                                    const p = players.find(x => x.id === id);
                                    const repeatInfo = courtRepeatPartners[court.id]?.find(r => r.playerId === id);
                                    return (
                                      <div key={id} className={cn("text-[11px] font-black bg-background p-2 rounded-lg border flex flex-col gap-1", repeatInfo && "border-orange-500/50 bg-orange-500/5")}>
                                        <div className="flex items-center justify-between">
                                          <span className="truncate flex-1">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                          {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                          <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                                        </div>
                                        {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                      </div>
                                    );
                                  })}
                                  {currentDraft.slice(0, 2).length < 2 && (
                                    <div className="h-8 border-2 border-dashed rounded-lg bg-background/50 flex items-center justify-center">
                                      <p className="text-[8px] font-black uppercase opacity-30 italic">Drop player</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {currentDraft.length >= 2 && (
                                <div className="p-3 rounded-xl border-2 border-dashed bg-muted/5">
                                  <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team 2</p>
                                  <div className="space-y-2">
                                    {currentDraft.slice(2).map(id => {
                                      const p = players.find(x => x.id === id);
                                      const repeatInfo = courtRepeatPartners[court.id]?.find(r => r.playerId === id);
                                      return (
                                        <div key={id} className={cn("text-[11px] font-black bg-background p-2 rounded-lg border flex flex-col gap-1", repeatInfo && "border-orange-500/50 bg-orange-500/5")}>
                                          <div className="flex items-center justify-between">
                                            <span className="truncate flex-1">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                            {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                            <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                                          </div>
                                          {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                        </div>
                                      );
                                    })}
                                    {currentDraft.slice(2).length < 2 && (
                                      <div className="h-8 border-2 border-dashed rounded-lg bg-background/50 flex items-center justify-center">
                                        <p className="text-[8px] font-black uppercase opacity-30 italic">Drop opponent</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-24 flex flex-col items-center justify-center opacity-40 border-2 border-dashed rounded-xl">
                              <DoorOpen className="h-6 w-6 mb-2" />
                              <p className="text-[9px] font-black uppercase">Idle Court</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-3 border-t bg-muted/5">
                      {isOccupied && match && isStaff ? (
                        <div className="flex w-full gap-2">
                          {!match.startTime ? (
                            <Button onClick={() => startTimer(court.id)} className="w-full bg-green-600 font-black text-tiny uppercase tracking-widest"><Play className="h-4 w-4 mr-2" /> START</Button>
                          ) : (
                            <>
                              <Button onClick={() => setScoringCourtId(court.id)} className="flex-1 bg-primary font-black text-tiny uppercase tracking-widest">FINISH</Button>
                              <Button variant="outline" size="icon" onClick={() => endMatch(court.id, 'cancelled')} className="h-10 w-10 shrink-0"><Ban className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex w-full justify-between items-center h-10">
                          <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">READY FOR PAIRING</p>
                          {isAdmin && !isOccupied && <Button variant="ghost" size="icon" onClick={() => deleteCourt(court.id)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-24 md:hidden">
              {courts.map(court => {
                const match = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const isOccupied = court.status === 'occupied';
                const currentDraft = courtDrafts[court.id] || [];
                const isEditing = editingCourtId === court.id;

                return (
                  <Card
                    key={court.id}
                    onDragOver={(e) => { e.preventDefault(); if (!isOccupied) setDragOverCourtId(court.id); }}
                    onDragLeave={() => setDragOverCourtId(null)}
                    onDrop={(e) => onDropInCourt(e, court.id)}
                    className={cn("border-2 overflow-hidden flex flex-col h-fit transition-all", isOccupied ? "bg-card border-primary/20 shadow-md" : "bg-muted/5 border-dashed", dragOverCourtId === court.id && "ring-2 ring-orange-500")}
                  >
                    <div className={cn("p-2 px-3 flex justify-between items-center border-b", isOccupied ? "bg-primary/10" : "bg-muted/10")}>
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={tempCourtName}
                          onChange={e => setTempCourtName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleRenameCourt(court.id)}
                          onBlur={() => handleRenameCourt(court.id)}
                          className="h-7 text-[10px] font-black uppercase bg-background border-primary w-[120px] px-2"
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-1.5 group/title cursor-pointer"
                          onClick={() => { if (isStaff) { setEditingCourtId(court.id); setTempCourtName(court.name); } }}
                        >
                          <span className="text-compact font-black uppercase truncate max-w-[150px]">{court.name}</span>
                          {isStaff && <Pencil className="h-3 w-3 opacity-0 group-hover/title:opacity-40 transition-opacity" />}
                        </div>
                      )}
                      <Badge className="text-[8px] font-black uppercase px-2 h-4">{court.status}</Badge>
                    </div>
                    <CardContent className="p-4 flex-1">
                      {isOccupied ? (
                        match ? (
                          <div className="space-y-4">
                            <LiveTimer startTime={match.startTime} />
                            {(() => {
                              const matchRepeats = detectRepeatPartners(match.teamA, match.teamB, players, repeatPartnerThreshold);
                              return matchRepeats.length > 0 ? (
                                <div className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/30 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  <span className="text-[9px] font-black uppercase text-orange-600">{matchRepeats.length} Repeat Partner{matchRepeats.length > 1 ? 's' : ''}</span>
                                </div>
                              ) : null;
                            })()}
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                              <div className="space-y-2 p-3 rounded-xl border-l-4 border-primary bg-primary/5">
                                {match.teamA.map(id => {
                                  const p = players.find(x => x.id === id);
                                  const matchRepeats = detectRepeatPartners(match.teamA, match.teamB, players, repeatPartnerThreshold);
                                  const repeatInfo = matchRepeats.find(r => r.playerId === id);
                                  return <div key={id} className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                      <span className="text-compact font-black truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                      {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                    </div>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                  </div>;
                                })}
                              </div>
                              <span className="text-[10px] font-black opacity-20">VS</span>
                              <div className="space-y-2 p-3 rounded-xl border-r-4 border-primary bg-primary/5 text-right">
                                {match.teamB.map(id => {
                                  const p = players.find(x => x.id === id);
                                  const matchRepeats = detectRepeatPartners(match.teamA, match.teamB, players, repeatPartnerThreshold);
                                  const repeatInfo = matchRepeats.find(r => r.playerId === id);
                                  return <div key={id} className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                      {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                      <span className="text-compact font-black truncate">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                    </div>
                                    {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                  </div>;
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <p className="text-[9px] font-black uppercase opacity-40">Syncing match...</p>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="space-y-4">
                          {currentDraft.length > 0 ? (
                            <div className="space-y-3">
                              {courtRepeatPartners[court.id]?.length > 0 && (
                                <div className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/30 rounded-lg">
                                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  <span className="text-[9px] font-black uppercase text-orange-600">{courtRepeatPartners[court.id].length} Repeat Partner{courtRepeatPartners[court.id].length > 1 ? 's' : ''}</span>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto text-orange-600" onClick={() => {
                                    const suggestions = generateSwapSuggestions(
                                      currentDraft.slice(0, 2),
                                      currentDraft.slice(2, 4),
                                      players,
                                      [...allDraftedIds, ...currentDraft],
                                      repeatPartnerThreshold
                                    );
                                    setSwapSuggestions(suggestions);
                                    setShowSwapDialog(true);
                                  }}>
                                    <ArrowRightLeft className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              <div className="p-3 rounded-xl border-2 border-dashed bg-muted/5">
                                <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team 1</p>
                                <div className="space-y-2">
                                  {currentDraft.slice(0, 2).map(id => {
                                    const p = players.find(x => x.id === id);
                                    const repeatInfo = courtRepeatPartners[court.id]?.find(r => r.playerId === id);
                                    return (
                                      <div key={id} className={cn("text-[11px] font-black bg-background p-2 rounded-lg border flex flex-col gap-1", repeatInfo && "border-orange-500/50 bg-orange-500/5")}>
                                        <div className="flex items-center justify-between">
                                          <span className="truncate flex-1">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                          {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                          <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                                        </div>
                                        {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                      </div>
                                    );
                                  })}
                                  {currentDraft.slice(0, 2).length < 2 && (
                                    <div className="h-8 border-2 border-dashed rounded-lg bg-background/50 flex items-center justify-center">
                                      <p className="text-[8px] font-black uppercase opacity-30 italic">Drop player</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {currentDraft.length >= 2 && (
                                <div className="p-3 rounded-xl border-2 border-dashed bg-muted/5">
                                  <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team 2</p>
                                  <div className="space-y-2">
                                    {currentDraft.slice(2).map(id => {
                                      const p = players.find(x => x.id === id);
                                      const repeatInfo = courtRepeatPartners[court.id]?.find(r => r.playerId === id);
                                      return (
                                        <div key={id} className={cn("text-[11px] font-black bg-background p-2 rounded-lg border flex flex-col gap-1", repeatInfo && "border-orange-500/50 bg-orange-500/5")}>
                                          <div className="flex items-center justify-between">
                                            <span className="truncate flex-1">{p?.name ? getUniqueDisplayName(p.name, allPlayerNames) : ''}</span>
                                            {repeatInfo && <AlertTriangle className="h-3 w-3 text-orange-600 shrink-0" />}
                                            <WaitTimeBadge lastAvailableAt={p?.lastAvailableAt} />
                                          </div>
                                          {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0 w-fit", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                        </div>
                                      );
                                    })}
                                    {currentDraft.slice(2).length < 2 && (
                                      <div className="h-8 border-2 border-dashed rounded-lg bg-background/50 flex items-center justify-center">
                                        <p className="text-[8px] font-black uppercase opacity-30 italic">Drop opponent</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {currentDraft.length === 4 && (
                                <Button
                                  className="w-full h-10 font-black uppercase"
                                  onClick={() => startMatch({ teamA: currentDraft.slice(0, 2), teamB: currentDraft.slice(2) })}
                                >
                                  Start Match
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="h-32 flex items-center justify-center">
                              <p className="text-[9px] font-black uppercase opacity-30 italic">Drop players to start match</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
        </div>
      </div>

      {scoringCourtId && (() => {
        const court = courts.find(c => c.id === scoringCourtId);
        const match = matches.find(m => m.id === court?.currentMatchId);
        if (!match) return null;
        const teamA = players.filter(p => match.teamA.includes(p.id));
        const teamB = players.filter(p => match.teamB.includes(p.id));
        return (
          <MatchScoreDialog
            open={!!scoringCourtId}
            onOpenChange={(open) => { if (!open) setScoringCourtId(null); }}
            teamA={teamA}
            teamB={teamB}
            onScoreSubmit={handleScoreSubmit}
            defaultWinningScore={defaultWinningScore}
            deuceEnabled={deuceEnabled}
          />
        );
      })()}

      <AlertDialog open={activeModal === 'zeroConfirm'} onOpenChange={(open) => { if (!open) setActiveModal(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase">Confirm Zero Score</AlertDialogTitle>
            <AlertDialogDescription>The losing team has a score of 0. Is this outcome correct?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setActiveModal('score')}>EDIT SCORE</Button>
            <AlertDialogAction onClick={() => { if (pendingScore) { endMatch(pendingScore.courtId, 'completed', pendingScore.winner, pendingScore.teamAScore, pendingScore.teamBScore); setScoringCourtId(null); setActiveModal(null); } }}>YES, CONFIRM</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Swap Suggestion Dialog */}
      <AlertDialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-orange-600" />
              Swap Suggestions
            </AlertDialogTitle>
            <AlertDialogDescription>
              Recommended players to swap to avoid repeat partnerships
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            {swapSuggestions?.map((suggestion: any) => {
              const player = players.find(p => p.id === suggestion.playerId);
              return (
                <div key={suggestion.playerId} className="border-2 rounded-xl p-4 bg-secondary/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="font-black text-sm">{player?.name ? getUniqueDisplayName(player.name, allPlayerNames) : ''}</span>
                    </div>
                    <Badge variant="destructive" className="text-[8px] h-5 px-2 font-black uppercase">
                      Repeat Partner
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Suggested Swaps:</p>
                    {suggestion.suggestedPlayers.map((sp: any, idx: number) => (
                      <div key={sp.player.id} className="flex items-center justify-between p-2 bg-background rounded-lg border cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => {
                        const newDraft = [...draftPlayerIds];
                        const idxToReplace = newDraft.indexOf(suggestion.playerId);
                        if (idxToReplace !== -1) {
                          newDraft[idxToReplace] = sp.player.id;
                          setDraftPlayerIds(newDraft);
                          setShowSwapDialog(false);
                          toast({ title: "Player Swapped", description: `${player?.name} swapped with ${sp.player.name}` });
                        }
                      }}>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[8px] font-black bg-orange-500/10 text-orange-600 border-orange-500/20">#{idx + 1}</Badge>
                          <span className="text-xs font-black">{sp.player.name}</span>
                          <Badge variant="outline" className={cn("text-[8px] h-4 px-1", getSkillColor(sp.player.skillLevel))}>{SKILL_LEVELS_SHORT[sp.player.skillLevel]}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-muted-foreground">{sp.reason}</span>
                          <Badge variant="secondary" className="text-[8px] h-4 px-1">{sp.player.gamesPlayed || 0}G</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSwapDialog(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NotificationPermissionModal open={showNotificationModal} onOpenChange={handleNotificationModalClose} />
    </div>
  );
}
