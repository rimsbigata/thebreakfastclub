"use client";

import { useState, useMemo, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, User, TrendingUp, Users, Trash2, Pencil, Search, Clock, Target, Activity, Filter, ArrowUpDown, RefreshCw, CheckSquare, Square, X, FileText, ArrowUp, ArrowDown, Minus, Shield, ShieldCheck, ShieldAlert, Timer } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Cell } from 'recharts';
import { SKILL_LEVELS, SKILL_LEVELS_SHORT, getSkillColor, Player } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

function StatusBadge({ status }: { status: string }) {
  const colors = {
    available: "bg-green-600 text-white dark:bg-green-500 dark:text-green-950",
    playing: "bg-primary text-primary-foreground animate-pulse",
    resting: "bg-muted text-muted-foreground"
  };
  return (
    <Badge className={cn("text-[9px] font-black uppercase tracking-widest h-4 px-1.5 shrink-0", colors[status as keyof typeof colors])}>
      {status}
    </Badge>
  );
}

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function ImprovementSparkline({ score }: { score: number }) {
  const points = score > 0
    ? "0,20 5,18 10,15 15,12 20,8 25,5 30,2"
    : score < 0
      ? "0,2 5,5 10,8 15,12 20,15 25,18 30,20"
      : "0,11 5,11 10,11 15,11 20,11 25,11 30,11";

  const color = score > 0 ? "text-green-600 dark:text-green-500" : score < 0 ? "text-red-600 dark:text-red-500" : "text-muted-foreground";

  return (
    <svg width="30" height="22" viewBox="0 0 30 22" className={color}>
      <polyline
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="stroke-current"
      />
    </svg>
  );
}

