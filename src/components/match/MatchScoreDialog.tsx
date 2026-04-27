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
    const a = teamAScore.trim() === '' ? undefined : Number(teamAScore);
    const b = teamBScore.trim() === '' ? undefined : Number(teamBScore);
    
    // Auto-determine winner if scores are provided
    const winner = (a ?? 0) >= (b ?? 0) ? 'teamA' : 'teamB';
    
    onScoreSubmit(a, b, winner);
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Match Score</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <div className="text-center">
                <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Team A</Label>
                <div className="text-xs font-bold truncate">
                  {teamA.map(p => p.name).join(' & ')}
                </div>
              </div>
              <Input
                placeholder="0"
                value={teamAScore}
                onChange={e => setTeamAScore(e.target.value)}
                type="number"
                className="text-center text-2xl font-black h-14"
              />
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Team B</Label>
                <div className="text-xs font-bold truncate">
                  {teamB.map(p => p.name).join(' & ')}
                </div>
              </div>
              <Input
                placeholder="0"
                value={teamBScore}
                onChange={e => setTeamBScore(e.target.value)}
                type="number"
                className="text-center text-2xl font-black h-14"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              className="w-full font-bold h-12" 
              onClick={handleSubmit}
              disabled={teamAScore === '' || teamBScore === ''}
            >
              Submit Score
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-xs font-bold uppercase text-muted-foreground" 
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
