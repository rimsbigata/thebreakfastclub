import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
}

export function MatchScoreDialog({ open, onOpenChange, teamA, teamB, onScoreSubmit, onSkip }: MatchScoreDialogProps) {
  const [teamAScore, setTeamAScore] = useState<string>('');
  const [teamBScore, setTeamBScore] = useState<string>('');

  const handleSubmit = () => {
    const aVal = teamAScore.trim() === '' ? undefined : Math.max(0, Number(teamAScore));
    const bVal = teamBScore.trim() === '' ? undefined : Math.max(0, Number(teamBScore));
    
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase">Record Match Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-8 py-6">
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
                onChange={e => setTeamAScore(e.target.value)}
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
                onChange={e => setTeamBScore(e.target.value)}
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