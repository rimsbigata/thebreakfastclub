
export type PlayerStatus = 'available' | 'playing' | 'resting';
export type CourtStatus = 'available' | 'occupied';

export interface Player {
  id: string;
  name: string;
  skillLevel: number; // 1 to 7
  gamesPlayed: number;
  partnerHistory: string[]; // IDs of recent partners
  status: PlayerStatus;
  improvementScore: number;
  wins?: number;
  losses?: number;
}

export interface Court {
  id: string;
  name: string; // Customizable e.g. "Court 1"
  status: CourtStatus;
  currentMatchId?: string;
}

export interface Match {
  id: string;
  teamA: string[]; // Player IDs
  teamB: string[]; // Player IDs
  courtId: string;
  timestamp: any;
  isCompleted: boolean;
  winnerTeam?: 'A' | 'B';
}

export interface Fee {
  id: string; // YYYY-MM-DD
  shuttleFee: number;
  courtFee: number;
  entranceFee: number;
  payments: Record<string, boolean>; // playerId -> isPaid
}

export interface PaymentMethod {
  id: string;
  name: string;
  imageUrl: string;
}
