import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Player } from '@/lib/types';
import { Label } from '@/components/ui/label';

interface MatchScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamA: Player[];
  teamB: Player[];
  onScoreSubmit: (teamAScore: number | undefined, teamBScore: number | undefined, winner: 'teamA' | 'teamB') => void;
  onSkip?: () => void;
  defaultWinningScore?: number;
  deuceEnabled?: boolean;
}

export function MatchScoreDialog({ open, onOpenChange, teamA, teamB, onScoreSubmit, onSkip, defaultWinningScore = 21, deuceEnabled = false }: MatchScoreDialogProps) {
  const [teamAScore, setTeamAScore] = useState<string>('');
  const [teamBScore, setTeamBScore] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Cleanup when modal closes
  useEffect(() => {
    if (!open) {
      // Reset state
      reset();

    }
  }, [open]);

  const validateScore = (a: number, b: number): { valid: boolean; message?: string } => {
    const higher = Math.max(a, b);
    const lower = Math.min(a, b);

    if (a === b) {
      return { valid: false, message: "Scores cannot be equal." };
    }
    if (higher < defaultWinningScore) {
      return { valid: false, message: `Winning score (${defaultWinningScore}) not reached.` };
    }
    if (!deuceEnabled && higher > defaultWinningScore) {
      return { valid: false, message: `Winner's score cannot exceed ${defaultWinningScore}.` };
    }
    if (deuceEnabled) {
      if (higher === defaultWinningScore && lower === defaultWinningScore - 1) {
        return { valid: false, message: `Must win by 2 points.` };
      }
      if (higher > defaultWinningScore && higher - lower < 2) {
        return { valid: false, message: "Must win by 2 points in deuce." };
      }
    }
    return { valid: true };
  };

  const handleSubmit = () => {
    const aVal = teamAScore.trim() === '' ? undefined : Math.max(0, Number(teamAScore));
    const bVal = teamBScore.trim() === '' ? undefined : Math.max(0, Number(teamBScore));

    // Validate scores if both are provided
    if (aVal !== undefined && bVal !== undefined) {
      const validation = validateScore(aVal, bVal);
      if (!validation.valid) {
        setError(validation.message || 'Invalid score');
        return;
      }
    }

    setError('');

    // Auto-determine winner if scores are provided
    const winner = (aVal ?? 0) >= (bVal ?? 0) ? 'teamA' : 'teamB';

    onScoreSubmit(aVal, bVal, winner);
    reset();
  };

  const handleSkip = () => {
    reset();
    onOpenChange(false);
    if (onSkip) onSkip();
  };

  const reset = () => {
    setTeamAScore('');
    setTeamBScore('');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase">Record Match Score</DialogTitle>
          <DialogDescription className="sr-only">
            Enter the final scores for the match
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 py-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium p-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="text-center">
                <Label className="text-[12px] font-black uppercase text-primary tracking-widest">Team A</Label>
                <div className="text-sm font-bold truncate mt-1">
                  {teamA.map(p => p.name).join(' & ')}
                </div>
              </div>
              <Input
                placeholder="0"
                value={teamAScore}
                onChange={e => {
                  setTeamAScore(e.target.value);
                  setError('');
                }}
                type="number"
                min="0"
                className="text-center text-4xl font-black h-20 border-2 no-spinner"
                onBlur={() => {
                  if (teamAScore && Number(teamAScore) < 0) setTeamAScore('0');
                }}
              />
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <Label className="text-[12px] font-black uppercase text-muted-foreground tracking-widest">Team B</Label>
                <div className="text-sm font-bold truncate mt-1">
                  {teamB.map(p => p.name).join(' & ')}
                </div>
              </div>
              <Input
                placeholder="0"
                value={teamBScore}
                onChange={e => {
                  setTeamBScore(e.target.value);
                  setError('');
                }}
                type="number"
                min="0"
                className="text-center text-4xl font-black h-20 border-2 no-spinner"
                onBlur={() => {
                  if (teamBScore && Number(teamBScore) < 0) setTeamBScore('0');
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <Button
              className="w-full font-black h-16 text-lg uppercase"
              onClick={handleSubmit}
              disabled={teamAScore === '' || teamBScore === ''}
            >
              Submit Results
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs font-black uppercase tracking-widest text-muted-foreground"
              onClick={handleSkip}
            >
              Skip & Pick Winner Manually
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
