
export type PlayerStatus = 'available' | 'playing' | 'resting';
export type CourtStatus = 'available' | 'occupied';

export const SKILL_LEVELS: Record<number, string> = {
  1: "Beginner",
  2: "Advanced Beginner",
  3: "Low Intermediate",
  4: "Mid Intermediate",
  5: "Upper Intermediate",
  6: "Advanced",
  7: "Expert",
};

export interface Player {
  id: string;
  name: string;
  skillLevel: number; // 1 to 7
  wins: number;
  gamesPlayed: number;
  partnerHistory: string[]; // IDs of recent partners
  status: PlayerStatus;
  improvementScore: number;
  totalPlayTimeMinutes: number;
  lastAvailableAt?: number; // Timestamp for FIFO queue
}

export interface Court {
  id: string;
  name: string; 
  status: CourtStatus;
  currentMatchId?: string | null;
}

export interface Match {
  teamAScore?: number;
  teamBScore?: number;
  id: string;
  teamA: string[]; 
  teamB: string[]; 
  courtId: string;
  timestamp: string; 
  startTime?: string; 
  isCompleted: boolean;
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
