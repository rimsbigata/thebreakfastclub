
export type PlayerStatus = 'available' | 'playing' | 'resting';
export type CourtStatus = 'available' | 'occupied';
export type MatchStatus = 'ongoing' | 'completed' | 'cancelled';

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

/**
 * Centralized Skill Color Mapping (Single Source of Truth)
 * Standardized Hex Mapping with Theme-Aware adjustments.
 */
export const getSkillColor = (level: number) => {
  switch (level) {
    case 1: 
      // Beginner (Beg) → #E5E7EB (light gray)
      return "bg-[#E5E7EB] text-slate-900 dark:bg-slate-700 dark:text-slate-200";
    case 2: 
      // Advanced Beginner (Adv Beg) → #14B8A6 (teal)
      return "bg-[#14B8A6] text-white dark:bg-teal-600/80";
    case 3: 
      // Low Intermediate (Low Int) → #22C55E (green)
      return "bg-[#22C55E] text-white dark:bg-green-600/80";
    case 4: 
      // Mid Intermediate (Mid Int) → #EAB308 (yellow)
      return "bg-[#EAB308] text-slate-900 dark:bg-yellow-600/20 dark:text-yellow-500";
    case 5: 
      // Upper Intermediate (Up Int) → #F97316 (orange)
      return "bg-[#F97316] text-white dark:bg-orange-600/80";
    case 6: 
      // Advanced (Adv) → #EF4444 (red)
      return "bg-[#EF4444] text-white dark:bg-red-600/80";
    case 7: 
      // Expert (Exp) → #8B5CF6 (purple)
      return "bg-[#8B5CF6] text-white dark:bg-purple-600/80";
    default: 
      return "bg-muted text-muted-foreground";
  }
};

export interface PlayerSnapshot {
  id: string;
  name: string;
  skillLevel: number;
}

export interface Player {
  id: string;
  name: string;
  skillLevel: number; 
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
