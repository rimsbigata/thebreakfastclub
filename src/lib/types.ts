
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
 * Centralized Skill Color Mapping
 * Priority: Contrast and High Visibility
 */
export const getSkillColor = (level: number) => {
  switch (level) {
    case 1: return "bg-[#E5E7EB] text-slate-900"; // Beg - light gray
    case 2: return "bg-[#14B8A6] text-white";     // Adv Beg - teal
    case 3: return "bg-[#22C55E] text-white";     // Low Int - green
    case 4: return "bg-[#EAB308] text-slate-900"; // Mid Int - yellow
    case 5: return "bg-[#F97316] text-white";     // Up Int - orange
    case 6: return "bg-[#EF4444] text-white";     // Adv - red
    case 7: return "bg-[#8B5CF6] text-white";     // Exp - purple
    default: return "bg-muted text-muted-foreground";
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
