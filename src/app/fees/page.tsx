
"use client";

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Player, Fee } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Banknote, QrCode, UserCheck, Calculator, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

export default function FeesPage() {
  const db = useFirestore();
  const today = new Date().toISOString().split('T')[0];
  
  const [shuttleFee, setShuttleFee] = useState(0);
  const [courtFee, setCourtFee] = useState(0);
  const [entranceFee, setEntranceFee] = useState(0);

  const playersRef = useMemoFirebase(() => collection(db, 'players'), [db]);
  const feeDocRef = useMemoFirebase(() => doc(db, 'fees', today), [db, today]);

  const { data: players } = useCollection<Player>(playersRef);
  const { data: feeData } = useCollection<Fee>(useMemoFirebase(() => collection(db, 'fees'), [db]));

  const currentFee = feeData?.find(f => f.id === today);

  const perPlayerFee = useMemo(() => {
    const total = shuttleFee + courtFee + entranceFee;
    const count = players?.length || 1;
    return (total / count).toFixed(2);
  }, [shuttleFee, courtFee, entranceFee, players]);

  const handleUpdateFee = () => {
    setDoc(feeDocRef, {
      id: today,
      shuttleFee,
      courtFee,
      entranceFee,
      payments: currentFee?.payments || {},
      qrCodeUrl: '/payments/qr-sample.png' // Default placeholder
    }, { merge: true });
  };

  const togglePayment = (playerId: string, currentStatus: boolean) => {
    const newPayments = { ...(currentFee?.payments || {}), [playerId]: !currentStatus };
    updateDocumentNonBlocking(feeDocRef, { payments: newPayments });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6 text-green-600" /> Fees
        </h1>
        <p className="text-sm text-muted-foreground">Daily financial tracking and payments.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" /> Calculate Daily Split
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Shuttle</Label>
              <Input type="number" value={shuttleFee} onChange={e => setShuttleFee(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Court</Label>
              <Input type="number" value={courtFee} onChange={e => setCourtFee(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Entry</Label>
              <Input type="number" value={entranceFee} onChange={e => setEntranceFee(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg flex justify-between items-center">
            <span className="font-bold">Total Per Player:</span>
            <span className="text-2xl font-black text-primary">${perPlayerFee}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleUpdateFee}>Apply Daily Fee</Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Payment Status
            </h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <QrCode className="h-4 w-4" /> QR Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Payment QR</DialogTitle></DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="relative h-64 w-64 border-8 border-white shadow-xl rounded-xl overflow-hidden">
                    <Image 
                      src="https://picsum.photos/seed/qr/300/300" 
                      alt="Payment QR" 
                      fill 
                      data-ai-hint="qr code"
                    />
                  </div>
                  <p className="text-center text-sm text-muted-foreground font-medium">Scan to pay ${perPlayerFee}</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {players?.map(player => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm">
                <span className="font-medium">{player.name}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${currentFee?.payments[player.id] ? 'text-green-600' : 'text-red-500'}`}>
                    {currentFee?.payments[player.id] ? 'PAID' : 'PENDING'}
                  </span>
                  <Checkbox 
                    checked={!!currentFee?.payments[player.id]} 
                    onCheckedChange={() => togglePayment(player.id, !!currentFee?.payments[player.id])}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
