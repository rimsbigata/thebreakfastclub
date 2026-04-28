
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

interface ClubContextType {
  userProfile: UserProfile | null;
  activeSession: QueueSession | null;
  players: Player[];
  courts: Court[];
  matches: Match[];
  role: 'player' | 'admin' | null;
  isSessionActive: boolean;
  isProfileLoading: boolean;
  
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
  
  // Memoized query for User Profile
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  
  const { data: profileData, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

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
    await setDoc(playerRef, {
      userId: user.uid,
      sessionId: session.id,
      status: 'available',
      joinedAt: new Date().toISOString(),
      lastAvailableAt: Date.now(),
      name: userProfile.name,
      skillLevel: userProfile.skillLevel || 3
    });

    setActiveSession(session);
  };

  const createSession = async () => {
    if (!firestore || !user?.uid || userProfile?.role !== 'admin') {
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

    await setDoc(doc(firestore, 'sessions', sessionId), session);
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
    const match: Match = {
      ...matchData,
      id: matchId,
      timestamp: new Date().toISOString(),
      isCompleted: false,
      status: 'ongoing'
    };
    await setDoc(doc(firestore, 'sessions', activeSession.id, 'matches', matchId), match);
    
    if (matchData.courtId) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', matchData.courtId), {
        status: 'occupied',
        currentMatchId: matchId
      });
    }

    for (const pid of [...matchData.teamA, ...matchData.teamB]) {
      await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', pid), {
        status: 'playing'
      });
    }
  };

  const endMatch = async (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    if (!firestore || !activeSession?.id) return;
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;

    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'matches', court.currentMatchId), {
      isCompleted: status === 'completed',
      status,
      winner,
      teamAScore,
      teamBScore,
      endTime: new Date().toISOString()
    });

    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), {
      status: 'available',
      currentMatchId: null
    });

    const match = matches.find(m => m.id === court.currentMatchId);
    if (match) {
      for (const pid of [...match.teamA, ...match.teamB]) {
        await updateDoc(doc(firestore, 'sessions', activeSession.id, 'players', pid), {
          status: 'available',
          lastAvailableAt: Date.now()
        });
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
    await updateDoc(doc(firestore, 'sessions', activeSession.id, 'courts', courtId), { 
      status: 'occupied', 
      currentMatchId: matchId 
    });
  };

  return (
    <ClubContext.Provider value={{
      userProfile,
      activeSession,
      players,
      courts,
      matches,
      role: userProfile?.role || null,
      isSessionActive: !!activeSession,
      isProfileLoading,
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
