
"use client";

import { Court, Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Clock, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface QueueCardProps {
  court: Court;
  players: Record<string, Player>;
  onJoin: (courtId: string) => void;
}

export function QueueCard({ court, players, onJoin }: QueueCardProps) {
  const statusColors = {
    Available: 'bg-green-500',
    Busy: 'bg-primary',
    Maintenance: 'bg-muted',
  };

  return (
    <Card className="overflow-hidden border-2 transition-all hover:shadow-md">
      <CardHeader className="bg-secondary/20 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{court.name}</CardTitle>
          <Badge variant={court.status === 'available' ? 'secondary' : 'default'} className="uppercase">
            {court.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{court.queue.length} in queue</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{court.estimatedWaitMinutes} min wait</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">On Court</h4>
          <div className="flex -space-x-2">
            {court.currentPlayers.map((id) => (
              <Avatar key={id} className="border-2 border-background h-8 w-8">
                <AvatarFallback>{players[id]?.name?.[0]}</AvatarFallback>
              </Avatar>
            ))}
            {court.currentPlayers.length === 0 && (
              <span className="text-sm italic text-muted-foreground">Vacant</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Next in Line</h4>
          <div className="space-y-2">
            {court.queue.slice(0, 3).map((id, index) => (
              <div key={id} className="flex items-center gap-2 text-sm bg-background p-2 rounded-md border">
                <span className="font-bold text-primary">#{index + 1}</span>
                <span className="flex-1">{players[id]?.name || "Anonymous"}</span>
                <Badge variant="outline" className="text-[10px]">{players[id]?.skillLevel}</Badge>
              </div>
            ))}
            {court.queue.length > 3 && (
              <p className="text-center text-xs text-muted-foreground">
                + {court.queue.length - 3} more
              </p>
            )}
            {court.queue.length === 0 && (
              <p className="text-sm italic text-muted-foreground">Queue is empty</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-secondary/10 border-t p-4">
        <Button onClick={() => onJoin(court.id)} className="w-full gap-2" variant={court.status === 'available' ? 'default' : 'secondary'}>
          <Play className="h-4 w-4" />
          Join Queue
        </Button>
      </CardFooter>
    </Card>
  );
}
