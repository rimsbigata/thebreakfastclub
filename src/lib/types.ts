
export type UserRole = 'player' | 'admin';
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
}

export interface QueueSession {
  id: string;
  code: string;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt: string;
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
    case 1: return "bg-[#9CA3AF] text-slate-900 border-none font-bold";
    case 2: return "bg-[#0F766E] text-white border-none font-bold";
    case 3: return "bg-[#15803D] text-white border-none font-bold";
    case 4: return "bg-[#CA8A04] text-slate-900 border-none font-bold";
    case 5: return "bg-[#EA580C] text-white border-none font-bold";
    case 6: return "bg-[#DC2626] text-white border-none font-bold";
    case 7: return "bg-[#7C3AED] text-white border-none font-bold";
    default: return "bg-muted text-muted-foreground border-none font-bold";
  }
};

export interface PlayerSnapshot {
  id: string;
  name: string;
  skillLevel: number;
}

export interface Player extends UserProfile {
  wins: number;
  gamesPlayed: number;
  partnerHistory: string[]; 
  status: PlayerStatus;
  improvementScore: number;
  totalPlayTimeMinutes: number;
  lastAvailableAt?: number;
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
  timestamp: string; 
  startTime?: string; 
  endTime?: string;
  isCompleted: boolean;
  status: MatchStatus;
  winner?: 'teamA' | 'teamB' | null;
}

export interface Fee {
  id: string; 
  shuttleFee: number;
  courtFee: number;
  entranceFee: number;
  qrCodeUrl?: string; 
  payments: Record<string, boolean>; 
}

export interface PaymentMethod {
  id: string;
  name: string;
  imageUrl: string;
}
