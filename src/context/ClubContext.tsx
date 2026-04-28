
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  UserProfile, 
  QueueSession, 
  SessionPlayer, 
  Player, 
  Court, 
  Match, 
  MatchStatus
} from '@/lib/types';
import { useFirebase, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ClubContextType {
  userProfile: UserProfile | null;
  activeSession: QueueSession | null;
  players: Player[];
  courts: Court[];
  matches: Match[];
  role: 'player' | 'admin' | null;
  isSessionActive: boolean;
  isProfileLoading: boolean;
  isAdminRoleLoading: boolean;
  
  // Auth & Session
  joinSession: (code: string) => Promise<void>;
  createSession: () => Promise<string>;
  
  // Admin Controls
  addCourt: (name?: string) => Promise<string>;
  deleteCourt: (id: string) => Promise<void>;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted' | 'status' | 'teamASnapshots' | 'teamBSnapshots'>) => Promise<void>;
  endMatch: (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => void;
  deleteMatch: (matchId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  
  // Settings
  clubLogo: string | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const [activeSession, setActiveSession] = useState<QueueSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // 1. Load basic profile
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'userProfiles', user.uid);
  }, [firestore, user?.uid]);
  const { data: profileData, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // 2. Check for administrative role (overrides profile role)
  const adminRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'admin_roles', user.uid);
  }, [firestore, user?.uid]);
  const { data: adminRoleData, isLoading: isAdminRoleLoading } = useDoc(adminRoleRef);

  useEffect(() => {
    if (profileData) {
      setUserProfile(profileData);
    } else if (!user) {
      setUserProfile(null);
    }
  }, [profileData, user]);

  // Session Data Hooks
  const playersQuery = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id) return null;
    return collection(firestore, 'sessions', activeSession.id, 'players');
  }, [firestore, activeSession?.id]);
  const { data: sessionPlayers } = useCollection<SessionPlayer>(playersQuery);

  const courtsQuery = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id) return null;
    return collection(firestore, 'sessions', activeSession.id, 'courts');
  }, [firestore, activeSession?.id]);
  const { data: sessionCourts } = useCollection<Court>(courtsQuery);

  const matchesQuery = useMemoFirebase(() => {
    if (!firestore || !activeSession?.id) return null;
    return collection(firestore, 'sessions', activeSession.id, 'matches');
  }, [firestore, activeSession?.id]);
  const { data: sessionMatches } = useCollection<Match>(matchesQuery);

  // Determine role: admin_roles collection has priority
  const role: 'player' | 'admin' | null = adminRoleData ? 'admin' : (userProfile?.role as any || null);

  // Map SessionPlayers to Player objects
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

  const courts: Court[] = sessionCourts || [];
  const matches: Match[] = sessionMatches || [];

  const joinSession = async (code: string) => {
    if (!firestore || !user?.uid || !userProfile) return;

    const sessionsRef = collection(firestore, 'sessions');
    const q = query(sessionsRef, where('code', '==', code.toUpperCase()), where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Valid session code required');
    }

    const sessionDoc = snapshot.docs[0];
    const session = { ...sessionDoc.data(), id: sessionDoc.id } as QueueSession;

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

    setDoc(playerRef, playerData)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: playerRef.path,
          operation: 'create',
          requestResourceData: playerData
        }));
      });

    setActiveSession(session);
  };

  const createSession = async () => {
    if (!firestore || !user?.uid || role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const sessionId = Math.random().toString(36).substr(2, 9);
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const session: QueueSession = {
      id: sessionId,
      code,
      status: 'active',
      createdBy: user.uid,
      createdAt: new Date().toISOString()
    };

    const sessionRef = doc(firestore, 'sessions', sessionId);
    setDoc(sessionRef, session)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sessionRef.path,
          operation: 'create',
          requestResourceData: session
        }));
      });

    setActiveSession(session);
    return code;
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
    const courtRef = doc(firestore, 'sessions', activeSession.id, 'courts', courtId);
    setDoc(courtRef, court)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: courtRef.path,
          operation: 'create',
          requestResourceData: court
        }));
      });
    return courtId;
  };

  const deleteCourt = async (id: string) => {
    if (!firestore || !activeSession?.id) return;
    const courtRef = doc(firestore, 'sessions', activeSession.id, 'courts', id);
    deleteDoc(courtRef)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: courtRef.path,
          operation: 'delete'
        }));
      });
  };

  const startMatch = async (matchData: any) => {
    if (!firestore || !activeSession?.id) return;
    const matchId = Math.random().toString(36).substr(2, 9);
    const match: Match = {
      ...matchData,
      id: matchId,
      timestamp: new Date().toISOString(),
      isCompleted: false,
      status: 'ongoing'
    };
    const matchRef = doc(firestore, 'sessions', activeSession.id, 'matches', matchId);
    setDoc(matchRef, match)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: matchRef.path,
          operation: 'create',
          requestResourceData: match
        }));
      });
    
    if (matchData.courtId) {
      const courtRef = doc(firestore, 'sessions', activeSession.id, 'courts', matchData.courtId);
      updateDoc(courtRef, {
        status: 'occupied',
        currentMatchId: matchId
      }).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: courtRef.path,
          operation: 'update',
          requestResourceData: { status: 'occupied', currentMatchId: matchId }
        }));
      });
    }

    for (const pid of [...matchData.teamA, ...matchData.teamB]) {
      const playerRef = doc(firestore, 'sessions', activeSession.id, 'players', pid);
      updateDoc(playerRef, {
        status: 'playing'
      }).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: playerRef.path,
          operation: 'update',
          requestResourceData: { status: 'playing' }
        }));
      });
    }
  };

  const endMatch = async (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    if (!firestore || !activeSession?.id) return;
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;

    const matchRef = doc(firestore, 'sessions', activeSession.id, 'matches', court.currentMatchId);
    updateDoc(matchRef, {
      isCompleted: status === 'completed',
      status,
      winner,
      teamAScore,
      teamBScore,
      endTime: new Date().toISOString()
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: matchRef.path,
        operation: 'update',
        requestResourceData: { status, winner, teamAScore, teamBScore }
      }));
    });

    const courtRef = doc(firestore, 'sessions', activeSession.id, 'courts', courtId);
    updateDoc(courtRef, {
      status: 'available',
      currentMatchId: null
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: courtRef.path,
        operation: 'update'
      }));
    });

    const match = matches.find(m => m.id === court.currentMatchId);
    if (match) {
      for (const pid of [...match.teamA, ...match.teamB]) {
        const playerRef = doc(firestore, 'sessions', activeSession.id, 'players', pid);
        updateDoc(playerRef, {
          status: 'available',
          lastAvailableAt: Date.now()
        }).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: playerRef.path,
            operation: 'update'
          }));
        });
      }
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!firestore || !activeSession?.id) return;
    const matchRef = doc(firestore, 'sessions', activeSession.id, 'matches', matchId);
    deleteDoc(matchRef).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: matchRef.path,
        operation: 'delete'
      }));
    });
  };

  const assignMatchToCourt = async (matchId: string, courtId: string) => {
    if (!firestore || !activeSession?.id) return;
    const matchRef = doc(firestore, 'sessions', activeSession.id, 'matches', matchId);
    updateDoc(matchRef, { courtId }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: matchRef.path,
        operation: 'update'
      }));
    });
    
    const courtRef = doc(firestore, 'sessions', activeSession.id, 'courts', courtId);
    updateDoc(courtRef, { 
      status: 'occupied', 
      currentMatchId: matchId 
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: courtRef.path,
        operation: 'update'
      }));
    });
  };

  return (
    <ClubContext.Provider value={{
      userProfile,
      activeSession,
      players,
      courts,
      matches,
      role,
      isSessionActive: !!activeSession,
      isProfileLoading,
      isAdminRoleLoading,
      joinSession,
      createSession,
      addCourt,
      deleteCourt,
      startMatch,
      endMatch,
      deleteMatch,
      assignMatchToCourt,
      clubLogo: null,
      defaultWinningScore: 21,
      autoAdvanceEnabled: true
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
