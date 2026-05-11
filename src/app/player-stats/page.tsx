"use client";

import { useClub } from '@/context/ClubContext';
import { useUser } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, Target, Calendar, TrendingDown, Flame, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Match } from '@/lib/types';

export default function PlayerStatsPage() {
  const { matches, players } = useClub();
  const { user } = useUser();

  const getUserStats = (matchList: Match[]) => {
    if (!user?.uid) return { wins: 0, total: 0, diff: 0, winRate: 0, currentStreak: 0, longestWinStreak: 0, longestLossStreak: 0 };
    
    let wins = 0;
    let total = 0;
    let diff = 0;
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    // Sort matches by timestamp to calculate streaks
    const sortedMatches = [...matchList].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sortedMatches.forEach(m => {
      const isTeamA = m.teamA.includes(user.uid);
      const win = (m.winner === 'teamA' && isTeamA) || (m.winner === 'teamB' && !isTeamA);
      
      if (win) {
        wins += 1;
        tempWinStreak += 1;
        tempLossStreak = 0;
        if (tempWinStreak > longestWinStreak) {
          longestWinStreak = tempWinStreak;
        }
      } else {
        tempLossStreak += 1;
        tempWinStreak = 0;
        if (tempLossStreak > longestLossStreak) {
          longestLossStreak = tempLossStreak;
        }
      }
      
      total += 1;
      if (m.teamAScore !== undefined && m.teamBScore !== undefined) {
        const scoreDiff = isTeamA ? (m.teamAScore - m.teamBScore) : (m.teamBScore - m.teamAScore);
        diff += scoreDiff;
      }
    });

    // Calculate current streak (most recent matches)
    if (sortedMatches.length > 0) {
      currentStreak = 0;
      const reversedMatches = [...sortedMatches].reverse();
      let streakType: 'win' | 'loss' | null = null;
      
      for (const m of reversedMatches) {
        const isTeamA = m.teamA.includes(user.uid);
        const win = (m.winner === 'teamA' && isTeamA) || (m.winner === 'teamB' && !isTeamA);
        
        if (streakType === null) {
          streakType = win ? 'win' : 'loss';
          currentStreak = 1;
        } else if ((streakType === 'win' && win) || (streakType === 'loss' && !win)) {
          currentStreak += 1;
        } else {
          break;
        }
      }
    }

    return {
      wins,
      total,
      diff,
      winRate: total ? (wins / total) * 100 : 0,
      currentStreak,
      longestWinStreak,
      longestLossStreak
    };
  };

  const todayMatches = useMemo(() => {
    const now = new Date().toDateString();
    return matches.filter(m => new Date(m.timestamp).toDateString() === now);
  }, [matches]);

  const monthMatches = useMemo(() => {
    const now = new Date();
    return matches.filter(m => {
      const d = new Date(m.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [matches]);

  const allMatches = useMemo(() => {
    return matches.filter(m => m.status === 'completed' && (m.teamA.includes(user?.uid || '') || m.teamB.includes(user?.uid || '')));
  }, [matches, user?.uid]);

  const todayStats = useMemo(() => getUserStats(todayMatches), [todayMatches, user?.uid]);
  const monthStats = useMemo(() => getUserStats(monthMatches), [monthMatches, user?.uid]);
  const allStats = useMemo(() => getUserStats(allMatches), [allMatches, user?.uid]);

  const currentPlayer = players.find(p => p.id === user?.uid);

  const RenderStats = ({ stats, label }: { stats: any; label: string }) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="border-2 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-primary">{stats.wins}</p>
            <p className="text-[10px] font-black uppercase text-muted-foreground">Wins</p>
          </CardContent>
        </Card>
        <Card className="border-2 bg-secondary/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black">{stats.total}</p>
            <p className="text-[10px] font-black uppercase text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-2 bg-secondary/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black text-green-600">{stats.winRate.toFixed(0)}%</p>
            <p className="text-[10px] font-black uppercase text-muted-foreground">Win Rate</p>
          </CardContent>
        </Card>
        <Card className="border-2 bg-secondary/5">
          <CardContent className="p-4 text-center">
            <p className={cn("text-3xl font-black", stats.diff > 0 ? "text-green-600" : "text-destructive")}>
              {stats.diff > 0 ? `+${stats.diff}` : stats.diff}
            </p>
            <p className="text-[10px] font-black uppercase text-muted-foreground">Point Diff</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const RenderStreaks = ({ stats }: { stats: any }) => {
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border-2 bg-orange-500/5 border-orange-500/50">
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-black text-orange-500">{stats.currentStreak}</p>
            <p className="text-[9px] font-black uppercase text-muted-foreground">Current Streak</p>
          </CardContent>
        </Card>
        <Card className="border-2 bg-green-500/5 border-green-500/50">
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-black text-green-500">{stats.longestWinStreak}</p>
            <p className="text-[9px] font-black uppercase text-muted-foreground">Best Win Streak</p>
          </CardContent>
        </Card>
        <Card className="border-2 bg-destructive/5 border-destructive/50">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-black text-destructive">{stats.longestLossStreak}</p>
            <p className="text-[9px] font-black uppercase text-muted-foreground">Worst Loss Streak</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (!user?.uid) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <div className="text-center py-20 border-4 border-dashed rounded-2xl bg-secondary/10 flex flex-col items-center">
          <Target className="h-10 w-10 mb-2 opacity-10" />
          <p className="font-black uppercase text-tiny tracking-widest opacity-40">Please log in to view your stats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <header className="space-y-0.5 text-center sm:text-left">
        <h1 className="flex items-center justify-center sm:justify-start gap-3">
          <Award className="h-8 w-8 text-primary" /> Player Statistics
        </h1>
        <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">
          Your personal performance metrics
        </p>
      </header>

      {currentPlayer && (
        <Card className="border-2 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-black">{currentPlayer.name}</p>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Player Profile</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 border-2">
              {currentPlayer.stars?.toFixed(1) || 0} ⭐ Stars
            </Badge>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="bg-secondary/50 border-2 w-full sm:w-auto">
          <TabsTrigger value="today" className="gap-2 font-black uppercase text-[10px]">
            <Calendar className="h-3 w-3" /> Today
          </TabsTrigger>
          <TabsTrigger value="month" className="gap-2 font-black uppercase text-[10px]">
            <TrendingUp className="h-3 w-3" /> This Month
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2 font-black uppercase text-[10px]">
            <Trophy className="h-3 w-3" /> All Time
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
            <RenderStats stats={todayStats} label="Today" />
            <RenderStreaks stats={todayStats} />
          </div>
        </TabsContent>
        
        <TabsContent value="month" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
            <RenderStats stats={monthStats} label="This Month" />
            <RenderStreaks stats={monthStats} />
          </div>
        </TabsContent>
        
        <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
            <RenderStats stats={allStats} label="All Time" />
            <RenderStreaks stats={allStats} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
