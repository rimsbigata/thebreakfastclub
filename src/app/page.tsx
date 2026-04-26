
"use client";

import { useMemo } from 'react';
import { useCollection } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Timer, DoorOpen, Activity, Trophy } from 'lucide-react';
import { Player, Court } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const db = useFirestore();
  
  const playersRef = useMemoFirebase(() => collection(db, 'players'), [db]);
  const courtsRef = useMemoFirebase(() => collection(db, 'courts'), [db]);
  
  const { data: players } = useCollection<Player>(playersRef);
  const { data: courts } = useCollection<Court>(courtsRef);

  const stats = useMemo(() => {
    const totalPlayers = players?.length || 0;
    const availableCourts = courts?.filter(c => c.status === 'available').length || 0;
    const playingNow = players?.filter(p => p.status === 'playing').length || 0;
    const avgGames = players?.length ? (players.reduce((acc, p) => acc + p.gamesPlayed, 0) / players.length).toFixed(1) : 0;

    return [
      { label: 'Active Players', value: totalPlayers, icon: Users, color: 'text-blue-500' },
      { label: 'Available Courts', value: availableCourts, icon: DoorOpen, color: 'text-green-500' },
      { label: 'Playing Now', value: playingNow, icon: Activity, color: 'text-orange-500' },
      { label: 'Avg Games', value: avgGames, icon: Trophy, color: 'text-yellow-500' },
    ];
  }, [players, courts]);

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">TheBreakfastClub</h1>
          <p className="text-muted-foreground">Admin Control Panel</p>
        </div>
        <div className="hidden md:flex gap-4 mb-1">
          {/* Desktop nav would go here if needed */}
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <stat.icon className={`h-8 w-8 mb-2 ${stat.color}`} />
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <h3 className="text-2xl font-bold">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Quick Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Court Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {courts?.map(court => (
                  <div key={court.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border">
                    <span className="font-medium">{court.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${court.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-primary/20 text-primary'}`}>
                      {court.status}
                    </span>
                  </div>
                )) || <p className="text-sm text-muted-foreground italic">No courts found.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Queue Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {players?.filter(p => p.status === 'available').slice(0, 5).map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-xs text-muted-foreground">Level {player.skillLevel}</span>
                  </div>
                )) || <p className="text-sm text-muted-foreground italic">No players waiting.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
