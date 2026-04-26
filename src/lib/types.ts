
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';
export type PlayStyle = 'Aggressive' | 'Defensive' | 'All-Rounder' | 'Tactical';

export interface Player {
  id: string;
  name: string;
  skillLevel: SkillLevel;
  playStyle: PlayStyle;
  gamesPlayed: number;
  avatarUrl?: string;
}

export interface Court {
  id: string;
  name: string;
  status: 'Available' | 'Busy' | 'Maintenance';
  queue: string[]; // Array of player IDs
  currentPlayers: string[]; // Players currently on court
  estimatedWaitMinutes: number;
}
