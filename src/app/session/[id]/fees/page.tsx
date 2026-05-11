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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function FeesPage() {
  const { players, fees, paymentMethods, updateFee, togglePayment, role, currentPlayer } = useClub();
  const [today, setToday] = useState<string>('');

  // Shuttle inputs
  const [shuttleUnits, setShuttleUnits] = useState(0);
  const [shuttlePricePerPiece, setShuttlePricePerPiece] = useState(0);

  // Court inputs
  const [courts, setCourts] = useState<Array<{ id: string; name: string; feePerHour: number; hoursRented: number }>>([
    { id: '1', name: 'Court 1', feePerHour: 0, hoursRented: 0 }
  ]);

  // Entrance fee
  const [entranceFee, setEntranceFee] = useState(0);
  const [includeEntranceFee, setIncludeEntranceFee] = useState(true);

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]);
  }, []);

  const currentFee = useMemo(() => fees?.find(f => f.id === today), [fees, today]);

  // Sync admin inputs if fee already exists
  useEffect(() => {
    if (currentFee && role === 'admin') {
      setShuttleUnits(currentFee.shuttleUnits || 0);
      setShuttlePricePerPiece(currentFee.shuttlePricePerPiece || 0);
      if (currentFee.courts) {
        setCourts(currentFee.courts);
      }
      setEntranceFee(currentFee.entranceFee || 0);
      setIncludeEntranceFee(!!currentFee.entranceFee);
    }
  }, [currentFee, role]);

  const isAdmin = role === 'admin';
  const isQueueMaster = role === 'queueMaster';
  const isStaff = isAdmin || isQueueMaster;
  const isPlayer = role === 'player';

  // Calculate shuttle subtotal
  const shuttleSubtotal = useMemo(() => {
    return shuttleUnits * shuttlePricePerPiece;
  }, [shuttleUnits, shuttlePricePerPiece]);

  // Calculate court subtotal
  const courtSubtotal = useMemo(() => {
    return courts.reduce((total, court) => total + (court.feePerHour * court.hoursRented), 0);
  }, [courts]);

  // Calculate total per player
  const perPlayerFee = useMemo(() => {
    if (isAdmin) {
      const total = shuttleSubtotal + courtSubtotal + (includeEntranceFee ? entranceFee : 0);
      return (total / (players.length || 1)).toFixed(2);
    } else {
      if (!currentFee) return "0.00";
      const shuttleTotal = (currentFee.shuttleUnits || 0) * (currentFee.shuttlePricePerPiece || 0);
      const courtTotal = (currentFee.courts || []).reduce((total: number, court: any) => total + (court.feePerHour * court.hoursRented), 0);
      const total = shuttleTotal + courtTotal + (currentFee.entranceFee || 0);
      return (total / (players.length || 1)).toFixed(2);
    }
  }, [shuttleSubtotal, courtSubtotal, entranceFee, includeEntranceFee, players.length, currentFee, isAdmin]);

  // Add new court
  const addCourt = () => {
    setCourts([...courts, { id: Date.now().toString(), name: `Court ${courts.length + 1}`, feePerHour: 0, hoursRented: 0 }]);
  };

  // Remove court
  const removeCourt = (courtId: string) => {
    if (courts.length > 1) {
      setCourts(courts.filter(c => c.id !== courtId));
    }
  };

  // Update court
  const updateCourt = (courtId: string, field: 'feePerHour' | 'hoursRented', value: number) => {
    setCourts(courts.map(c => c.id === courtId ? { ...c, [field]: value } : c));
  };

  const sortedPlayers = useMemo(() => {
    // For players, only show their own entry if they have joined with a valid name
    if (isPlayer && currentPlayer) {
      const player = players.find(p => p.id === currentPlayer.id);
      // Only show if player exists and has a valid name (not "Unknown" or empty, case-insensitive)
      if (player && player.name && player.name.toLowerCase() !== 'unknown') {
        return [player];
      }
      return [];
    }

    // For staff, show all players except those with "Unknown" names
    return [...players]
      .filter(p => p.name && p.name.toLowerCase() !== 'unknown')
      .sort((a, b) => {
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
              <div className="grid grid-cols-1 gap-6">
                {/* Shuttle Section */}
                <div className="space-y-4 p-4 rounded-xl border-2 bg-secondary/30">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Shuttle / Tube</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Units</Label>
                      <Input
                        type="number"
                        className="h-12 font-black"
                        value={shuttleUnits}
                        onChange={e => setShuttleUnits(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price / Piece</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                        <Input
                          type="number"
                          className="h-12 font-black pl-8"
                          value={shuttlePricePerPiece}
                          onChange={e => setShuttlePricePerPiece(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg border-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-black">₱{shuttleSubtotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Court Section */}
                <div className="space-y-4 p-4 rounded-xl border-2 bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Court Rental</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addCourt}
                      className="h-8 text-[10px] font-black uppercase border-2"
                    >
                      + Add Court
                    </Button>
                  </div>
                  {courts.map((court, index) => (
                    <div key={court.id} className="space-y-3 p-4 bg-background rounded-lg border-2 relative">
                      {courts.length > 1 && (
                        <button
                          key="remove-btn"
                          onClick={() => removeCourt(court.id)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-600 font-black text-xs"
                        >
                          ✕
                        </button>
                      )}
                      <div key="court-name" className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">{court.name}</div>
                      <div key="fee-inputs" className="grid grid-cols-2 gap-4">
                        <div key="fee-hour" className="space-y-1.5">
                          <Label key="fee-label" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fee / Hour</Label>
                          <div key="fee-input-wrapper" className="relative">
                            <span key="peso-sign" className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-muted-foreground/50">₱</span>
                            <Input
                              key="fee-input"
                              type="number"
                              className="h-12 font-black pl-8"
                              value={court.feePerHour}
                              onChange={e => updateCourt(court.id, 'feePerHour', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div key="hours-input" className="space-y-1.5">
                          <Label key="hours-label" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hours</Label>
                          <Input
                            key="hours-input-field"
                            type="number"
                            className="h-12 font-black"
                            value={court.hoursRented}
                            onChange={e => updateCourt(court.id, 'hoursRented', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div key="court-subtotal" className="flex justify-between items-center p-2 bg-secondary/50 rounded text-xs">
                        <span key="subtotal-label" className="font-black uppercase tracking-widest text-muted-foreground">Court Subtotal</span>
                        <span key="subtotal-value" className="font-black">₱{(court.feePerHour * court.hoursRented).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg border-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Court Total</span>
                    <span className="text-lg font-black">₱{courtSubtotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Entrance Fee Section */}
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
                onClick={() => updateFee({ 
                  id: today, 
                  shuttleUnits, 
                  shuttlePricePerPiece, 
                  courts, 
                  entranceFee: includeEntranceFee ? entranceFee : 0 
                })}
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
                  <DialogHeader>
                    <DialogTitle className="text-center font-black uppercase">Scan to Pay ₱{perPlayerFee}</DialogTitle>
                    <DialogDescription className="sr-only">
                      Scan QR code to pay your session fee
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map(method => (
                        <Card key={method.id} className="overflow-hidden border-2">
                          <div key="method-name" className="bg-primary text-primary-foreground p-2 text-center text-[10px] font-black uppercase tracking-widest">{method.name}</div>
                          <div key="method-image" className="relative h-64 bg-white"><Image src={method.imageUrl} alt={method.name} fill className="object-contain p-4" /></div>
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
                    <DialogHeader>
                      <DialogTitle>QR Methods</DialogTitle>
                      <DialogDescription className="sr-only">
                        Manage payment QR codes
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                      {paymentMethods.map(method => (
                        <Card key={method.id} className="overflow-hidden border-2">
                          <div key="method-name" className="bg-primary text-primary-foreground p-1 text-center text-[10px] font-black uppercase">{method.name}</div>
                          <div key="method-image" className="relative h-64 bg-white"><Image src={method.imageUrl} alt={method.name} fill className="object-contain p-4" /></div>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <ScrollArea className="h-[600px] rounded-2xl border-2 bg-card p-4">
              <div key="players-list" className="space-y-2">
                  {sortedPlayers.map((player, index) => {
                  const isPaid = !!currentFee?.payments?.[player.id];
                  const isMe = player.id === currentPlayer?.id;

                  return (
                    <div key={`player-${player.id}-${index}`} className={cn(
                      "flex items-center justify-between p-4 border-2 rounded-xl transition-all",
                      isPaid ? "bg-green-500/5 border-green-500/20 opacity-60" : "bg-card border-border hover:border-primary/30",
                      isMe && "ring-2 ring-primary ring-offset-2"
                    )}>
                      <div key={`player-info-${player.id}`} className="flex items-center gap-3">
                        <div key={`status-dot-${player.id}`} className={cn("h-3 w-3 rounded-full", isPaid ? "bg-green-500" : "bg-red-500")} />
                        <div key={`name-container-${player.id}`} className="flex flex-col">
                          <span key={`player-name-${player.id}`} className={cn("font-black text-sm", isPaid && "line-through text-muted-foreground")}>
                            {player.name} {isMe && <span key={`you-label-${player.id}`} className="text-[10px] text-primary ml-1">(YOU)</span>}
                          </span>
                          {isPaid && <p key={`payment-verified-${player.id}`} className="text-[8px] font-black uppercase text-green-600 mt-0.5">Payment Verified</p>}
                        </div>
                      </div>
                      <div key={`payment-status-${player.id}`} className="flex items-center gap-4">
                        <span key={`status-text-${player.id}`} className={cn("text-[10px] font-black uppercase tracking-tighter", isPaid ? "text-green-600" : "text-red-500")}>
                          {isPaid ? 'Settled' : 'Pending'}
                        </span>
                        {isAdmin && (
                          <Checkbox key={`checkbox-${player.id}`} checked={isPaid} onCheckedChange={() => togglePayment(today, player.id)} className="h-5 w-5 border-2" />
                        )}
                      </div>
                    </div>
                  );
                })}
                {players.length === 0 && (
                  <div key="no-players" className="py-20 text-center text-muted-foreground font-black uppercase text-xs opacity-20">No Players Found</div>
                )}
              </div>
            </ScrollArea>
          </section>
        )}
      </div>
    </div>
  );
}
