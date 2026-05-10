
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
  PaymentMethod,
  BoostSchedule
} from '@/lib/types';
import { useFirebase, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';
import { sendYourTurnNotification, sendNotification, sendMatchQueuedNotification, sendCourtAssignedNotification } from '@/lib/notificationUtils';
import { getLocalStorageService } from '@/lib/localStorageService';

interface ClubSettings {
  clubLogo: string | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
  defaultCourtCount: number;
  deuceEnabled: boolean;
  autoRestEnabled: boolean;
}

interface ClubContextType {
  userProfile: UserProfile | null;
  activeSession: QueueSession | null;
  players: Player[];
  courts: Court[];
  matches: Match[];
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  role: 'player' | 'admin' | 'queueMaster' | null;
  isSessionActive: boolean;
  isProfileLoading: boolean;
  isAdminRoleLoading: boolean;
  isRestoringSession: boolean;
  currentPlayer: Player | null;

  // Auth & Session
  joinSession: (code: string, participate?: boolean, joinAsPlayer?: boolean) => Promise<string>;
  createSession: (isDoubleStar?: boolean, sessionCode?: string, venueName?: string, scheduledDate?: string, scheduledTime?: string) => Promise<string>;
  regenerateQueueSessionCode: () => Promise<string>;
  endSession: () => Promise<void>;
  loadSessionById: (sessionId: string) => Promise<void>;
  endSessionById: (sessionId: string) => Promise<void>;
  getAllSessions: () => Promise<QueueSession[]>;

  // Admin Controls
  addPlayer: (input: { name: string; skillLevel: number; playStyle: string }) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  addCourt: (name?: string) => Promise<string>;
  updateCourt: (id: string, updates: Partial<Court>) => Promise<void>;
  deleteCourt: (id: string) => Promise<void>;
  updateFcmToken: (token: string) => Promise<void>;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted' | 'status' | 'teamASnapshots' | 'teamBSnapshots'>) => Promise<void>;
  startTimer: (courtId: string) => Promise<void>;
  updateMatchScore: (matchId: string, teamAScore: number, teamBScore: number) => Promise<void>;
  endMatch: (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => void;
  swapPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => Promise<void>;
  deleteMatch: (matchId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  createCourtAndAssignMatch: (matchId: string) => Promise<void>;

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
  deuceEnabled: boolean;
  setDeuceEnabled: (enabled: boolean) => Promise<void>;
  autoRestEnabled: boolean;
  setAutoRestEnabled: (enabled: boolean) => Promise<void>;
  queueSessionCode: string;

  // Boost Schedules
  boostSchedules: BoostSchedule[];
  addBoostSchedule: (date: string, venueName?: string, scheduledTime?: string) => Promise<{ sessionCode: string; sessionId: string }>;
  deleteBoostSchedule: (id: string) => Promise<void>;
  upcomingBoost?: BoostSchedule;

  // System
  resetDailyBoard: () => Promise<void>;
  clearClubData: () => Promise<void>;
  sendTestNotification: () => Promise<boolean>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);
const ACTIVE_SESSION_STORAGE_KEY = 'tbc-active-session-id';

export function ClubProvider({ children }: { children: ReactNode }) {
  const { firestore, auth } = useFirebase();
  const { user } = useUser();

  const [activeSession, setActiveSession] = useState<QueueSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

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
    const restoreSession = async () => {
      setIsRestoringSession(true);
      try {
        const sessionSnapshot = await getDoc(doc(firestore, 'sessions', storedSessionId));
        if (!sessionSnapshot.exists()) return;
        const session = { ...sessionSnapshot.data(), id: sessionSnapshot.id } as QueueSession;
        if (session.status === 'active') {
          setActiveSession(session);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsRestoringSession(false);
      }
    };
    restoreSession();
  }, [firestore, user?.uid, activeSession]);

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
  const { data: sessionSettings } = useDoc<ClubSettings>(clubSettingsRef);

  const boostSchedulesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'boost_schedules');
  }, [firestore, user?.uid]);
  const { data: boostSchedules } = useCollection<BoostSchedule>(boostSchedulesRef);

  const upcomingBoost = useMemo(() => {
    if (!boostSchedules) return undefined;
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    return boostSchedules
      .filter(bs => bs.isActive)
      .find(bs => {
        const boostDate = new Date(bs.date);
        return boostDate >= today && boostDate <= threeDaysFromNow;
      });
  }, [boostSchedules]);

  const role: 'player' | 'admin' | 'queueMaster' | null = useMemo(() => {
    if (adminRoleData) return 'admin';
    if (userProfile?.role === 'admin') return 'admin';
    if (userProfile?.role === 'queueMaster') {
      if (userProfile.roleExpiresAt && new Date(userProfile.roleExpiresAt) < new Date()) return 'player';
      return 'queueMaster';
    }
    return userProfile?.role || null;
  }, [adminRoleData, userProfile]);

  const players: Player[] = (sessionPlayers || []).map(sp => ({
    id: sp.userId,
    name: sp.name || 'Unknown',
    role: 'player',
    status: sp.status,
    skillLevel: sp.skillLevel || 3,
    wins: (sp as any).wins || 0,
    gamesPlayed: (sp as any).gamesPlayed || 0,
    partnerHistory: (sp as any).partnerHistory || [],
    improvementScore: (sp as any).improvementScore || 0,
    totalPlayTimeMinutes: (sp as any).totalPlayTimeMinutes || 0,
    lastAvailableAt: sp.lastAvailableAt,
    stars: (sp as any).stars || 0
  }));

  const currentPlayer = players.find(p => p.id === user?.uid) || null;
  const courts: Court[] = sessionCourts || [];
  const matches: Match[] = sessionMatches || [];
  const fees: Fee[] = sessionFees || [];
  const paymentMethods: PaymentMethod[] = sessionPaymentMethods || [];

  const clubLogo = sessionSettings?.clubLogo || null;
  const defaultWinningScore = sessionSettings?.defaultWinningScore || 21;
  const autoAdvanceEnabled = sessionSettings?.autoAdvanceEnabled ?? true;
  const defaultCourtCount = sessionSettings?.defaultCourtCount ?? 0;
  const deuceEnabled = sessionSettings?.deuceEnabled ?? true;
  const autoRestEnabled = sessionSettings?.autoRestEnabled ?? false;
  const queueSessionCode = activeSession?.code || '';

  const updateFcmToken = async (token: string) => {
    if (!firestore || !user?.uid) return;
    try {
      const batch = writeBatch(firestore);
      // Update global profile
      batch.update(doc(firestore, 'userProfiles', user.uid), { fcmToken: token });
      // Update session record if active
      if (activeSession?.id) {
        batch.update(doc(firestore, 'sessions', activeSession.id, 'players', user.uid), { fcmToken: token });
      }
      await batch.commit();
    } catch (error) {
      console.error('Update FCM failed:', error);
    }
  };

  const startMatch = async (matchData: any) => {
    if (!firestore || !activeSession?.id || role === 'player') throw new Error('Unauthorized');
    const matchId = Math.random().toString(36).substr(2, 9);
    const match: Match = {
      id: matchId,
      teamA: matchData.teamA,
      teamB: matchData.teamB,
      teamASnapshots: matchData.teamA.map((id: string) => {
        const p = players.find(player => player.id === id);
        return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };
      }),
      teamBSnapshots: matchData.teamB.map((id: string) => {
        const p = players.find(player => player.id === id);
        return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };
      }),
      teamAScore: 0,
      teamBScore: 0,
      timestamp: new Date().toISOString(),
      isCompleted: false,
      status: 'ongoing',
      ...(matchData.courtId ? { courtId: matchData.courtId } : {}),
    };

    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), match);
    if (matchData.courtId) {
      batch.update(doc(firestore, 'sessions', activeSession.id, 'courts', matchData.courtId), { 
        status: 'occupied', 
        currentMatchId: matchId 
      });
    }
    for (const pid of [...matchData.teamA, ...matchData.teamB]) {
      batch.update(doc(firestore, 'sessions', activeSession.id, 'players', pid), { status: 'playing' });
    }
    await batch.commit();

    const teamANames = matchData.teamA.map((id: string) => players.find(p => p.id === id)?.name || 'Unknown').join(' & ');
    const teamBNames = matchData.teamB.map((id: string) => players.find(p => p.id === id)?.name || 'Unknown').join(' & ');
    if (matchData.courtId) {
      const court = courts.find(c => c.id === matchData.courtId);
      await sendCourtAssignedNotification([...matchData.teamA, ...matchData.teamB], teamANames, teamBNames, court?.name || 'Court', matchId);
    } else {
      await sendMatchQueuedNotification([...matchData.teamA, ...matchData.teamB], teamANames, teamBNames, matchId);
    }
  };

  const endMatch = async (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    if (!firestore || !activeSession?.id || role === 'player') throw new Error('Unauthorized');
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;
    const match = matches.find(m => m.id === court.currentMatchId);
    if (!match) return;

    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'sessions', activeSession.id, 'matches', court.currentMatchId), {
      isCompleted: status === 'completed',
      status,
      endTime: new Date().toISOString(),
      ...(winner ? { winner } : {}),
      ...(teamAScore !== undefined ? { teamAScore } : {}),
      ...(teamBScore !== undefined ? { teamBScore } : {}),
    });
    batch.update(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), { 
      status: 'available', 
      currentMatchId: null 
    });

    const startTime = match.startTime ? new Date(match.startTime).getTime() : null;
    const playDuration = startTime ? Math.floor((Date.now() - startTime) / 60000) : 0;

    for (const pid of [...match.teamA, ...match.teamB]) {
      const p = players.find(player => player.id === pid);
      const isTeamA = match.teamA.includes(pid);
      const partnerId = isTeamA ? match.teamA.find(id => id !== pid) : match.teamB.find(id => id !== pid);
      const won = status === 'completed' && winner
        ? (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA)
        : false;
      const nextStatus = autoRestEnabled ? 'resting' : 'available';
      batch.update(doc(firestore, 'sessions', activeSession.id, 'players', pid), {
        status: nextStatus,
        lastAvailableAt: Date.now(),
        wins: (p?.wins || 0) + (won ? 1 : 0),
        gamesPlayed: (p?.gamesPlayed || 0) + (status === 'completed' ? 1 : 0),
        partnerHistory: partnerId ? [partnerId, ...(p?.partnerHistory || [])].slice(0, 5) : (p?.partnerHistory || []),
        improvementScore: Math.max(0, (p?.improvementScore || 0) + (won ? 5 : status === 'completed' ? -2 : 0)),
        totalPlayTimeMinutes: (p?.totalPlayTimeMinutes || 0) + playDuration,
      });
    }
    await batch.commit();

    if (status === 'completed' && autoAdvanceEnabled) {
      const nextMatch = matches
        .filter(m => !m.isCompleted && !m.courtId && m.id !== court.currentMatchId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
      if (nextMatch) await assignMatchToCourt(nextMatch.id, courtId);
    }
  };

  const assignMatchToCourt = async (matchId: string, courtId: string) => {
    if (!firestore || !activeSession?.id || role === 'player') throw new Error('Unauthorized');
    const match = matches.find(m => m.id === matchId);
    const court = courts.find(c => c.id === courtId);
    if (!match || !court) return;

    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), { courtId });
    batch.update(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), { 
      status: 'occupied', 
      currentMatchId: matchId 
    });
    await batch.commit();

    const teamANames = match.teamA.map(id => players.find(p => p.id === id)?.name || 'Unknown').join(' & ');
    const teamBNames = match.teamB.map(id => players.find(p => p.id === id)?.name || 'Unknown').join(' & ');
    await sendCourtAssignedNotification([...match.teamA, ...match.teamB], teamANames, teamBNames, court.name, matchId);
  };

  const createCourtAndAssignMatch = async (matchId: string) => {
    const courtId = await addCourt();
    await assignMatchToCourt(matchId, courtId);
  };

  const joinSession = async (code: string, participate: boolean = true, joinAsPlayer: boolean = false) => {
    if (!firestore || !user?.uid) throw new Error('Not signed in');
    const sessionCode = code.trim().toUpperCase();
    const q = query(collection(firestore, 'sessions'), where('code', '==', sessionCode), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error('Invalid code');
    const sessionDoc = snapshot.docs[0];
    const session = { ...sessionDoc.data(), id: sessionDoc.id } as QueueSession;
    if (participate) {
      await setDoc(doc(firestore, 'sessions', session.id, 'players', user.uid), {
        userId: user.uid,
        status: 'available',
        joinedAt: new Date().toISOString(),
        lastAvailableAt: Date.now(),
        name: userProfile?.name || 'Unknown',
        skillLevel: userProfile?.skillLevel || 3
      });
    }
    setActiveSession(session);
    return session.id;
  };

  const createSession = async (isDoubleStar = false, sessionCode = '', venueName = '', scheduledDate = '', scheduledTime = '') => {
    if (!firestore || !user?.uid || role !== 'admin') throw new Error('Unauthorized');
    const sessionId = Math.random().toString(36).substr(2, 9);
    const code = sessionCode || Math.random().toString(36).substr(2, 6).toUpperCase();
    const session: QueueSession = {
      id: sessionId,
      code,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      venueName,
      scheduledDate,
      scheduledTime,
      isDoubleStar
    };
    await setDoc(doc(firestore, 'sessions', sessionId), session);
    const count = sessionSettings?.defaultCourtCount || 0;
    for (let i = 1; i <= count; i++) {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(firestore, 'sessions', sessionId, 'courts', id), {
        id, name: `Court ${i}`, status: 'available', queue: [], estimatedWaitMinutes: 0, currentPlayers: []
      });
    }
    setActiveSession(session);
    return sessionId;
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

  const loadSessionById = async (sessionId: string) => {
    const snap = await getDoc(doc(firestore, 'sessions', sessionId));
    if (!snap.exists()) throw new Error('Not found');
    const session = { ...snap.data(), id: snap.id } as QueueSession;
    if (session.status !== 'active') throw new Error('Inactive');
    setActiveSession(session);
  };

  const endSessionById = async (sessionId: string) => {
    if (role !== 'admin') throw new Error('Unauthorized');
    await updateDoc(doc(firestore, 'sessions', sessionId), { status: 'inactive' });
  };

  const getAllSessions = async () => {
    if (role !== 'admin') throw new Error('Unauthorized');
    const snap = await getDocs(collection(firestore, 'sessions'));
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as QueueSession));
  };

  const addPlayer = async (input: { name: string; skillLevel: number; playStyle: string }) => {
    if (!activeSession?.id || role === 'player') throw new Error('Unauthorized');
    const id = 'member_' + Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'players', id), {
      userId: id, status: 'available', joinedAt: new Date().toISOString(), lastAvailableAt: Date.now(),
      name: input.name, skillLevel: input.skillLevel
    });
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    if (!activeSession?.id || role === 'player') throw new Error('Unauthorized');
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', id), updates);
  };

  const deletePlayer = async (id: string) => {
    if (!activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'players', id));
  };

  const addCourt = async (name?: string) => {
    if (!activeSession?.id || role === 'player') throw new Error('Unauthorized');
    const id = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'courts', id), {
      id, name: name || `Court ${courts.length + 1}`, status: 'available', queue: [], estimatedWaitMinutes: 0, currentPlayers: []
    });
    return id;
  };

  const updateCourt = async (id: string, updates: Partial<Court>) => {
    if (!activeSession?.id || role === 'player') throw new Error('Unauthorized');
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', id), updates);
  };

  const deleteCourt = async (id: string) => {
    if (!activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    const court = courts.find(c => c.id === id);
    if (court?.currentMatchId) {
      const match = matches.find(m => m.id === court.currentMatchId);
      if (match) {
        const batch = writeBatch(firestore);
        for (const pid of [...match.teamA, ...match.teamB]) {
          batch.update(doc(firestore, 'sessions', activeSession.id, 'players', pid), { status: 'available', lastAvailableAt: Date.now() });
        }
        batch.delete(doc(firestore, 'sessions', activeSession.id, 'matches', match.id));
        await batch.commit();
      }
    }
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'courts', id));
  };

  const startTimer = async (courtId: string) => {
    if (!activeSession?.id || role === 'player') throw new Error('Unauthorized');
    const court = courts.find(c => c.id === courtId);
    if (court?.currentMatchId) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', court.currentMatchId), { startTime: new Date().toISOString() });
    }
  };

  const updateMatchScore = async (matchId: string, teamAScore: number, teamBScore: number) => {
    if (!activeSession?.id || role === 'player') throw new Error('Unauthorized');
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), { teamAScore, teamBScore });
  };

  const swapPlayer = async (matchId: string, oldId: string, newId: string) => {
    if (!activeSession?.id || role === 'player') throw new Error('Unauthorized');
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const replacement = players.find(p => p.id === newId);
    const snap = { id: newId, name: replacement?.name || 'Unknown', skillLevel: replacement?.skillLevel || 3 };
    const isA = match.teamA.includes(oldId);
    const teamA = isA ? match.teamA.map(i => i === oldId ? newId : i) : match.teamA;
    const teamB = !isA ? match.teamB.map(i => i === oldId ? newId : i) : match.teamB;
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), { teamA, teamB });
    batch.update(doc(firestore, 'sessions', activeSession.id, 'players', oldId), { status: 'available', lastAvailableAt: Date.now() });
    batch.update(doc(firestore, 'sessions', activeSession.id, 'players', newId), { status: 'playing' });
    await batch.commit();
    if (match.courtId) {
      const c = courts.find(x => x.id === match.courtId);
      await sendYourTurnNotification(newId, match.courtId, c?.name);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    const match = matches.find(m => m.id === id);
    const batch = writeBatch(firestore);
    if (match?.courtId) batch.update(doc(firestore, 'sessions', activeSession.id, 'courts', match.courtId), { status: 'available', currentMatchId: null });
    if (match) {
      for (const pid of [...match.teamA, ...match.teamB]) {
        batch.update(doc(firestore, 'sessions', activeSession.id, 'players', pid), { status: 'available', lastAvailableAt: Date.now() });
      }
    }
    batch.delete(doc(firestore, 'sessions', activeSession.id, 'matches', id));
    await batch.commit();
  };

  const updateFee = async (data: any) => {
    if (!activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'fees', data.id), data, { merge: true });
  };

  const togglePayment = async (date: string, pid: string) => {
    if (!activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    const fee = fees.find(f => f.id === date);
    const payments = { ...(fee?.payments || {}) };
    payments[pid] = !payments[pid];
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'fees', date), { payments }, { merge: true });
  };

  const addPaymentMethod = async (name: string, imageUrl: string) => {
    if (!activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    const id = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'paymentMethods', id), { id, name, imageUrl });
  };

  const deletePaymentMethod = async (id: string) => {
    if (!activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'paymentMethods', id));
  };

  const setClubLogo = async (l: string | null) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { clubLogo: l }, { merge: true });
  };

  const setDefaultWinningScore = async (s: number) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { defaultWinningScore: s }, { merge: true });
  };

  const setAutoAdvanceEnabled = async (e: boolean) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { autoAdvanceEnabled: e }, { merge: true });
  };

  const setDefaultCourtCount = async (c: number) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { defaultCourtCount: c }, { merge: true });
  };

  const setDeuceEnabled = async (e: boolean) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { deuceEnabled: e }, { merge: true });
  };

  const setAutoRestEnabled = async (e: boolean) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { autoRestEnabled: e }, { merge: true });
  };

  const addBoostSchedule = async (date: string, venueName = '', scheduledTime = '') => {
    if (!firestore || !user?.uid) throw new Error('Unauthorized');
    const sessionId = Math.random().toString(36).substr(2, 9);
    const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
    await setDoc(doc(firestore, 'sessions', sessionId), {
      id: sessionId, code: Math.random().toString(36).substr(2, 6).toUpperCase(), status: 'active',
      createdBy: user.uid, createdAt: new Date().toISOString(), isDoubleStar: true, venueName, scheduledDate: date, scheduledTime
    });
    const boostRef = doc(collection(firestore, 'boost_schedules'));
    await setDoc(boostRef, { id: boostRef.id, sessionId, date, sessionCode, isActive: true, createdAt: new Date().toISOString(), venueName, scheduledTime });
    return { sessionCode, sessionId };
  };

  const deleteBoostSchedule = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'boost_schedules', id));
  };

  const resetDailyBoard = async () => {
    if (!activeSession?.id) return;
    const batch = writeBatch(firestore);
    matches.filter(m => !m.isCompleted).forEach(m => batch.update(doc(firestore, 'sessions', activeSession.id, 'matches', m.id), { isCompleted: true, status: 'cancelled' }));
    courts.forEach(c => batch.update(doc(firestore, 'sessions', activeSession.id, 'courts', c.id), { status: 'available', currentMatchId: null }));
    players.forEach(p => batch.update(doc(firestore, 'sessions', activeSession.id, 'players', p.id), { status: 'available', lastAvailableAt: Date.now() }));
    await batch.commit();
  };

  const clearClubData = async () => {
    if (role !== 'admin') throw new Error('Unauthorized');
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch('/api/admin/clear-club-data', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scope: 'allSessions' }),
    });
    if (!res.ok) throw new Error('Failed');
    setActiveSession(null);
  };

  const sendTestNotification = async () => {
    if (!user?.uid) return false;
    return await sendNotification({
      playerIds: [user.uid],
      title: '🏸 Notification System Active',
      body: 'If you can see this, your browser is ready for match alerts!',
      data: { type: 'test', tag: 'test-alert' }
    });
  };

  return (
    <ClubContext.Provider value={{
      userProfile, activeSession, players, courts, matches, fees, paymentMethods, role,
      isSessionActive: !!activeSession, isProfileLoading, isAdminRoleLoading, isRestoringSession, currentPlayer,
      joinSession, createSession, regenerateQueueSessionCode, endSession, loadSessionById, endSessionById, getAllSessions,
      addPlayer, updatePlayer, deletePlayer, addCourt, updateCourt, deleteCourt, updateFcmToken, startMatch, startTimer, updateMatchScore, endMatch,
      swapPlayer, deleteMatch, assignMatchToCourt, createCourtAndAssignMatch,
      updateFee, togglePayment, addPaymentMethod, deletePaymentMethod,
      clubLogo, setClubLogo, defaultWinningScore, setDefaultWinningScore, autoAdvanceEnabled, setAutoAdvanceEnabled, queueSessionCode,
      resetDailyBoard, defaultCourtCount, setDefaultCourtCount, deuceEnabled, setDeuceEnabled, autoRestEnabled, setAutoRestEnabled,
      boostSchedules: boostSchedules || [], addBoostSchedule, deleteBoostSchedule, upcomingBoost, clearClubData,
      sendTestNotification
    }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (!context) throw new Error('useClub must be used within a ClubProvider');
  return context;
}
