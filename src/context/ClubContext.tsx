
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Player, Court, Match, Fee, PaymentMethod } from '@/lib/types';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  query, 
  orderBy,
  getFirestore,
  Firestore,
  serverTimestamp
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';

interface ClubContextType {
  players: Player[];
  courts: Court[];
  matches: Match[];
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  clubLogo: string | null;
  addPlayer: (player: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'partnerHistory' | 'status' | 'improvementScore' | 'totalPlayTimeMinutes' | 'lastAvailableAt'>) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  addCourt: (name: string) => void;
  deleteCourt: (id: string) => void;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted'>) => void;
  startTimer: (courtId: string) => void;
  endMatch: (courtId: string, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => void;
  swapPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  updateFee: (fee: Omit<Fee, 'payments'>) => void;
  togglePayment: (date: string, playerId: string) => void;
  addPaymentMethod: (name: string, imageData: string) => void;
  deletePaymentMethod: (id: string) => void;
  setClubLogo: (imageUrl: string | null) => void;
  resetDailyBoard: () => void;
  wipeAllData: () => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [clubLogo, setClubLogoState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    // Real-time listeners for all collections
    const unsubPlayers = onSnapshot(collection(firestore, 'players'), (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Player)));
    });

    const unsubCourts = onSnapshot(collection(firestore, 'courts'), (snapshot) => {
      setCourts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Court)));
    });

    const unsubMatches = onSnapshot(query(collection(firestore, 'matches'), orderBy('timestamp', 'desc')), (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Match)));
    });

    const unsubFees = onSnapshot(collection(firestore, 'fees'), (snapshot) => {
      setFees(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Fee)));
    });

    const unsubMethods = onSnapshot(collection(firestore, 'paymentMethods'), (snapshot) => {
      setPaymentMethods(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PaymentMethod)));
    });

    const unsubSettings = onSnapshot(doc(firestore, 'settings', 'branding'), (docSnap) => {
      if (docSnap.exists()) {
        setClubLogoState(docSnap.data().logo || null);
      }
    });

    setIsLoaded(true);

    return () => {
      unsubPlayers();
      unsubCourts();
      unsubMatches();
      unsubFees();
      unsubMethods();
      unsubSettings();
    };
  }, [firestore]);

  const addPlayer = (data: any) => {
    if (!firestore) return;
    addDoc(collection(firestore, 'players'), {
      ...data,
      wins: 0,
      gamesPlayed: 0,
      partnerHistory: [],
      status: 'available',
      improvementScore: 0,
      totalPlayTimeMinutes: 0,
      lastAvailableAt: Date.now()
    });
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'players', id), updates);
  };

  const deletePlayer = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'players', id));
  };

  const addCourt = (name: string) => {
    if (!firestore) return;
    addDoc(collection(firestore, 'courts'), {
      name: `Court ${name}`,
      status: 'available',
      currentMatchId: null
    });
  };

  const deleteCourt = (id: string) => {
    if (!firestore) return;
    const court = courts.find(c => c.id === id);
    if (court?.currentMatchId) {
      const match = matches.find(m => m.id === court.currentMatchId);
      if (match) {
        [...match.teamA, ...match.teamB].forEach(pid => {
          updatePlayer(pid, { status: 'available', lastAvailableAt: Date.now() });
        });
      }
    }
    deleteDoc(doc(firestore, 'courts', id));
  };

  const startMatch = (matchData: any) => {
    if (!firestore) return;
    addDoc(collection(firestore, 'matches'), {
      ...matchData,
      timestamp: new Date().toISOString(),
      isCompleted: false
    }).then(docRef => {
      const matchId = docRef.id;
      if (matchData.courtId) {
        updateDoc(doc(firestore, 'courts', matchData.courtId), {
          status: 'occupied',
          currentMatchId: matchId
        });
      }
      [...matchData.teamA, ...matchData.teamB].forEach(pid => {
        const p = players.find(player => player.id === pid);
        updateDoc(doc(firestore, 'players', pid), {
          status: 'playing',
          gamesPlayed: (p?.gamesPlayed || 0) + 1,
          lastAvailableAt: null
        });
      });
    });
  };

  const assignMatchToCourt = (matchId: string, courtId: string) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'matches', matchId), { courtId });
    updateDoc(doc(firestore, 'courts', courtId), { 
      status: 'occupied', 
      currentMatchId: matchId 
    });
  };

  const startTimer = (courtId: string) => {
    if (!firestore) return;
    const court = courts.find(c => c.id === courtId);
    if (court?.currentMatchId) {
      updateDoc(doc(firestore, 'matches', court.currentMatchId), {
        startTime: new Date().toISOString()
      });
    }
  };

  const endMatch = (courtId: string, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    if (!firestore) return;
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;

    const match = matches.find(m => m.id === court.currentMatchId);
    if (!match) return;

    const startTime = match.startTime ? new Date(match.startTime) : null;
    const playDuration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0;

    updateDoc(doc(firestore, 'matches', court.currentMatchId), {
      isCompleted: true,
      winner,
      teamAScore,
      teamBScore
    });

    updateDoc(doc(firestore, 'courts', courtId), {
      status: 'available',
      currentMatchId: null
    });

    [...match.teamA, ...match.teamB].forEach(pid => {
      const p = players.find(player => player.id === pid);
      if (!p) return;

      const isTeamA = match.teamA.includes(pid);
      const partnerId = isTeamA ? match.teamA.find(id => id !== pid) : match.teamB.find(id => id !== pid);
      const newHistory = partnerId ? [partnerId, ...p.partnerHistory].slice(0, 5) : p.partnerHistory;
      
      let won = false;
      if (winner) {
        won = (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA);
      }

      updateDoc(doc(firestore, 'players', pid), {
        status: 'available',
        lastAvailableAt: Date.now(),
        wins: won ? (p.wins || 0) + 1 : (p.wins || 0),
        partnerHistory: newHistory,
        improvementScore: Math.max(0, (p.improvementScore || 0) + (won ? 5 : -2)),
        totalPlayTimeMinutes: (p.totalPlayTimeMinutes || 0) + playDuration
      });
    });
  };

  const swapPlayer = (matchId: string, oldPlayerId: string, newPlayerId: string) => {
    if (!firestore) return;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const isTeamA = match.teamA.includes(oldPlayerId);
    const teamA = isTeamA ? match.teamA.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamA;
    const teamB = !isTeamA ? match.teamB.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamB;

    updateDoc(doc(firestore, 'matches', matchId), { teamA, teamB });
    updateDoc(doc(firestore, 'players', oldPlayerId), { status: 'available', lastAvailableAt: Date.now() });
    
    const newP = players.find(p => p.id === newPlayerId);
    updateDoc(doc(firestore, 'players', newPlayerId), { 
      status: 'playing', 
      gamesPlayed: (newP?.gamesPlayed || 0) + 1,
      lastAvailableAt: null 
    });
  };

  const updateFee = (data: any) => {
    if (!firestore) return;
    setDoc(doc(firestore, 'fees', data.id), data, { merge: true });
  };

  const togglePayment = (date: string, playerId: string) => {
    if (!firestore) return;
    const fee = fees.find(f => f.id === date);
    const payments = fee?.payments || {};
    updateDoc(doc(firestore, 'fees', date), {
      [`payments.${playerId}`]: !payments[playerId]
    });
  };

  const addPaymentMethod = (name: string, imageData: string) => {
    if (!firestore) return;
    addDoc(collection(firestore, 'paymentMethods'), { name, imageUrl: imageData });
  };

  const deletePaymentMethod = (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'paymentMethods', id));
  };

  const setClubLogo = (imageUrl: string | null) => {
    if (!firestore) return;
    setDoc(doc(firestore, 'settings', 'branding'), { logo: imageUrl }, { merge: true });
  };

  const resetDailyBoard = () => {
    // This would typically involve cloud functions for efficiency, 
    // but for MVP we loop through local lists to trigger updates.
    matches.filter(m => !m.isCompleted).forEach(m => {
      updateDoc(doc(firestore, 'matches', m.id), { isCompleted: true, winner: null });
    });
    players.forEach(p => {
      updateDoc(doc(firestore, 'players', p.id), {
        status: 'available',
        wins: 0,
        gamesPlayed: 0,
        totalPlayTimeMinutes: 0,
        partnerHistory: [],
        lastAvailableAt: Date.now()
      });
    });
    courts.forEach(c => {
      updateDoc(doc(firestore, 'courts', c.id), { status: 'available', currentMatchId: null });
    });
  };

  const wipeAllData = () => {
    // This requires administrative access or a specific wipe pattern.
    // In Firestore, we'd delete the documents individually.
    players.forEach(p => deleteDoc(doc(firestore, 'players', p.id)));
    courts.forEach(c => deleteDoc(doc(firestore, 'courts', c.id)));
    matches.forEach(m => deleteDoc(doc(firestore, 'matches', m.id)));
    fees.forEach(f => deleteDoc(doc(firestore, 'fees', f.id)));
    paymentMethods.forEach(pm => deleteDoc(doc(firestore, 'paymentMethods', pm.id)));
    setDoc(doc(firestore, 'settings', 'branding'), { logo: null });
  };

  if (!isLoaded) {
    return <SplashScreen logo={clubLogo} />;
  }

  return (
    <ClubContext.Provider value={{
      players, courts, matches, fees, paymentMethods, clubLogo,
      addPlayer, updatePlayer, deletePlayer, addCourt, deleteCourt,
      startMatch, startTimer, endMatch, swapPlayer, assignMatchToCourt, updateFee, togglePayment,
      addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData, setClubLogo
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
