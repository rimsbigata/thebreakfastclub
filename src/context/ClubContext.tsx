
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Player, Court, Match, Fee, PaymentMethod, MatchStatus, PlayerSnapshot } from '@/lib/types';
import { SplashScreen } from '@/components/layout/SplashScreen';

interface ClubContextType {
  players: Player[];
  courts: Court[];
  matches: Match[];
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  clubLogo: string | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
  queueSessionCode: string;
  currentPlayer: Player | null;
  addPlayer: (player: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'partnerHistory' | 'status' | 'improvementScore' | 'totalPlayTimeMinutes' | 'lastAvailableAt'>) => Promise<void>;
  signUpPlayer: (data: { name: string; pin: string; skillLevel: number; playStyle?: string; selfAssessment?: unknown }) => Promise<Player>;
  logInPlayer: (name: string, pin: string) => Promise<Player>;
  logOutPlayer: () => void;
  joinQueueSession: (code: string) => Promise<Player>;
  regenerateQueueSessionCode: () => Promise<string>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  addCourt: (name?: string) => Promise<string>;
  deleteCourt: (id: string) => Promise<void>;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted' | 'status' | 'teamASnapshots' | 'teamBSnapshots'>) => Promise<void>;
  startTimer: (courtId: string) => void;
  updateMatchScore: (matchId: string, teamAScore: number, teamBScore: number) => void;
  endMatch: (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => void;
  swapPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  createCourtAndAssignMatch: (matchId: string) => Promise<void>;
  updateFee: (fee: Omit<Fee, 'payments'>) => void;
  togglePayment: (date: string, playerId: string) => void;
  addPaymentMethod: (name: string, imageData: string) => void;
  deletePaymentMethod: (id: string) => void;
  setClubLogo: (imageUrl: string | null) => void;
  setDefaultWinningScore: (score: number) => void;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
  resetDailyBoard: () => Promise<void>;
  wipeAllData: () => Promise<void>;
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
  AUTO_ADVANCE: 'tbc_auto_advance'
};

const CURRENT_PLAYER_KEY = 'tbc_current_player_id';

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export function ClubProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [clubLogo, setClubLogoState] = useState<string | null>(null);
  const [defaultWinningScore, setDefaultWinningScoreState] = useState<number>(21);
  const [autoAdvanceEnabled, setAutoAdvanceEnabledState] = useState<boolean>(true);
  const [queueSessionCode, setQueueSessionCodeState] = useState<string>('TBC001');
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const currentPlayer = players.find(p => p.id === currentPlayerId) ?? null;

