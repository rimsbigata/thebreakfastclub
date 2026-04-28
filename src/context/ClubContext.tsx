
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  UserProfile, 
  QueueSession, 
  SessionPlayer, 
  Player, 
  Court, 
  Match, 
  MatchStatus,
  Fee,
  PaymentMethod
} from '@/lib/types';
import { useFirebase, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ClubSettings {
  clubLogo: string | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
}

interface ClubContextType {
  userProfile: UserProfile | null;
  activeSession: QueueSession | null;
  players: Player[];
  courts: Court[];
  matches: Match[];
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  role: 'player' | 'admin' | null;
  isSessionActive: boolean;
  isProfileLoading: boolean;
  isAdminRoleLoading: boolean;
  currentPlayer: Player | null;
  
  // Auth & Session
  joinSession: (code: string, participate?: boolean) => Promise<void>;
  createSession: () => Promise<string>;
  regenerateQueueSessionCode: () => Promise<string>;
  endSession: () => Promise<void>;
  
  // Admin Controls
  addCourt: (name?: string) => Promise<string>;
  deleteCourt: (id: string) => Promise<void>;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted' | 'status' | 'teamASnapshots' | 'teamBSnapshots'>) => Promise<void>;
  endMatch: (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => void;
  deleteMatch: (matchId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  
  // Financials
  updateFee: (fee: Partial<Fee> & { id: string }) => Promise<void>;
  togglePayment: (date: string, playerId: string) => Promise<void>;
  addPaymentMethod: (name: string, imageUrl: string) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  
  // Global Settings
  clubLogo: string | null;
  setClubLogo: (logo: string | null) => Promise<void>;
  defaultWinningScore: number;
  setDefaultWinningScore: (score: number) => Promise<void>;
  autoAdvanceEnabled: boolean;
  setAutoAdvanceEnabled: (enabled: boolean) => Promise<void>;
  queueSessionCode: string;
  
  // System
  resetDailyBoard: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [activeSession, setActiveSession] = useState<QueueSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'userProfiles', user.uid);
  }, [firestore, user?.uid]);
  const { data: profileData, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const adminRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'admin_roles', user.uid);
  }, [firestore, user?.uid]);
  const { data: adminRoleData, isLoading: isAdminRoleLoading } = useDoc(adminRoleRef);

  // Clear state on logout to prevent permission errors on listeners
  useEffect(() => {
    if (!user) {
      setActiveSession(null);
      setUserProfile(null);
    } else if (profileData) {
      setUserProfile(profileData);
    }
  }, [profileData, user]);

  const playersQuery = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id || !user?.uid) return null;
    return collection(firestore, 'sessions', activeSession.id, 'players');
  }, [firestore, activeSession?.id, user?.uid]);
  const { data: sessionPlayers } = useCollection<SessionPlayer>(playersQuery);

  const courtsQuery = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id || !user?.uid) return null;
    return collection(firestore, 'sessions', activeSession.id, 'courts');
  }, [firestore, activeSession?.id, user?.uid]);
  const { data: sessionCourts } = useCollection<Court>(courtsQuery);

  const matchesQuery = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id || !user?.uid) return null;
    return collection(firestore, 'sessions', activeSession.id, 'matches');
  }, [firestore, activeSession?.id, user?.uid]);
  const { data: sessionMatches } = useCollection<Match>(matchesQuery);

  const feesQuery = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id || !user?.uid) return null;
    return collection(firestore, 'sessions', activeSession.id, 'fees');
  }, [firestore, activeSession?.id, user?.uid]);
  const { data: sessionFees } = useCollection<Fee>(feesQuery);

  const paymentMethodsQuery = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id || !user?.uid) return null;
    return collection(firestore, 'sessions', activeSession.id, 'paymentMethods');
  }, [firestore, activeSession?.id, user?.uid]);
  const { data: sessionPaymentMethods } = useCollection<PaymentMethod>(paymentMethodsQuery);

  const settingsRef = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id || !user?.uid) return null;
    return doc(firestore, 'sessions', activeSession.id, 'settings', 'config');
  }, [firestore, activeSession?.id, user?.uid]);
  const { data: sessionSettings } = useDoc<ClubSettings>(settingsRef);

  const role: 'player' | 'admin' | null = adminRoleData ? 'admin' : (userProfile?.role as any || null);
  
  const players: Player[] = (sessionPlayers || []).map(sp => ({
    id: sp.userId,
    name: sp.name || 'Unknown',
    role: 'player',
    status: sp.status,
    skillLevel: sp.skillLevel || 3,
    wins: 0,
    gamesPlayed: 0,
    partnerHistory: [],
    improvementScore: 0,
    totalPlayTimeMinutes: 0,
    lastAvailableAt: sp.lastAvailableAt
  }));

  const currentPlayer = players.find(p => p.id === user?.uid) || null;
  const courts: Court[] = sessionCourts || [];
  const matches: Match[] = sessionMatches || [];
  const fees: Fee[] = sessionFees || [];
  const paymentMethods: PaymentMethod[] = sessionPaymentMethods || [];
  
  const clubLogo = sessionSettings?.clubLogo || null;
  const defaultWinningScore = sessionSettings?.defaultWinningScore || 21;
  const autoAdvanceEnabled = sessionSettings?.autoAdvanceEnabled ?? true;
  const queueSessionCode = activeSession?.code || '';

  const joinSession = async (code: string, participate: boolean = true) => {
    if (!firestore || !user?.uid || !userProfile) return;
    const sessionsRef = collection(firestore, 'sessions');
    const q = query(sessionsRef, where('code', '==', code.toUpperCase()), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error('Valid session code required');
    
    const sessionDoc = snapshot.docs[0];
    const session = { ...sessionDoc.data(), id: sessionDoc.id } as QueueSession;

    if (participate) {
      const playerRef = doc(firestore, 'sessions', session.id, 'players', user.uid);
      const playerData = {
        userId: user.uid,
        sessionId: session.id,
        status: 'available',
        joinedAt: new Date().toISOString(),
        lastAvailableAt: Date.now(),
        name: userProfile.name,
        skillLevel: userProfile.skillLevel || 3
      };
      await setDoc(playerRef, playerData);
    }
    
    setActiveSession(session);
  };

  const createSession = async () => {
    if (!firestore || !user?.uid || role !== 'admin') throw new Error('Unauthorized');
    const sessionId = Math.random().toString(36).substr(2, 9);
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const session: QueueSession = {
      id: sessionId,
      code,
      status: 'active',
      createdBy: user.uid,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(firestore, 'sessions', sessionId), session);
    setActiveSession(session);
    return code;
  };

  const regenerateQueueSessionCode = async () => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    const newCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    await updateDoc(doc(firestore, 'sessions', activeSession.id), { code: newCode });
    setActiveSession(prev => prev ? { ...prev, code: newCode } : null);
    return newCode;
  };

  const endSession = async () => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    await updateDoc(doc(firestore, 'sessions', activeSession.id), { status: 'inactive' });
    setActiveSession(null);
  };

  const addCourt = async (name?: string) => {
    if (!firestore || !activeSession?.id) return '';
    const courtId = Math.random().toString(36).substr(2, 9);
    const court: Court = {
      id: courtId,
      name: name || `Court ${courts.length + 1}`,
      status: 'available',
      queue: [],
      estimatedWaitMinutes: 0,
      currentPlayers: []
    };
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), court);
    return courtId;
  };

  const deleteCourt = async (id: string) => {
    if (!firestore || !activeSession?.id) return;
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'courts', id));
  };

  const startMatch = async (matchData: any) => {
    if (!firestore || !activeSession?.id) return;
    const matchId = Math.random().toString(36).substr(2, 9);
    const match: Match = { ...matchData, id: matchId, timestamp: new Date().toISOString(), isCompleted: false, status: 'ongoing' };
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), match);
    
    if (matchData.courtId) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', matchData.courtId), { status: 'occupied', currentMatchId: matchId });
    }
    for (const pid of [...matchData.teamA, ...matchData.teamB]) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', pid), { status: 'playing' });
    }
  };

  const endMatch = async (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    if (!firestore || !activeSession?.id) return;
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', court.currentMatchId), {
      isCompleted: status === 'completed',
      status, winner, teamAScore, teamBScore, endTime: new Date().toISOString()
    });
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), { status: 'available', currentMatchId: null });
    const match = matches.find(m => m.id === court.currentMatchId);
    if (match) {
      for (const pid of [...match.teamA, ...match.teamB]) {
        await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', pid), { status: 'available', lastAvailableAt: Date.now() });
      }
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!firestore || !activeSession?.id) return;
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId));
  };

  const assignMatchToCourt = async (matchId: string, courtId: string) => {
    if (!firestore || !activeSession?.id) return;
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), { courtId });
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), { status: 'occupied', currentMatchId: matchId });
  };

  const updateFee = async (feeData: Partial<Fee> & { id: string }) => {
    if (!firestore || !activeSession?.id) return;
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'fees', feeData.id), feeData, { merge: true });
  };

  const togglePayment = async (date: string, playerId: string) => {
    if (!firestore || !activeSession?.id) return;
    const fee = fees.find(f => f.id === date);
    const payments = { ...(fee?.payments || {}) };
    payments[playerId] = !payments[playerId];
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'fees', date), { payments });
  };

  const addPaymentMethod = async (name: string, imageUrl: string) => {
    if (!firestore || !activeSession?.id) return;
    const id = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'paymentMethods', id), { id, name, imageUrl });
  };

  const deletePaymentMethod = async (id: string) => {
    if (!firestore || !activeSession?.id) return;
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'paymentMethods', id));
  };

  const setClubLogo = async (logo: string | null) => {
    if (!firestore || !activeSession?.id) return;
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'settings', 'config'), { clubLogo: logo }, { merge: true });
  };

  const setDefaultWinningScore = async (score: number) => {
    if (!firestore || !activeSession?.id) return;
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'settings', 'config'), { defaultWinningScore: score }, { merge: true });
  };

  const setAutoAdvanceEnabled = async (enabled: boolean) => {
    if (!firestore || !activeSession?.id) return;
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'settings', 'config'), { autoAdvanceEnabled: enabled }, { merge: true });
  };

  const resetDailyBoard = async () => {
    if (!firestore || !activeSession?.id) return;
    for (const match of matches.filter(m => !m.isCompleted)) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', match.id), { isCompleted: true, status: 'cancelled' });
    }
    for (const court of courts) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', court.id), { status: 'available', currentMatchId: null });
    }
    for (const player of sessionPlayers || []) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', player.userId), { status: 'available', lastAvailableAt: Date.now() });
    }
  };

  return (
    <ClubContext.Provider value={{
      userProfile, activeSession, players, courts, matches, fees, paymentMethods, role,
      isSessionActive: !!activeSession, isProfileLoading, isAdminRoleLoading, currentPlayer,
      joinSession, createSession, regenerateQueueSessionCode, endSession,
      addCourt, deleteCourt, startMatch, endMatch, deleteMatch, assignMatchToCourt,
      updateFee, togglePayment, addPaymentMethod, deletePaymentMethod,
      clubLogo, setClubLogo, defaultWinningScore, setDefaultWinningScore,
      autoAdvanceEnabled, setAutoAdvanceEnabled, queueSessionCode,
      resetDailyBoard
    }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (context === undefined) throw new Error('useClub must be used within a ClubProvider');
  return context;
}
