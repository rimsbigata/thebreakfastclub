
"use client";

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Court, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Sparkles, Loader2, ArrowLeftRight, Users2, Trophy, Trash2 } from 'lucide-react';
import { generateMatch } from '@/ai/flows/ai-match-suggestions-flow';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  const courtsRef = useMemoFirebase(() => collection(db, 'courts'), [db]);
  const playersRef = useMemoFirebase(() => collection(db, 'players'), [db]);
  const matchesRef = useMemoFirebase(() => collection(db, 'matches'), [db]);
  
  const { data: courts } = useCollection<Court>(courtsRef);
  const { data: players } = useCollection<Player>(playersRef);

  const handleAddCourt = () => {
    if (!newCourtName) return;
    const courtId = Math.random().toString(36).substring(7);
    const courtRef = doc(db, 'courts', courtId);
    
    // Using setDocumentNonBlocking to sync document ID with the 'id' field
    // This ensures consistency and satisfies security rules
    setDocumentNonBlocking(courtRef, {
      id: courtId,
      name: `Court ${newCourtName}`,
      status: 'available',
    }, { merge: true });
    
    setNewCourtName('');
  };

  const handleDeleteCourt = (docId: string) => {
    if (typeof window !== 'undefined' && !window.confirm("Are you sure you want to delete this court?")) return;
    
    // Explicitly targeting the document by ID for deletion
    const courtRef = doc(db, 'courts', docId);
    deleteDocumentNonBlocking(courtRef);
    
    toast({ title: "Court Deleted" });
  };

  const handleGenerateMatch = async () => {
    const availablePlayers = players?.filter(p => p.status === 'available') || [];
    const availableCourts = courts?.filter(c => c.status === 'available') || [];

    if (availablePlayers.length < 4) {
      toast({ title: "Not enough players", description: "Need at least 4 available players.", variant: "destructive" });
      return;
    }
    if (availableCourts.length === 0) {
      toast({ title: "No courts", description: "All courts are occupied or none exist.", variant: "destructive" });
      return;
    }

    setLoadingMatch(true);
    try {
      const result = await generateMatch({
        availablePlayers: availablePlayers.map(p => ({
          id: p.id,
          name: p.name,
          skillLevel: p.skillLevel,
          gamesPlayed: p.gamesPlayed,
          partnerHistory: p.partnerHistory,
        })),
        availableCourts: availableCourts.map(c => ({ id: c.id, name: c.name })),
      });

      if (result.matchFound && result.courtId) {
        const matchId = Math.random().toString(36).substring(7);
        const matchData = {
          id: matchId,
          teamA: result.teamA,
          teamB: result.teamB,
          courtId: result.courtId,
          timestamp: new Date().toISOString(),
          isCompleted: false,
        };
        
        const matchRef = doc(db, 'matches', matchId);
        setDocumentNonBlocking(matchRef, matchData, { merge: true });

        const courtDocRef = doc(db, 'courts', result.courtId);
        updateDocumentNonBlocking(courtDocRef, { status: 'occupied', currentMatchId: matchId });

        [...result.teamA, ...result.teamB].forEach(pid => {
          const pRef = doc(db, 'players', pid);
          const currentPlayer = players?.find(p => p.id === pid);
          updateDocumentNonBlocking(pRef, { 
            status: 'playing', 
            gamesPlayed: (currentPlayer?.gamesPlayed || 0) + 1 
          });
        });

        toast({ title: "Match Started!", description: `Assigned to ${result.courtName}.` });
      } else {
        toast({ title: "No optimal match", description: "AI couldn't find a balance with current rules." });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "AI Error", description: "Failed to generate match logic.", variant: "destructive" });
    } finally {
      setLoadingMatch(false);
    }
  };

  const handleCompleteMatch = (court: Court) => {
    if (!court.currentMatchId) return;
    const courtRef = doc(db, 'courts', court.id);
    const matchRef = doc(db, 'matches', court.currentMatchId);

    updateDocumentNonBlocking(matchRef, { isCompleted: true });
    updateDocumentNonBlocking(courtRef, { status: 'available', currentMatchId: null });

    players?.filter(p => p.status === 'playing').forEach(p => {
       updateDocumentNonBlocking(doc(db, 'players', p.id), { status: 'available' });
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courts</h1>
          <p className="text-sm text-muted-foreground">Manage real-time play and AI matching.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleGenerateMatch} 
            disabled={loadingMatch || !courts?.length || !players?.length} 
            className="gap-2 bg-primary"
          >
            {loadingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Match
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Court</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Court Identifier</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground bg-secondary px-3 py-2 rounded-md">Court</span>
                    <Input 
                      placeholder="e.g. 1, A, or Blue" 
                      value={newCourtName} 
                      onChange={e => setNewCourtName(e.target.value)} 
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleAddCourt}>Create Court</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!courts?.length ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-card/50">
          <Trophy className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-bold text-muted-foreground">No courts registered</p>
          <p className="text-sm text-muted-foreground mb-6">Click the + button to add your first court.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courts?.map(court => (
            <Card key={court.id} className="border-2 shadow-sm relative group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold">{court.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourt(court.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 transition-colors" />
                  </Button>
                  <Badge variant={court.status === 'available' ? 'outline' : 'default'} className={court.status === 'available' ? 'text-green-600 border-green-200' : 'bg-primary'}>
                    {court.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {court.status === 'occupied' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <Users2 className="h-3 w-3" /> Live Match
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-secondary/30 rounded-lg border border-dashed border-primary/20">
                        <p className="text-[10px] font-black uppercase text-primary/60 mb-1">Team A</p>
                        <div className="text-xs font-bold">In Play</div>
                      </div>
                      <div className="p-3 bg-secondary/30 rounded-lg border border-dashed border-primary/20">
                        <p className="text-[10px] font-black uppercase text-primary/60 mb-1">Team B</p>
                        <div className="text-xs font-bold">In Play</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-secondary/10">
                     <Trophy className="h-6 w-6 text-muted-foreground/30 mb-2" />
                     <p className="text-sm text-muted-foreground italic">Ready for next match</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between gap-2 border-t pt-4">
                 {court.status === 'occupied' ? (
                   <>
                    <Button variant="outline" size="sm" onClick={() => handleCompleteMatch(court)} className="flex-1">End Match</Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsSwapOpen(true)} className="gap-2">
                      <ArrowLeftRight className="h-4 w-4" /> Swap
                    </Button>
                   </>
                 ) : (
                   <p className="text-xs text-muted-foreground">Available for assignment</p>
                 )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isSwapOpen} onOpenChange={setIsSwapOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Swap Player</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <Label>Select replacement from available players:</Label>
            {players?.filter(p => p.status === 'available').map(player => (
              <Button key={player.id} variant="outline" className="w-full justify-between" onClick={() => setIsSwapOpen(false)}>
                {player.name} <Badge>Lvl {player.skillLevel}</Badge>
              </Button>
            ))}
            {players?.filter(p => p.status === 'available').length === 0 && (
              <p className="text-center text-sm text-muted-foreground italic">No players available to swap.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
