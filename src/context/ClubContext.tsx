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
import { doc, collection, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { sendMatchStartingNotification, sendYourTurnNotification } from '@/lib/notificationUtils';
import { getLocalStorageService } from '@/lib/localStorageService';

interface ClubSettings {
  clubLogo: string | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
  defaultCourtCount: number;
  deuceEnabled: boolean;
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
  queueSessionCode: string;

  // Boost Schedules
  boostSchedules: BoostSchedule[];
  addBoostSchedule: (date: string, venueName?: string, scheduledTime?: string) => Promise<{ sessionCode: string; sessionId: string }>;
  deleteBoostSchedule: (id: string) => Promise<void>;
  upcomingBoost?: BoostSchedule;

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
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Initialize local storage service
  const localStorageService = useMemo(() => {
    return firestore ? getLocalStorageService(firestore) : null;
  }, [firestore]);

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
      setIsRestoringSession(true);
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
      } finally {
        setIsRestoringSession(false);
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
    // Priority 1: Explicitly assigned in admin_roles collection
    if (adminRoleData) return 'admin';
    // Priority 2: Set within user profile document
    if (userProfile?.role === 'admin') return 'admin';
    // Check for temporary queueMaster role (not expired)
    if (userProfile?.role === 'queueMaster') {
      if (userProfile.roleExpiresAt && new Date(userProfile.roleExpiresAt) < new Date()) {
        return 'player'; // Expired
      }
      return 'queueMaster';
    }
    if (userProfile?.role === 'player') return 'player';
    return null;
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
    lastAvailableAt: sp.lastAvailableAt
  }));

  const currentPlayer = players.find(p => p.id === user?.uid) || null;

  // Use session-specific role if available (when admin joins as player), otherwise use global role
  const sessionRole = (currentPlayer as any)?.sessionRole;
  const effectiveRole = sessionRole || role;
  const courts: Court[] = sessionCourts || [];
  const matches: Match[] = sessionMatches || [];
  const fees: Fee[] = sessionFees || [];
  const paymentMethods: PaymentMethod[] = sessionPaymentMethods || [];

  const clubLogo = sessionSettings?.clubLogo || null;
  const defaultWinningScore = sessionSettings?.defaultWinningScore || 21;
  const autoAdvanceEnabled = sessionSettings?.autoAdvanceEnabled ?? true;
  const defaultCourtCount = sessionSettings?.defaultCourtCount ?? 0;
  const deuceEnabled = sessionSettings?.deuceEnabled ?? true;
  const queueSessionCode = activeSession?.code || '';

  const joinSession = async (code: string, participate: boolean = true, joinAsPlayer: boolean = false) => {
    if (!firestore || !user?.uid) throw new Error('You must be signed in to join a session.');
    if (participate && !userProfile) throw new Error('Your player profile is still loading. Try again in a moment.');
    const sessionCode = code.trim().toUpperCase();
    if (!sessionCode) throw new Error('Session code is required.');

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
        // Store session-specific role: if admin joins as player, override role to 'player'
        sessionRole: joinAsPlayer ? 'player' : role,
        lastAvailableAt: Date.now(),
        name: userProfile?.name || 'Unknown',
        skillLevel: userProfile?.skillLevel || 3
      };
      await setDoc(playerRef, playerData);
    }

    setActiveSession(session);
    return session.id;
  };

  const createSession = async (isDoubleStar = false, sessionCode = '', venueName = '', scheduledDate = '', scheduledTime = '') => {
    if (!firestore || !user?.uid || role !== 'admin') throw new Error('Unauthorized');

    // Validate session code if double star is requested and a code is provided
    if (isDoubleStar && sessionCode) {
      const today = new Date().toISOString().split('T')[0];
      const boostSchedule = (boostSchedules || []).find(
        bs => bs.sessionCode === sessionCode && bs.date === today && bs.isActive
      );
      if (!boostSchedule) {
        throw new Error('Invalid boost schedule code for today');
      }
    }

    const sessionId = Math.random().toString(36).substr(2, 9);
    const code = sessionCode || Math.random().toString(36).substr(2, 6).toUpperCase();

    const session: QueueSession = {
      id: sessionId,
      code,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      venueName: venueName || '',
      scheduledDate: scheduledDate || '',
      scheduledTime: scheduledTime || '',
      isDoubleStar: isDoubleStar
    };

    await setDoc(doc(firestore, 'sessions', sessionId), session);

    // Create default courts
    const defaultCourtCount = sessionSettings?.defaultCourtCount || 0;
    for (let i = 1; i <= defaultCourtCount; i++) {
      const courtId = Math.random().toString(36).substr(2, 9);
      const court: Court = {
        id: courtId,
        name: `Court ${i}`,
        status: 'available',
        queue: [],
        estimatedWaitMinutes: 0,
        currentPlayers: []
      };
      await setDoc(doc(firestore, 'sessions', sessionId, 'courts', courtId), court);
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
    if (!firestore || !activeSession?.id) throw new Error('No active session');
    if (role !== 'admin') throw new Error('Unauthorized: Only admins can end sessions');

    try {
      // Calculate session rankings and award stars to top 4 players
      const sessionPlayersData = players.map(p => ({
        id: p.id,
        name: p.name,
        wins: p.wins || 0,
        gamesPlayed: p.gamesPlayed || 0,
        winRate: (p.wins || 0) / (p.gamesPlayed || 1),
        pointDiff: 0, // Calculate from matches
      }));

      // Calculate point difference from completed matches
      const completedMatches = matches.filter(m => m.status === 'completed');
      completedMatches.forEach(m => {
        if (m.teamAScore !== undefined && m.teamBScore !== undefined) {
          [...m.teamA, ...m.teamB].forEach(pid => {
            const player = sessionPlayersData.find(p => p.id === pid);
            if (player) {
              const isTeamA = m.teamA.includes(pid);
              const diff = isTeamA ? (m.teamAScore! - m.teamBScore!) : (m.teamBScore! - m.teamAScore!);
              player.pointDiff += diff;
            }
          });
        }
      });

      // Sort by wins > win rate > point difference
      const rankedPlayers = sessionPlayersData.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.pointDiff - a.pointDiff;
      });

      // Award stars to top 4 players
      const starsEarned: Record<string, number> = {};
      const isDoubleStar = activeSession.isDoubleStar || false;

      rankedPlayers.slice(0, 4).forEach((player, index) => {
        // 1st place: 4 stars, 2nd: 3 stars, 3rd: 2 stars, 4th: 1 star
        const baseStars = 4 - index;
        starsEarned[player.id] = isDoubleStar ? baseStars * 2 : baseStars;
      });

      // Update player documents with stars (wrapped in try-catch to handle permission errors)
      try {
        for (const [playerId, stars] of Object.entries(starsEarned)) {
          await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', playerId), {
            stars: stars,
          });
        }
      } catch (error) {
        console.error('Failed to update player stars:', error);
        // Continue anyway - session ending is more important
      }

      // Store final star distribution in session document
      await updateDoc(doc(firestore, 'sessions', activeSession.id), {
        status: 'inactive',
        finalStars: starsEarned,
      });

      // Trigger star distribution notifications (wrapped in try-catch)
      try {
        if (Object.keys(starsEarned).length > 0) {
          const notificationsRef = collection(firestore, 'sessions', activeSession.id, 'notifications');
          const starMessage = isDoubleStar
            ? `Session ended! Top 4 players earned double stars: ${Object.entries(starsEarned).map(([pid, stars]) => `${players.find(p => p.id === pid)?.name || 'Unknown'} (${stars}⭐)`).join(', ')}`
            : `Session ended! Top 4 players earned stars: ${Object.entries(starsEarned).map(([pid, stars]) => `${players.find(p => p.id === pid)?.name || 'Unknown'} (${stars}⭐)`).join(', ')}`;

          await addDoc(notificationsRef, {
            type: 'star_distribution',
            message: starMessage,
            starsEarned,
            timestamp: new Date().toISOString(),
            isRead: false,
          });
        }
      } catch (error) {
        console.error('Failed to add notification:', error);
        // Continue anyway - session ending is more important
      }

      setActiveSession(null);
    } catch (error) {
      // Re-throw if it's a critical error
      if (error instanceof Error && error.message.includes('No active session')) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('Only admins can end sessions')) {
        throw error;
      }
      // Log other errors but don't fail the operation
      console.error('Error during session end:', error);
    }
  };

  const loadSessionById = async (sessionId: string) => {
    if (!firestore || !user?.uid) throw new Error('You must be signed in to load a session.');
    const sessionSnapshot = await getDoc(doc(firestore, 'sessions', sessionId));

    if (!sessionSnapshot.exists()) {
      throw new Error('Session not found');
    }

    const session = { ...sessionSnapshot.data(), id: sessionSnapshot.id } as QueueSession;

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    setActiveSession(session);
  };

  const endSessionById = async (sessionId: string) => {
    if (!firestore || !user?.uid) throw new Error('You must be signed in.');
    if (role !== 'admin') throw new Error('Unauthorized: Only admins can end sessions');

    await updateDoc(doc(firestore, 'sessions', sessionId), {
      status: 'inactive',
    });
  };

  const getAllSessions = async (): Promise<QueueSession[]> => {
    if (!firestore || !user?.uid) throw new Error('You must be signed in.');
    if (role !== 'admin') throw new Error('Unauthorized: Only admins can view all sessions');

    const sessionsSnapshot = await getDocs(collection(firestore, 'sessions'));
    return sessionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as QueueSession));
  };

  const addPlayer = async (input: { name: string; skillLevel: number; playStyle: string }) => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    const userId = 'member_' + Math.random().toString(36).substr(2, 9);
    const playerData = {
      userId,
      sessionId: activeSession.id,
      status: 'available',
      joinedAt: new Date().toISOString(),
      lastAvailableAt: Date.now(),
      name: input.name,
      skillLevel: input.skillLevel
    };
    
    // Write to local storage immediately for fast UI
    if (localStorageService) {
      await localStorageService.setDocument(`sessions/${activeSession.id}/players`, userId, playerData);
    }
    
    // Sync to Firebase in background
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'players', userId), playerData);
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    if (!firestore || !activeSession?.id) throw new Error('No active session');
    // Only admin or queueMaster can update players
    if (role !== 'admin' && role !== 'queueMaster') throw new Error('Unauthorized');
    // Only admin can change roles
    if ((updates.role || updates.roleExpiresAt !== undefined) && role !== 'admin') {
      throw new Error('Only admin can change player roles');
    }
    const sessionUpdates: any = {};
    if (updates.name) sessionUpdates.name = updates.name;
    if (updates.skillLevel) sessionUpdates.skillLevel = updates.skillLevel;
    if (updates.status) sessionUpdates.status = updates.status;
    if (updates.notes !== undefined) sessionUpdates.notes = updates.notes;
    if (updates.playStyle) sessionUpdates.playStyle = updates.playStyle;
    if (updates.role) sessionUpdates.role = updates.role;
    if (updates.roleExpiresAt !== undefined) sessionUpdates.roleExpiresAt = updates.roleExpiresAt;
    
    // Update local storage immediately for fast UI
    if (localStorageService) {
      await localStorageService.updateDocument(`sessions/${activeSession.id}/players`, id, sessionUpdates);
    }
    
    // Sync to Firebase in background
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', id), sessionUpdates);
  };

  const deletePlayer = async (id: string) => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'players', id));
  };

  const addCourt = async (name?: string) => {
    if (!firestore || !activeSession?.id || (role !== 'admin' && role !== 'queueMaster')) throw new Error('Unauthorized');
    const courtId = Math.random().toString(36).substr(2, 9);
    const court: Court = {
      id: courtId,
      name: name || `Court ${courts.length + 1}`,
      status: 'available',
      queue: [],
      estimatedWaitMinutes: 0,
      currentPlayers: []
    };
    
    // Write to local storage immediately for fast UI
    if (localStorageService) {
      await localStorageService.setDocument(`sessions/${activeSession.id}/courts`, courtId, court);
    }
    
    // Sync to Firebase in background
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), court);
    return courtId;
  };

  const deleteCourt = async (id: string) => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'courts', id));
  };

  const updateFcmToken = async (token: string) => {
    if (!firestore || !activeSession?.id || !user?.uid) return;
    try {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', user.uid), {
        fcmToken: token,
      });
    } catch (error) {
      console.error('Failed to update FCM token:', error);
    }
  };

  const startMatch = async (matchData: any) => {
    if (!firestore || !activeSession?.id || (role !== 'admin' && role !== 'queueMaster')) throw new Error('Unauthorized');
    const matchId = Math.random().toString(36).substr(2, 9);
    const match: Match = {
      id: matchId,
      teamA: matchData.teamA,
      teamB: matchData.teamB,
      teamASnapshots: matchData.teamA.map((id: string) => {
        const player = players.find(p => p.id === id);
        return { id, name: player?.name || 'Unknown', skillLevel: player?.skillLevel || 3 };
      }),
      teamBSnapshots: matchData.teamB.map((id: string) => {
        const player = players.find(p => p.id === id);
        return { id, name: player?.name || 'Unknown', skillLevel: player?.skillLevel || 3 };
      }),
      teamAScore: 0,
      teamBScore: 0,
      timestamp: new Date().toISOString(),
      isCompleted: false,
      status: 'ongoing',
      ...(matchData.courtId ? { courtId: matchData.courtId } : {}),
    };
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), match);

    if (matchData.courtId) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', matchData.courtId), { status: 'occupied', currentMatchId: matchId });
    }
    for (const pid of [...matchData.teamA, ...matchData.teamB]) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', pid), { status: 'playing' });
    }

    // Send 'Match Starting' notification to all participants
    try {
      const court = matchData.courtId ? courts.find(c => c.id === matchData.courtId) : undefined;
      await sendMatchStartingNotification(
        [...matchData.teamA, ...matchData.teamB],
        matchData.courtId,
        court?.name
      );
    } catch (error) {
      console.error('Failed to send match starting notification:', error);
    }
  };

  const startTimer = async (courtId: string) => {
    if (!firestore || !activeSession?.id || (role !== 'admin' && role !== 'queueMaster')) throw new Error('Unauthorized');
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', court.currentMatchId), {
      startTime: new Date().toISOString(),
    });
  };

  const updateMatchScore = async (matchId: string, teamAScore: number, teamBScore: number) => {
    if (!firestore || !activeSession?.id || (role !== 'admin' && role !== 'queueMaster')) throw new Error('Unauthorized');
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), {
      teamAScore: Math.max(0, teamAScore),
      teamBScore: Math.max(0, teamBScore),
    });
  };

  const endMatch = async (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    if (!firestore || !activeSession?.id || (role !== 'admin' && role !== 'queueMaster')) throw new Error('Unauthorized');
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;

    const match = matches.find(m => m.id === court.currentMatchId);
    if (!match) return;

    // Stars are now awarded only at session end to top 4 players, not per match
    // Store match data for session-end star calculation
    const isDoubleStar = activeSession.isDoubleStar || false;

    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', court.currentMatchId), {
      isCompleted: status === 'completed',
      status,
      endTime: new Date().toISOString(),
      ...(winner ? { winner } : {}),
      ...(teamAScore !== undefined ? { teamAScore } : {}),
      ...(teamBScore !== undefined ? { teamBScore } : {}),
      isDoubleStar,
    });
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), { status: 'available', currentMatchId: null });

    const startTime = match.startTime ? new Date(match.startTime).getTime() : null;
    const playDuration = startTime ? Math.floor((Date.now() - startTime) / 60000) : 0;
    for (const pid of [...match.teamA, ...match.teamB]) {
      const player = players.find(p => p.id === pid);
      const isTeamA = match.teamA.includes(pid);
      const partnerId = isTeamA ? match.teamA.find(id => id !== pid) : match.teamB.find(id => id !== pid);
      const won = status === 'completed' && winner
        ? (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA)
        : false;

      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', pid), {
        status: 'available',
        lastAvailableAt: Date.now(),
        wins: (player?.wins || 0) + (won ? 1 : 0),
        gamesPlayed: (player?.gamesPlayed || 0) + (status === 'completed' ? 1 : 0),
        partnerHistory: partnerId ? [partnerId, ...(player?.partnerHistory || [])].slice(0, 5) : (player?.partnerHistory || []),
        improvementScore: Math.max(0, (player?.improvementScore || 0) + (won ? 5 : status === 'completed' ? -2 : 0)),
        totalPlayTimeMinutes: (player?.totalPlayTimeMinutes || 0) + playDuration,
      });
    }


    if (status === 'completed' && autoAdvanceEnabled) {
      const nextMatch = matches
        .filter(m => !m.isCompleted && !m.courtId && m.id !== court.currentMatchId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];

      if (nextMatch) {
        await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', nextMatch.id), {
          courtId,
          status: 'ongoing',
        });
        await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), {
          status: 'occupied',
          currentMatchId: nextMatch.id,
        });
      }
    }
  };

  const swapPlayer = async (matchId: string, oldPlayerId: string, newPlayerId: string) => {
    if (!firestore || !activeSession?.id || (role !== 'admin' && role !== 'queueMaster')) throw new Error('Unauthorized');
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const replacement = players.find(p => p.id === newPlayerId);
    const replacementSnapshot = {
      id: newPlayerId,
      name: replacement?.name || 'Unknown',
      skillLevel: replacement?.skillLevel || 3,
    };
    const isTeamA = match.teamA.includes(oldPlayerId);
    const teamA = isTeamA ? match.teamA.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamA;
    const teamB = !isTeamA ? match.teamB.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamB;
    const teamASnapshots = isTeamA
      ? (match.teamASnapshots || []).map(snapshot => snapshot.id === oldPlayerId ? replacementSnapshot : snapshot)
      : match.teamASnapshots;
    const teamBSnapshots = !isTeamA
      ? (match.teamBSnapshots || []).map(snapshot => snapshot.id === oldPlayerId ? replacementSnapshot : snapshot)
      : match.teamBSnapshots;

    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), {
      teamA,
      teamB,
      ...(teamASnapshots ? { teamASnapshots } : {}),
      ...(teamBSnapshots ? { teamBSnapshots } : {}),
    });
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', oldPlayerId), {
      status: 'available',
      lastAvailableAt: Date.now(),
    });
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', newPlayerId), {
      status: 'playing',
    });

    // Send 'Your Turn!' notification to the new player
    try {
      if (match.courtId) {
        const court = courts.find(c => c.id === match.courtId);
        if (court) {
          await sendYourTurnNotification(newPlayerId, match.courtId, court.name);
        }
      }
    } catch (error) {
      console.error('Failed to send your turn notification for swap:', error);
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized');
    const match = matches.find(m => m.id === matchId);
    if (match?.courtId) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', match.courtId), {
        status: 'available',
        currentMatchId: null,
      });
    }
    if (match) {
      for (const pid of [...match.teamA, ...match.teamB]) {
        await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', pid), {
          status: 'available',
          lastAvailableAt: Date.now(),
        });
      }
    }
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId));
  };

  const assignMatchToCourt = async (matchId: string, courtId: string) => {
    if (!firestore || !activeSession?.id || (role !== 'admin' && role !== 'queueMaster')) throw new Error('Unauthorized');
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), { courtId });
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), { status: 'occupied', currentMatchId: matchId });

    // Send 'Your Turn!' notifications to players in the match
    try {
      const match = matches.find(m => m.id === matchId);
      const court = courts.find(c => c.id === courtId);

      if (match && court) {
        const playerIds = [...match.teamA, ...match.teamB];
        await sendYourTurnNotification(playerIds.join(','), courtId, court.name);
      }
    } catch (error) {
      console.error('Failed to send your turn notifications:', error);
      // Don't throw error - notification failure shouldn't block match assignment
    }
  };

  const createCourtAndAssignMatch = async (matchId: string) => {
    if (!firestore || !activeSession?.id || (role !== 'admin' && role !== 'queueMaster')) throw new Error('Unauthorized');
    const courtId = await addCourt();
    await assignMatchToCourt(matchId, courtId);
  };

  const updateFee = async (feeData: Partial<Fee> & { id: string }) => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized: Only admin can modify fee data');
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'fees', feeData.id), feeData, { merge: true });
  };

  const togglePayment = async (date: string, playerId: string) => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized: Only admin can modify payment data');
    const fee = fees.find(f => f.id === date);
    const payments = { ...(fee?.payments || {}) };
    payments[playerId] = !payments[playerId];
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'fees', date), { payments }, { merge: true });
  };

  const addPaymentMethod = async (name: string, imageUrl: string) => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized: Only admin can add payment methods');
    const id = Math.random().toString(36).substr(2, 9);
    const paymentMethod = { id, name, imageUrl };
    
    // Write to local storage immediately for fast UI
    if (localStorageService) {
      await localStorageService.setDocument(`sessions/${activeSession.id}/paymentMethods`, id, paymentMethod);
    }
    
    // Sync to Firebase in background
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'paymentMethods', id), paymentMethod);
  };

  const deletePaymentMethod = async (id: string) => {
    if (!firestore || !activeSession?.id || role !== 'admin') throw new Error('Unauthorized: Only admin can delete payment methods');
    
    // Delete from local storage immediately for fast UI
    if (localStorageService) {
      await localStorageService.deleteDocument(`sessions/${activeSession.id}/paymentMethods`, id);
    }
    
    // Sync to Firebase in background
    await deleteDoc(doc(firestore, 'sessions', activeSession.id, 'paymentMethods', id));
  };

  const setClubLogo = async (logo: string | null) => {
    if (!firestore || !user?.uid) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { clubLogo: logo }, { merge: true });
  };

  const setDefaultWinningScore = async (score: number) => {
    if (!firestore || !user?.uid) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { defaultWinningScore: score }, { merge: true });
  };

  const setAutoAdvanceEnabled = async (enabled: boolean) => {
    if (!firestore || !user?.uid) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { autoAdvanceEnabled: enabled }, { merge: true });
  };

  const setDefaultCourtCount = async (count: number) => {
    if (!firestore) return;
    const safeCount = Math.max(0, Math.min(20, Math.floor(count)));
    await setDoc(doc(firestore, 'sessionSettings', 'config'), { defaultCourtCount: safeCount }, { merge: true });
  };

  const setDeuceEnabled = async (enabled: boolean) => {
    if (!firestore || !user?.uid) return;
    await setDoc(doc(firestore, 'clubSettings', 'config'), { deuceEnabled: enabled }, { merge: true });
  };

  const addBoostSchedule = async (date: string, venueName = '', scheduledTime = '') => {
    if (!firestore || !user?.uid) throw new Error('Unauthorized');
    // Generate session ID and 6-digit session code
    const sessionId = Math.random().toString(36).substr(2, 9);
    const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();

    // Create a session with isDoubleStar enabled
    const session: QueueSession = {
      id: sessionId,
      code,
      status: 'active',
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      isDoubleStar: true,
      venueName,
      scheduledDate: date,
      scheduledTime
    };
    await setDoc(doc(firestore, 'sessions', sessionId), session);

    // Create boost schedule record
    const boostRef = doc(collection(firestore, 'boost_schedules'));
    await setDoc(boostRef, {
      id: boostRef.id,
      sessionId,
      date,
      sessionCode,
      isActive: true,
      createdAt: new Date().toISOString(),
      venueName,
      scheduledTime
    });

    return { sessionCode, sessionId };
  };

  const deleteBoostSchedule = async (id: string) => {
    if (!firestore || !user?.uid) throw new Error('Unauthorized');
    await deleteDoc(doc(firestore, 'boost_schedules', id));
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
      userProfile, activeSession, players, courts, matches, fees, paymentMethods, role: effectiveRole,
      isSessionActive: !!activeSession, isProfileLoading, isAdminRoleLoading, isRestoringSession, currentPlayer,
      joinSession, createSession, regenerateQueueSessionCode, endSession, loadSessionById, endSessionById, getAllSessions,
      addPlayer, updatePlayer, deletePlayer,
      addCourt, deleteCourt, updateFcmToken, startMatch, startTimer, updateMatchScore, endMatch,
      swapPlayer, deleteMatch, assignMatchToCourt, createCourtAndAssignMatch,
      updateFee, togglePayment, addPaymentMethod, deletePaymentMethod,
      clubLogo, setClubLogo, defaultWinningScore, setDefaultWinningScore,
      autoAdvanceEnabled, setAutoAdvanceEnabled, queueSessionCode,
      resetDailyBoard, defaultCourtCount, setDefaultCourtCount, deuceEnabled, setDeuceEnabled,
      boostSchedules: boostSchedules || [], addBoostSchedule, deleteBoostSchedule, upcomingBoost, clearClubData
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
