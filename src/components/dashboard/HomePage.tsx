
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Timer, Play, Zap, ArrowLeftRight, User, DoorOpen, ListOrdered, X, Trophy, Ban, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';

function LiveTimer({ startTime }: { startTime?: string }) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-2 text-primary font-mono font-black animate-pulse bg-primary/10 px-3 py-1 rounded-full text-compact">
      <Timer className="h-4 w-4" />
      {elapsed}
    </div>
  );
}

function WaitTimeBadge({ lastAvailableAt }: { lastAvailableAt?: number }) {
  const [mins, setMins] = useState(0);

  useEffect(() => {
    if (!lastAvailableAt) return;
    const update = () => setMins(Math.floor((Date.now() - lastAvailableAt) / 60000));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [lastAvailableAt]);

  return (
    <Badge variant="secondary" className="gap-1 text-tiny h-5 px-1.5 font-black uppercase tracking-tighter bg-secondary border shadow-sm">
      {mins}min
    </Badge>
  );
}

export default function HomePage() {
  const { 
    courts, players, matches, deleteCourt, startMatch, 
    endMatch, assignMatchToCourt, addCourt, deleteMatch,
    role, activeSession, isSessionActive
  } = useClub();
  
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [sortOption, setSortOption] = useState<string>('default');

  useEffect(() => {
    setMounted(true);
  }, []);

  const sortedAvailablePlayers = useMemo(() => {
    return players
      .filter(p => p.status === 'available')
      .sort((a, b) => {
        let result = 0;
        switch (sortOption) {
          case 'skill-asc': result = a.skillLevel - b.skillLevel; break;
          case 'skill-desc': result = b.skillLevel - a.skillLevel; break;
          case 'name-asc': result = a.name.localeCompare(b.name); break;
          case 'name-desc': result = b.name.localeCompare(a.name); break;
        }
        return result || (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0);
      });
  }, [players, sortOption]);
  
  const waitingMatches = useMemo(() => {
    return matches.filter(m => !m.isCompleted && !m.courtId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [matches]);

  if (!mounted) return null;

  const isAdmin = role === 'admin';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background overflow-hidden">
      {!isSessionActive && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md border-2 border-primary/20 shadow-2xl">
            <CardHeader className="text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-primary mb-2" />
              <CardTitle className="text-xl font-black uppercase">No Active Session</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm font-bold opacity-60">
              Please join or create a session to access the command center.
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12">
        
        {/* THE BENCH */}
        <div className="md:col-span-3 border-r flex flex-col bg-secondary/5 min-h-0">
          <div className="p-3 bg-card border-b flex items-center justify-between sticky top-0 z-10 gap-2 h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
              <User className="h-4 w-4 text-primary" /> The Bench
            </h2>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-7 text-[9px] font-black uppercase tracking-widest border-2 w-[100px] bg-background px-2">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default" className="text-[9px] font-bold uppercase">Default</SelectItem>
                  <SelectItem value="skill-asc" className="text-[9px] font-bold uppercase">Skill ↑</SelectItem>
                  <SelectItem value="skill-desc" className="text-[9px] font-bold uppercase">Skill ↓</SelectItem>
                  <SelectItem value="name-asc" className="text-[9px] font-bold uppercase">A-Z</SelectItem>
                  <SelectItem value="name-desc" className="text-[9px] font-bold uppercase">Z-A</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="font-black h-7 px-2 text-tiny shrink-0">{sortedAvailablePlayers.length}</Badge>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 grid grid-cols-2 gap-2 pb-24">
              {sortedAvailablePlayers.map((player) => (
                <Card 
                  key={player.id} 
                  className="p-3 border-2 shadow-sm group bg-card min-w-0"
                >
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="font-black text-compact truncate flex-1 leading-tight">{player.name}</span>
                    <WaitTimeBadge lastAvailableAt={player.lastAvailableAt} />
                  </div>
                  <div className="flex justify-between items-center opacity-80 gap-1">
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-4 px-1.5 truncate", getSkillColor(player.skillLevel))}>
                      {SKILL_LEVELS_SHORT[player.skillLevel]}
                    </Badge>
                  </div>
                </Card>
              ))}
              {sortedAvailablePlayers.length === 0 && (
                <div className="col-span-2 py-20 text-center text-muted-foreground font-bold italic opacity-20 text-compact">Bench Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* MATCH QUEUE */}
        <div className="md:col-span-3 border-r flex flex-col bg-background transition-all min-h-0">
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-orange-500" /> Queue
            </h2>
            <Badge variant="secondary" className="font-black h-6 px-2.5 text-compact bg-orange-500 text-white border-none">{waitingMatches.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3 pb-24">
              {waitingMatches.map((match, index) => (
                <Card 
                  key={match.id} 
                  className="border-2 border-orange-500/30 bg-orange-500/5 shadow-sm overflow-hidden group relative"
                >
                  <div className="absolute top-1 left-1 z-10">
                    <Badge variant="secondary" className="bg-orange-500 text-white text-[9px] h-4 px-1 font-black">
                       #{index + 1}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-white z-10"
                      onClick={() => deleteMatch(match.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <div className="p-3 pt-6 flex items-center justify-between gap-2">
                    <div className="flex flex-col space-y-1.5 flex-1 min-w-0 border-l-4 border-orange-500/20 pl-2">
                      <span className="text-[8px] font-black uppercase text-orange-500 opacity-50">T1</span>
                      {match.teamA.map(id => {
                        const p = players.find(player => player.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                            {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[9px] font-black opacity-30 px-1 shrink-0">VS</div>
                    <div className="flex flex-col space-y-1.5 flex-1 min-w-0 items-end text-right border-r-4 border-orange-500/20 pr-2">
                      <span className="text-[8px] font-black uppercase text-orange-500 opacity-50">T2</span>
                      {match.teamB.map(id => {
                        const p = players.find(player => player.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5 min-w-0 justify-end">
                            {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                            <span className="text-[11px] font-black truncate leading-tight flex-1">{p?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ))}
              {waitingMatches.length === 0 && (
                <div className="py-20 text-center text-muted-foreground font-bold italic opacity-20 text-compact">Queue Empty</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ACTIVE COURTS */}
        <div className="md:col-span-6 flex flex-col bg-secondary/5 min-h-0">
          <div className="p-3 bg-card border-b flex items-center justify-between h-14">
            <h2 className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-green-600" /> Active Courts
            </h2>
            <Badge variant="outline" className="font-black h-6 px-2.5 text-compact">{courts.filter(c => c.status === 'occupied').length}/{courts.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-24">
              {courts.map(court => {
                const match = matches.find(m => m.id === court.currentMatchId && !m.isCompleted);
                const teamAScore = match?.teamAScore || 0;
                const teamBScore = match?.teamBScore || 0;
                
                return (
                  <Card 
                    key={court.id} 
                    className={cn(
                      "border-2 transition-all duration-200 overflow-hidden flex flex-col min-h-[380px]",
                      court.status === 'occupied' ? "bg-card border-primary/20" : "bg-muted/10 border-border"
                    )}
                  >
                    <div className={cn("p-2 px-3 flex justify-between items-center border-b", court.status === 'occupied' ? "bg-primary/5" : "bg-muted/20")}>
                      <span className="text-compact font-black uppercase truncate max-w-[120px]">{court.name}</span>
                      <Badge variant={court.status === 'available' ? 'outline' : 'default'} className="text-[9px] font-black uppercase px-2 h-5 shrink-0">
                        {court.status}
                      </Badge>
                    </div>
                    <CardContent className="p-3 flex-1 flex flex-col space-y-3 min-h-0">
                      {court.status === 'occupied' && match ? (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <LiveTimer startTime={match.startTime || match.timestamp} />
                          </div>
                          <div className="grid grid-cols-1 gap-2 flex-1">
                            <div className={cn("p-3 rounded-lg border-l-4 space-y-1.5 transition-colors relative", teamAScore > teamBScore ? "border-primary bg-primary/5" : "border-muted-foreground/10 bg-muted/10")}>
                              <span className="text-[8px] font-black uppercase text-primary opacity-50">Team 1 (T1)</span>
                              {match.teamA.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                      {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className={cn("p-3 rounded-lg border-l-4 space-y-1.5 transition-colors relative", teamBScore > teamAScore ? "border-primary bg-primary/5" : "border-muted-foreground/10 bg-muted/10")}>
                              <span className="text-[8px] font-black uppercase text-primary opacity-50">Team 2 (T2)</span>
                              {match.teamB.map(id => {
                                const p = players.find(player => player.id === id);
                                return (
                                  <div key={id} className="flex justify-between items-center gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span className="text-compact font-black truncate flex-1 leading-tight">{p?.name}</span>
                                      {p && <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 shrink-0", getSkillColor(p.skillLevel))}>{SKILL_LEVELS_SHORT[p.skillLevel]}</Badge>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-8">
                          <Zap className="h-10 w-10 mb-2" />
                          <p className="text-tiny font-black uppercase text-center tracking-widest">Available</p>
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="p-2.5 border-t mt-auto gap-2">
                      {isAdmin && (
                        <div className="flex w-full justify-between items-center px-1 h-10">
                          <p className="text-[9px] font-black uppercase opacity-40 truncate">Admin Tools Active</p>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white shrink-0" onClick={() => deleteCourt(court.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {!isAdmin && (
                         <p className="text-[8px] font-bold uppercase opacity-30 text-center w-full">View Only</p>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
