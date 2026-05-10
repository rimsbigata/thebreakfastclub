"use client";

import { useClub } from '@/context/ClubContext';
import { useUser } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { History, Trophy, TrendingDown, TrendingUp, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getSkillColor, SKILL_LEVELS_SHORT } from '@/lib/types';
import { useMemo } from 'react';
import { Match } from '@/lib/types';

export default function MatchHistoryPage() {
  const { matches, players, role } = useClub();
  const { user } = useUser();

  const getUserMatches = (allMatches: Match[]) => {
    if (!user?.uid) return [];
    
    // Admins see all completed matches, players only see their own
    if (role === 'admin') {
      return allMatches.filter(m => m.status === 'completed');
    }
    
    return allMatches.filter(m =>
      m.status === 'completed' &&
      (m.teamA.includes(user.uid) || m.teamB.includes(user.uid))
    );
  };

  const allUserMatches = useMemo(() => getUserMatches(matches), [matches, user?.uid, role]);

  const todayMatches = useMemo(() => {
    const now = new Date().toDateString();
    return allUserMatches.filter(m => new Date(m.timestamp).toDateString() === now);
  }, [allUserMatches]);

  const monthMatches = useMemo(() => {
    const now = new Date();
    return allUserMatches.filter(m => {
      const d = new Date(m.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [allUserMatches]);

  const getUserStats = (matchList: Match[]) => {
    if (!user?.uid) return { wins: 0, total: 0, diff: 0 };
    let wins = 0;
    let total = 0;
    let diff = 0;

    matchList.forEach(m => {
      const isTeamA = m.teamA.includes(user.uid);
      const win = (m.winner === 'teamA' && isTeamA) || (m.winner === 'teamB' && !isTeamA);
      if (win) wins += 1;
      total += 1;
      if (m.teamAScore !== undefined && m.teamBScore !== undefined) {
        const scoreDiff = isTeamA ? (m.teamAScore - m.teamBScore) : (m.teamBScore - m.teamAScore);
        diff += scoreDiff;
      }
    });

    return { wins, total, diff };
  };

  const todayStats = useMemo(() => getUserStats(todayMatches), [todayMatches, user?.uid]);
  const monthStats = useMemo(() => getUserStats(monthMatches), [monthMatches, user?.uid]);
  const allStats = useMemo(() => getUserStats(allUserMatches), [allUserMatches, user?.uid]);

  const RenderMatchList = ({ matchList, stats }: { matchList: Match[]; stats: { wins: number; total: number; diff: number } }) => {
    if (!user?.uid) return null;

    return (
      <div className="space-y-3 pb-24">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="border-2 bg-primary/5">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-black text-primary">{stats.wins}</p>
              <p className="text-[8px] font-black uppercase text-muted-foreground">Wins</p>
            </CardContent>
          </Card>
          <Card className="border-2 bg-secondary/5">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-black">{stats.total}</p>
              <p className="text-[8px] font-black uppercase text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-2 bg-secondary/5">
            <CardContent className="p-3 text-center">
              <p className={cn("text-2xl font-black", stats.diff > 0 ? "text-green-600" : "text-destructive")}>
                {stats.diff > 0 ? `+${stats.diff}` : stats.diff}
              </p>
              <p className="text-[8px] font-black uppercase text-muted-foreground">Point Diff</p>
            </CardContent>
          </Card>
        </div>

        {matchList.map((match) => {
          const isAdmin = role === 'admin';
          const isTeamA = match.teamA.includes(user.uid);
          const isWinner = (match.winner === 'teamA' && isTeamA) || (match.winner === 'teamB' && !isTeamA);
          const yourTeam = isTeamA ? match.teamA : match.teamB;
          const opponentTeam = isTeamA ? match.teamB : match.teamA;
          const yourScore = isTeamA ? match.teamAScore : match.teamBScore;
          const opponentScore = isTeamA ? match.teamBScore : match.teamAScore;
          
          // For admin view, use teamA and teamB directly
          const team1 = isAdmin ? match.teamA : yourTeam;
          const team2 = isAdmin ? match.teamB : opponentTeam;
          const team1Score = isAdmin ? match.teamAScore : yourScore;
          const team2Score = isAdmin ? match.teamBScore : opponentScore;
          const team1Won = isAdmin ? match.winner === 'teamA' : isWinner;
          const team1Label = isAdmin ? "Team 1" : "Your Team";
          const team2Label = isAdmin ? "Team 2" : "Opponents";
          const winLabel = isAdmin ? (team1Won ? "Team 1 Won" : "Team 2 Won") : (isWinner ? "Victory" : "Defeat");
          
          // For admin view, use neutral styling. For player view, highlight based on win/loss
          const cardStyle = isAdmin 
            ? "border-2 border-secondary/50" 
            : (team1Won ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5");
          const badgeVariant = isAdmin 
            ? "outline" 
            : (team1Won ? "default" : "destructive");
          const scoreColor = isAdmin 
            ? "" 
            : (team1Won ? "text-green-600" : "text-destructive");

          return (
            <Card key={match.id} className={cn(
              "transition-all",
              cardStyle
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={badgeVariant} className="font-black uppercase text-[9px]">
                      {team1Won ? <Trophy className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {winLabel}
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
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">{team1Label}</p>
                    {team1.map((playerId) => {
                      const player = players.find(p => p.id === playerId);
                      return (
                        <div key={playerId} className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-black",
                            !isAdmin && playerId === user.uid ? "text-primary" : ""
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
                      scoreColor
                    )}>
                      {team1Score} - {team2Score}
                    </p>
                  </div>

                  <div className="flex-1 space-y-2 text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">{team2Label}</p>
                    {team2.map((playerId) => {
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
            <p className="font-black uppercase text-tiny tracking-widest opacity-40">No matches found</p>
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
        <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">Your personal match record</p>
      </header>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="bg-secondary/50 border-2 w-full sm:w-auto">
          <TabsTrigger value="today" className="gap-2 font-black uppercase text-[10px]">
            <Calendar className="h-3 w-3" /> Today
          </TabsTrigger>
          <TabsTrigger value="month" className="gap-2 font-black uppercase text-[10px]">
            <Calendar className="h-3 w-3" /> This Month
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2 font-black uppercase text-[10px]">
            <Trophy className="h-3 w-3" /> All Time
          </TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RenderMatchList matchList={todayMatches} stats={todayStats} />
        </TabsContent>
        <TabsContent value="month" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RenderMatchList matchList={monthMatches} stats={monthStats} />
        </TabsContent>
        <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RenderMatchList matchList={allUserMatches} stats={allStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
