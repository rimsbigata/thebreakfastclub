
"use client";

import { useClub } from '@/context/ClubContext';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, Medal, Star, Target, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function RankingsPage() {
  const { players } = useClub();

  const winRateRankings = [...players]
    .filter(p => p.gamesPlayed > 0)
    .map(p => ({
      ...p,
      winRate: ((p.wins || 0) / (p.gamesPlayed || 1)) * 100
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const topSkillRankings = [...players].sort((a, b) => b.skillLevel - a.skillLevel).slice(0, 6);

  return (
    <div className="container mx-auto px-4 py-8 space-y-12 pb-24 max-w-6xl">
      <header className="space-y-1 text-center sm:text-left">
        <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center justify-center sm:justify-start gap-3">
          <Trophy className="h-10 w-10 text-yellow-500 drop-shadow-lg" /> Daily Hall of Fame
        </h1>
        <p className="text-sm text-muted-foreground font-black uppercase tracking-widest opacity-60">Today's top performers based on win rates</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* WIN RATE LEADERBOARD */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 font-black text-xl uppercase tracking-tight">
            <Medal className="h-6 w-6 text-primary" /> Win Rate Leaderboard
          </div>
          <div className="grid gap-3">
            {winRateRankings.map((player, i) => (
              <Card key={player.id} className={cn(
                "border-2 transition-all hover:scale-[1.01]",
                i === 0 ? "border-yellow-500 bg-yellow-500/5 shadow-xl shadow-yellow-500/10" : "border-border"
              )}>
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-5">
                    <span className={cn(
                      "font-black text-4xl italic min-w-[40px] text-center",
                      i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground/20"
                    )}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-black text-lg flex items-center gap-2">
                        {player.name}
                        {i === 0 && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 animate-pulse" />}
                      </p>
                      <div className="flex gap-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">
                        <span>{player.wins} Wins</span>
                        <span>{player.gamesPlayed} Matches</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-3xl font-black", i === 0 ? "text-yellow-600" : "text-primary")}>
                      {player.winRate.toFixed(0)}%
                    </p>
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Efficiency</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {winRateRankings.length === 0 && (
              <div className="text-center py-20 border-4 border-dashed rounded-3xl bg-secondary/10 text-muted-foreground flex flex-col items-center">
                <Target className="h-16 w-16 mb-4 opacity-10" />
                <p className="font-black uppercase text-sm tracking-widest">No stats recorded for today yet</p>
              </div>
            )}
          </div>
        </section>

        {/* SKILL ELITES */}
        <section className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 font-black text-xl uppercase tracking-tight">
            <TrendingUp className="h-6 w-6 text-green-500" /> Skill Elites
          </div>
          <div className="grid grid-cols-1 gap-4">
            {topSkillRankings.map((player, i) => (
              <Card key={player.id} className="border-2 border-primary/10 bg-primary/5 group hover:border-primary transition-all">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-card border-2 flex items-center justify-center text-primary font-black group-hover:scale-110 transition-transform">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-black text-sm">{player.name}</p>
                      <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Lvl {player.skillLevel} Specialist</p>
                    </div>
                  </div>
                  <Badge className="bg-primary font-black text-[10px] h-6 px-2">{player.improvementScore} PTS</Badge>
                </CardContent>
              </Card>
            ))}
            {topSkillRankings.length === 0 && (
              <div className="p-10 text-center border-2 border-dashed rounded-2xl flex flex-col items-center opacity-30">
                <User className="h-10 w-10 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Roster is empty</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