  useEffect(() => {
    const load = (key: string, fallback: any) => {
      if (typeof window === 'undefined') return fallback;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    };

    setPlayers(load(STORAGE_KEYS.PLAYERS, []));
    setCourts(load(STORAGE_KEYS.COURTS, []));
    setMatches(load(STORAGE_KEYS.MATCHES, []));
    setFees(load(STORAGE_KEYS.FEES, []));
    setPaymentMethods(load(STORAGE_KEYS.PAYMENT_METHODS, []));
    setClubLogoState(localStorage.getItem(STORAGE_KEYS.LOGO));
    setDefaultWinningScoreState(parseInt(localStorage.getItem(STORAGE_KEYS.WINNING_SCORE) || '21'));
    
    const savedAutoAdvance = localStorage.getItem(STORAGE_KEYS.AUTO_ADVANCE);
    setAutoAdvanceEnabledState(savedAutoAdvance !== null ? JSON.parse(savedAutoAdvance) : true);
    setCurrentPlayerId(localStorage.getItem(CURRENT_PLAYER_KEY));
    
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1500);

    apiRequest<{
      players: Player[];
      courts: Court[];
      matches: Match[];
      settings?: {
        fees: Fee[];
        paymentMethods: PaymentMethod[];
        clubLogo: string | null;
        defaultWinningScore: number;
        autoAdvanceEnabled: boolean;
        queueSessionCode: string;
      };
    }>('/api/club-state')
      .then(data => {
        if (Array.isArray(data.players)) {
          setPlayers(data.players);
        }
        if (Array.isArray(data.courts)) {
          setCourts(data.courts);
        }
        if (Array.isArray(data.matches)) {
          setMatches(data.matches);
        }
        if (data.settings) {
          setFees(data.settings.fees);
          setPaymentMethods(data.settings.paymentMethods);
          setClubLogoState(data.settings.clubLogo);
          setDefaultWinningScoreState(data.settings.defaultWinningScore);
          setAutoAdvanceEnabledState(data.settings.autoAdvanceEnabled);
          setQueueSessionCodeState(data.settings.queueSessionCode);
        }
      })
      .catch(error => {
        console.error(error);
      });

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(courts));
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(fees));
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(paymentMethods));
    localStorage.setItem(STORAGE_KEYS.WINNING_SCORE, defaultWinningScore.toString());
    localStorage.setItem(STORAGE_KEYS.AUTO_ADVANCE, JSON.stringify(autoAdvanceEnabled));
    if (clubLogo) localStorage.setItem(STORAGE_KEYS.LOGO, clubLogo);
    else localStorage.removeItem(STORAGE_KEYS.LOGO);
  }, [players, courts, matches, fees, paymentMethods, clubLogo, defaultWinningScore, autoAdvanceEnabled, isLoaded]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addPlayer = async (data: any) => {
    const result = await apiRequest<{ player: Player }>('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setPlayers(prev => [...prev, result.player]);
  };

  const rememberCurrentPlayer = (player: Player) => {
    setCurrentPlayerId(player.id);
    localStorage.setItem(CURRENT_PLAYER_KEY, player.id);
  };

  const signUpPlayer = async (data: { name: string; pin: string; skillLevel: number; playStyle?: string; selfAssessment?: unknown }) => {
    const result = await apiRequest<{ player: Player }>('/api/player-auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setPlayers(prev => [...prev, result.player]);
    rememberCurrentPlayer(result.player);
    return result.player;
  };

  const logInPlayer = async (name: string, pin: string) => {
    const result = await apiRequest<{ player: Player }>('/api/player-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    });
    setPlayers(prev => {
      const exists = prev.some(p => p.id === result.player.id);
      return exists ? prev.map(p => p.id === result.player.id ? result.player : p) : [...prev, result.player];
    });
    rememberCurrentPlayer(result.player);
    return result.player;
  };

  const logOutPlayer = () => {
    setCurrentPlayerId(null);
    localStorage.removeItem(CURRENT_PLAYER_KEY);
  };

  const joinQueueSession = async (code: string) => {
    if (!currentPlayerId) {
      throw new Error('Log in before joining a queue session.');
    }

    const result = await apiRequest<{ player: Player }>('/api/player-auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: currentPlayerId, code }),
    });
    setPlayers(prev => prev.map(p => p.id === result.player.id ? result.player : p));
    return result.player;
  };

  const regenerateQueueSessionCode = async () => {
    const result = await apiRequest<{ settings: { queueSessionCode: string } }>('/api/settings/session-code', {
      method: 'POST',
    });
    setQueueSessionCodeState(result.settings.queueSessionCode);
    return result.settings.queueSessionCode;
  };

  const persistSettings = (overrides: Partial<{
    fees: Fee[];
    paymentMethods: PaymentMethod[];
    clubLogo: string | null;
    defaultWinningScore: number;
    autoAdvanceEnabled: boolean;
    queueSessionCode: string;
  }>) => {
    apiRequest('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fees,
        paymentMethods,
        clubLogo,
        defaultWinningScore,
        autoAdvanceEnabled,
        queueSessionCode,
        ...overrides,
      }),
    }).catch(console.error);
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    await apiRequest(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  };

  const deletePlayer = async (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    await apiRequest(`/api/players/${id}`, { method: 'DELETE' });
  };

  const addCourt = async (name?: string) => {
    const courtNumbers = courts
      .map(c => parseInt(c.name.replace('Court ', '')))
      .filter(n => !isNaN(n));
    const nextNum = courtNumbers.length > 0 ? Math.max(...courtNumbers) + 1 : 1;

    const result = await apiRequest<{ court: Court }>('/api/courts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name ? `Court ${name}` : `Court ${nextNum}` }),
    });
    setCourts(prev => [...prev, result.court]);
    return result.court.id;
  };

  const deleteCourt = async (id: string) => {
    const court = courts.find(c => c.id === id);
    if (court?.currentMatchId) {
      deleteMatch(court.currentMatchId);
    }
    setCourts(prev => prev.filter(c => c.id !== id));
    await apiRequest(`/api/courts/${id}`, { method: 'DELETE' });
  };

  const startMatch = async (matchData: any) => {
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

    const result = await apiRequest<{ match: Match }>('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...matchData,
        courtId: targetCourtId,
        teamASnapshots,
        teamBSnapshots,
      }),
    });

    const newMatch: Match = {
      ...result.match,
      courtId: targetCourtId,
      teamASnapshots,
      teamBSnapshots,
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
  };

  const updateMatchScore = (matchId: string, teamAScore: number, teamBScore: number) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, teamAScore, teamBScore } : m));
    apiRequest(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamAScore, teamBScore }),
    }).catch(console.error);
  };

  const endMatch = (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;

    const match = matches.find(m => m.id === court.currentMatchId);
    if (!match) return;

    const startTime = match.startTime ? new Date(match.startTime) : null;
    const playDuration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0;

    const endTime = new Date().toISOString();
    const completedMatch: Match = {
      ...match,
      isCompleted: status === 'completed',
      status,
      winner,
      teamAScore,
      teamBScore,
      endTime,
    };

    setMatches(prev => prev.map(m => 
      m.id === court.currentMatchId ? completedMatch : m
    ));

    setCourts(prev => prev.map(c => 
      c.id === courtId ? { ...c, status: 'available', currentMatchId: null } : c
    ));

    const updatedPlayers: Player[] = players.map(p => {
      if (![...match.teamA, ...match.teamB].includes(p.id)) return p;

      if (status === 'cancelled') {
        return { ...p, status: 'available' as const, lastAvailableAt: Date.now() };
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
        status: 'available' as const,
        lastAvailableAt: Date.now(),
        wins: (p.wins || 0) + (won ? 1 : 0),
        gamesPlayed: (p.gamesPlayed || 0) + 1,
        partnerHistory: newHistory,
        improvementScore: Math.max(0, (p.improvementScore || 0) + (won ? 5 : -2)),
        totalPlayTimeMinutes: (p.totalPlayTimeMinutes || 0) + playDuration
      };
    });

    setPlayers(updatedPlayers);

    apiRequest(`/api/matches/${match.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isCompleted: completedMatch.isCompleted,
        status: completedMatch.status,
        winner: completedMatch.winner,
        teamAScore: completedMatch.teamAScore,
        teamBScore: completedMatch.teamBScore,
        endTime,
        releaseCourtId: courtId,
        players: updatedPlayers
          .filter(p => [...match.teamA, ...match.teamB].includes(p.id))
          .map(p => ({ id: p.id, updates: p })),
      }),
    }).catch(console.error);

    // Trigger Auto-Advance if enabled
    if (autoAdvanceEnabled && status === 'completed') {
      autoAdvanceToCourt(courtId);
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
    apiRequest(`/api/matches/${matchId}`, { method: 'DELETE' }).catch(console.error);
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

    apiRequest(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamA: newTeamA,
        teamB: newTeamB,
        teamASnapshots: newTeamASnapshots,
        teamBSnapshots: newTeamBSnapshots,
        players: [
          { id: oldPlayerId, updates: { status: 'available', lastAvailableAt: Date.now() } },
          { id: newPlayerId, updates: { status: 'playing' } },
        ],
      }),
    }).catch(console.error);
  };

  const assignMatchToCourt = (matchId: string, courtId: string) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, courtId, status: 'ongoing' } : m));
    setCourts(prev => prev.map(c => 
      c.id === courtId 
        ? { ...c, status: 'occupied', currentMatchId: matchId } 
        : c
    ));
    apiRequest(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtId, status: 'ongoing' }),
    }).catch(console.error);
  };

  const createCourtAndAssignMatch = async (matchId: string) => {
    const newCourtId = await addCourt();
    assignMatchToCourt(matchId, newCourtId);
  };

  const startTimer = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (court?.currentMatchId) {
      const startTime = new Date().toISOString();
      setMatches(prev => prev.map(m => 
        m.id === court.currentMatchId 
          ? { ...m, startTime } 
          : m
      ));
      apiRequest(`/api/matches/${court.currentMatchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime }),
      }).catch(console.error);
    }
  };

  const updateFee = (data: any) => {
    let nextFees: Fee[] = [];
    setFees(prev => {
      const exists = prev.find(f => f.id === data.id);
      nextFees = exists
        ? prev.map(f => f.id === data.id ? { ...f, ...data } : f)
        : [...prev, { ...data, payments: {} }];
      persistSettings({ fees: nextFees });
      return nextFees;
    });
  };

  const togglePayment = (date: string, playerId: string) => {
    setFees(prev => {
      const nextFees = prev.map(f => {
        if (f.id !== date) return f;
        const payments = { ...f.payments };
        payments[playerId] = !payments[playerId];
        return { ...f, payments };
      });
      persistSettings({ fees: nextFees });
      return nextFees;
    });
  };

  const addPaymentMethod = (name: string, imageData: string) => {
    const newMethod: PaymentMethod = { id: generateId(), name, imageUrl: imageData };
    setPaymentMethods(prev => {
      const nextMethods = [...prev, newMethod];
      persistSettings({ paymentMethods: nextMethods });
      return nextMethods;
    });
  };

  const deletePaymentMethod = (id: string) => {
    setPaymentMethods(prev => {
      const nextMethods = prev.filter(pm => pm.id !== id);
      persistSettings({ paymentMethods: nextMethods });
      return nextMethods;
    });
  };

  const setClubLogo = (imageUrl: string | null) => {
    setClubLogoState(imageUrl);
    persistSettings({ clubLogo: imageUrl });
  };

  const setDefaultWinningScore = (score: number) => {
    setDefaultWinningScoreState(score);
    persistSettings({ defaultWinningScore: score });
  };

  const setAutoAdvanceEnabled = (enabled: boolean) => {
    setAutoAdvanceEnabledState(enabled);
    persistSettings({ autoAdvanceEnabled: enabled });
  };

  const resetDailyBoard = async () => {
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
    await apiRequest('/api/club-state', { method: 'PATCH' });
  };

  const wipeAllData = async () => {
    setPlayers([]);
    setCourts([]);
    setMatches([]);
    setFees([]);
    setPaymentMethods([]);
    setClubLogoState(null);
    setDefaultWinningScoreState(21);
    setAutoAdvanceEnabledState(true);
    setQueueSessionCodeState('TBC001');
    setCurrentPlayerId(null);
    localStorage.clear();
    await apiRequest('/api/club-state', { method: 'DELETE' });
  };

  if (!isLoaded) {
    return <SplashScreen logo={clubLogo} />;
  }

  return (
    <ClubContext.Provider value={{
      players, courts, matches, fees, paymentMethods, clubLogo, defaultWinningScore, autoAdvanceEnabled, queueSessionCode, currentPlayer,
      addPlayer, signUpPlayer, logInPlayer, logOutPlayer, joinQueueSession, regenerateQueueSessionCode, updatePlayer, deletePlayer, addCourt, deleteCourt,
      startMatch, startTimer, updateMatchScore, endMatch, swapPlayer, assignMatchToCourt, createCourtAndAssignMatch, updateFee, togglePayment,
      addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData, setClubLogo, deleteMatch, setDefaultWinningScore, setAutoAdvanceEnabled
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