export default function PlayersPage() {
  const { players, addPlayer, updatePlayer, deletePlayer, role } = useClub();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === 'admin';

  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState('3');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editSkill, setEditSkill] = useState('3');
  const [editNotes, setEditNotes] = useState('');
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [roleDialogPlayer, setRoleDialogPlayer] = useState<Player | null>(null);
  const [tempRoleHours, setTempRoleHours] = useState('2');

  const filteredPlayers = useMemo(() => {
    let result = players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    if (skillFilter !== 'all') {
      result = result.filter(p => p.skillLevel === parseInt(skillFilter));
    }

    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'skill':
          return b.skillLevel - a.skillLevel;
        case 'games':
          return b.gamesPlayed - a.gamesPlayed;
        case 'winRate':
          const aRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
          const bRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
          return bRate - aRate;
        case 'improvement':
          return b.improvementScore - a.improvementScore;
        default:
          return 0;
      }
    });

    return result;
  }, [players, searchQuery, statusFilter, skillFilter, sortBy]);

  const skillDistribution = useMemo(() => {
    return Object.keys(SKILL_LEVELS_SHORT).map(level => ({
      level: `L${level}`,
      count: players.filter(p => p.skillLevel === parseInt(level)).length,
    }));
  }, [players]);

  const handleAddPlayerAction = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    const isDuplicate = players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      toast({ title: "Duplicate Name", description: `${trimmedName} is already in the roster.`, variant: "destructive" });
      return;
    }
    try {
      await addPlayer({ name: trimmedName, skillLevel: parseInt(newSkill), playStyle: 'Unknown' });
      setNewName('');
      inputRef.current?.focus();
      toast({ title: "Player Added" });
    } catch (error) {
      toast({
        title: "Could not add player",
        description: error instanceof Error ? error.message : "Database write failed.",
        variant: "destructive"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddPlayerAction();
  };

  const handleEditPlayerAction = async () => {
    if (!editingPlayer || !editName.trim()) return;
    try {
      await updatePlayer(editingPlayer.id, { name: editName.trim(), skillLevel: parseInt(editSkill), notes: editNotes.trim() || undefined });
      setEditingPlayer(null);
      toast({ title: "Profile Updated" });
    } catch (error) {
      toast({
        title: "Could not update player",
        description: error instanceof Error ? error.message : "Database write failed.",
        variant: "destructive"
      });
    }
  };

  const handleStatusToggle = async (player: Player) => {
    const statusCycle: Record<string, string> = {
      available: 'playing',
      playing: 'resting',
      resting: 'available'
    };
    const newStatus = statusCycle[player.status];
    try {
      await updatePlayer(player.id, { status: newStatus as Player['status'] });
      toast({ title: `Status changed to ${newStatus}` });
    } catch (error) {
      toast({
        title: "Could not update status",
        description: error instanceof Error ? error.message : "Database write failed.",
        variant: "destructive"
      });
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  const handleBulkStatusChange = async (newStatus: Player['status']) => {
    if (selectedPlayers.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedPlayers).map(id => updatePlayer(id, { status: newStatus }))
      );
      toast({ title: `${selectedPlayers.size} players updated to ${newStatus}` });
      setSelectedPlayers(new Set());
    } catch (error) {
      toast({
        title: "Could not update players",
        description: error instanceof Error ? error.message : "Database write failed.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-24 max-w-7xl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:py-0 sm:static">
        <div className="space-y-0.5">
          <h1 className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> Roster
          </h1>
          <p className="text-tiny text-muted-foreground font-black uppercase tracking-widest opacity-60">
            {players.length} Members
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roster..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-compact font-bold bg-secondary/20 border-none"
            />
          </div>
          {selectedPlayers.size > 0 && (
            <div className="flex gap-1 items-center bg-primary/10 border-2 border-primary rounded-lg px-2">
              <span className="text-[10px] font-black uppercase text-primary">{selectedPlayers.size} selected</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleBulkStatusChange('available')} title="Set to Available">
                <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleBulkStatusChange('playing')} title="Set to Playing">
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleBulkStatusChange('resting')} title="Set to Resting">
                <div className="h-2.5 w-2.5 rounded-full bg-muted" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedPlayers(new Set())}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-compact font-bold border-2 w-full sm:w-36">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold text-compact">All Status</SelectItem>
              <SelectItem value="available" className="font-bold text-compact">Available</SelectItem>
              <SelectItem value="playing" className="font-bold text-compact">Playing</SelectItem>
              <SelectItem value="resting" className="font-bold text-compact">Resting</SelectItem>
            </SelectContent>
          </Select>
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger className="h-10 text-compact font-bold border-2 w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold text-compact">All Skills</SelectItem>
              {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                <SelectItem key={val} value={val} className="font-bold text-compact">{val} - {label as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-10 text-compact font-bold border-2 w-full sm:w-40">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name" className="font-bold text-compact">Name</SelectItem>
              <SelectItem value="skill" className="font-bold text-compact">Skill Level</SelectItem>
              <SelectItem value="games" className="font-bold text-compact">Games Played</SelectItem>
              <SelectItem value="winRate" className="font-bold text-compact">Win Rate</SelectItem>
              <SelectItem value="improvement" className="font-bold text-compact">Improvement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-6">
          <Card className="border-2 shadow-sm bg-card overflow-hidden">
            <CardHeader className="p-4 bg-primary/5 border-b">
              <CardTitle className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4 w-4" /> Quick Reg
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Name</Label>
                <Input
                  ref={inputRef}
                  placeholder="Enter name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-10 text-compact font-bold border-2"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Skill Tier</Label>
                <Select value={newSkill} onValueChange={setNewSkill}>
                  <SelectTrigger className="h-10 text-compact font-bold border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="font-bold text-compact">{val} - {label as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full font-black uppercase text-compact h-12" onClick={handleAddPlayerAction} disabled={!newName.trim()}>
                Add Member
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm hidden md:block">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-tiny font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillDistribution}>
                  <XAxis dataKey="level" fontSize={9} tickLine={false} axisLine={false} />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {skillDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </aside>

        <div className="lg:col-span-8">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-2 pr-2 pb-24">
              {filteredPlayers.map((player) => (
                <Card key={player.id} className={cn("border-2 shadow-sm bg-card group hover:border-primary transition-all duration-200 overflow-hidden min-w-0 cursor-pointer", selectedPlayers.has(player.id) && "border-primary bg-primary/5")} onClick={() => setViewingPlayer(player)}>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={e => { e.stopPropagation(); togglePlayerSelection(player.id); }}>
                        {selectedPlayers.has(player.id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </Button>
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0", getSkillColor(player.skillLevel))}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-compact truncate leading-tight group-hover:text-primary transition-colors">
                          {player.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          <StatusBadge status={player.status} />
                          {player.role !== 'player' && (
                            <Badge className={cn(
                              "text-[8px] font-black uppercase px-1 h-3 border-none",
                              player.role === 'admin' ? "bg-violet-600 text-white" : "bg-amber-500 text-white"
                            )}>
                              {player.role === 'admin' ? 'Admin' : 'Queue'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusToggle(player)} title="Toggle status">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingPlayer(player); setEditName(player.name); setEditSkill(player.skillLevel.toString()); setEditNotes(player.notes || ''); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRoleDialogPlayer(player)} title="Manage role">
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                          deletePlayer(player.id).catch(error => {
                            toast({
                              title: "Could not delete player",
                              description: error instanceof Error ? error.message : "Database delete failed.",
                              variant: "destructive"
                            });
                          });
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-dashed min-w-0">
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[8px] font-black uppercase text-muted-foreground truncate mb-1">Skill</p>
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-1.5 h-4 truncate w-full", getSkillColor(player.skillLevel))}>
                          {SKILL_LEVELS_SHORT[player.skillLevel]}
                        </Badge>
                      </div>
                      <div className="text-right min-w-0">
                        <p className="text-[8px] font-black uppercase text-muted-foreground truncate mb-1">Games</p>
                        <p className="text-compact font-black truncate">{player.gamesPlayed}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-[8px] font-black uppercase text-muted-foreground truncate mb-1">Win Rate</p>
                        <p className="text-compact font-black truncate">{player.gamesPlayed > 0 ? `${Math.round((player.wins / player.gamesPlayed) * 100)}%` : '-'}</p>
                      </div>
                      <div className="text-right min-w-0">
                        <p className="text-[8px] font-black uppercase text-muted-foreground truncate mb-1">Play Time</p>
                        <p className="text-compact font-black truncate">{player.totalPlayTimeMinutes > 0 ? `${Math.floor(player.totalPlayTimeMinutes / 60)}h` : '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1.5">
                      <div className="flex items-center gap-1">
                        <ImprovementSparkline score={player.improvementScore} />
                        <span className="text-[8px] font-black uppercase">{player.improvementScore > 0 ? `+${player.improvementScore}` : player.improvementScore}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 h-4 flex items-center gap-1">
                        <Activity className="h-2.5 w-2.5" />
                        {player.playStyle}
                      </Badge>
                      {player.notes && (
                        <Badge variant="secondary" className="text-[8px] font-black uppercase px-1.5 h-4 flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5" />
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 pt-1 text-[8px] font-black uppercase text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span className={cn(
                        player.lastAvailableAt && Date.now() - player.lastAvailableAt < 3600000 ? "text-green-600 dark:text-green-500" : ""
                      )}>
                        {formatRelativeTime(player.lastAvailableAt)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
              {filteredPlayers.length === 0 && (
                <div className="col-span-full py-20 text-center border-4 border-dashed rounded-2xl bg-secondary/5">
                  <User className="h-10 w-10 mx-auto mb-2 opacity-10" />
                  <p className="text-[10px] font-black uppercase text-muted-foreground opacity-40">No matching members</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-compact font-black uppercase">Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase opacity-60">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-10 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase opacity-60">Skill Tier</Label>
              <Select value={editSkill} onValueChange={setEditSkill}>
                <SelectTrigger className="h-10 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SKILL_LEVELS).map(([val, label]) => (
                    <SelectItem key={val} value={val} className="font-bold text-compact">{val} - {label as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase opacity-60">Notes</Label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Add notes about this player..."
                className="font-bold text-compact resize-none h-20"
              />
            </div>
            <Button className="w-full font-black uppercase text-compact h-12" onClick={handleEditPlayerAction}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingPlayer} onOpenChange={(open) => !open && setViewingPlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-compact font-black uppercase flex items-center gap-2">
              <User className="h-5 w-5" /> Player Profile
            </DialogTitle>
          </DialogHeader>
          {viewingPlayer && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className={cn("h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-black text-white", getSkillColor(viewingPlayer.skillLevel))}>
                  {viewingPlayer.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black">{viewingPlayer.name}</h3>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={viewingPlayer.status} />
                    <Badge variant="outline" className="text-[9px] font-black uppercase px-1.5 h-4">
                      {SKILL_LEVELS_SHORT[viewingPlayer.skillLevel]}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/20 rounded-lg p-3 space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Games Played</p>
                  <p className="text-lg font-black">{viewingPlayer.gamesPlayed}</p>
                </div>
                <div className="bg-secondary/20 rounded-lg p-3 space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Wins</p>
                  <p className="text-lg font-black">{viewingPlayer.wins}</p>
                </div>
                <div className="bg-secondary/20 rounded-lg p-3 space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Win Rate</p>
                  <p className="text-lg font-black">{viewingPlayer.gamesPlayed > 0 ? `${Math.round((viewingPlayer.wins / viewingPlayer.gamesPlayed) * 100)}%` : '-'}</p>
                </div>
                <div className="bg-secondary/20 rounded-lg p-3 space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Play Time</p>
                  <p className="text-lg font-black">{viewingPlayer.totalPlayTimeMinutes > 0 ? `${Math.floor(viewingPlayer.totalPlayTimeMinutes / 60)}h ${viewingPlayer.totalPlayTimeMinutes % 60}m` : '-'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Improvement Score</p>
                  <Badge variant="secondary" className="text-[9px] font-black uppercase px-1.5 h-4 flex items-center gap-1">
                    <Target className="h-2.5 w-2.5" />
                    {viewingPlayer.improvementScore > 0 ? `+${viewingPlayer.improvementScore}` : viewingPlayer.improvementScore}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Play Style</p>
                  <Badge variant="outline" className="text-[9px] font-black uppercase px-1.5 h-4 flex items-center gap-1">
                    <Activity className="h-2.5 w-2.5" />
                    {viewingPlayer.playStyle}
                  </Badge>
                </div>
              </div>

              {viewingPlayer.partnerHistory && viewingPlayer.partnerHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Partner History</p>
                  <div className="flex flex-wrap gap-1">
                    {viewingPlayer.partnerHistory.map((partnerId, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[9px] font-black uppercase px-1.5 h-4">
                        {partnerId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewingPlayer.lastAvailableAt && (
                <div className="flex items-center gap-2 pt-2 border-t text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-black uppercase">
                    Last seen {new Date(viewingPlayer.lastAvailableAt).toLocaleString()}
                  </p>
                </div>
              )}

              {viewingPlayer.notes && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-[8px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <FileText className="h-2.5 w-2.5" /> Notes
                  </p>
                  <p className="text-xs font-bold text-muted-foreground bg-secondary/20 rounded-lg p-3">
                    {viewingPlayer.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={!!roleDialogPlayer} onOpenChange={(open) => !open && setRoleDialogPlayer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-compact font-black uppercase flex items-center gap-2">
              <Shield className="h-5 w-5" /> Manage Role
            </DialogTitle>
          </DialogHeader>
          {roleDialogPlayer && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-xl font-black text-white", getSkillColor(roleDialogPlayer.skillLevel))}>
                  {roleDialogPlayer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black">{roleDialogPlayer.name}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    Current Role: <span className={cn(
                      "font-black",
                      roleDialogPlayer.role === 'admin' ? "text-violet-600" : roleDialogPlayer.role === 'queueMaster' ? "text-amber-600" : "text-muted-foreground"
                    )}>{roleDialogPlayer.role === 'admin' ? 'Admin' : roleDialogPlayer.role === 'queueMaster' ? 'Queue Master' : 'Player'}</span>
                  </p>
                  {roleDialogPlayer.roleExpiresAt && (
                    <p className="text-[10px] font-bold text-muted-foreground">
                      Expires: {new Date(roleDialogPlayer.roleExpiresAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Assign Role</p>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant={roleDialogPlayer.role === 'admin' ? 'default' : 'outline'}
                    className="w-full justify-start gap-2 font-black uppercase text-compact h-11"
                    onClick={() => {
                      updatePlayer(roleDialogPlayer.id, { role: 'admin', roleExpiresAt: undefined })
                        .then(() => {
                          toast({ title: `${roleDialogPlayer.name} is now Admin` });
                          setRoleDialogPlayer(null);
                        })
                        .catch(error => toast({
                          title: "Could not update role",
                          description: error instanceof Error ? error.message : "Database update failed.",
                          variant: "destructive"
                        }));
                    }}
                  >
                    <ShieldCheck className="h-4 w-4" /> Admin (Permanent)
                  </Button>

                  <div className="space-y-2">
                    <Button
                      variant={roleDialogPlayer.role === 'queueMaster' ? 'default' : 'outline'}
                      className="w-full justify-start gap-2 font-black uppercase text-compact h-11"
                      onClick={() => {
                        const hours = parseInt(tempRoleHours);
                        const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
                        updatePlayer(roleDialogPlayer.id, { role: 'queueMaster', roleExpiresAt: expiresAt })
                          .then(() => {
                            toast({ title: `${roleDialogPlayer.name} is now Queue Master for ${hours}h` });
                            setRoleDialogPlayer(null);
                          })
                          .catch(error => toast({
                            title: "Could not update role",
                            description: error instanceof Error ? error.message : "Database update failed.",
                            variant: "destructive"
                          }));
                      }}
                    >
                      <ShieldAlert className="h-4 w-4" /> Queue Master (Temporary)
                    </Button>
                    <div className="flex items-center gap-2 px-1">
                      <Timer className="h-3 w-3 text-muted-foreground" />
                      <Select value={tempRoleHours} onValueChange={setTempRoleHours}>
                        <SelectTrigger className="h-8 text-compact font-bold w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1" className="font-bold text-compact">1 hour</SelectItem>
                          <SelectItem value="2" className="font-bold text-compact">2 hours</SelectItem>
                          <SelectItem value="4" className="font-bold text-compact">4 hours</SelectItem>
                          <SelectItem value="8" className="font-bold text-compact">8 hours</SelectItem>
                          <SelectItem value="24" className="font-bold text-compact">24 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {roleDialogPlayer.role !== 'player' && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 font-black uppercase text-compact h-11 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        updatePlayer(roleDialogPlayer.id, { role: 'player', roleExpiresAt: undefined })
                          .then(() => {
                            toast({ title: `${roleDialogPlayer.name} role removed` });
                            setRoleDialogPlayer(null);
                          })
                          .catch(error => toast({
                            title: "Could not update role",
                            description: error instanceof Error ? error.message : "Database update failed.",
                            variant: "destructive"
                          }));
                      }}
                    >
                      <X className="h-4 w-4" /> Remove Role (Set to Player)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
