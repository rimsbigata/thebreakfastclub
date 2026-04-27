'use client';

import { Player, Match, SKILL_LEVELS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface MatchResultsProps {
  matches: Match[];
  players: Player[];
  limit?: number;
}

export function MatchResults({ matches, players, limit }: MatchResultsProps) {
  // Filter completed matches and sort by timestamp descending
  const completedMatches = matches
    .filter(m => m.isCompleted)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  if (completedMatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Match Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No completed matches yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Match Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {completedMatches.map(match => {
          const teamA = players.filter(p => match.teamA.includes(p.id));
          const teamB = players.filter(p => match.teamB.includes(p.id));
          const isTeamAWinner = match.winner === 'teamA';
          const isTeamBWinner = match.winner === 'teamB';

          return (
            <div key={match.id} className="border rounded-lg p-4 space-y-3 bg-secondary/30">
              {/* Timestamp */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(match.timestamp), 'MMM d, yyyy HH:mm')}
                </div>
                <Badge variant="outline">Court {match.courtId}</Badge>
              </div>

              {/* Teams and Scores */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                {/* Team A */}
                <div className={`p-3 rounded-lg border-2 ${isTeamAWinner ? 'border-green-500 bg-green-500/10' : 'border-transparent'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Team A</span>
                      {isTeamAWinner && (
                        <Badge className="bg-green-600 text-white text-[10px]">Winner</Badge>
                      )}
                    </div>
                    {teamA.map(player => (
                      <div key={player.id} className="text-sm flex items-center justify-between">
                        <span className="font-medium">{player.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Lvl {player.skillLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score */}
                <div className="text-center py-2">
                  <div className="text-3xl font-bold text-primary">
                    {match.teamAScore !== undefined ? match.teamAScore : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase font-bold">vs</div>
                  <div className="text-3xl font-bold text-primary">
                    {match.teamBScore !== undefined ? match.teamBScore : '—'}
                  </div>
                </div>

                {/* Team B */}
                <div className={`p-3 rounded-lg border-2 ${isTeamBWinner ? 'border-green-500 bg-green-500/10' : 'border-transparent'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Team B</span>
                      {isTeamBWinner && (
                        <Badge className="bg-green-600 text-white text-[10px]">Winner</Badge>
                      )}
                    </div>
                    {teamB.map(player => (
                      <div key={player.id} className="text-sm flex items-center justify-between">
                        <span className="font-medium">{player.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Lvl {player.skillLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
