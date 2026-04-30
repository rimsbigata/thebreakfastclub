'use client';

import { useState } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trophy, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { MatchScoreDialog } from '@/components/match/MatchScoreDialog';
import { MatchResults } from '@/components/match/MatchResults';
import { cn } from '@/lib/utils';

export default function CourtsPage() {
  const { courts, players, matches, addCourt, deleteCourt, endMatch, defaultWinningScore, deuceEnabled } = useClub();
  const { toast } = useToast();
  const [newCourtName, setNewCourtName] = useState('');
  const [scoringCourtId, setScoringCourtId] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<
    'score' | 'zeroConfirm' | null
  >(null);

  const [pendingScore, setPendingScore] = useState<{
    courtId: string;
    teamAScore: number;
    teamBScore: number;
    winner: 'teamA' | 'teamB';
  } | null>(null);

  const handleAddCourt = async () => {
    if (!newCourtName) return;

    const formattedName = `Court ${newCourtName}`;
    const exists = courts.some(c => c.name.toLowerCase() === formattedName.toLowerCase());

    if (exists) {
      toast({
        title: "Duplicate Court",
        description: `There is already a court named "${formattedName}".`,
        variant: "destructive"
      });
      return;
    }

    try {
      await addCourt(newCourtName);
      setNewCourtName('');
      toast({ title: "Court Added" });
    } catch (error) {
      toast({
        title: "Could not add court",
        description: error instanceof Error ? error.message : "Database write failed.",
        variant: "destructive"
      });
    }
  };

  const handleScoreSubmit = (
    teamAScore: number | undefined,
    teamBScore: number | undefined,
    winner: 'teamA' | 'teamB'
  ) => {
    if (!scoringCourtId) return;

    const a = teamAScore ?? 0;
    const b = teamBScore ?? 0;
    const losingScore = winner === 'teamA' ? b : a;

    // Validate score based on deuce rule
    const higher = Math.max(a, b);
    const lower = Math.min(a, b);

    if (higher < defaultWinningScore) {
      toast({ title: "Invalid Score", description: `Winning score (${defaultWinningScore}) not reached.`, variant: "destructive" });
      return;
    }
    if (a === b) {
      toast({ title: "Invalid Score", description: "Scores cannot be equal.", variant: "destructive" });
      return;
    }
    if (deuceEnabled) {
      if (higher === defaultWinningScore && lower === defaultWinningScore - 1) {
        toast({ title: "Invalid Score", description: "Must win by 2 points.", variant: "destructive" });
        return;
      }
      if (higher > defaultWinningScore && higher - lower < 2) {
        toast({ title: "Invalid Score", description: "Must win by 2 points in deuce.", variant: "destructive" });
        return;
      }
    }

    if (losingScore === 0) {
      setPendingScore({
        courtId: scoringCourtId,
        teamAScore: a,
        teamBScore: b,
        winner,
      });

      setActiveModal('zeroConfirm');
      return;
    }

    endMatch(scoringCourtId, 'completed', winner, a, b);
    setActiveModal(null);
    setScoringCourtId(null);
    toast({ title: "Match Recorded" });
  };

  const handleEditZeroScore = () => {
    setActiveModal(null);
    window.setTimeout(() => setActiveModal('score'), 0);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courts</h1>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="transition-all hover:bg-secondary"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="animate-in zoom-in duration-300">
              <DialogHeader><DialogTitle>Add New Court</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Court Identifier</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground bg-secondary px-3 py-2 rounded-md">Court</span>
                    <Input
                      placeholder="e.g. 1, A, or Blue"
                      value={newCourtName}
                      onChange={e => setNewCourtName(e.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full active:scale-95 transition-transform" onClick={handleAddCourt}>Create Court</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courts.map((court, idx) => (
          <Card key={court.id} className="border-2 shadow-sm relative group overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 animate-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{court.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                  onClick={() => deleteCourt(court.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Badge variant={court.status === 'available' ? 'outline' : 'default'} className={cn(
                  "transition-colors",
                  court.status === 'available' ? 'text-green-600 border-green-200 bg-green-500/5' : 'bg-primary'
                )}>
                  {court.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {court.status === 'occupied' ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Live Match
                  </div>
                  <div className="h-24 flex items-center justify-center bg-secondary/10 rounded-lg border-2 border-dashed">
                    <p className="text-xs text-muted-foreground font-medium italic">Match in progress on {court.name}</p>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                  <Trophy className="h-6 w-6 text-muted-foreground/30 mb-2 transition-colors group-hover:text-primary/30" />
                  <p className="text-sm text-muted-foreground italic">Ready for next match</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between gap-2 border-t pt-4">
              {court.status === 'occupied' ? (
                <Button variant="outline" size="sm" onClick={() => {
                  setScoringCourtId(court.id);
                  setActiveModal('score');
                }} className="w-full transition-all hover:bg-primary hover:text-primary-foreground active:scale-95">End Match & Record Score</Button>
              ) : (
                <p className="text-xs text-muted-foreground opacity-50">Idle</p>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <section className="pt-8 animate-in slide-in-from-bottom-8 duration-1000">
        <MatchResults matches={matches} players={players} limit={10} />
      </section>

      {scoringCourtId && (() => {
        const court = courts.find(c => c.id === scoringCourtId);
        const match = matches.find(m => m.id === court?.currentMatchId);
        if (!match) return null;

        const teamA = players.filter(p => match.teamA.includes(p.id));
        const teamB = players.filter(p => match.teamB.includes(p.id));

        return (
          <MatchScoreDialog
            open={activeModal === 'score'}
            onOpenChange={(open) => {
              if (!open) {
                setActiveModal(null);
                setScoringCourtId(null);
              }
            }}
            teamA={teamA}
            teamB={teamB}
            onScoreSubmit={handleScoreSubmit}
          />
        );
      })()}

      {activeModal === 'zeroConfirm' && (
        <Dialog open={true} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Zero Score</DialogTitle>
            </DialogHeader>
            <p className="text-sm">The losing team has a score of 0. Is this correct?</p>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => {
                  if (pendingScore) {
                    endMatch(
                      pendingScore.courtId,
                      'completed',
                      pendingScore.winner,
                      pendingScore.teamAScore,
                      pendingScore.teamBScore
                    );
                  }
                  setActiveModal(null);
                  setScoringCourtId(null);
                }}
              >
                Yes, Confirm
              </Button>
              <DialogClose asChild>
                <Button variant="outline" onClick={handleEditZeroScore}>Edit Score</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
