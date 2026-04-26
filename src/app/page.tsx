
"use client";

import { useState, useMemo } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { CourtStats } from '@/components/dashboard/CourtStats';
import { QueueCard } from '@/components/queue/QueueCard';
import { MatchSuggester } from '@/components/match/MatchSuggester';
import { Player, Court } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const INITIAL_PLAYERS: Record<string, Player> = {
  'p1': { id: 'p1', name: 'James Wilson', skillLevel: 'Advanced', playStyle: 'Aggressive', gamesPlayed: 120 },
  'p2': { id: 'p2', name: 'Sarah Chen', skillLevel: 'Intermediate', playStyle: 'Defensive', gamesPlayed: 85 },
  'p3': { id: 'p3', name: 'Mike Johnson', skillLevel: 'Pro', playStyle: 'Tactical', gamesPlayed: 340 },
  'p4': { id: 'p4', name: 'Emma Davis', skillLevel: 'Beginner', playStyle: 'All-Rounder', gamesPlayed: 12 },
  'p5': { id: 'p5', name: 'Alex Wong', skillLevel: 'Intermediate', playStyle: 'Aggressive', gamesPlayed: 92 },
  'p6': { id: 'p6', name: 'Lisa Taylor', skillLevel: 'Advanced', playStyle: 'Tactical', gamesPlayed: 110 },
  'p7': { id: 'p7', name: 'Tom H.', skillLevel: 'Intermediate', playStyle: 'Defensive', gamesPlayed: 45 },
  'p8': { id: 'p8', name: 'Rachel Z.', skillLevel: 'Advanced', playStyle: 'All-Rounder', gamesPlayed: 156 },
};

const INITIAL_COURTS: Court[] = [
  { id: 'c1', name: 'Court A (Premium)', status: 'Busy', queue: ['p7', 'p8'], currentPlayers: ['p1', 'p2', 'p5', 'p6'], estimatedWaitMinutes: 15 },
  { id: 'c2', name: 'Court B', status: 'Available', queue: [], currentPlayers: [], estimatedWaitMinutes: 0 },
  { id: 'c3', name: 'Court C', status: 'Busy', queue: ['p4'], currentPlayers: ['p3'], estimatedWaitMinutes: 10 },
  { id: 'c4', name: 'Court D', status: 'Maintenance', queue: [], currentPlayers: [], estimatedWaitMinutes: 0 },
];

export default function Home() {
  const [courts, setCourts] = useState(INITIAL_COURTS);
  const [players] = useState(INITIAL_PLAYERS);
  const { toast } = useToast();

  const handleJoinQueue = (courtId: string) => {
    // Logic for the current user to join
    const court = courts.find(c => c.id === courtId);
    if (!court) return;
    
    if (court.status === 'Maintenance') {
      toast({
        title: "Court Unavailable",
        description: "This court is currently under maintenance.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Joined Queue!",
      description: `You are now in line for ${court.name}. We'll notify you when it's your turn.`,
    });
  };

  const allQueuedPlayers = useMemo(() => {
    const ids = new Set(courts.flatMap(c => c.queue));
    return Array.from(ids).map(id => players[id]).filter(Boolean);
  }, [courts, players]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Live Dashboard</h1>
          <p className="text-muted-foreground">Manage court queues and matches in real-time.</p>
        </header>

        <CourtStats />

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Available Courts</h2>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Available
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Busy
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courts.map(court => (
                <QueueCard 
                  key={court.id} 
                  court={court} 
                  players={players}
                  onJoin={handleJoinQueue}
                />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <h2 className="text-xl font-bold">Optimization Tools</h2>
            <MatchSuggester playersInQueue={allQueuedPlayers} />
            
            <div className="p-4 rounded-xl bg-secondary/30 border space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Queue Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="p-3 bg-background hover:bg-background/80 transition-colors border rounded-lg text-xs font-semibold">Join Random</button>
                <button className="p-3 bg-background hover:bg-background/80 transition-colors border rounded-lg text-xs font-semibold">Team Creator</button>
                <button className="p-3 bg-background hover:bg-background/80 transition-colors border rounded-lg text-xs font-semibold">Instant Game</button>
                <button className="p-3 bg-background hover:bg-background/80 transition-colors border rounded-lg text-xs font-semibold">Help/Guide</button>
              </div>
            </div>
          </aside>
        </div>
      </main>
      
      <footer className="border-t py-6 bg-secondary/10 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; 2024 ShuttleQueue. All rights reserved. Built for champions.
        </div>
      </footer>
    </div>
  );
}
