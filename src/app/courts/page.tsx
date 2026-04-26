
"use client";

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Court, Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Sparkles, Loader2, ArrowLeftRight } from 'lucide-react';
import { generateMatch } from '@/ai/flows/ai-match-suggestions-flow';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';

export default function CourtsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');

  const courtsRef = useMemoFirebase(() => collection(db, 'courts'), [db]);
  const playersRef = useMemoFirebase(() => collection(db, 'players'), [db]);
  
  const { data: courts } = useCollection<Court>(courtsRef);
  const { data: players } = useCollection<Player>(playersRef);

  const handleAddCourt = () => {
    if (!newCourtName) return;
    const courtId = Math.random().toString(36).substring(7);
    addDocumentNonBlocking(courtsRef, {
      id: courtId,
      name: newCourtName,
      status: 'available',
    });
    setNewCourtName('');
  };

  const handleGenerateMatch = async () => {
    const availablePlayers = players?.filter(p => p.status === 'available') || [];
    const availableCourts = courts?.filter(c => c.status === 'available') || [];

    if (availablePlayers.length < 4) {
      toast({ title: "Not enough players", description: "Need at least 4 available players for a doubles match.", variant: "destructive" });
      return;
    }
    if (availableCourts.length === 0) {
      toast({ title: "No courts", description: "All courts are currently occupied.", variant: "destructive" });
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
        toast({ title: "Match Suggested!", description: `Team A vs Team B on ${result.courtName}.` });
        // In a real app, we would auto-assign or show a confirm dialog
      } else {
        toast({ title: "No optimal match", description: "AI couldn't find a perfectly balanced match with current history rules." });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMatch(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courts</h1>
        <div className="flex gap-2">
          <Button onClick={handleGenerateMatch} disabled={loadingMatch} className="gap-2 bg-primary">
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
                  <Label>Court Name</Label>
                  <Input placeholder="e.g. Court A" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleAddCourt}>Create Court</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courts?.map(court => (
          <Card key={court.id} className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-bold">{court.name}</CardTitle>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${court.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-primary/20 text-primary'}`}>
                {court.status}
              </span>
            </CardHeader>
            <CardContent>
              {court.status === 'occupied' ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Currently Playing:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-secondary/30 rounded">Team A: ...</div>
                    <div className="p-2 bg-secondary/30 rounded">Team B: ...</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Ready for match</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
               <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" /> Swap
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
