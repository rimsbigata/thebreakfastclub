import { Player } from './types';

export interface RepeatPartnerInfo {
  playerId: string;
  partnerId: string;
  repeatCount: number;
  recentMatchIndex: number; // 0 = most recent, 1 = 2 games ago, etc.
}

export interface SwapSuggestion {
  playerId: string;
  suggestedPlayers: {
    player: Player;
    reason: string;
    priority: number;
  }[];
}

/**
 * Detect repeat partnerships in a match draft
 * @param teamA - Array of player IDs for Team A
 * @param teamB - Array of player IDs for Team B
 * @param allPlayers - All players with their partner history
 * @param threshold - How many recent matches to check (default: 3)
 * @returns Array of repeat partner info
 */
export function detectRepeatPartners(
  teamA: string[],
  teamB: string[],
  allPlayers: Player[],
  threshold: number = 3
): RepeatPartnerInfo[] {
  const repeats: RepeatPartnerInfo[] = [];
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));

  const checkPair = (playerId: string, partnerId: string) => {
    const player = playerMap.get(playerId);
    if (!player) return;

    const partnerHistory = player.partnerHistory || [];
    for (let i = 0; i < Math.min(threshold, partnerHistory.length); i++) {
      if (partnerHistory[i] === partnerId) {
        repeats.push({
          playerId,
          partnerId,
          repeatCount: partnerHistory.filter(p => p === partnerId).length,
          recentMatchIndex: i,
        });
        break; // Only record the most recent occurrence
      }
    }
  };

  // Check Team A partnerships
  if (teamA.length >= 2) {
    checkPair(teamA[0], teamA[1]);
    checkPair(teamA[1], teamA[0]);
  }

  // Check Team B partnerships
  if (teamB.length >= 2) {
    checkPair(teamB[0], teamB[1]);
    checkPair(teamB[1], teamB[0]);
  }

  return repeats;
}

/**
 * Check if a specific player has a repeat partner in the current draft
 */
export function hasRepeatPartner(
  playerId: string,
  teamA: string[],
  teamB: string[],
  allPlayers: Player[],
  threshold: number = 3
): boolean {
  const repeats = detectRepeatPartners(teamA, teamB, allPlayers, threshold);
  return repeats.some(r => r.playerId === playerId);
}

/**
 * Get the repeat partner for a specific player
 */
export function getRepeatPartnerForPlayer(
  playerId: string,
  teamA: string[],
  teamB: string[],
  allPlayers: Player[],
  threshold: number = 3
): RepeatPartnerInfo | null {
  const repeats = detectRepeatPartners(teamA, teamB, allPlayers, threshold);
  return repeats.find(r => r.playerId === playerId) || null;
}

/**
 * Generate swap suggestions for players with repeat partners
 * @param teamA - Current Team A player IDs
 * @param teamB - Current Team B player IDs
 * @param allPlayers - All available players
 * @param currentDraftIds - IDs of all players currently in the draft
 * @param threshold - Repeat partner threshold
 * @returns Swap suggestions for affected players
 */
export function generateSwapSuggestions(
  teamA: string[],
  teamB: string[],
  allPlayers: Player[],
  currentDraftIds: string[],
  threshold: number = 3
): SwapSuggestion[] {
  const repeats = detectRepeatPartners(teamA, teamB, allPlayers, threshold);
  const playerMap = new Map(allPlayers.map(p => [p.id, p]));
  const suggestions: SwapSuggestion[] = [];

  const draftSet = new Set(currentDraftIds);
  const teamASet = new Set(teamA);
  const teamBSet = new Set(teamB);

  repeats.forEach(repeat => {
    const player = playerMap.get(repeat.playerId);
    const repeatPartner = playerMap.get(repeat.partnerId);
    
    if (!player || !repeatPartner) return;

    // Find eligible swap candidates:
    // 1. Not already in draft
    // 2. Would not create a repeat partnership with their new partner
    const eligibleCandidates = allPlayers.filter(candidate => {
      if (draftSet.has(candidate.id)) return false;
      
      // Check if swapping would create repeat partnerships
      const newTeamA = [...teamA];
      const newTeamB = [...teamB];
      
      // Determine which team the player is on
      const playerTeam = teamA.includes(repeat.playerId) ? 'A' : 'B';
      const partnerTeam = playerTeam === 'A' ? 'B' : 'A';
      
      if (playerTeam === 'A') {
        const idx = newTeamA.indexOf(repeat.playerId);
        newTeamA[idx] = candidate.id;
      } else {
        const idx = newTeamB.indexOf(repeat.playerId);
        newTeamB[idx] = candidate.id;
      }
      
      // Check if new pairing creates repeat
      const newRepeats = detectRepeatPartners(newTeamA, newTeamB, allPlayers, threshold);
      return !newRepeats.some(r => r.playerId === candidate.id);
    });

    // Rank candidates by priority (waiting time, then games played)
    const rankedCandidates = eligibleCandidates
      .map(candidate => {
        let priority = 0;
        let reason = '';

        // Priority 1: Waiting time (longer wait = higher priority)
        const waitTime = (candidate.lastAvailableAt || 0);
        priority += waitTime / 1000; // Scale down for reasonable numbers
        reason += `Wait: ${Math.floor(waitTime / 60000)}min `;

        // Priority 2: Games played (fewer games = higher priority)
        priority += (100 - (candidate.gamesPlayed || 0));
        reason += `Games: ${candidate.gamesPlayed || 0}`;

        return {
          player: candidate,
          reason: reason.trim(),
          priority,
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Top 5 suggestions

    if (rankedCandidates.length > 0) {
      suggestions.push({
        playerId: repeat.playerId,
        suggestedPlayers: rankedCandidates,
      });
    }
  });

  return suggestions;
}
