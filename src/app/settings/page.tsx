
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, query, getDocs, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const handleResetMatches = async () => {
    try {
      const batch = writeBatch(db);
      
      // Reset players status and games
      const playersSnap = await getDocs(collection(db, 'players'));
      playersSnap.forEach(p => {
        batch.update(p.ref, { status: 'available', gamesPlayed: 0 });
      });

      // Clear matches
      const matchesSnap = await getDocs(collection(db, 'matches'));
      matchesSnap.forEach(m => batch.delete(m.ref));

      // Reset courts
      const courtsSnap = await getDocs(collection(db, 'courts'));
      courtsSnap.forEach(c => batch.update(c.ref, { status: 'available', currentMatchId: null }));

      await batch.commit();
      toast({ title: "Daily Reset Complete", description: "Matches cleared and games reset to zero." });
    } catch (e) {
      toast({ title: "Reset Failed", variant: "destructive" });
    }
  };

  const handleWipeData = async () => {
    // Highly destructive: in real use case would need multiple confirmations
    if (!confirm("Are you SURE? This will delete ALL data in the club.")) return;
    
    try {
      const batch = writeBatch(db);
      const collections = ['players', 'courts', 'matches', 'fees'];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, colName));
        snap.forEach(d => batch.delete(d.ref));
      }
      await batch.commit();
      toast({ title: "Factory Reset Complete", description: "All data purged." });
    } catch (e) {
      toast({ title: "Wipe Failed", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Maintenance</CardTitle>
            <CardDescription>Reset game counts and clear the board for a new day.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleResetMatches} variant="outline" className="w-full gap-2 border-primary text-primary hover:bg-primary hover:text-white">
              <RefreshCcw className="h-4 w-4" /> Reset Daily Board
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </CardTitle>
            <CardDescription>Actions here cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleWipeData} variant="destructive" className="w-full gap-2">
              <Trash2 className="h-4 w-4" /> Reset All Club Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
