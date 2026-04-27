'use client';

import { Player, Match, SKILL_LEVELS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Medal } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MatchResultsProps {
  matches: Match[];
  players: Player[];
  limit?: number;
}

export function MatchResults({ matches, players, limit }: MatchResultsProps) {
  const completedMatches = matches
    .filter(m => m.isCompleted)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  if (completedMatches.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-secondary/5">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Trophy className="h-10 w-10 opacity-10 mb-2" />
          <p className="text-sm font-medium italic">No matches completed yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Medal className="h-5 w-5 text-yellow-500" />
        <h2 className="text-lg font-bold">Recent Match Results</h2>
      </div>
      <div className="grid gap-3">
        {completedMatches.map(match => {
          const teamA = players.filter(p => match.teamA.includes(p.id));
          const teamB = players.filter(p => match.teamB.includes(p.id));
          const isTeamAWinner = match.winner === 'teamA';
          const isTeamBWinner = match.winner === 'teamB';

          return (
            <Card key={match.id} className="overflow-hidden border-2 shadow-sm transition-shadow hover:shadow-md">
              <div className="bg-secondary/10 px-4 py-2 flex justify-between items-center border-b">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  <Clock className="h-3 w-3" />
                  {format(new Date(match.timestamp), 'h:mm a')}
                </div>
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
                  Court {match.courtId.slice(-1).toUpperCase()}
                </Badge>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  {/* Team A */}
                  <div className={cn(
                    "p-3 rounded-xl border-l-4 space-y-2",
                    isTeamAWinner ? "border-primary bg-primary/5" : "border-muted bg-secondary/5 opacity-80"
                  )}>
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team A</p>
                    {teamA.map(p => (
                      <div key={p.id} className="flex flex-col">
                        <span className="text-sm font-bold truncate">{p.name}</span>
                        <span className="text-[8px] uppercase font-bold text-muted-foreground">Lvl {p.skillLevel}</span>
                      </div>
                    ))}
                  </div>

                  {/* Score */}
                  <div className="text-center px-2 flex flex-col items-center justify-center min-w-[60px]">
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-2xl font-black",
                        isTeamAWinner ? "text-primary" : "text-muted-foreground"
                      )}>
                        {match.teamAScore !== undefined ? match.teamAScore : (isTeamAWinner ? 'W' : 'L')}
                      </span>
                      <span className="text-muted-foreground font-black opacity-30 mx-1">-</span>
                      <span className={cn(
                        "text-2xl font-black",
                        isTeamBWinner ? "text-primary" : "text-muted-foreground"
                      )}>
                        {match.teamBScore !== undefined ? match.teamBScore : (isTeamBWinner ? 'W' : 'L')}
                      </span>
                    </div>
                  </div>

                  {/* Team B */}
                  <div className={cn(
                    "p-3 rounded-xl border-l-4 space-y-2 text-right",
                    isTeamBWinner ? "border-primary bg-primary/5" : "border-muted bg-secondary/5 opacity-80"
                  )}>
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Team B</p>
                    {teamB.map(p => (
                      <div key={p.id} className="flex flex-col">
                        <span className="text-sm font-bold truncate">{p.name}</span>
                        <span className="text-[8px] uppercase font-bold text-muted-foreground">Lvl {p.skillLevel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
