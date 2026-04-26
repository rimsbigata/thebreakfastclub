
"use client";

import { useClub } from '@/context/ClubContext';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, TrendingUp, AlertCircle, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function RankingsPage() {
  const { players } = useClub();

  const topPlayers = [...players].sort((a, b) => b.skillLevel - a.skillLevel).slice(0, 10);
  const improvedPlayers = [...players].sort((a, b) => b.improvementScore - a.improvementScore).slice(0, 10);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" /> Rankings
        </h1>
        <p className="text-sm text-muted-foreground">Club leaderboards and performance trends.</p>
      </header>

      <div className="space-y-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Medal className="h-5 w-5 text-primary" /> Top Ranked
          </div>
          <div className="grid gap-3">
            {topPlayers.map((player, i) => (
              <Card key={player.id} className={i === 0 ? "border-yellow-500 border-2 shadow-lg" : ""}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <span className="font-black text-2xl text-muted-foreground/30">#{i + 1}</span>
                    <div>
                      <p className="font-bold">{player.name}</p>
                      <p className="text-xs text-muted-foreground">Skill Level: {player.skillLevel}</p>
                    </div>
                  </div>
                  {i === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <TrendingUp className="h-5 w-5 text-green-500" /> Most Improved
          </div>
          <div className="grid gap-3">
            {improvedPlayers.filter(p => p.improvementScore > 0).map((player, i) => (
              <Card key={player.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold">{player.name}</p>
                      <p className="text-xs text-muted-foreground">Score: +{player.improvementScore}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">Improved</Badge>
                </CardContent>
              </Card>
            ))}
            {players.length === 0 && (
               <p className="text-center text-sm text-muted-foreground italic py-10">No data available.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
