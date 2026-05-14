"use client";

import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, TrendingUp, Users, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import NextImage from 'next/image';

export default function GlobalFeesPage() {
  const { fees, players, activeSession, role, paymentMethods, currentPlayer } = useClub();
  const isAdmin = role === 'admin';
  const isQueueMaster = role === 'queueMaster';
  const isStaff = isAdmin || isQueueMaster;
  const isPlayer = role === 'player';

  // Calculate total fee per session
  const sessionTotalFee = useMemo(() => {
    if (!activeSession?.id) return 0;
    const sessionFee = fees.find(f => f.id === activeSession.id);
    if (!sessionFee) return 0;
    return (sessionFee.shuttleFee || 0) + (sessionFee.courtFee || 0) + (sessionFee.entranceFee || 0);
  }, [fees, activeSession]);

  // Calculate total collected from payments
  const totalCollected = useMemo(() => {
    if (!activeSession?.id) return 0;
    const sessionFee = fees.find(f => f.id === activeSession.id);
    if (!sessionFee) return 0;
    const paidCount = Object.values(sessionFee.payments || {}).filter(p => p).length;
    return paidCount * sessionTotalFee;
  }, [fees, activeSession, sessionTotalFee]);

  // Calculate payment status per player
  const paymentStatus = useMemo(() => {
    if (!activeSession?.id) return [];
    const sessionFee = fees.find(f => f.id === activeSession.id);
    if (!sessionFee) return [];

    // For players, only show their own payment status
    if (isPlayer && currentPlayer) {
      const player = players.find(p => p.id === currentPlayer.id);
      if (!player) return [];
      return [{
        ...player,
        paid: sessionFee.payments?.[player.id] || false,
      }];
    }

    // For staff, show all players
    return players.map(player => ({
      ...player,
      paid: sessionFee.payments?.[player.id] || false,
    }));
  }, [fees, activeSession, players, isPlayer, currentPlayer]);

  // Calculate payment statistics
  const paymentStats = useMemo(() => {
    const totalPlayers = paymentStatus.length;
    const paidPlayers = paymentStatus.filter(p => p.paid).length;
    const unpaidPlayers = totalPlayers - paidPlayers;
    const totalAmount = paidPlayers * sessionTotalFee;
    const pendingAmount = unpaidPlayers * sessionTotalFee;

    return {
      totalPlayers,
      paidPlayers,
      unpaidPlayers,
      totalAmount,
      pendingAmount,
    };
  }, [paymentStatus, sessionTotalFee]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
      <header className="space-y-0.5 text-center sm:text-left">
        <h1 className="flex items-center justify-center sm:justify-start gap-3">
          <Banknote className="h-8 w-8 text-green-600" /> Fee Tracker
        </h1>
        <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">
          {isPlayer ? 'Your payment status' : 'Track session fees and payments'}
        </p>
      </header>

      {isPlayer ? (
        // Player view: Show only own fees and payment QR code
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" /> Your Fee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-green-600">₱{sessionTotalFee.toFixed(2)}</p>
                <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">
                  Shuttle + Court + Entrance
                </p>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              paymentStatus[0]?.paid ? "border-green-500/20 bg-green-500/5" : "border-orange-500/20 bg-orange-500/5"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  {paymentStatus[0]?.paid ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <Users className="h-4 w-4 text-orange-600" />
                  )}
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "text-3xl font-black",
                  paymentStatus[0]?.paid ? "text-green-600" : "text-orange-600"
                )}>
                  {paymentStatus[0]?.paid ? 'PAID' : 'PENDING'}
                </p>
                <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">
                  {paymentStatus[0]?.paid ? 'Payment received' : 'Payment pending'}
                </p>
              </CardContent>
            </Card>
          </div>

          {paymentMethods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="border-2 rounded-xl p-4 bg-card flex flex-col items-center">
                      <div className="relative h-32 w-full border bg-white rounded-lg overflow-hidden mb-3 shadow-inner">
                        <NextImage src={method.imageUrl} alt={method.name} fill className="object-contain p-2" />
                      </div>
                      <span className="font-black text-xs uppercase truncate w-full text-center">{method.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Staff view: Show all fees and management tools
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" /> Per Player Fee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-green-600">₱{sessionTotalFee.toFixed(2)}</p>
                <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">
                  Shuttle + Court + Entrance
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-primary">₱{paymentStats.totalAmount.toFixed(2)}</p>
                <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">
                  {paymentStats.paidPlayers} / {paymentStats.totalPlayers} paid
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500/20 bg-orange-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-600" /> Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-orange-600">₱{paymentStats.pendingAmount.toFixed(2)}</p>
                <p className="text-[10px] font-black uppercase text-muted-foreground mt-1">
                  {paymentStats.unpaidPlayers} unpaid
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 pb-24">
                {paymentStatus.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 border-2 rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <p className="font-black text-compact">{player.name}</p>
                      {player.paid && (
                        <Badge className="bg-green-600 text-white font-black text-[10px] uppercase">
                          PAID
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-black text-green-600">₱{sessionTotalFee.toFixed(2)}</p>
                  </div>
                ))}
                {paymentStatus.length === 0 && (
                  <div className="text-center py-10 border-4 border-dashed rounded-lg bg-secondary/10">
                    <p className="font-black uppercase text-tiny tracking-widest opacity-40">No players in session</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
