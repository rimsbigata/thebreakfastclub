"use client";

import { useClub } from '@/context/ClubContext';
import { useUser } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { History, Trophy, TrendingDown, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getSkillColor, SKILL_LEVELS_SHORT } from '@/lib/types';
import { useMemo, use } from 'react';
import { Match } from '@/lib/types';

export default function SessionMatchHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { matches, players, activeSession } = useClub();
  const { user } = useUser();
  const resolvedParams = use(params);

  const getSessionMatches = (allMatches: Match[]) => {
    if (!user?.uid || !activeSession) return [];
    return allMatches.filter(m =>
      m.status === 'completed' &&
      (m.teamA.includes(user.uid) || m.teamB.includes(user.uid))
    );
  };

  const allUserMatches = useMemo(() => getSessionMatches(matches), [matches, user?.uid, activeSession]);

  const RenderMatchList = ({ matchList }: { matchList: Match[] }) => {
    if (!user?.uid) return null;

    return (
      <div className="space-y-3 pb-24">
        {matchList.map((match) => {
          const isTeamA = match.teamA.includes(user.uid);
          const isWinner = (match.winner === 'teamA' && isTeamA) || (match.winner === 'teamB' && !isTeamA);
          const yourTeam = isTeamA ? match.teamA : match.teamB;
          const opponentTeam = isTeamA ? match.teamB : match.teamA;
          const yourScore = isTeamA ? match.teamAScore : match.teamBScore;
          const opponentScore = isTeamA ? match.teamBScore : match.teamAScore;

          return (
            <Card key={match.id} className={cn(
              "border-2 transition-all",
              isWinner ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isWinner ? "default" : "destructive"} className="font-black uppercase text-[9px]">
                      {isWinner ? <Trophy className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {isWinner ? "Victory" : "Defeat"}
                    </Badge>
                    <span className="text-[9px] font-black text-muted-foreground uppercase">
                      {new Date(match.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(match.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Your Team</p>
                    {yourTeam.map((playerId) => {
                      const player = players.find(p => p.id === playerId);
                      return (
                        <div key={playerId} className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-black",
                            playerId === user.uid ? "text-primary" : ""
                          )}>
                            {player?.name}
                          </span>
                          {player && (
                            <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1", getSkillColor(player.skillLevel || 3))}>
                              {SKILL_LEVELS_SHORT[player.skillLevel || 3]}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center">
                    <p className={cn(
                      "text-3xl font-black",
                      isWinner ? "text-green-600" : "text-destructive"
                    )}>
                      {yourScore} - {opponentScore}
                    </p>
                  </div>

                  <div className="flex-1 space-y-2 text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Opponents</p>
                    {opponentTeam.map((playerId) => {
                      const player = players.find(p => p.id === playerId);
                      return (
                        <div key={playerId} className="flex items-center justify-end gap-2">
                          {player && (
                            <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1", getSkillColor(player.skillLevel || 3))}>
                              {SKILL_LEVELS_SHORT[player.skillLevel || 3]}
                            </Badge>
                          )}
                          <span className="text-sm font-black">{player?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {match.courtId && (
                  <div className="pt-2 border-t border-dashed">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">
                      Court: {match.courtId}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {matchList.length === 0 && (
          <div className="text-center py-20 border-4 border-dashed rounded-2xl bg-secondary/10 flex flex-col items-center">
            <History className="h-10 w-10 mb-2 opacity-10" />
            <p className="font-black uppercase text-tiny tracking-widest opacity-40">No matches found in this session</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <header className="space-y-0.5 text-center sm:text-left">
        <h1 className="flex items-center justify-center sm:justify-start gap-3">
          <History className="h-8 w-8 text-primary" /> Match History
        </h1>
        <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">
          Your matches in {activeSession?.code || 'this session'}
        </p>
      </header>

      <RenderMatchList matchList={allUserMatches} />
    </div>
  );
}
