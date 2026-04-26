
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Player, Court, Match, Fee, PaymentMethod } from '@/lib/types';

interface ClubContextType {
  players: Player[];
  courts: Court[];
  matches: Match[];
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  addPlayer: (player: Omit<Player, 'id' | 'gamesPlayed' | 'partnerHistory' | 'status' | 'improvementScore' | 'totalPlayTimeMinutes'>) => void;
  deletePlayer: (id: string) => void;
  addCourt: (name: string) => void;
  deleteCourt: (id: string) => void;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted'>) => void;
  startTimer: (courtId: string) => void;
  endMatch: (courtId: string, winner?: 'teamA' | 'teamB') => void;
  updateFee: (fee: Omit<Fee, 'payments'>) => void;
  togglePayment: (date: string, playerId: string) => void;
  addPaymentMethod: (name: string, imageData: string) => void;
  deletePaymentMethod: (id: string) => void;
  resetDailyBoard: () => void;
  wipeAllData: () => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem('breakfast_club_data');
      if (data) {
        const parsed = JSON.parse(data);
        setPlayers(parsed.players || []);
        setCourts(parsed.courts || []);
        setMatches(parsed.matches || []);
        setFees(parsed.fees || []);
        setPaymentMethods(parsed.paymentMethods || []);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        const dataToSave = JSON.stringify({
          players, courts, matches, fees, paymentMethods
        });
        localStorage.setItem('breakfast_club_data', dataToSave);
      } catch (e) {
        console.error("Failed to save data. You may have exceeded localStorage quota.", e);
      }
    }
  }, [players, courts, matches, fees, paymentMethods, isLoaded]);

  const addPlayer = (data: any) => {
    const newPlayer: Player = {
      ...data,
      id: Math.random().toString(36).substring(7),
      gamesPlayed: 0,
      partnerHistory: [],
      status: 'available',
      improvementScore: 0,
      totalPlayTimeMinutes: 0
    };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const deletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const addCourt = (name: string) => {
    const newCourt: Court = {
      id: Math.random().toString(36).substring(7),
      name: `Court ${name}`,
      status: 'available'
    };
    setCourts(prev => [...prev, newCourt]);
  };

  const deleteCourt = (id: string) => {
    const courtToDelete = courts.find(c => c.id === id);
    if (courtToDelete?.currentMatchId) {
      const match = matches.find(m => m.id === courtToDelete.currentMatchId);
      if (match) {
        const playerIds = [...match.teamA, ...match.teamB];
        setPlayers(prev => prev.map(p => 
          playerIds.includes(p.id) ? { ...p, status: 'available' } : p
        ));
      }
    }
    setCourts(prev => prev.filter(c => c.id !== id));
  };

  const startMatch = (matchData: any) => {
    const matchId = Math.random().toString(36).substring(7);
    const newMatch: Match = {
      ...matchData,
      id: matchId,
      timestamp: new Date().toISOString(),
      isCompleted: false
    };

    setMatches(prev => [...prev, newMatch]);
    setCourts(prev => prev.map(c => 
      c.id === matchData.courtId ? { ...c, status: 'occupied', currentMatchId: matchId } : c
    ));
    setPlayers(prev => prev.map(p => 
      [...matchData.teamA, ...matchData.teamB].includes(p.id) 
        ? { ...p, status: 'playing', gamesPlayed: p.gamesPlayed + 1 } 
        : p
    ));
  };

  const startTimer = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court || !court.currentMatchId) return;

    setMatches(prev => prev.map(m => 
      m.id === court.currentMatchId ? { ...m, startTime: new Date().toISOString() } : m
    ));
  };

  const endMatch = (courtId: string, winner?: 'teamA' | 'teamB') => {
    const court = courts.find(c => c.id === courtId);
    if (!court || !court.currentMatchId) return;

    const match = matches.find(m => m.id === court.currentMatchId);
    if (!match) return;

    const endTime = new Date();
    const startTime = match.startTime ? new Date(match.startTime) : null;
    const playDurationMinutes = startTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 60000) : 0;

    setMatches(prev => prev.map(m => m.id === court.currentMatchId ? { ...m, isCompleted: true, winner } : m));
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'available', currentMatchId: null } : c));
    
    setPlayers(prev => prev.map(p => {
      const isPart = [...match.teamA, ...match.teamB].includes(p.id);
      if (!isPart) return p;

      // Update partner history (add partner ID to start of array)
      const partnerId = match.teamA.includes(p.id) 
        ? match.teamA.find(id => id !== p.id) 
        : match.teamB.find(id => id !== p.id);
      
      const newHistory = partnerId ? [partnerId, ...p.partnerHistory].slice(0, 5) : p.partnerHistory;

      let impChange = 0;
      if (winner) {
        const isWinner = (winner === 'teamA' && match.teamA.includes(p.id)) || 
                         (winner === 'teamB' && match.teamB.includes(p.id));
        impChange = isWinner ? 5 : -2;
      }

      return { 
        ...p, 
        status: 'available', 
        partnerHistory: newHistory,
        improvementScore: Math.max(0, p.improvementScore + impChange),
        totalPlayTimeMinutes: p.totalPlayTimeMinutes + playDurationMinutes
      };
    }));
  };

  const updateFee = (data: any) => {
    setFees(prev => {
      const existing = prev.find(f => f.id === data.id);
      if (existing) {
        return prev.map(f => f.id === data.id ? { ...f, ...data } : f);
      }
      return [...prev, { ...data, payments: {} }];
    });
  };

  const togglePayment = (date: string, playerId: string) => {
    setFees(prev => {
      const existing = prev.find(f => f.id === date);
      if (existing) {
        return prev.map(f => {
          if (f.id === date) {
            const newPayments = { ...f.payments, [playerId]: !f.payments[playerId] };
            return { ...f, payments: newPayments };
          }
          return f;
        });
      }
      return [...prev, { 
        id: date, 
        shuttleFee: 0, 
        courtFee: 0, 
        entranceFee: 0, 
        payments: { [playerId]: true } 
      }];
    });
  };

  const addPaymentMethod = (name: string, imageData: string) => {
    const newMethod: PaymentMethod = {
      id: Math.random().toString(36).substring(7),
      name,
      imageUrl: imageData
    };
    setPaymentMethods(prev => [...prev, newMethod]);
  };

  const deletePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  };

  const resetDailyBoard = () => {
    setMatches([]);
    setPlayers(prev => prev.map(p => ({ ...p, status: 'available', gamesPlayed: 0, totalPlayTimeMinutes: 0, partnerHistory: [] })));
    setCourts(prev => prev.map(c => ({ ...c, status: 'available', currentMatchId: null })));
  };

  const wipeAllData = () => {
    setPlayers([]);
    setCourts([]);
    setMatches([]);
    setFees([]);
    setPaymentMethods([]);
    localStorage.removeItem('breakfast_club_data');
  };

  return (
    <ClubContext.Provider value={{
      players, courts, matches, fees, paymentMethods,
      addPlayer, deletePlayer, addCourt, deleteCourt,
      startMatch, startTimer, endMatch, updateFee, togglePayment,
      addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData
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
