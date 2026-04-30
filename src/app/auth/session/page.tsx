
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useClub } from '@/context/ClubContext';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, PlayCircle, LogOut } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

export default function SessionGatePage() {
  const { userProfile, activeSession, joinSession, createSession, role, isRestoringSession } = useClub();
  const { auth } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role === 'admin') {
      router.replace('/');
      return;
    }

    if (isRestoringSession) return;

    if (activeSession) {
      router.push('/');
    }
  }, [activeSession, role, router, isRestoringSession]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await joinSession(code, true);
      toast({ title: "Joined Session!" });
      router.push('/');
    } catch (error: any) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const newCode = await createSession();
      toast({ title: "Session Created!", description: `Code: ${newCode}` });
      router.push('/');
    } catch (error: any) {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/auth');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center justify-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" /> Active Session
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
            Enter the session code provided by the organizer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase opacity-60">Session Code</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                className="h-14 text-center text-2xl font-black tracking-[0.5em]"
                maxLength={6}
                required
              />
            </div>
            <Button className="w-full h-14 font-black uppercase" disabled={loading || !code}>
              Join Queue <PlayCircle className="ml-2 h-5 w-5" />
            </Button>
          </form>

          {role === 'admin' && (
            <div className="pt-4 border-t border-dashed">
              <p className="text-[10px] font-bold uppercase text-center text-muted-foreground mb-4">Admin Options</p>
              <Button variant="outline" className="w-full h-12 font-black uppercase border-2" onClick={handleCreate} disabled={loading}>
                Start New Session
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full text-[10px] font-bold uppercase opacity-60 hover:opacity-100" onClick={handleLogout}>
            <LogOut className="mr-2 h-3 w-3" /> Log out of {userProfile?.name}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
