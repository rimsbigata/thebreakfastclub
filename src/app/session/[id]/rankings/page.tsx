"use client";

import { useClub } from '@/context/ClubContext';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, Medal, Star, Target, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Match, SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';

export default function RankingsPage() {
  const { players, matches } = useClub();

  const getRankingsForPeriod = (periodMatches: Match[], useStars: boolean = false) => {
    const stats: Record<string, { wins: number; total: number; diff: number; stars: number; doubleStarMatches: number }> = {};

    periodMatches.forEach(m => {
      if (m.status !== 'completed') return;
      const pIds = [...m.teamA, ...m.teamB];
      pIds.forEach(id => {
        if (!stats[id]) stats[id] = { wins: 0, total: 0, diff: 0, stars: 0, doubleStarMatches: 0 };
        stats[id].total += 1;
        const isTeamA = m.teamA.includes(id);
        const win = (m.winner === 'teamA' && isTeamA) || (m.winner === 'teamB' && !isTeamA);
        if (win) stats[id].wins += 1;
        if (m.teamAScore !== undefined && m.teamBScore !== undefined) {
          const scoreDiff = isTeamA ? (m.teamAScore - m.teamBScore) : (m.teamBScore - m.teamAScore);
          stats[id].diff += scoreDiff;
        }
        // Stars are now awarded at session end, not per match
        // For daily rankings, we use wins/rate/diff (no stars)
        // For monthly/overall, stars come from session finalStars
        // Track double star matches for context
        if (m.isDoubleStar) {
          stats[id].doubleStarMatches += 1;
        }
      });
    });

    return players
      .filter(p => useStars ? (p.stars || 0) > 0 : stats[p.id]?.total > 0)
      .map(p => {
        const s = stats[p.id];
        return {
          ...p,
          wins: s?.wins || 0,
          gamesPlayed: s?.total || 0,
          winRate: s?.total ? (s.wins / s.total) * 100 : 0,
          pointDiff: s?.diff || 0,
          stars: p.stars || 0,
          doubleStarMatches: s?.doubleStarMatches || 0
        };
      })
      .sort((a, b) => {
        if (useStars) {
          if (b.stars !== a.stars) return b.stars - a.stars;
        }
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pointDiff - a.pointDiff;
      });
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

  const dailyRankings = useMemo(() => getRankingsForPeriod(todayMatches, false), [todayMatches, players]);
  const monthlyRankings = useMemo(() => getRankingsForPeriod(monthMatches, true), [monthMatches, players]);
  const overallRankings = useMemo(() => getRankingsForPeriod(matches, true), [matches, players]);

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

      <Tabs defaultValue="daily" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-secondary/50 border-2">
            <TabsTrigger value="daily" className="gap-2 font-black uppercase text-[10px]">
              <TrendingUp className="h-3 w-3" /> Daily
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2 font-black uppercase text-[10px]">
              <Calendar className="h-3 w-3" /> Monthly
            </TabsTrigger>
            <TabsTrigger value="overall" className="gap-2 font-black uppercase text-[10px]">
              <Star className="h-3 w-3" /> Overall
            </TabsTrigger>
          </TabsList>
          <div className="hidden sm:flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground bg-primary/5 px-2 py-1 rounded-full border">
            <Medal className="h-2.5 w-2.5 text-primary" /> Tiebreaker: Wins {'>'} Rate {'>'} Diff
          </div>
        </div>
        <TabsContent value="daily" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RenderLeaderboard data={dailyRankings} tab="daily" />
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
