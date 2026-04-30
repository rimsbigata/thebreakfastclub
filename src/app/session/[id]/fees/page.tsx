"use client";

import { useMemo, useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Banknote, QrCode, UserCheck, Calculator, CreditCard, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function FeesPage() {
  const { players, fees, paymentMethods, updateFee, togglePayment, role, currentPlayer } = useClub();
  const [today, setToday] = useState<string>('');

  const [shuttleFee, setShuttleFee] = useState(0);
  const [courtFee, setCourtFee] = useState(0);
  const [entranceFee, setEntranceFee] = useState(0);
  const [includeEntranceFee, setIncludeEntranceFee] = useState(true);

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]);
  }, []);

  const currentFee = useMemo(() => fees?.find(f => f.id === today), [fees, today]);

  // Sync admin inputs if fee already exists
  useEffect(() => {
    if (currentFee && role === 'admin') {
      setShuttleFee(currentFee.shuttleFee || 0);
      setCourtFee(currentFee.courtFee || 0);
      setEntranceFee(currentFee.entranceFee || 0);
      setIncludeEntranceFee(!!currentFee.entranceFee);
    }
  }, [currentFee, role]);

  const isAdmin = role === 'admin';
  const isQueueMaster = role === 'queueMaster';
  const isStaff = isAdmin || isQueueMaster;
  const isPlayer = role === 'player';

  const perPlayerFee = useMemo(() => {
    if (isAdmin) {
      const total = shuttleFee + courtFee + (includeEntranceFee ? entranceFee : 0);
      return (total / (players.length || 1)).toFixed(2);
    } else {
      if (!currentFee) return "0.00";
      const total = (currentFee.shuttleFee || 0) + (currentFee.courtFee || 0) + (currentFee.entranceFee || 0);
      return (total / (players.length || 1)).toFixed(2);
    }
  }, [shuttleFee, courtFee, entranceFee, includeEntranceFee, players.length, currentFee, isAdmin]);

  const sortedPlayers = useMemo(() => {
    // For players, only show their own entry
    if (isPlayer && currentPlayer) {
      const player = players.find(p => p.id === currentPlayer.id);
      return player ? [player] : [];
    }

    // For staff, show all players
    return [...players].sort((a, b) => {
      const aPaid = !!currentFee?.payments?.[a.id];
      const bPaid = !!currentFee?.payments?.[b.id];
      return aPaid === bPaid ? 0 : aPaid ? 1 : -1;
    });
  }, [players, currentFee, isPlayer, currentPlayer]);

  const myPaymentStatus = useMemo(() => {
    if (!currentPlayer || !currentFee) return false;
    return !!currentFee.payments?.[currentPlayer.id];
  }, [currentPlayer, currentFee]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 max-w-5xl animate-in fade-in duration-700">
      <header className="space-y-1">
        <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Banknote className="h-8 w-8 text-green-600" /> Club Fees
        </h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">Daily finance & payment tracking</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CALCULATOR OR SUMMARY CARD */}
        <Card className="lg:col-span-5 border-2 shadow-lg bg-card overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              {isAdmin ? <Calculator className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
              {isAdmin ? "Daily Split Calculator" : "My Balance"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {isAdmin ? (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Shuttle Fee</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                    <input
                      type="number"
                      className="flex h-12 w-full rounded-md border-2 border-input bg-background pl-8 pr-3 py-2 text-lg font-black ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={shuttleFee}
                      onChange={e => setShuttleFee(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Court Rental</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                    <input
                      type="number"
                      className="flex h-12 w-full rounded-md border-2 border-input bg-background pl-8 pr-3 py-2 text-lg font-black ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={courtFee}
                      onChange={e => setCourtFee(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 p-4 rounded-xl bg-secondary/50 border-2 border-dashed">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Entry Fee</Label>
                    <Switch checked={includeEntranceFee} onCheckedChange={setIncludeEntranceFee} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                    <input
                      type="number"
                      disabled={!includeEntranceFee}
                      className="flex h-12 w-full rounded-md border-2 border-input bg-background pl-8 pr-3 py-2 text-lg font-black disabled:opacity-30 ring-offset-background"
                      value={entranceFee}
                      onChange={e => setEntranceFee(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-secondary/30 border-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Session Date</p>
                  <p className="font-black text-sm">{today}</p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Your Status</p>
                    <p className={cn("font-black text-sm", myPaymentStatus ? "text-green-600" : "text-red-500")}>
                      {myPaymentStatus ? "SETTLED" : "PAYMENT PENDING"}
                    </p>
                  </div>
                  <div className={cn("h-4 w-4 rounded-full", myPaymentStatus ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
                </div>

                {!currentFee && (
                  <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-xl text-center">
                    <p className="text-[10px] font-black uppercase text-yellow-600">Admin hasn't finalized fees yet</p>
                  </div>
                )}
              </div>
            )}

            <div className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 flex justify-between items-center transform hover:scale-[1.02] transition-transform">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Per Player Cost</p>
                <h2 className="text-4xl font-black">₱{perPlayerFee}</h2>
              </div>
              <Banknote className="h-10 w-10 opacity-30" />
            </div>
          </CardContent>
          <CardFooter>
            {isAdmin && (
              <Button
                className="w-full h-12 font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
                onClick={() => updateFee({ id: today, shuttleFee, courtFee, entranceFee: includeEntranceFee ? entranceFee : 0 })}
              >
                Apply to Today's Board
              </Button>
            )}
            {!isAdmin && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full h-12 font-black uppercase tracking-widest shadow-lg bg-green-600 hover:bg-green-700">
                    <QrCode className="mr-2 h-4 w-4" /> View Payment QR
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="text-center font-black uppercase">Scan to Pay ₱{perPlayerFee}</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map(method => (
                        <Card key={method.id} className="overflow-hidden border-2">
                          <div className="bg-primary text-primary-foreground p-2 text-center text-[10px] font-black uppercase tracking-widest">{method.name}</div>
                          <div className="relative h-64 bg-white"><Image src={method.imageUrl} alt={method.name} fill className="object-contain p-4" /></div>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground italic text-sm">No QR codes added by admin.</div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardFooter>
        </Card>

        {/* ROSTER SECTION - Hidden for players */}
        {isStaff && (
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                {isAdmin ? <UserCheck className="h-6 w-6 text-green-600" /> : <ShieldCheck className="h-6 w-6 text-primary" />}
                {isAdmin ? "Payment Roster" : "Club Roster Status"}
              </h2>
              {isAdmin && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 font-black uppercase text-[10px] border-2">
                      <QrCode className="h-4 w-4" /> Manage QRs
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>QR Methods</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                      {paymentMethods.map(method => (
                        <Card key={method.id} className="overflow-hidden border-2">
                          <div className="bg-primary text-primary-foreground p-1 text-center text-[10px] font-black uppercase">{method.name}</div>
                          <div className="relative h-64 bg-white"><Image src={method.imageUrl} alt={method.name} fill className="object-contain p-4" /></div>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <ScrollArea className="h-[600px] rounded-2xl border-2 bg-card p-4">
              <div className="space-y-2">
                {sortedPlayers.map(player => {
                  const isPaid = !!currentFee?.payments?.[player.id];
                  const isMe = player.id === currentPlayer?.id;

                  return (
                    <div key={player.id} className={cn(
                      "flex items-center justify-between p-4 border-2 rounded-xl transition-all",
                      isPaid ? "bg-green-500/5 border-green-500/20 opacity-60" : "bg-card border-border hover:border-primary/30",
                      isMe && "ring-2 ring-primary ring-offset-2"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full", isPaid ? "bg-green-500" : "bg-red-500")} />
                        <div className="flex flex-col">
                          <span className={cn("font-black text-sm", isPaid && "line-through text-muted-foreground")}>
                            {player.name} {isMe && <span className="text-[10px] text-primary ml-1">(YOU)</span>}
                          </span>
                          {isPaid && <p className="text-[8px] font-black uppercase text-green-600 mt-0.5">Payment Verified</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn("text-[10px] font-black uppercase tracking-tighter", isPaid ? "text-green-600" : "text-red-500")}>
                          {isPaid ? 'Settled' : 'Pending'}
                        </span>
                        {isAdmin && (
                          <Checkbox checked={isPaid} onCheckedChange={() => togglePayment(today, player.id)} className="h-5 w-5 border-2" />
                        )}
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
        )}
      </div>
    </div>
  );
}
