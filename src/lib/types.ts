
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
}

export interface Court {
  id: string;
  name: string; // Customizable e.g. "Court 1" or "Court A"
  status: CourtStatus;
  currentMatchId?: string | null;
}

export interface Match {
  id: string;
  teamA: string[]; // Player IDs
  teamB: string[]; // Player IDs
  courtId: string;
  timestamp: string; // ISO string for client-side
  isCompleted: boolean;
}

export interface Fee {
  id: string; // Date string document ID (e.g., "2026-04-26")
  shuttleFee: number;
  courtFee: number;
  entranceFee: number;
  qrCodeUrl?: string; // Link to Firebase Storage
  payments: Record<string, boolean>; // playerId -> paid status
}

export interface PaymentMethod {
  id: string;
  name: string;
  imageUrl: string;
}
