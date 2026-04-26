
export type PlayerStatus = 'available' | 'playing' | 'resting';
export type CourtStatus = 'available' | 'occupied';

export interface Player {
  id: string;
  name: string;
  skillLevel: number; // 1-7
  gamesPlayed: number;
  partnerHistory: string[];
  status: PlayerStatus;
  improvementScore: number;
}

export interface Court {
  id: string;
  name: string;
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
}

export interface Fee {
  id: string; // YYYY-MM-DD
  shuttleFee: number;
  courtFee: number;
  entranceFee: number;
  qrCodeUrl?: string;
  payments: Record<string, boolean>; // playerId -> isPaid
}
