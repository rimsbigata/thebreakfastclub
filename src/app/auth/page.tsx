
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { SKILL_LEVELS, SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';
import { cn } from '@/lib/utils';

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

export default function AuthPage() {
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Signup Specific State
  const [skillLevel, setSkillLevel] = useState('3');
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({
    consistency: 3,
    movement: 3,
    matchplay: 3,
  });

  const recommendedSkill = useMemo(() => {
    const values = Object.values(answers);
    return Math.max(1, Math.min(7, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)));
  }, [answers]);

  const handleApplyRecommendation = () => {
    setSkillLevel(recommendedSkill.toString());
    setIsAssessmentOpen(false);
    toast({ title: "Skill recommendation applied!" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const profileData = {
        id: user.uid,
        name,
        email,
        role: 'player',
        skillLevel: Number(skillLevel),
        dateJoined: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const profileRef = doc(firestore, 'userProfiles', user.uid);

      setDoc(profileRef, profileData)
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: profileRef.path,
            operation: 'create',
            requestResourceData: profileData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

      toast({ title: "Account created!", description: "Welcome to The Breakfast Club." });
      router.push('/auth/session');
    } catch (error: any) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Welcome back!" });
      router.push('/');
    } catch (error: any) {
      toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-foreground">The Breakfast Club</CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60">Badminton Command Center</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" className="font-bold uppercase text-[10px]">Login</TabsTrigger>
              <TabsTrigger value="signup" className="font-bold uppercase text-[10px]">Join Club</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="coach@club.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Password</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <Button className="w-full h-12 font-black uppercase" disabled={loading}>
                  {loading ? "Authenticating..." : "Login"} <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Password</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>

                <div className="pt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase opacity-60">Skill Tier</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[9px] font-black uppercase tracking-widest text-primary gap-1"
                      onClick={() => setIsAssessmentOpen(!isAssessmentOpen)}
                    >
                      <Sparkles className="h-3 w-3" />
                      {isAssessmentOpen ? "Hide Tools" : "Evaluate My Skill"}
                      {isAssessmentOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>

                  {isAssessmentOpen && (
                    <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border-2 border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-4">
                        {assessmentQuestions.map(q => (
                          <div key={q.id} className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{q.label}</Label>
                            <Select
                              value={answers[q.id].toString()}
                              onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: parseInt(val) }))}
                            >
                              <SelectTrigger className="h-9 text-xs font-bold bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {q.options.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value.toString()} className="text-xs font-medium">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                        <div className="pt-2">
                          <Button
                            type="button"
                            className="w-full h-10 font-black uppercase text-[10px] bg-primary/20 text-primary hover:bg-primary/30 border-none"
                            onClick={handleApplyRecommendation}
                          >
                            Use Recommended: Level {recommendedSkill}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <Select value={skillLevel} onValueChange={setSkillLevel}>
                    <SelectTrigger className="h-12 border-2 font-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="font-bold">
                          <div className="flex items-center gap-2">
                            <Badge className={cn("h-4 px-1 text-[9px] font-black uppercase shrink-0", getSkillColor(parseInt(val)))}>
                              {SKILL_LEVELS_SHORT[parseInt(val)]}
                            </Badge>
                            <span className="text-xs uppercase">{label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full h-14 font-black uppercase mt-4" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Player Account"} <UserPlus className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
