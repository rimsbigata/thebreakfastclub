
"use client";

import { useClub } from '@/context/ClubContext';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, Medal, Star, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function RankingsPage() {
  const { players } = useClub();

  // Daily Win Rate Ranking: wins / gamesPlayed
  const winRateRankings = [...players]
    .filter(p => (p.gamesPlayed || 0) > 0)
    .map(p => {
      const wins = p.wins || 0;
      const games = p.gamesPlayed || 1; // Default to 1 to avoid division by zero
      return {
        ...p,
        wins,
        gamesPlayed: p.gamesPlayed || 0,
        winRate: (wins / games) * 100
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  // Top Ranked by Skill Level (for reference)
  const topSkillRankings = [...players].sort((a, b) => (b.skillLevel || 0) - (a.skillLevel || 0)).slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" /> Daily Rankings
        </h1>
        <p className="text-sm text-muted-foreground">Based on daily wins over games played.</p>
      </header>

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Medal className="h-5 w-5 text-primary" /> Daily Win Rate Leaderboard
          </div>
          <div className="grid gap-4">
            {winRateRankings.map((player, i) => (
              <Card key={player.id} className={cn(
                "transition-all",
                i === 0 ? "border-yellow-500 border-2 shadow-lg bg-yellow-50/10" : "border-border"
              )}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "font-black text-2xl w-8",
                      i === 0 ? "text-yellow-500" : "text-muted-foreground/30"
                    )}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold flex items-center gap-2">
                        {player.name}
                        {i === 0 && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {player.wins} Wins / {player.gamesPlayed} Games
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-primary">
                      {player.winRate.toFixed(0)}%
                    </div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Win Rate</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {winRateRankings.length === 0 && (
              <div className="text-center py-20 border-2 border-dashed rounded-xl bg-secondary/5 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-2 opacity-10" />
                <p className="text-sm italic">No matches completed yet today.</p>
              </div>
            )}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <TrendingUp className="h-5 w-5 text-green-500" /> Skill Elites
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topSkillRankings.map((player) => (
              <Card key={player.id} className="bg-secondary/10 border-none">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-bold text-sm">{player.name}</p>
                    <p className="text-[10px] uppercase font-black text-muted-foreground">Level {player.skillLevel}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-primary/20 bg-background">
                    {player.improvementScore || 0} pts
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
