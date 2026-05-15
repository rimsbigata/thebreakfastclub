
export type UserRole = 'player' | 'admin' | 'queueMaster';
export type PlayerStatus = 'available' | 'playing' | 'resting';
export type CourtStatus = 'available' | 'occupied';
export type MatchStatus = 'ongoing' | 'completed' | 'cancelled';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  skillLevel?: number;
  playStyle?: string;
  createdAt?: string;
  roleExpiresAt?: string; // ISO date string for temporary roles (e.g., queueMaster)
}

export interface QueueSession {
  id: string;
  code: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
  isDoubleStar?: boolean;
  venueName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface SessionPlayer {
  userId: string;
  sessionId: string;
  status: PlayerStatus;
  joinedAt: string;
  lastAvailableAt?: number;
  // Denormalized for easy UI display
  name?: string;
  skillLevel?: number;
  fcmToken?: string; // Firebase Cloud Messaging token for push notifications
}

export const SKILL_LEVELS_SHORT: Record<number, string> = {
  1: "Beg",
  2: "Adv Beg",
  3: "Low Int",
  4: "Mid Int",
  5: "Up Int",
  6: "Adv",
  7: "Exp",
};

export const SKILL_LEVELS_FULL: Record<number, string> = {
  1: "Beginner",
  2: "Advanced Beginner",
  3: "Low Intermediate",
  4: "Mid Intermediate",
  5: "Upper Intermediate",
  6: "Advanced",
  7: "Expert",
};

export const SKILL_LEVELS = SKILL_LEVELS_FULL;

export const getSkillColor = (level: number) => {
  switch (level) {
    case 1: return "bg-zinc-300 text-zinc-950 dark:bg-zinc-600 dark:text-zinc-50 border-none font-bold";
    case 2: return "bg-teal-600 text-white dark:bg-teal-500 dark:text-teal-950 border-none font-bold";
    case 3: return "bg-green-700 text-white dark:bg-green-500 dark:text-green-950 border-none font-bold";
    case 4: return "bg-amber-500 text-amber-950 dark:bg-amber-400 dark:text-amber-950 border-none font-bold";
    case 5: return "bg-orange-600 text-white dark:bg-orange-500 dark:text-white border-none font-bold";
    case 6: return "bg-red-600 text-white dark:bg-red-500 dark:text-white border-none font-bold";
    case 7: return "bg-violet-600 text-white dark:bg-violet-500 dark:text-white border-none font-bold";
    default: return "bg-muted text-muted-foreground border-none font-bold";
  }
};

export interface PlayerSnapshot {
  id: string;
  name: string;
  skillLevel: number;
}

export interface Player extends UserProfile {
  role: UserRole;
  skillLevel: number;
  wins: number;
  gamesPlayed: number;
  partnerHistory: string[];
  status: PlayerStatus;
  improvementScore: number;
  totalPlayTimeMinutes: number;
  lastAvailableAt?: number;
  notes?: string;
  stars?: number;
  pointsScored?: number;
  pointsConceded?: number;
  pointDiff?: number;
  fcmToken?: string; // Firebase Cloud Messaging token for push notifications
}

export interface Court {
  id: string;
  name: string;
  status: CourtStatus;
  currentMatchId?: string | null;
  queue: string[];
  estimatedWaitMinutes: number;
  currentPlayers: string[];
}

export interface Match {
  id: string;
  teamA: string[];
  teamB: string[];
  teamASnapshots?: PlayerSnapshot[];
  teamBSnapshots?: PlayerSnapshot[];
  teamAScore?: number;
  teamBScore?: number;
  courtId?: string;
  sessionId?: string;
  timestamp: string;
  startTime?: string;
  endTime?: string;
  isCompleted: boolean;
  status: MatchStatus;
  winner?: 'teamA' | 'teamB' | null;
  stars?: Record<string, number>; // Player ID to stars earned
  isDoubleStar?: boolean; // Whether this match had double star boost
}

export interface Fee {
  id: string;
  shuttleUnits: number;
  shuttlePricePerPiece: number;
  courts: Array<{ id: string; name: string; feePerHour: number; hoursRented: number }>;
  entranceFee: number;
  qrCodeUrl?: string;
  payments: Record<string, boolean>;
  // Legacy fields for backward compatibility
  shuttleFee?: number;
  courtFee?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  imageUrl: string;
}

export interface BoostSchedule {
  id: string;
  sessionId: string; // Reference to the session document
  date: string; // YYYY-MM-DD format
  sessionCode: string; // 6-digit code for validation
  isActive: boolean;
  createdAt: string;
  venueName?: string;
  scheduledTime?: string;
}
