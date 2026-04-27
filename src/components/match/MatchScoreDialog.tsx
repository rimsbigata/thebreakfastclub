import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player } from '@/lib/types';

interface MatchScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamA: Player[];
  teamB: Player[];
  /**
   * Called when the user submits a score or selects a winner.
   * If scores are omitted, they can be undefined.
   */
  onScoreSubmit: (teamAScore: number | undefined, teamBScore: number | undefined, winner: 'teamA' | 'teamB') => void;
  /**
   * Called when the user chooses to skip recording a score.
   * The caller can then show win buttons.
   */
  onSkip?: () => void;
}

export function MatchScoreDialog({ open, onOpenChange, teamA, teamB, onScoreSubmit, onSkip }: MatchScoreDialogProps) {
  const [teamAScore, setTeamAScore] = useState<string>('');
  const [teamBScore, setTeamBScore] = useState<string>('');

  const handleSubmit = () => {
    const a = teamAScore.trim() === '' ? undefined : Number(teamAScore);
    const b = teamBScore.trim() === '' ? undefined : Number(teamBScore);
    const winner = (a ?? 0) > (b ?? 0) ? 'teamA' : 'teamB';
    onScoreSubmit(a, b, winner);
    reset();
    onOpenChange(false);
  };

  const handleSkip = () => {
    // Close dialog without recording scores; notify parent to show win buttons.
    reset();
    onOpenChange(false);
    if (onSkip) onSkip();
  };

  const handleWin = (winner: 'teamA' | 'teamB') => {
    onScoreSubmit(undefined, undefined, winner);
    reset();
    onOpenChange(false);
  };

  const reset = () => {
    setTeamAScore('');
    setTeamBScore('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Match Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="font-medium">Team A</div>
            <Input
              placeholder="Score"
              value={teamAScore}
              onChange={e => setTeamAScore(e.target.value)}
              type="number"
            />
            <div className="font-medium">Team B</div>
            <Input
              placeholder="Score"
              value={teamBScore}
              onChange={e => setTeamBScore(e.target.value)}
              type="number"
            />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={handleSkip}>Skip Score Recording</Button>
            <Button onClick={handleSubmit}>Submit Score</Button>
          </div>
          <hr className="my-2" />
          <div className="flex gap-2 justify-center">
            <Button variant="success" onClick={() => handleWin('teamA')}>Team A Wins</Button>
            <Button variant="destructive" onClick={() => handleWin('teamB')}>Team B Wins</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
