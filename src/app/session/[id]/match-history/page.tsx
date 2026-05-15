"use client";

import { useClub } from '@/context/ClubContext';
import { useUser } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { History, Trophy, TrendingDown, Calendar, Clock, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getSkillColor, SKILL_LEVELS_SHORT } from '@/lib/types';
import { useMemo, use, useState } from 'react';
import { Match } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function SessionMatchHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { matches, players, activeSession, role, updateMatchScore } = useClub();
  const { user } = useUser();
  const resolvedParams = use(params);

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [teamAScore, setTeamAScore] = useState<number>(0);
  const [teamBScore, setTeamBScore] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const getSessionMatches = (allMatches: Match[]) => {
    if (!user?.uid || !activeSession) return [];
    
    // Admins see all completed matches, players only see their own
    if (role === 'admin') {
      return allMatches.filter(m => m.status === 'completed');
    }
    
    return allMatches.filter(m =>
      m.status === 'completed' &&
      (m.teamA.includes(user.uid) || m.teamB.includes(user.uid))
    );
  };

  const allUserMatches = useMemo(() => getSessionMatches(matches), [matches, user?.uid, activeSession, role]);

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setTeamAScore(match.teamAScore || 0);
    setTeamBScore(match.teamBScore || 0);
  };

  const handleSaveScore = async () => {
    if (!editingMatch) return;
    setIsSaving(true);
    try {
      await updateMatchScore(editingMatch.id, teamAScore, teamBScore);
      setEditingMatch(null);
    } catch (error) {
      console.error('Failed to update match score:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const RenderMatchList = ({ matchList }: { matchList: Match[] }) => {
    if (!user?.uid) return null;

    return (
      <div className="space-y-3 pb-24">
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
                  <div className="flex items-center gap-3">
                    <div className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(match.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        onClick={() => handleEditMatch(match)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
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

      {/* Edit Score Dialog */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase">Edit Match Score</DialogTitle>
            <DialogDescription>Update the final score for this match</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Team 1 Score</Label>
                <Input
                  type="number"
                  value={teamAScore}
                  onChange={(e) => setTeamAScore(parseInt(e.target.value) || 0)}
                  className="h-12 font-black text-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Team 2 Score</Label>
                <Input
                  type="number"
                  value={teamBScore}
                  onChange={(e) => setTeamBScore(parseInt(e.target.value) || 0)}
                  className="h-12 font-black text-xl"
                />
              </div>
            </div>
            {editingMatch && (
              <div className="text-sm text-muted-foreground">
                <p className="font-bold">Match ID: {editingMatch.id}</p>
                <p className="text-xs">Date: {new Date(editingMatch.timestamp).toLocaleString()}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingMatch(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveScore} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
