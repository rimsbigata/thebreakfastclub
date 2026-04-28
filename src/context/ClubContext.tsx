
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Player, Court, Match, Fee, PaymentMethod, MatchStatus, PlayerSnapshot } from '@/lib/types';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { safeLocalStorage } from '@/lib/localStorage';

interface ClubContextType {
  players: Player[];
  courts: Court[];
  matches: Match[];
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  clubLogo: string | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
  benchSort: string;
  addPlayer: (player: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'partnerHistory' | 'status' | 'improvementScore' | 'totalPlayTimeMinutes' | 'lastAvailableAt'>) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => void;
  addCourt: (name?: string) => string;
  deleteCourt: (id: string) => void;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted' | 'status' | 'teamASnapshots' | 'teamBSnapshots'>) => Promise<void>;
  startTimer: (courtId: string) => void;
  updateMatchScore: (matchId: string, teamAScore: number, teamBScore: number) => Promise<void>;
  endMatch: (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => Promise<void>;
  swapPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  createCourtAndAssignMatch: (matchId: string) => void;
  updateFee: (fee: Omit<Fee, 'payments'>) => void;
  togglePayment: (date: string, playerId: string) => void;
  addPaymentMethod: (name: string, imageData: string) => void;
  deletePaymentMethod: (id: string) => void;
  setClubLogo: (imageUrl: string | null) => void;
  setDefaultWinningScore: (score: number) => void;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
  setBenchSort: (sort: string) => void;
  resetDailyBoard: () => void;
  wipeAllData: () => void;
  deleteMatch: (matchId: string) => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PLAYERS: 'tbc_players',
  COURTS: 'tbc_courts',
  MATCHES: 'tbc_matches',
  FEES: 'tbc_fees',
  PAYMENT_METHODS: 'tbc_payment_methods',
  LOGO: 'tbc_logo',
  WINNING_SCORE: 'tbc_winning_score',
  AUTO_ADVANCE: 'tbc_auto_advance',
  BENCH_SORT: 'tbc_bench_sort'
};

export function ClubProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [clubLogo, setClubLogoState] = useState<string | null>(null);
  const [defaultWinningScore, setDefaultWinningScoreState] = useState<number>(21);
  const [autoAdvanceEnabled, setAutoAdvanceEnabledState] = useState<boolean>(true);
  const [benchSort, setBenchSortState] = useState<string>('name');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const load = (key: string, fallback: any) => {
      const saved = safeLocalStorage.get(key);
      return saved ? JSON.parse(saved) : fallback;
    };

    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/players');
        if (res.ok) {
          const data = await res.json();
          const mappedPlayers = data.players.map((p: any) => ({
            id: p.id,
            name: p.name,
            skillLevel: p.skill_level || 3,
            wins: 0,
            gamesPlayed: 0,
            partnerHistory: [],
            status: 'available',
            improvementScore: 0,
            totalPlayTimeMinutes: 0,
            lastAvailableAt: Date.now()
          }));
          setPlayers(mappedPlayers);
          return mappedPlayers;
        }
      } catch (error) {
        console.error('Failed to fetch players:', error);
        setPlayers([]);
      }
      return [] as Player[];
    };

    const fetchMatches = async (playerList: Player[]) => {
      try {
        const res = await fetch('/api/matches');
        if (res.ok) {
          const data = await res.json();
          const mappedMatches = data.matches.map((m: any) => {
            const teamA = m.team1_player_ids || [];
            const teamB = m.team2_player_ids || [];
            const teamASnapshots = teamA.map((id: string) => {
              const p = playerList.find(p => p.id === id);
              return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };
            });
            const teamBSnapshots = teamB.map((id: string) => {
              const p = playerList.find(p => p.id === id);
              return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };
            });
            return {
              id: m.id,
              courtId: m.court_id,
              teamA,
              teamB,
              teamAScore: m.team1_score || 0,
              teamBScore: m.team2_score || 0,
              teamASnapshots,
              teamBSnapshots,
              timestamp: m.created_at,
              isCompleted: m.status === 'completed',
              status: m.status === 'completed' ? 'completed' : m.status === 'ongoing' ? 'ongoing' : 'ongoing',
              winner: m.winner === 'T1' ? 'teamA' : m.winner === 'T2' ? 'teamB' : null
            };
          });
          setMatches(mappedMatches);
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error);
        setMatches([]);
      }
    };

    const loadData = async () => {
      const loadedPlayers = await fetchPlayers();
      await fetchMatches(loadedPlayers);
      setCourts(load(STORAGE_KEYS.COURTS, []));
      setFees(load(STORAGE_KEYS.FEES, []));
      setPaymentMethods(load(STORAGE_KEYS.PAYMENT_METHODS, []));
      setClubLogoState(safeLocalStorage.get(STORAGE_KEYS.LOGO));
      setDefaultWinningScoreState(parseInt(safeLocalStorage.get(STORAGE_KEYS.WINNING_SCORE) || '21'));
      const savedAutoAdvance = safeLocalStorage.get(STORAGE_KEYS.AUTO_ADVANCE);
      setAutoAdvanceEnabledState(savedAutoAdvance ? JSON.parse(savedAutoAdvance) : true);
      setBenchSortState(safeLocalStorage.get(STORAGE_KEYS.BENCH_SORT) || 'name');
      setTimeout(() => setIsLoaded(true), 1500);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    safeLocalStorage.set(STORAGE_KEYS.COURTS, JSON.stringify(courts));
    safeLocalStorage.set(STORAGE_KEYS.FEES, JSON.stringify(fees));
    safeLocalStorage.set(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(paymentMethods));
    safeLocalStorage.set(STORAGE_KEYS.WINNING_SCORE, defaultWinningScore.toString());
    safeLocalStorage.set(STORAGE_KEYS.AUTO_ADVANCE, JSON.stringify(autoAdvanceEnabled));
    safeLocalStorage.set(STORAGE_KEYS.BENCH_SORT, benchSort);
    if (clubLogo) safeLocalStorage.set(STORAGE_KEYS.LOGO, clubLogo);
    else safeLocalStorage.remove(STORAGE_KEYS.LOGO);
  }, [courts, fees, paymentMethods, clubLogo, defaultWinningScore, autoAdvanceEnabled, benchSort, isLoaded]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addPlayer = async (data: any) => {
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, skillLevel: data.skillLevel || 3 })
      });
      if (res.ok) {
        const result = await res.json();
        const newPlayer: Player = {
          ...data,
          id: result.player.id,
          wins: 0,
          gamesPlayed: 0,
          partnerHistory: [],
          status: 'available',
          improvementScore: 0,
          totalPlayTimeMinutes: 0,
          lastAvailableAt: Date.now()
        };
        setPlayers(prev => [...prev, newPlayer]);
      }
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const addCourt = (name?: string) => {
    const courtNumbers = courts
      .map(c => parseInt(c.name.replace('Court ', '')))
      .filter(n => !isNaN(n));
    const nextNum = courtNumbers.length > 0 ? Math.max(...courtNumbers) + 1 : 1;
    
    const id = generateId();
    const newCourt: Court = {
      id,
      name: name ? `Court ${name}` : `Court ${nextNum}`,
      status: 'available',
      currentMatchId: null
    };
    setCourts(prev => [...prev, newCourt]);
    return id;
  };

  const deleteCourt = (id: string) => {
    const court = courts.find(c => c.id === id);
    if (court?.currentMatchId) {
      deleteMatch(court.currentMatchId);
    }
    setCourts(prev => prev.filter(c => c.id !== id));
  };

  const startMatch = async (matchData: any) => {
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamA: matchData.teamA, teamB: matchData.teamB, courtId: matchData.courtId })
      });
      if (res.ok) {
        const result = await res.json();
        let targetCourtId = matchData.courtId;
        if (!targetCourtId) {
          const availableCourt = courts.find(c => c.status === 'available');
          if (availableCourt) {
            targetCourtId = availableCourt.id;
          }
        }

        const teamASnapshots: PlayerSnapshot[] = matchData.teamA.map((id: string) => {
          const p = players.find(player => player.id === id);
          return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };
        });

        const teamBSnapshots: PlayerSnapshot[] = matchData.teamB.map((id: string) => {
          const p = players.find(player => player.id === id);
          return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };
        });

        const newMatch: Match = {
          ...matchData,
          id: result.match.id,
          courtId: targetCourtId,
          teamASnapshots,
          teamBSnapshots,
          timestamp: result.match.created_at,
          isCompleted: false,
          status: 'ongoing'
        };

        setMatches(prev => [newMatch, ...prev]);

        if (targetCourtId) {
          setCourts(prev => prev.map(c => 
            c.id === targetCourtId 
              ? { ...c, status: 'occupied', currentMatchId: result.match.id } 
              : c
          ));
        }

        setPlayers(prev => prev.map(p => 
          [...matchData.teamA, ...matchData.teamB].includes(p.id)
            ? { ...p, status: 'playing', lastAvailableAt: undefined }
            : p
        ));
      }
    } catch (error) {
      console.error('Error starting match:', error);
    }
  };

  const updateMatchScore = async (matchId: string, teamAScore: number, teamBScore: number) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, teamAScore, teamBScore } : m));
    try {
      await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1_score: teamAScore, team2_score: teamBScore })
      });
    } catch (error) {
      console.error('Error updating match score:', error);
    }
  };

  const endMatch = async (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;

    const match = matches.find(m => m.id === court.currentMatchId);
    if (!match) return;

    const startTime = match.startTime ? new Date(match.startTime) : null;
    const playDuration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0;

    // Update the match state
    setMatches(prev => prev.map(m => 
      m.id === court.currentMatchId 
        ? { ...m, isCompleted: status === 'completed', status, winner, teamAScore, teamBScore, endTime: new Date().toISOString() } 
        : m
    ));

    // Free the court
    setCourts(prev => prev.map(c => 
      c.id === courtId ? { ...c, status: 'available', currentMatchId: null } : c
    ));

    // Update the players
    setPlayers(prev => prev.map(p => {
      if (![...match.teamA, ...match.teamB].includes(p.id)) return p;

      if (status === 'cancelled') {
        return { ...p, status: 'available', lastAvailableAt: Date.now() };
      }

      const isTeamA = match.teamA.includes(p.id);
      const partnerId = isTeamA ? match.teamA.find(id => id !== p.id) : match.teamB.find(id => id !== p.id);
      const newHistory = partnerId ? [partnerId, ...p.partnerHistory].slice(0, 5) : p.partnerHistory;
      
      let won = false;
      if (winner) {
        won = (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA);
      } else if (teamAScore !== undefined && teamBScore !== undefined) {
        won = (teamAScore > teamBScore && isTeamA) || (teamBScore > teamAScore && !isTeamA);
      }

      return {
        ...p,
        status: 'available',
        lastAvailableAt: Date.now(),
        wins: (p.wins || 0) + (won ? 1 : 0),
        gamesPlayed: (p.gamesPlayed || 0) + 1,
        partnerHistory: newHistory,
        improvementScore: Math.max(0, (p.improvementScore || 0) + (won ? 5 : -2)),
        totalPlayTimeMinutes: (p.totalPlayTimeMinutes || 0) + playDuration
      };
    }));

    // Trigger Auto-Advance if enabled
    if (autoAdvanceEnabled && status === 'completed') {
      autoAdvanceToCourt(courtId);
    }

    if (status === 'completed') {
      try {
        await fetch('/api/matches/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            match_id: court.currentMatchId, 
            winner: winner === 'teamA' ? 'T1' : winner === 'teamB' ? 'T2' : null,
            team1_score: teamAScore || 0,
            team2_score: teamBScore || 0
          })
        });
      } catch (error) {
        console.error('Error completing match:', error);
      }
    }
  };

  const autoAdvanceToCourt = (targetCourtId: string) => {
    setMatches(prevMatches => {
      const queue = prevMatches
        .filter(m => !m.isCompleted && !m.courtId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (queue.length === 0) return prevMatches;

      const nextMatch = queue[0];
      
      // Update the match with the new court assignment
      const updatedMatches = prevMatches.map(m => 
        m.id === nextMatch.id ? { ...m, courtId: targetCourtId, status: 'ongoing' as MatchStatus } : m
      );

      // We need to update courts too, but since we are inside setMatches, 
      // we'll rely on the side effect or direct state call if possible.
      // In React state updates, it's cleaner to handle this together.
      
      return updatedMatches;
    });

    // Separately update the court state
    setCourts(prevCourts => {
      // Find the first available match in the queue (re-calculate for consistency)
      const nextMatchInQueue = matches
        .filter(m => !m.isCompleted && !m.courtId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];

      if (!nextMatchInQueue) return prevCourts;

      return prevCourts.map(c => 
        c.id === targetCourtId 
          ? { ...c, status: 'occupied', currentMatchId: nextMatchInQueue.id } 
          : c
      );
    });
  };

  const deleteMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    setPlayers(prev => prev.map(p => 
      [...match.teamA, ...match.teamB].includes(p.id)
        ? { ...p, status: 'available', lastAvailableAt: Date.now() }
        : p
    ));

    if (match.courtId) {
      setCourts(prev => prev.map(c => 
        c.id === match.courtId ? { ...c, status: 'available', currentMatchId: null } : c
      ));
    }

    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  const swapPlayer = (matchId: string, oldPlayerId: string, newPlayerId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const p = players.find(player => player.id === newPlayerId);
    const newSnapshot = { id: newPlayerId, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };

    const isTeamA = match.teamA.includes(oldPlayerId);
    const newTeamA = isTeamA ? match.teamA.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamA;
    const newTeamB = !isTeamA ? match.teamB.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamB;

    const newTeamASnapshots = isTeamA ? match.teamASnapshots?.map(s => s.id === oldPlayerId ? newSnapshot : s) : match.teamASnapshots;
    const newTeamBSnapshots = !isTeamA ? match.teamBSnapshots?.map(s => s.id === oldPlayerId ? newSnapshot : s) : match.teamBSnapshots;

    setMatches(prev => prev.map(m => m.id === matchId ? { 
      ...m, 
      teamA: newTeamA, 
      teamB: newTeamB, 
      teamASnapshots: newTeamASnapshots, 
      teamBSnapshots: newTeamBSnapshots 
    } : m));
    
    setPlayers(prev => prev.map(p => {
      if (p.id === oldPlayerId) return { ...p, status: 'available', lastAvailableAt: Date.now() };
      if (p.id === newPlayerId) return { ...p, status: 'playing', lastAvailableAt: undefined };
      return p;
    }));
  };

  const assignMatchToCourt = (matchId: string, courtId: string) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, courtId, status: 'ongoing' } : m));
    setCourts(prev => prev.map(c => 
      c.id === courtId 
        ? { ...c, status: 'occupied', currentMatchId: matchId } 
        : c
    ));
  };

  const createCourtAndAssignMatch = (matchId: string) => {
    const newCourtId = addCourt();
    assignMatchToCourt(matchId, newCourtId);
  };

  const startTimer = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (court?.currentMatchId) {
      setMatches(prev => prev.map(m => 
        m.id === court.currentMatchId 
          ? { ...m, startTime: new Date().toISOString() } 
          : m
      ));
    }
  };

  const updateFee = (data: any) => {
    setFees(prev => {
      const exists = prev.find(f => f.id === data.id);
      if (exists) return prev.map(f => f.id === data.id ? { ...f, ...data } : f);
      return [...prev, { ...data, payments: {} }];
    });
  };

  const togglePayment = (date: string, playerId: string) => {
    setFees(prev => prev.map(f => {
      if (f.id !== date) return f;
      const payments = { ...f.payments };
      payments[playerId] = !payments[playerId];
      return { ...f, payments };
    }));
  };

  const addPaymentMethod = (name: string, imageData: string) => {
    const newMethod: PaymentMethod = { id: generateId(), name, imageUrl: imageData };
    setPaymentMethods(prev => [...prev, newMethod]);
  };

  const deletePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  };

  const setClubLogo = (imageUrl: string | null) => {
    setClubLogoState(imageUrl);
  };

  const setDefaultWinningScore = (score: number) => {
    setDefaultWinningScoreState(score);
  };

  const setAutoAdvanceEnabled = (enabled: boolean) => {
    setAutoAdvanceEnabledState(enabled);
  };

  const setBenchSort = (sort: 'skill' | 'name' | 'lastAvailable') => {
    setBenchSortState(sort);
  };

  const resetDailyBoard = () => {
    setMatches(prev => prev.map(m => !m.isCompleted ? { ...m, isCompleted: true, status: 'cancelled' } : m));
    setPlayers(prev => prev.map(p => ({
      ...p,
      status: 'available',
      wins: 0,
      gamesPlayed: 0,
      totalPlayTimeMinutes: 0,
      partnerHistory: [],
      lastAvailableAt: Date.now()
    })));
    setCourts(prev => prev.map(c => ({ ...c, status: 'available', currentMatchId: null })));
  };

  const wipeAllData = () => {
    setPlayers([]);
    setCourts([]);
    setMatches([]);
    setFees([]);
    setPaymentMethods([]);
    setClubLogoState(null);
    setDefaultWinningScoreState(21);
    setAutoAdvanceEnabledState(true);
    localStorage.clear();
  };

  if (!isLoaded) {
    return <SplashScreen logo={clubLogo} />;
  }

  return (
    <ClubContext.Provider value={{
      players, courts, matches, fees, paymentMethods, clubLogo, defaultWinningScore, autoAdvanceEnabled, benchSort,
      addPlayer, updatePlayer, deletePlayer, addCourt, deleteCourt,
      startMatch, startTimer, updateMatchScore, endMatch, swapPlayer, assignMatchToCourt, createCourtAndAssignMatch, updateFee, togglePayment,
      addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData, setClubLogo, deleteMatch, setDefaultWinningScore, setAutoAdvanceEnabled, setBenchSort
    }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}
