'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
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
import { doc, collection, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

interface ClubSettings {
  clubLogo: string | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
  defaultCourtCount: number;
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
  addPlayer: (input: { name: string; skillLevel: number; playStyle: string }) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
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
  defaultCourtCount: number;
  setDefaultCourtCount: (count: number) => Promise<void>;
  queueSessionCode: string;
  
  // System
  resetDailyBoard: () => Promise<void>;
  clearClubData: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);
const ACTIVE_SESSION_STORAGE_KEY = 'tbc-active-session-id';

export function ClubProvider({ children }: { children: ReactNode }) {
  const { firestore, auth } = useFirebase();
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

  useEffect(() => {
    if (!user) {
      setActiveSession(null);
      setUserProfile(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      }
    } else if (profileData) {
      setUserProfile(profileData);
    }
  }, [profileData, user]);

  useEffect(() => {
    if (!firestore || !user?.uid || activeSession) return;

    const storedSessionId = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!storedSessionId) return;

    let isCancelled = false;

    const restoreSession = async () => {
      try {
        const sessionSnapshot = await getDoc(doc(firestore, 'sessions', storedSessionId));

        if (isCancelled) return;

        if (!sessionSnapshot.exists()) {
          window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          return;
        }

        const session = { ...sessionSnapshot.data(), id: sessionSnapshot.id } as QueueSession;

        if (session.status !== 'active') {
          window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
          return;
        }

        setActiveSession(session);
      } catch (error) {
        console.error('Failed to restore active session:', error);
        window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      }
    };

    restoreSession();

    return () => {
      isCancelled = true;
    };
  }, [firestore, user?.uid, activeSession]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (activeSession?.id) {
      window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSession.id);
    } else {
      window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
  }, [activeSession?.id]);

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

  const clubSettingsRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'clubSettings', 'config');
  }, [firestore, user?.uid]);
  const { data: clubSettings } = useDoc<ClubSettings>(clubSettingsRef);

  const role: 'player' | 'admin' | null = useMemo(() => {
    // Priority 1: Explicitly assigned in admin_roles collection
    if (adminRoleData) return 'admin';
    // Priority 2: Set within user profile document
    if (userProfile?.role === 'admin') return 'admin';
    if (userProfile?.role === 'player') return 'player';
    return null;
  }, [adminRoleData, userProfile]);
  
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
  
  const clubLogo = clubSettings?.clubLogo || null;
  const defaultWinningScore = clubSettings?.defaultWinningScore || 21;
  const autoAdvanceEnabled = clubSettings?.autoAdvanceEnabled ?? true;
  const defaultCourtCount = clubSettings?.defaultCourtCount ?? 0;
  const queueSessionCode = activeSession?.code || '';

  const joinSession = async (code: string, participate: boolean = true) => {
    const sessionCode = code.trim().toUpperCase();

    if (!firestore || !user?.uid) {
      throw new Error('You must be signed in to join a session.');
    }

    if (!sessionCode) {
      throw new Error('Session code is required.');
    }

    if (participate && !userProfile) {
      throw new Error('Your player profile is still loading. Try again in a moment.');
    }

    const sessionsRef = collection(firestore, 'sessions');
    const q = query(sessionsRef, where('code', '==', sessionCode), where('status', '==', 'active'));
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
        name: userProfile?.name || 'Unknown',
        skillLevel: userProfile?.skillLevel || 3
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

    for (let courtNumber = 1; courtNumber <= defaultCourtCount; courtNumber += 1) {
      const courtId = `court_${courtNumber}`;
      const court: Court = {
        id: courtId,
        name: `Court ${courtNumber}`,
        status: 'available',
        queue: [],
        estimatedWaitMinutes: 0,
        currentPlayers: []
      };
      await setDoc(doc(firestore, 'sessions', sessionId, 'courts', courtId), court);
    }

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

  const addPlayer = async (input: { name: string; skillLevel: number; playStyle: string }) => {
    if (!firestore || !activeSession?.id) return;
    const userId = 'member_' + Math.random().toString(36).substr(2, 9);
    const playerRef = doc(firestore, 'sessions', activeSession.id, 'players', userId);
    const playerData = {
      userId,
      sessionId: activeSession.id,
      status: 'available',
      joinedAt: new Date().toISOString(),
      lastAvailableAt: Date.now(),
      name: input.name,
      skillLevel: input.skillLevel
    };
    await setDoc(playerRef, playerData);
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    if (!firestore || !activeSession?.id) return;
    const playerRef = doc(firestore, 'sessions', activeSession.id, 'players', id);
    const sessionUpdates: any = {};
    if (updates.name) sessionUpdates.name = updates.name;
    if (updates.skillLevel) sessionUpdates.skillLevel = updates.skillLevel;
    if (updates.status) sessionUpdates.status = updates.status;
    await updateDoc(playerRef, sessionUpdates);
  };

  const deletePlayer = async (id: string) => {
    if (!firestore || !activeSession?.id) return;
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'players', id));
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
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { clubLogo: logo }, { merge: true });
  };

  const setDefaultWinningScore = async (score: number) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { defaultWinningScore: score }, { merge: true });
  };

  const setAutoAdvanceEnabled = async (enabled: boolean) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { autoAdvanceEnabled: enabled }, { merge: true });
  };

  const setDefaultCourtCount = async (count: number) => {
    if (!firestore) return;
    const safeCount = Math.max(0, Math.min(20, Math.floor(count)));
    await setDoc(doc(firestore, 'clubSettings', 'config'), { defaultCourtCount: safeCount }, { merge: true });
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

  const clearClubData = async () => {
    if (role !== 'admin') throw new Error('Unauthorized');

    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('You must be signed in to clear club data.');

    const response = await fetch('/api/admin/clear-club-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ scope: 'allSessions' }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to clear club data.');
    }

    setActiveSession(null);
  };

  return (
    <ClubContext.Provider value={{
      userProfile, activeSession, players, courts, matches, fees, paymentMethods, role,
      isSessionActive: !!activeSession, isProfileLoading, isAdminRoleLoading, currentPlayer,
      joinSession, createSession, regenerateQueueSessionCode, endSession,
      addPlayer, updatePlayer, deletePlayer,
      addCourt, deleteCourt, startMatch, endMatch, deleteMatch, assignMatchToCourt,
      updateFee, togglePayment, addPaymentMethod, deletePaymentMethod,
      clubLogo, setClubLogo, defaultWinningScore, setDefaultWinningScore,
      autoAdvanceEnabled, setAutoAdvanceEnabled, defaultCourtCount, setDefaultCourtCount, queueSessionCode,
      resetDailyBoard, clearClubData
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