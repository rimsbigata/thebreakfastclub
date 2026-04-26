
export type PlayerStatus = 'available' | 'playing' | 'resting';
export type CourtStatus = 'available' | 'occupied';

export const SKILL_LEVELS: Record<number, string> = {
  1: "Novice",
  2: "Beginner",
  3: "Recreational",
  4: "Intermediate",
  5: "Advanced",
  6: "Expert",
  7: "Elite",
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
