
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AuthPage() {
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Default role is player. 
      // Using 'userProfiles' collection to match security rules
      const profileData = {
        id: user.uid,
        name,
        email,
        role: 'player',
        skillLevel: 3, // Default intermediate
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
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
                  <Label className="text-foreground">Full Name</Label>
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
                <Button className="w-full h-12 font-black uppercase" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"} <UserPlus className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
