
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Player, Court, Match, Fee, PaymentMethod } from '@/lib/types';
import { SplashScreen } from '@/components/layout/SplashScreen';

interface ClubContextType {
  players: Player[];
  courts: Court[];
  matches: Match[];
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  clubLogo: string | null;
  courtCapacity: number;
  addPlayer: (player: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'partnerHistory' | 'status' | 'improvementScore' | 'totalPlayTimeMinutes' | 'lastAvailableAt'>) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  addCourt: (name?: string) => string;
  deleteCourt: (id: string) => void;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted'>) => void;
  startTimer: (courtId: string) => void;
  endMatch: (courtId: string, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => void;
  swapPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  createCourtAndAssignMatch: (matchId: string) => void;
  updateFee: (fee: Omit<Fee, 'payments'>) => void;
  togglePayment: (date: string, playerId: string) => void;
  addPaymentMethod: (name: string, imageData: string) => void;
  deletePaymentMethod: (id: string) => void;
  setClubLogo: (imageUrl: string | null) => void;
  resetDailyBoard: () => void;
  wipeAllData: () => void;
  setCourtCapacity: (capacity: number) => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PLAYERS: 'tbc_players',
  COURTS: 'tbc_courts',
  MATCHES: 'tbc_matches',
  FEES: 'tbc_fees',
  PAYMENT_METHODS: 'tbc_payment_methods',
  LOGO: 'tbc_logo',
  CAPACITY: 'tbc_court_capacity'
};

export function ClubProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [clubLogo, setClubLogoState] = useState<string | null>(null);
  const [courtCapacity, setCourtCapacityState] = useState<number>(4);
  const [isLoaded, setIsLoaded] = useState(false);

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
    setCourtCapacityState(Number(load(STORAGE_KEYS.CAPACITY, 4)));
    
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(courts));
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(fees));
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(paymentMethods));
    localStorage.setItem(STORAGE_KEYS.CAPACITY, JSON.stringify(courtCapacity));
    if (clubLogo) localStorage.setItem(STORAGE_KEYS.LOGO, clubLogo);
    else localStorage.removeItem(STORAGE_KEYS.LOGO);
  }, [players, courts, matches, fees, paymentMethods, clubLogo, courtCapacity, isLoaded]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addPlayer = (data: any) => {
    const newPlayer: Player = {
      ...data,
      id: generateId(),
      wins: 0,
      gamesPlayed: 0,
      partnerHistory: [],
      status: 'available',
      improvementScore: 0,
      totalPlayTimeMinutes: 0,
      lastAvailableAt: Date.now()
    };
    setPlayers(prev => [...prev, newPlayer]);
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
      const match = matches.find(m => m.id === court.currentMatchId);
      if (match) {
        setPlayers(prev => prev.map(p => 
          [...match.teamA, ...match.teamB].includes(p.id) 
            ? { ...p, status: 'available', lastAvailableAt: Date.now() } 
            : p
        ));
      }
    }
    setCourts(prev => prev.filter(c => c.id !== id));
  };

  const startMatch = (matchData: any) => {
    const newMatchId = generateId();
    let targetCourtId = matchData.courtId;

    // If no court specified, check if we can auto-assign based on capacity
    if (!targetCourtId) {
      const occupiedCount = courts.filter(c => c.status === 'occupied').length;
      if (occupiedCount < courtCapacity) {
        // Try to find an existing available court first
        const availableCourt = courts.find(c => c.status === 'available');
        if (availableCourt) {
          targetCourtId = availableCourt.id;
        } else if (courts.length < courtCapacity) {
          // If no available court but under capacity, create one
          targetCourtId = addCourt();
        }
      }
    }

    const newMatch: Match = {
      ...matchData,
      id: newMatchId,
      courtId: targetCourtId,
      timestamp: new Date().toISOString(),
      isCompleted: false
    };

    setMatches(prev => [newMatch, ...prev]);

    if (targetCourtId) {
      setCourts(prev => prev.map(c => 
        c.id === targetCourtId 
          ? { ...c, status: 'occupied', currentMatchId: newMatchId } 
          : c
      ));
    }

    setPlayers(prev => prev.map(p => 
      [...matchData.teamA, ...matchData.teamB].includes(p.id)
        ? { ...p, status: 'playing', gamesPlayed: (p.gamesPlayed || 0) + 1, lastAvailableAt: undefined }
        : p
    ));
  };

  const assignMatchToCourt = (matchId: string, courtId: string) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, courtId } : m));
    setCourts(prev => prev.map(c => 
      c.id === courtId 
        ? { ...c, status: 'occupied', currentMatchId: matchId } 
        : c
    ));
  };

  const createCourtAndAssignMatch = (matchId: string) => {
    const courtNumbers = courts
      .map(c => parseInt(c.name.replace('Court ', '')))
      .filter(n => !isNaN(n));
    const nextNum = courtNumbers.length > 0 ? Math.max(...courtNumbers) + 1 : 1;
    
    const newCourtId = generateId();
    const newCourt: Court = {
      id: newCourtId,
      name: `Court ${nextNum}`,
      status: 'occupied',
      currentMatchId: matchId
    };

    setCourts(prev => [...prev, newCourt]);
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, courtId: newCourtId } : m));
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

  const endMatch = (courtId: string, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;

    const match = matches.find(m => m.id === court.currentMatchId);
    if (!match) return;

    const startTime = match.startTime ? new Date(match.startTime) : null;
    const playDuration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0;

    setMatches(prev => prev.map(m => 
      m.id === court.currentMatchId 
        ? { ...m, isCompleted: true, winner, teamAScore, teamBScore } 
        : m
    ));

    setCourts(prev => prev.map(c => 
      c.id === courtId ? { ...c, status: 'available', currentMatchId: null } : c
    ));

    setPlayers(prev => prev.map(p => {
      if (![...match.teamA, ...match.teamB].includes(p.id)) return p;

      const isTeamA = match.teamA.includes(p.id);
      const partnerId = isTeamA ? match.teamA.find(id => id !== p.id) : match.teamB.find(id => id !== p.id);
      const newHistory = partnerId ? [partnerId, ...p.partnerHistory].slice(0, 5) : p.partnerHistory;
      
      let won = false;
      if (winner) {
        won = (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA);
      }

      return {
        ...p,
        status: 'available',
        lastAvailableAt: Date.now(),
        wins: won ? (p.wins || 0) + 1 : (p.wins || 0),
        partnerHistory: newHistory,
        improvementScore: Math.max(0, (p.improvementScore || 0) + (won ? 5 : -2)),
        totalPlayTimeMinutes: (p.totalPlayTimeMinutes || 0) + playDuration
      };
    }));
  };

  const swapPlayer = (matchId: string, oldPlayerId: string, newPlayerId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const isTeamA = match.teamA.includes(oldPlayerId);
    const newTeamA = isTeamA ? match.teamA.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamA;
    const newTeamB = !isTeamA ? match.teamB.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamB;

    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, teamA: newTeamA, teamB: newTeamB } : m));
    
    setPlayers(prev => prev.map(p => {
      if (p.id === oldPlayerId) return { ...p, status: 'available', lastAvailableAt: Date.now() };
      if (p.id === newPlayerId) return { ...p, status: 'playing', gamesPlayed: (p.gamesPlayed || 0) + 1, lastAvailableAt: undefined };
      return p;
    }));
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

  const setCourtCapacity = (capacity: number) => {
    setCourtCapacityState(capacity);
  };

  const resetDailyBoard = () => {
    setMatches(prev => prev.map(m => !m.isCompleted ? { ...m, isCompleted: true, winner: null } : m));
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
    setCourtCapacityState(4);
    localStorage.clear();
  };

  if (!isLoaded) {
    return <SplashScreen logo={clubLogo} />;
  }

  return (
    <ClubContext.Provider value={{
      players, courts, matches, fees, paymentMethods, clubLogo, courtCapacity,
      addPlayer, updatePlayer, deletePlayer, addCourt, deleteCourt,
      startMatch, startTimer, endMatch, swapPlayer, assignMatchToCourt, createCourtAndAssignMatch, updateFee, togglePayment,
      addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData, setClubLogo, setCourtCapacity
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
