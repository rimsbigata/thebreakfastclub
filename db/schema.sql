-- Database schema for The Breakfast Club Badminton App
-- Execute this in Neon SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  skill_level INTEGER NOT NULL CHECK (skill_level >= 1 AND skill_level <= 7),
  wins INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  partner_history UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'playing', 'resting')),
  improvement_score REAL DEFAULT 0.0,
  total_play_time_minutes INTEGER DEFAULT 0,
  last_available_at TIMESTAMP WITH TIME ZONE,
  play_style TEXT DEFAULT 'Unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courts table
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
  current_match_id UUID,
  queue UUID[] DEFAULT '{}',
  estimated_wait_minutes INTEGER DEFAULT 0,
  current_players UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a UUID[] NOT NULL,
  team_b UUID[] NOT NULL,
  team_a_snapshots JSONB,
  team_b_snapshots JSONB,
  team_a_score INTEGER,
  team_b_score INTEGER,
  court_id UUID REFERENCES courts(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  is_completed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'cancelled')),
  winner TEXT CHECK (winner IN ('teamA', 'teamB') OR winner IS NULL),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_players_skill_level ON players(skill_level);
CREATE INDEX idx_courts_status ON courts(status);
CREATE INDEX idx_matches_court_id ON matches(court_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_timestamp ON matches(timestamp);

-- Constraints
ALTER TABLE players ADD CONSTRAINT players_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE courts ADD CONSTRAINT courts_name_not_empty CHECK (length(trim(name)) > 0);