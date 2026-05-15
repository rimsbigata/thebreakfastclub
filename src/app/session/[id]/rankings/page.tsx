"use client";

import { useClub } from '@/context/ClubContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, Medal, Star, Target, Calendar, Filter, X, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { format, startOfMonth, endOfMonth, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { Match, SKILL_LEVELS_SHORT, getSkillColor, QueueSession } from '@/lib/types';
import { useParams } from 'next/navigation';

export default function RankingsPage() {
  const { id } = useParams();
  const { players, matches: currentSessionMatches, activeSession, getAllSessions } = useClub();
  const firestore = useFirestore();
  const [sessionPlayers, setSessionPlayers] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<QueueSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(id as string);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [historicalMatches, setHistoricalMatches] = useState<Match[]>([]);
  const [isHistoricalLoading, setIsHistoricalLoading] = useState(false);
  const [allSessionPlayers, setAllSessionPlayers] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadSessionData = async () => {
      if (!id || !firestore) return;
      try {
        // Fetch players for this specific session
        const pSnap = await getDocs(collection(firestore, 'sessions', id as string, 'players'));
        setSessionPlayers(pSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      } catch (err) {
        console.error('Failed to load session players:', err);
      }
    };
    loadSessionData();
  }, [id, firestore]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await getAllSessions();
        setAllSessions(sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    loadSessions();
  }, [getAllSessions]);

  useEffect(() => {
    const loadAllSessionPlayers = async () => {
      if (!firestore || allSessions.length === 0) return;
      try {
        const playersMap: Record<string, any> = {};
        
        for (const session of allSessions) {
          try {
            const pSnap = await getDocs(collection(firestore, 'sessions', session.id, 'players'));
            pSnap.docs.forEach(doc => {
              const data = doc.data();
              playersMap[doc.id] = {
                id: doc.id,
                name: data.name || 'Unknown',
                skillLevel: data.skillLevel || 3,
                sessionId: session.id
              };
            });
          } catch (err) {
            console.warn(`Failed to load players for session ${session.id}:`, err);
          }
        }
        
        setAllSessionPlayers(playersMap);
      } catch (err) {
        console.error('Failed to load all session players:', err);
      }
    };
    loadAllSessionPlayers();
  }, [firestore, allSessions]);

  useEffect(() => {
    const loadMatches = async () => {
      setIsHistoricalLoading(true);
      try {
        // 1. Fetch CURRENT session matches directly (No composite index required)
        const sessionMatchesQuery = query(
          collection(firestore, 'sessions', id as string, 'matches'),
          where('status', '==', 'completed')
        );
        const sessionSnapshot = await getDocs(sessionMatchesQuery);
        const sessionMatches = sessionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, sessionId: id as string } as Match));
        
        // Pre-populate with session matches so "This Session" works immediately
        setHistoricalMatches(sessionMatches);

        // 2. Fetch ALL matches for Monthly/Overall (Requires composite index)
        try {
          const allMatchesQuery = query(
            collectionGroup(firestore, 'matches'),
            where('status', '==', 'completed'),
            orderBy('timestamp', 'desc')
          );
          const allSnapshot = await getDocs(allMatchesQuery);
          const allMatches = allSnapshot.docs.map(doc => ({ 
            ...doc.data(), 
            id: doc.id, 
            sessionId: doc.ref.parent.parent?.id 
          } as Match));
          setHistoricalMatches(allMatches);
        } catch (cgErr) {
          console.warn('Collection Group query failed (likely index building):', cgErr);
          // We still have the session matches, so we don't clear the state
        }
      } catch (err) {
        console.error('Failed to load session matches:', err);
      } finally {
        setIsHistoricalLoading(false);
      }
    };
    loadMatches();
  }, [firestore, id]);

  const getRankingsForPeriod = (periodMatches: Match[], useStars: boolean = false) => {
    const stats: Record<string, { 
      wins: number; 
      losses: number; 
      total: number; 
      diff: number; 
      stars: number; 
      doubleStarMatches: number;
      pointsScored: number;
      pointsConceded: number;
    }> = {};
    
    periodMatches.forEach(match => {
      if (match.status !== 'completed' || !match.teamA || !match.teamB) return;
      
      const scoreA = match.teamAScore || 0;
      const scoreB = match.teamBScore || 0;
      const teamAWon = scoreA > scoreB;
      const diff = Math.abs(scoreA - scoreB);
      
      const updatePlayer = (playerId: string, won: boolean, pScored: number, pConceded: number) => {
        if (!stats[playerId]) {
          stats[playerId] = { wins: 0, losses: 0, total: 0, diff: 0, stars: 0, doubleStarMatches: 0, pointsScored: 0, pointsConceded: 0 };
        }
        stats[playerId].total += 1;
        if (won) stats[playerId].wins += 1;
        else stats[playerId].losses += 1;
        
        stats[playerId].diff += (won ? diff : -diff);
        stats[playerId].pointsScored += pScored;
        stats[playerId].pointsConceded += pConceded;
        
        if (useStars) {
          let matchStars = won ? 1 : 0.5;
          if (match.isDoubleStar) {
            matchStars *= 2;
            stats[playerId].doubleStarMatches += 1;
          }
          stats[playerId].stars += matchStars;
        }
      };

      match.teamA.forEach(id => updatePlayer(id, teamAWon, scoreA, scoreB));
      match.teamB.forEach(id => updatePlayer(id, !teamAWon, scoreB, scoreA));
    });

    return Object.entries(stats)
      .map(([pid, s]) => {
        const player = sessionPlayers.find(p => p.id === pid) || players.find(p => p.id === pid) || allSessionPlayers[pid];
        return {
          id: pid,
          name: player?.name || 'Unknown',
          skillLevel: player?.skillLevel || 3,
          ...s,
          gamesPlayed: s.total,
          winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0,
          pointDiff: s.diff
        };
      })
      .sort((a, b) => {
        if (useStars) return b.stars - a.stars || b.wins - a.wins || b.total - a.total;
        return b.wins - a.wins || a.total - b.total || b.pointDiff - a.pointDiff;
      });
  };

  const sessionMatches = useMemo(() => {
    if (selectedSessionId) {
      return historicalMatches.filter(m => m.sessionId === selectedSessionId);
    }
    if (selectedDate) {
      return historicalMatches.filter(m => isSameDay(new Date(m.timestamp), selectedDate));
    }
    return activeSession ? historicalMatches.filter(m => m.sessionId === activeSession.id) : currentSessionMatches;
  }, [historicalMatches, activeSession, selectedSessionId, selectedDate, currentSessionMatches]);

  const monthMatches = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return historicalMatches.filter(m => {
      const d = new Date(m.timestamp);
      return d >= start && d <= end;
    });
  }, [historicalMatches]);

  const dailyRankings = useMemo(() => getRankingsForPeriod(sessionMatches, false), [sessionMatches, players, sessionPlayers, allSessionPlayers]);
  const monthlyRankings = useMemo(() => getRankingsForPeriod(monthMatches, true), [monthMatches, players, sessionPlayers, allSessionPlayers]);
  const overallRankings = useMemo(() => getRankingsForPeriod(historicalMatches, true), [historicalMatches, players, sessionPlayers, allSessionPlayers]);

  const clearFilters = () => {
    setSelectedSessionId(id as string);
    setSelectedDate(null);
  };

  const RenderLeaderboard = ({ data, tab }: { data: any[]; tab: 'daily' | 'monthly' | 'overall' }) => {
    const isDaily = tab === 'daily';
    const isStarsTab = tab === 'monthly' || tab === 'overall';

    return (
      <div className="grid gap-1.5 pb-24">
        {data.map((player, i) => (
          <Card key={player.id} className={cn(
            "border-2 transition-all hover:scale-[1.005] min-w-0",
            i === 0 ? "border-yellow-500 bg-yellow-500/5" : "border-border"
          )}>
            <CardContent className="flex items-center justify-between p-3 gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={cn(
                  "font-black text-2xl italic min-w-[24px] text-center shrink-0",
                  i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground/20"
                )}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-compact flex items-center gap-1.5 truncate">
                    {player.name}
                    {i === 0 && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />}
                  </p>
                  <Badge variant="outline" className={cn("text-[8px] font-black uppercase px-1 h-3.5 mt-0.5 truncate", getSkillColor(player.skillLevel))}>
                    {SKILL_LEVELS_SHORT[player.skillLevel]}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-4 items-center shrink-0">
                {isDaily && (
                  <>
                    <div className="text-center">
                      <p className="text-lg font-black text-primary">{player.wins}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">W</p>
                    </div>
                    <div className="text-center">
                      <p className="text-compact font-black opacity-60">{player.gamesPlayed}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">GP</p>
                    </div>
                    <div className="hidden sm:block text-center">
                      <p className="text-compact font-black opacity-60">{player.pointsScored}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">PTS</p>
                    </div>
                    <div className="hidden sm:block text-center">
                      <p className="text-compact font-black opacity-60">{player.pointsConceded}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">AG</p>
                    </div>
                    <div className="text-center">
                      <p className="text-compact font-black opacity-60">{player.winRate.toFixed(0)}%</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">WR</p>
                    </div>
                    <div className="text-right min-w-[32px]">
                      <p className={cn("text-tiny font-black", player.pointDiff > 0 ? "text-green-600" : "text-destructive")}>
                        {player.pointDiff > 0 ? `+${player.pointDiff}` : player.pointDiff}
                      </p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">DIFF</p>
                    </div>
                  </>
                )}
                {isStarsTab && (
                  <>
                    <div className="text-center">
                      <p className="text-lg font-black text-yellow-500">{player.stars.toFixed(1)}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">⭐ STARS</p>
                    </div>
                    {player.doubleStarMatches > 0 && (
                      <div className="text-center">
                        <p className="text-sm font-black text-yellow-500">x2</p>
                        <p className="text-[7px] font-black uppercase text-muted-foreground">BOOST</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-compact font-black opacity-60">{player.gamesPlayed}G</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">PLAYED</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && (
          <div className="text-center py-20 border-4 border-dashed rounded-2xl bg-secondary/10 flex flex-col items-center">
            <Target className="h-10 w-10 mb-2 opacity-10" />
            <p className="font-black uppercase text-tiny tracking-widest opacity-40">No records found</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <header className="space-y-0.5 text-center sm:text-left">
        <h1 className="flex items-center justify-center sm:justify-start gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" /> Leaderboards
        </h1>
        <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">Hall of fame based on tournament stats</p>
      </header>

      {/* Filter Section */}
      <Card className="border-2 bg-secondary/5">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 bg-background border-2 rounded-lg px-3 py-1.5 flex-1 min-w-[200px]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-tight text-muted-foreground mr-2">Session:</span>
              <Select value={selectedSessionId || "none"} onValueChange={(v) => { setSelectedSessionId(v === "none" ? null : v); setSelectedDate(null); }}>
                <SelectTrigger className="h-7 border-none bg-transparent p-0 text-[10px] font-black uppercase focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-[10px] font-black uppercase">All Sessions</SelectItem>
                  {allSessions.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">
                      {s.venueName || 'Main Venue'} - {format(new Date(s.createdAt), 'MMM d')} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 bg-background border-2 rounded-lg px-3 py-1.5 flex-1 min-w-[200px]">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-tight text-muted-foreground mr-2">Date:</span>
              <DatePicker
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ""}
                onChange={(v) => { 
                  setSelectedDate(v ? parseISO(v) : null); 
                  setSelectedSessionId(null); 
                }}
                className="h-7 border-none bg-transparent p-0 text-[10px] font-black uppercase justify-start hover:bg-transparent shadow-none"
              />
            </div>

            {(selectedSessionId !== id || selectedDate) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 text-[10px] font-black uppercase gap-2 hover:bg-destructive/10 hover:text-destructive">
                <X className="h-4 w-4" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="daily" className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <TabsList className="bg-secondary/50 border-2 w-full sm:w-auto">
            <TabsTrigger value="daily" className="gap-2 font-black uppercase text-[10px] flex-1 sm:flex-initial">
              <Target className="h-3 w-3" /> This Session
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2 font-black uppercase text-[10px] flex-1 sm:flex-initial">
              <Calendar className="h-3 w-3" /> Monthly
            </TabsTrigger>
            <TabsTrigger value="overall" className="gap-2 font-black uppercase text-[10px] flex-1 sm:flex-initial">
              <Star className="h-3 w-3" /> Overall
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground bg-primary/5 px-2 py-1 rounded-full border">
            <Medal className="h-2.5 w-2.5 text-primary" /> Tiebreaker: Wins {'>'} GP {'>'} Diff
          </div>
        </div>
        <TabsContent value="daily" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              {selectedSessionId ? `Session Record: ${allSessions.find(s => s.id === selectedSessionId)?.code || id}` : selectedDate ? `Record for ${format(selectedDate, 'MMMM d, yyyy')}` : 'No session selected'}
            </p>
          </div>
          {isHistoricalLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-secondary/10 rounded-xl animate-pulse flex items-center px-4 gap-4">
                  <div className="h-8 w-8 bg-secondary/20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-secondary/20 rounded" />
                    <div className="h-3 w-20 bg-secondary/20 rounded" />
                  </div>
                  <div className="h-8 w-20 bg-secondary/20 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <RenderLeaderboard data={dailyRankings} tab="daily" />
          )}
        </TabsContent>
        <TabsContent value="monthly" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              As of {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
            </p>
          </div>
          <RenderLeaderboard data={monthlyRankings} tab="monthly" />
        </TabsContent>
        <TabsContent value="overall" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RenderLeaderboard data={overallRankings} tab="overall" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
