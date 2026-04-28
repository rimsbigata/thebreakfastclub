'use client';

import { useMemo, useState } from 'react';
import { LogIn, LogOut, UserPlus, Users, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useClub } from '@/context/ClubContext';
import { useToast } from '@/hooks/use-toast';
import { SKILL_LEVELS, SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';

const assessmentQuestions = [
  {
    id: 'consistency',
    label: 'Rally Consistency',
    options: [
      { value: 1, label: 'Still learning to keep the shuttle in play' },
      { value: 3, label: 'Can rally but breaks down under pressure' },
      { value: 5, label: 'Can sustain rallies with placement' },
      { value: 7, label: 'Controls pace and direction reliably' },
    ],
  },
  {
    id: 'movement',
    label: 'Court Movement',
    options: [
      { value: 1, label: 'Often late to the shuttle' },
      { value: 3, label: 'Can cover basic front/back movement' },
      { value: 5, label: 'Recovers well after most shots' },
      { value: 7, label: 'Uses efficient footwork and anticipation' },
    ],
  },
  {
    id: 'matchplay',
    label: 'Match Experience',
    options: [
      { value: 1, label: 'New to scoring and doubles rotation' },
      { value: 3, label: 'Plays casual games regularly' },
      { value: 5, label: 'Comfortable with competitive doubles' },
      { value: 7, label: 'Tournament or high-level club experience' },
    ],
  },
];

export default function JoinPage() {
  const {
    currentPlayer,
    signUpPlayer,
    logInPlayer,
    logOutPlayer,
    joinQueueSession,
  } = useClub();
  const { toast } = useToast();

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({
    consistency: 3,
    movement: 3,
    matchplay: 3,
  });
  const [manualSkill, setManualSkill] = useState<string>('auto');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recommendedSkill = useMemo(() => {
    const values = Object.values(answers);
    return Math.max(1, Math.min(7, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)));
  }, [answers]);

  const skillLevel = manualSkill === 'auto' ? recommendedSkill : Number(manualSkill);

  const handleAuth = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpPlayer({
          name,
          pin,
          skillLevel,
          playStyle: 'Unknown',
          selfAssessment: answers,
        });
        toast({ title: 'Signup complete', description: 'You are now logged in.' });
      } else {
        await logInPlayer(name, pin);
        toast({ title: 'Logged in' });
      }
      setPin('');
    } catch (error) {
      toast({
        title: mode === 'signup' ? 'Signup failed' : 'Login failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSession = async () => {
    setIsSubmitting(true);
    try {
      await joinQueueSession(sessionCode);
      toast({ title: 'Joined queue session', description: 'You are available for match assignment.' });
      setSessionCode('');
    } catch (error) {
      toast({
        title: 'Could not join session',
        description: error instanceof Error ? error.message : 'Check the code and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Player Access
            </h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
              Sign up, log in, and join today's queue session.
            </p>
          </div>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest">
                {currentPlayer ? 'Current Player' : mode === 'signup' ? 'Player Sign Up' : 'Player Login'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlayer ? (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-lg border-2 bg-secondary/10 p-4">
                    <div>
                      <p className="font-black">{currentPlayer.name}</p>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Status: {currentPlayer.status}</p>
                    </div>
                    <Badge className={getSkillColor(currentPlayer.skillLevel)}>
                      {SKILL_LEVELS_SHORT[currentPlayer.skillLevel]}
                    </Badge>
                  </div>
                  <Button variant="outline" className="w-full font-black uppercase" onClick={logOutPlayer}>
                    <LogOut className="h-4 w-4 mr-2" /> Log Out
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant={mode === 'signup' ? 'default' : 'outline'} onClick={() => setMode('signup')}>
                      <UserPlus className="h-4 w-4 mr-2" /> Sign Up
                    </Button>
                    <Button variant={mode === 'login' ? 'default' : 'outline'} onClick={() => setMode('login')}>
                      <LogIn className="h-4 w-4 mr-2" /> Log In
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>PIN</Label>
                    <Input value={pin} onChange={event => setPin(event.target.value)} placeholder="4+ digit PIN" type="password" />
                  </div>

                  {mode === 'signup' && (
                    <div className="space-y-4 rounded-lg border-2 bg-secondary/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest">Skill Self-Assessment</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Recommended: Level {recommendedSkill}</p>
                        </div>
                        <Badge className={getSkillColor(recommendedSkill)}>{SKILL_LEVELS_SHORT[recommendedSkill]}</Badge>
                      </div>

                      {assessmentQuestions.map(question => (
                        <div key={question.id} className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase">{question.label}</Label>
                          <Select
                            value={answers[question.id].toString()}
                            onValueChange={value => setAnswers(prev => ({ ...prev, [question.id]: Number(value) }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {question.options.map(option => (
                                <SelectItem key={option.value} value={option.value.toString()}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase">Final Skill Level</Label>
                        <Select value={manualSkill} onValueChange={setManualSkill}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Use recommendation: Level {recommendedSkill}</SelectItem>
                            {Object.entries(SKILL_LEVELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{value} - {label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full h-12 font-black uppercase"
                    onClick={handleAuth}
                    disabled={isSubmitting || !name.trim() || pin.length < 4}
                  >
                    {mode === 'signup' ? 'Create Player Account' : 'Log In'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Join Queue Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Ask the organizer for today's code. Only players with the code can join the active queue.
              </p>
              <Input
                value={sessionCode}
                onChange={event => setSessionCode(event.target.value.toUpperCase())}
                placeholder="Session code"
                className="h-14 text-center text-xl font-black uppercase tracking-widest"
              />
              <Button className="w-full h-12 font-black uppercase" onClick={handleJoinSession} disabled={isSubmitting || !currentPlayer || !sessionCode.trim()}>
                Join Session
              </Button>
              {!currentPlayer && (
                <p className="text-[10px] font-bold uppercase text-destructive">Log in or sign up before joining.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
