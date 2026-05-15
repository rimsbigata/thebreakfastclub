'use client';

import { useState, useEffect, useMemo } from 'react';
import { useClub } from '@/context/ClubContext';
import { useUser, useFirebase } from '@/firebase';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, ShieldCheck, Trophy, Banknote, Calendar, Loader2, Save, History, Award, KeyRound } from 'lucide-react';
import { SKILL_LEVELS, SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useFcmToken } from '@/hooks/useFcmToken';

export default function ProfilePage() {
  const { userProfile, activeSession, currentPlayer, players, fees, role, isRestoringSession } = useClub();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const { requestPermissionAndGetToken } = useFcmToken();

  const [name, setName] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  useEffect(() => {
    const checkProfileExists = async () => {
      if (user?.uid && firestore) {
        const profileRef = doc(firestore, 'userProfiles', user.uid);
        const profileDoc = await getDoc(profileRef);
        setIsCreatingProfile(!profileDoc.exists());
      }
    };

    checkProfileExists();

    if (userProfile) {
      setName(userProfile.name);
      setSkillLevel(userProfile.skillLevel?.toString() || '3');
    } else {
      // Set default values when creating new profile
      setSkillLevel('3');
    }
  }, [user, firestore, userProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !firestore || user.isAnonymous) return;

    setIsSaving(true);
    try {
      const profileRef = doc(firestore, 'userProfiles', user.uid);
      const profileData: any = {
        name: name.trim(),
        skillLevel: Number(skillLevel),
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        role: 'player'
      };

      if (isCreatingProfile) {
        // Request FCM token for all roles and devices
        try {
          const fcmToken = await requestPermissionAndGetToken();
          if (fcmToken) {
            profileData.fcmToken = fcmToken;
          }
        } catch (fcmError) {
          console.warn('FCM token request failed:', fcmError);
          // Continue without FCM token if it fails
        }

        await setDoc(profileRef, profileData);
        toast({ title: "Profile Created", description: "Your profile has been created successfully." });
        // Redirect to auth/session after creating profile
        router.push('/auth/session');
      } else {
        await updateDoc(profileRef, {
          name: name.trim(),
          skillLevel: Number(skillLevel),
          lastActive: new Date().toISOString()
        });
        toast({ title: "Profile Updated", description: "Your changes have been saved." });
      }
    } catch (error: any) {
      toast({ title: isCreatingProfile ? "Creation Failed" : "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const sessionFee = useMemo(() => {
    if (!activeSession || !fees) return null;
    return fees.find(f => f.id === todayStr) || null;
  }, [activeSession, fees, todayStr]);

  const paymentStatus = useMemo(() => {
    if (!currentPlayer || !sessionFee) return 'none';
    return sessionFee.payments?.[currentPlayer.id] ? 'settled' : 'pending';
  }, [currentPlayer, sessionFee]);

  const perPlayerFee = useMemo(() => {
    if (!sessionFee) return "0.00";
    const shuttleTotal = (sessionFee.shuttleUnits || 0) * (sessionFee.shuttlePricePerPiece || 0);
    const courtTotal = (sessionFee.courts || []).reduce((total: number, court: any) => total + (court.feePerHour * court.hoursRented), 0);
    const total = shuttleTotal + courtTotal + (sessionFee.entranceFee || 0);
    const divisor = players.length || 1;
    return (total / divisor).toFixed(2); 
  }, [sessionFee, players.length]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8 pb-24">
      <header className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
          <UserCircle className="h-8 w-8 text-primary" /> My Profile
        </h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Manage your player identity & stats</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Permanent Profile Settings */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> {isCreatingProfile ? "Create Your Profile" : "Account Details"}
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">
                {isCreatingProfile ? "Complete your profile to join sessions." : "Update your global player record."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-60">Display Name</Label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    disabled={user.isAnonymous}
                    placeholder="Enter your full name"
                    className="h-12 font-black border-2"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-60">Skill Tier</Label>
                  <Select 
                    value={skillLevel} 
                    onValueChange={setSkillLevel}
                    disabled={user.isAnonymous}
                  >
                    <SelectTrigger className="h-12 border-2 font-black">
                      <SelectValue placeholder="Select skill level" />
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

                {!user.isAnonymous && (
                  <Button type="submit" className="w-full h-12 font-black uppercase" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {isCreatingProfile ? "Create Profile & Continue" : "Save Changes"}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Current Session Context */}
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Active Session
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {isRestoringSession ? (
                <div className="text-center py-10">
                  <Loader2 className="h-10 w-10 mx-auto mb-2 animate-spin" />
                  <p className="text-xs font-black uppercase">Restoring session...</p>
                </div>
              ) : activeSession ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border-2">
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Session Code</p>
                      <p className="text-2xl font-black tracking-widest text-primary">{activeSession.code}</p>
                    </div>
                    <Badge className="bg-green-600 text-white font-black uppercase h-6">Connected</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-secondary/10 rounded-xl border-2 border-dashed">
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Your Status</p>
                      <p className="font-black uppercase text-sm">{currentPlayer?.status || 'Active'}</p>
                    </div>
                    <div className="p-4 bg-secondary/10 rounded-xl border-2 border-dashed">
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Matches Today</p>
                      <p className="font-black text-sm">{currentPlayer?.gamesPlayed || 0}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 opacity-40">
                  <KeyRound className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-xs font-black uppercase">Not joined to any session</p>
                  <Button variant="link" className="mt-2 text-primary uppercase text-[10px] font-black" onClick={() => router.push('/auth/session')}>Join Session Now</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Financial Summary */}
          <Card className="border-2 shadow-lg border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" /> Session Fee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-2">
                <p className="text-4xl font-black text-green-600">₱{perPlayerFee}</p>
                <p className="text-[9px] font-black uppercase text-muted-foreground mt-1">Due for current session</p>
              </div>
              
              <div className={cn(
                "p-3 rounded-lg border-2 text-center",
                paymentStatus === 'settled' ? "bg-green-600/10 border-green-600/20 text-green-600" : "bg-orange-500/10 border-orange-500/20 text-orange-600"
              )}>
                <p className="text-xs font-black uppercase tracking-tight">
                  {paymentStatus === 'settled' ? "✓ Payment Verified" : "Payment Pending"}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full h-10 border-2 font-black uppercase text-[10px]"
                onClick={() => router.push(activeSession ? `/session/${activeSession.id}/fees` : '/fees')}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Stats Summary */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-secondary/30 rounded-lg text-center">
                  <p className="text-lg font-black">{currentPlayer?.stars?.toFixed(1) || 0}</p>
                  <p className="text-[8px] font-black uppercase text-muted-foreground">⭐ Stars</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg text-center">
                  <p className="text-lg font-black">{currentPlayer?.wins || 0}</p>
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Wins</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="w-full font-black uppercase text-[10px] gap-2"
                onClick={() => router.push('/player-stats')}
              >
                <Trophy className="h-3 w-3" /> Full Statistics
              </Button>
              <Button 
                variant="ghost" 
                className="w-full font-black uppercase text-[10px] gap-2"
                onClick={() => router.push('/match-history')}
              >
                <History className="h-3 w-3" /> Match Record
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
