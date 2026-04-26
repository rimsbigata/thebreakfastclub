
"use client";

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, writeBatch, getDocs, doc } from 'firebase/firestore';
import { PaymentMethod } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCcw, Trash2, AlertTriangle, QrCode, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

export default function SettingsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodUrl, setNewMethodUrl] = useState('');

  const paymentMethodsRef = useMemoFirebase(() => collection(db, 'paymentMethods'), [db]);
  const { data: paymentMethods } = useCollection<PaymentMethod>(paymentMethodsRef);

  const handleResetMatches = async () => {
    try {
      const batch = writeBatch(db);
      const playersSnap = await getDocs(collection(db, 'players'));
      playersSnap.forEach(p => {
        batch.update(p.ref, { status: 'available', gamesPlayed: 0 });
      });
      const matchesSnap = await getDocs(collection(db, 'matches'));
      matchesSnap.forEach(m => batch.delete(m.ref));
      const courtsSnap = await getDocs(collection(db, 'courts'));
      courtsSnap.forEach(c => batch.update(c.ref, { status: 'available', currentMatchId: null }));
      await batch.commit();
      toast({ title: "Daily Reset Complete", description: "Matches cleared and games reset to zero." });
    } catch (e) {
      toast({ title: "Reset Failed", variant: "destructive" });
    }
  };

  const handleWipeData = async () => {
    if (!confirm("Are you SURE? This will delete ALL data in the club.")) return;
    try {
      const batch = writeBatch(db);
      const collections = ['players', 'courts', 'matches', 'fees', 'paymentMethods'];
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

  const handleAddPaymentMethod = () => {
    if (!newMethodName || !newMethodUrl) {
      toast({ title: "Missing details", description: "Please provide both name and URL.", variant: "destructive" });
      return;
    }
    const id = Math.random().toString(36).substring(7);
    addDocumentNonBlocking(paymentMethodsRef, {
      id,
      name: newMethodName,
      imageUrl: newMethodUrl
    });
    setNewMethodName('');
    setNewMethodUrl('');
    toast({ title: "QR Added", description: `${newMethodName} payment method created.` });
  };

  const handleDeleteMethod = (id: string) => {
    const methodRef = doc(db, 'paymentMethods', id);
    deleteDocumentNonBlocking(methodRef);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 pb-24">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Payment QR Codes
            </CardTitle>
            <CardDescription>Manage QR codes for player payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Name (e.g. GCash, Maya)</Label>
                <Input placeholder="e.g. GCash" value={newMethodName} onChange={e => setNewMethodName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>QR Image URL</Label>
                <Input placeholder="https://..." value={newMethodUrl} onChange={e => setNewMethodUrl(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddPaymentMethod} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Add Payment Method
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {paymentMethods?.map(method => (
                <div key={method.id} className="relative group border rounded-lg p-4 bg-secondary/10 flex flex-col items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteMethod(method.id)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                  <div className="relative h-32 w-32 border bg-white rounded-md overflow-hidden">
                    <Image src={method.imageUrl} alt={method.name} fill className="object-contain" data-ai-hint="payment qr" />
                  </div>
                  <span className="font-bold text-sm">{method.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
