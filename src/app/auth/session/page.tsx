
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useClub } from '@/context/ClubContext';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, PlayCircle, LogOut, Shield, User, List, Power, Loader2 } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Switch } from '@/components/ui/switch';
import { QueueSession } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function SessionGatePage() {
  const { userProfile, activeSession, joinSession, createSession, role, isRestoringSession, loadSessionById, endSessionById, getAllSessions } = useClub();
  const { auth } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinAsPlayer, setJoinAsPlayer] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);
  const [allSessions, setAllSessions] = useState<QueueSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);
  const [venueName, setVenueName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (isRestoringSession) return;

    // Redirect to active session if already joined
    if (activeSession) {
      router.push(`/session/${activeSession.id}`);
    }
  }, [activeSession, router, isRestoringSession]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await joinSession(code, true, role === 'admin' ? joinAsPlayer : false);
      toast({ title: "Joined Session!" });
      if (activeSession) {
        router.push(`/session/${activeSession.id}`);
      }
    } catch (error: any) {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const newCode = await createSession(false, undefined, venueName, scheduledDate, scheduledTime);
      toast({ title: "Session Created!", description: `Code: ${newCode}` });
      if (activeSession) {
        router.push(`/session/${activeSession.id}`);
      }
      // Reset form
      setVenueName('');
      setScheduledDate('');
      setScheduledTime('');
      setShowCreateForm(false);
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

  const handleLoadSessions = async () => {
    setLoadingSessions(true);
    try {
      const sessions = await getAllSessions();
      setAllSessions(sessions);
      setShowAdminView(true);
    } catch (error: any) {
      toast({ title: "Failed to load sessions", description: error.message, variant: "destructive" });
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleOpenSession = async (sessionId: string) => {
    setLoading(true);
    try {
      await loadSessionById(sessionId);
      toast({ title: "Session Loaded!" });
      router.push(`/session/${sessionId}`);
    } catch (error: any) {
      toast({ title: "Failed to load session", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to end this session?")) return;

    setEndingSessionId(sessionId);
    try {
      await endSessionById(sessionId);
      toast({ title: "Session Ended" });
      // Refresh the sessions list
      const sessions = await getAllSessions();
      setAllSessions(sessions);
    } catch (error: any) {
      toast({ title: "Failed to end session", description: error.message, variant: "destructive" });
    } finally {
      setEndingSessionId(null);
    }
  };

  if (showAdminView && role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl border-2 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center justify-center gap-2">
              <List className="h-6 w-6 text-primary" /> All Sessions
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
              Manage all active sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {allSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm font-black uppercase">No sessions found</p>
                  </div>
                ) : (
                  allSessions.map(session => (
                    <Card key={session.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-black uppercase tracking-widest">{session.code}</span>
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                                session.status === 'active' ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                              )}>
                                {session.status}
                              </span>
                            </div>
                            {session.venueName && (
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">{session.venueName}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="text-[9px] text-muted-foreground font-bold uppercase">
                                Created: {new Date(session.createdAt).toLocaleString()}
                              </p>
                              {session.scheduledDate && (
                                <p className="text-[9px] text-muted-foreground font-bold uppercase">{session.scheduledDate}</p>
                              )}
                              {session.scheduledTime && (
                                <p className="text-[9px] text-muted-foreground font-bold uppercase">{session.scheduledTime}</p>
                              )}
                            </div>
                            {session.isDoubleStar && (
                              <p className="text-[9px] text-primary font-black uppercase mt-1">⭐⭐ Double Star</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {session.status === 'active' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="font-black uppercase text-[10px] h-8"
                                  onClick={() => handleOpenSession(session.id)}
                                  disabled={loading}
                                >
                                  Open
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="font-black uppercase text-[10px] h-8"
                                  onClick={() => handleEndSession(session.id)}
                                  disabled={endingSessionId === session.id}
                                >
                                  {endingSessionId === session.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full font-black uppercase" onClick={() => setShowAdminView(false)}>
              Back to Join
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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

            {role === 'admin' && (
              <div className="flex items-center justify-between p-3 border-2 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  {joinAsPlayer ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  <span className="text-xs font-black uppercase">
                    Join as {joinAsPlayer ? 'Player' : 'Admin'}
                  </span>
                </div>
                <Switch checked={joinAsPlayer} onCheckedChange={setJoinAsPlayer} />
              </div>
            )}

            <Button className="w-full h-14 font-black uppercase" disabled={loading || !code}>
              {role === 'admin' && joinAsPlayer ? 'Join as Player' : 'Join Queue'} <PlayCircle className="ml-2 h-5 w-5" />
            </Button>
          </form>

          {role === 'admin' && (
            <div className="pt-4 border-t border-dashed space-y-3">
              <p className="text-[10px] font-bold uppercase text-center text-muted-foreground mb-4">Admin Options</p>
              <div className="space-y-2">
                {!showCreateForm ? (
                  <>
                    <Button variant="outline" className="w-full h-12 font-black uppercase border-2" onClick={() => setShowCreateForm(true)} disabled={loading}>
                      Start New Session
                    </Button>
                    <Button variant="outline" className="w-full h-12 font-black uppercase border-2" onClick={handleLoadSessions} disabled={loadingSessions}>
                      {loadingSessions ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <List className="h-4 w-4 mr-2" />}
                      View All Sessions
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3 p-3 border-2 rounded-lg bg-secondary/30">
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase opacity-60">Venue Name</Label>
                        <Input
                          value={venueName}
                          onChange={e => setVenueName(e.target.value)}
                          placeholder="e.g. Badminton Center A"
                          className="h-10 text-sm font-black"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase opacity-60">Date</Label>
                          <Input
                            type="date"
                            value={scheduledDate}
                            onChange={e => setScheduledDate(e.target.value)}
                            className="h-10 text-sm font-black"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase opacity-60">Time</Label>
                          <Input
                            type="time"
                            value={scheduledTime}
                            onChange={e => setScheduledTime(e.target.value)}
                            className="h-10 text-sm font-black"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 h-10 font-black uppercase text-[10px]" onClick={handleCreate} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                      </Button>
                      <Button variant="ghost" className="flex-1 h-10 font-black uppercase text-[10px]" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
