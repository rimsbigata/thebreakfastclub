
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Banknote, QrCode, UserCheck, Calculator, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function FeesPage() {
  const { players, fees, paymentMethods, updateFee, togglePayment } = useClub();
  const [today, setToday] = useState<string>('');
  
  const [shuttleFee, setShuttleFee] = useState(0);
  const [courtFee, setCourtFee] = useState(0);
  const [entranceFee, setEntranceFee] = useState(0);
  const [includeEntranceFee, setIncludeEntranceFee] = useState(true);

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]);
  }, []);

  const currentFee = useMemo(() => fees.find(f => f.id === today), [fees, today]);

  const perPlayerFee = useMemo(() => {
    const total = shuttleFee + courtFee + (includeEntranceFee ? entranceFee : 0);
    return (total / (players.length || 1)).toFixed(2);
  }, [shuttleFee, courtFee, entranceFee, includeEntranceFee, players.length]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aPaid = !!currentFee?.payments?.[a.id];
      const bPaid = !!currentFee?.payments?.[b.id];
      return aPaid === bPaid ? 0 : aPaid ? 1 : -1;
    });
  }, [players, currentFee]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 max-w-5xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Banknote className="h-8 w-8 text-green-600" /> Club Fees
        </h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Daily finance & payment tracking</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 border-2 shadow-lg bg-card overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Daily Split Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Shuttle Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                  <Input type="number" className="pl-8 font-black text-lg h-12" value={shuttleFee} onChange={e => setShuttleFee(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Court Rental</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                  <Input type="number" className="pl-8 font-black text-lg h-12" value={courtFee} onChange={e => setCourtFee(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5 p-4 rounded-xl bg-secondary/50 border-2 border-dashed">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Entry Fee</Label>
                  <Switch checked={includeEntranceFee} onCheckedChange={setIncludeEntranceFee} />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                  <Input type="number" disabled={!includeEntranceFee} className="pl-8 font-black text-lg h-12 disabled:opacity-30" value={entranceFee} onChange={e => setEntranceFee(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 flex justify-between items-center transform hover:scale-[1.02] transition-transform">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Per Player Cost</p>
                <h2 className="text-4xl font-black">₱{perPlayerFee}</h2>
              </div>
              <Banknote className="h-10 w-10 opacity-30" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full h-12 font-black uppercase tracking-widest" onClick={() => updateFee({ id: today, shuttleFee, courtFee, entranceFee: includeEntranceFee ? entranceFee : 0 })}>
              Apply to Today's Board
            </Button>
          </CardFooter>
        </Card>

        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-green-600" /> Payment Roster
            </h2>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 font-black uppercase text-[10px] border-2">
                    <QrCode className="h-4 w-4" /> QR Methods
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Scan to Pay</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                    {paymentMethods.map(method => (
                      <Card key={method.id} className="overflow-hidden border-2">
                        <div className="bg-primary text-primary-foreground p-1 text-center text-[10px] font-black uppercase">{method.name}</div>
                        <div className="relative h-64 bg-white"><Image src={method.imageUrl} alt={method.name} fill className="object-contain p-4" /></div>
                        <div className="p-3 bg-secondary text-center text-sm font-black uppercase">Pay ₱{perPlayerFee}</div>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <ScrollArea className="h-[600px] rounded-2xl border-2 bg-card p-4">
            <div className="space-y-2">
              {sortedPlayers.map(player => {
                const isPaid = !!currentFee?.payments?.[player.id];
                return (
                  <div key={player.id} className={cn(
                    "flex items-center justify-between p-4 border-2 rounded-xl transition-all",
                    isPaid ? "bg-green-500/5 border-green-500/20 opacity-60" : "bg-card border-border hover:border-primary/30"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("h-3 w-3 rounded-full", isPaid ? "bg-green-500" : "bg-red-500")} />
                      <span className={cn("font-black text-sm", isPaid && "line-through text-muted-foreground")}>{player.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-[10px] font-black uppercase tracking-tighter", isPaid ? "text-green-600" : "text-red-500")}>
                        {isPaid ? 'Settled' : 'Pending'}
                      </span>
                      <Checkbox checked={isPaid} onCheckedChange={() => togglePayment(today, player.id)} className="h-5 w-5 border-2" />
                    </div>
                  </div>
                );
              })}
              {players.length === 0 && (
                <div className="py-20 text-center text-muted-foreground font-black uppercase text-xs opacity-20">No Players Found</div>
              )}
            </div>
          </ScrollArea>
        </section>
      </div>
    </div>
  );
}
