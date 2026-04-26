
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Banknote, QrCode, UserCheck, Calculator, AlertCircle, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import Link from 'next/link';
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

  const currentFee = useMemo(() => {
    if (!today) return null;
    return fees.find(f => f.id === today);
  }, [fees, today]);

  const perPlayerFee = useMemo(() => {
    const effectiveEntry = includeEntranceFee ? entranceFee : 0;
    const total = shuttleFee + courtFee + effectiveEntry;
    const count = players.length || 1;
    return (total / count).toFixed(2);
  }, [shuttleFee, courtFee, entranceFee, includeEntranceFee, players.length]);

  const handleUpdateFeeAction = () => {
    if (!today) return;
    updateFee({
      id: today,
      shuttleFee,
      courtFee,
      entranceFee: includeEntranceFee ? entranceFee : 0,
    });
  };

  // Sort players: Pending at top, Paid at bottom
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aPaid = !!currentFee?.payments?.[a.id];
      const bPaid = !!currentFee?.payments?.[b.id];
      if (aPaid === bPaid) return 0;
      return aPaid ? 1 : -1;
    });
  }, [players, currentFee]);

  const handleExportCSV = () => {
    if (!today) return;
    const headers = ["Date", "Player Name", "Status", "Amount"];
    const rows = sortedPlayers.map(player => {
      const isPaid = !!currentFee?.payments?.[player.id];
      return [
        today,
        `"${player.name.replace(/"/g, '""')}"`,
        isPaid ? "Paid" : "Pending",
        perPlayerFee
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TheBreakfastClub_Fees_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Shuttle Fee</Label>
              <Input 
                type="number" 
                value={shuttleFee} 
                onChange={e => setShuttleFee(parseFloat(e.target.value) || 0)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Court Fee</Label>
              <Input 
                type="number" 
                value={courtFee} 
                onChange={e => setCourtFee(parseFloat(e.target.value) || 0)} 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={cn(!includeEntranceFee && "text-muted-foreground")}>Entry Fee</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Include</span>
                  <Switch 
                    checked={includeEntranceFee} 
                    onCheckedChange={setIncludeEntranceFee} 
                  />
                </div>
              </div>
              <Input 
                type="number" 
                value={entranceFee} 
                disabled={!includeEntranceFee}
                onChange={e => setEntranceFee(parseFloat(e.target.value) || 0)} 
                className={cn(!includeEntranceFee && "bg-muted opacity-50")}
              />
            </div>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg flex justify-between items-center">
            <span className="font-bold">Total Per Player:</span>
            <span className="text-2xl font-black text-primary">₱{perPlayerFee}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleUpdateFeeAction}>Apply Daily Fee</Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5" /> Payment Status
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" disabled={!today}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <QrCode className="h-4 w-4" /> QR Codes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Select Payment QR</DialogTitle></DialogHeader>
                  <div className="py-4 space-y-6">
                    {paymentMethods.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                        {paymentMethods.map(method => (
                          <Card key={method.id} className="overflow-hidden">
                            <div className="bg-muted p-2 text-center text-xs font-bold uppercase tracking-widest">{method.name}</div>
                            <div className="relative h-64 w-full bg-white">
                              <Image 
                                src={method.imageUrl} 
                                alt={method.name} 
                                fill 
                                className="object-contain"
                              />
                            </div>
                            <div className="p-2 text-center text-sm font-bold bg-primary/10">Pay ₱{perPlayerFee}</div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="font-bold">No QR Codes Uploaded</p>
                          <p className="text-sm text-muted-foreground">Please upload your payment QR codes in settings first.</p>
                        </div>
                        <Link href="/settings">
                          <Button className="gap-2">Go to Settings</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="space-y-2">
            {sortedPlayers.map(player => {
              const isPaid = !!currentFee?.payments?.[player.id];
              return (
                <div key={player.id} className={cn(
                  "flex items-center justify-between p-3 border rounded-lg shadow-sm transition-all",
                  isPaid ? "bg-muted/50 border-muted opacity-70" : "bg-card border-border"
                )}>
                  <span className={cn(
                    "font-medium transition-all",
                    isPaid && "line-through text-muted-foreground"
                  )}>
                    {player.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isPaid ? "text-green-600" : "text-red-500"
                    )}>
                      {isPaid ? 'PAID' : 'PENDING'}
                    </span>
                    <Checkbox 
                      checked={isPaid} 
                      onCheckedChange={() => today && togglePayment(today, player.id)}
                    />
                  </div>
                </div>
              );
            })}
            {players.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-secondary/5 text-muted-foreground italic text-sm">
                No players registered. Go to the Players tab to add members.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
