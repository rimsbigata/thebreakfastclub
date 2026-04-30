"use client";

import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { SKILL_LEVELS_SHORT, getSkillColor } from '@/lib/types';

export default function GlobalPlayersPage() {
  const { players, matches } = useClub();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('default');
  const [filterStatus, setFilterStatus] = useState('all');

  // Calculate player stats from all matches
  const playerStats = useMemo(() => {
    const stats: Record<string, { wins: number; total: number; diff: number; stars: number; gamesPlayed: number }> = {};

    matches.forEach(m => {
      if (m.status !== 'completed') return;
      const pIds = [...m.teamA, ...m.teamB];
      pIds.forEach(id => {
        if (!stats[id]) stats[id] = { wins: 0, total: 0, diff: 0, stars: 0, gamesPlayed: 0 };
        stats[id].total += 1;
        stats[id].gamesPlayed += 1;
        const isTeamA = m.teamA.includes(id);
        const win = (m.winner === 'teamA' && isTeamA) || (m.winner === 'teamB' && !isTeamA);
        if (win) stats[id].wins += 1;
        if (m.teamAScore !== undefined && m.teamBScore !== undefined) {
          const scoreDiff = isTeamA ? (m.teamAScore - m.teamBScore) : (m.teamBScore - m.teamAScore);
          stats[id].diff += scoreDiff;
        }
      });
    });

    return players.map(p => ({
      ...p,
      ...stats[p.id],
      winRate: stats[p.id]?.total ? (stats[p.id].wins / stats[p.id].total) * 100 : 0,
    }));
  }, [players, matches]);

  const filteredPlayers = useMemo(() => {
    let result = playerStats.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterStatus === 'active') {
      result = result.filter(p => p.gamesPlayed > 0);
    } else if (filterStatus === 'inactive') {
      result = result.filter(p => p.gamesPlayed === 0);
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stars-desc':
          return (b.stars || 0) - (a.stars || 0);
        case 'wins-desc':
          return b.wins - a.wins;
        case 'games-desc':
          return b.gamesPlayed - a.gamesPlayed;
        default:
          return b.gamesPlayed - a.gamesPlayed;
      }
    });

    return result;
  }, [playerStats, searchTerm, sortOption, filterStatus]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
      <header className="space-y-0.5 text-center sm:text-left">
        <h1 className="flex items-center justify-center sm:justify-start gap-3">
          <Users className="h-8 w-8 text-primary" /> All Players
        </h1>
        <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">
          View all players across all sessions
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 font-black"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[140px] font-black text-[10px] uppercase">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-full sm:w-[140px] font-black text-[10px] uppercase">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Most Games</SelectItem>
                  <SelectItem value="stars-desc">Most Stars</SelectItem>
                  <SelectItem value="wins-desc">Most Wins</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-24">
            {filteredPlayers.map((player) => (
              <Card key={player.id} className="border-2 hover:scale-[1.02] transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-compact truncate">{player.name}</p>
                      <Badge variant="outline" className={cn("text-[8px] font-black uppercase px-1 h-3.5 mt-1 truncate", getSkillColor(player.skillLevel))}>
                        {SKILL_LEVELS_SHORT[player.skillLevel]}
                      </Badge>
                    </div>
                    {player.stars > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-yellow-500">{player.stars.toFixed(1)}</p>
                        <p className="text-[7px] font-black uppercase text-muted-foreground">⭐</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-sm font-black text-primary">{player.wins}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">W</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black opacity-60">{player.winRate.toFixed(0)}%</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">WR</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black">{player.gamesPlayed}</p>
                      <p className="text-[7px] font-black uppercase text-muted-foreground">G</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredPlayers.length === 0 && (
              <div className="col-span-full text-center py-20 border-4 border-dashed rounded-2xl bg-secondary/10 flex flex-col items-center">
                <Users className="h-10 w-10 mb-2 opacity-10" />
                <p className="font-black uppercase text-tiny tracking-widest opacity-40">No players found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
