
import { Player, Court } from './types';

export interface MatchResult {
  matchCreated: boolean;
  courtId?: string;
  courtName?: string;
  teamA?: string[];
  teamB?: string[];
  error?: string;
  analysis?: string;
}

/**
 * Deterministic Matchmaking Engine
 * Prioritizes gamesPlayed, then waiting time (FIFO).
 * Social variety prioritized over perfect skill balance via penalties.
 */
export function generateDeterministicMatch(
  availablePlayers: Player[],
  availableCourts: Court[]
): MatchResult {
  if (availablePlayers.length < 4) {
    return { matchCreated: false, error: "Insufficient players available. Need at least 4." };
  }

  // Phase A: Selection
  // 1. Sort by games played (ascending)
  // 2. Sort by waiting time (earliest lastAvailableAt first) as primary tie-breaker
  const selectedPlayers = [...availablePlayers]
    .sort((a, b) => {
      // Priority 1: Fewer games played
      if ((a.gamesPlayed || 0) !== (b.gamesPlayed || 0)) {
        return (a.gamesPlayed || 0) - (b.gamesPlayed || 0);
      }
      // Priority 2: Longest wait time (earliest timestamp)
      return (a.lastAvailableAt || 0) - (b.lastAvailableAt || 0);
    })
    .slice(0, 4);

  const [p1, p2, p3, p4] = selectedPlayers;

  // Phase B: Pairing (3 possible combinations)
  const combos = [
    { teamA: [p1, p2], teamB: [p3, p4] },
    { teamA: [p1, p3], teamB: [p2, p4] },
    { teamA: [p1, p4], teamB: [p2, p3] },
  ];

  // Phase C: Scoring
  const scoredCombos = combos.map(combo => {
    // 1. Skill Gap
    const skillA = combo.teamA.reduce((sum, p) => sum + p.skillLevel, 0);
    const skillB = combo.teamB.reduce((sum, p) => sum + p.skillLevel, 0);
    const skillGap = Math.abs(skillA - skillB);

    // 2. Partner Penalty (STRICT)
    let penalty = 0;

    const checkPenalty = (pa: Player, pb: Player) => {
      let p = 0;
      // Index 0: Most recent
      if (pa.partnerHistory?.[0] === pb.id) p += 100;
      // Index 1: 2 games ago
      if (pa.partnerHistory?.[1] === pb.id) p += 25;
      return p;
    };

    penalty += checkPenalty(combo.teamA[0], combo.teamA[1]);
    penalty += checkPenalty(combo.teamB[0], combo.teamB[1]);

    return {
      ...combo,
      score: skillGap + penalty,
      skillGap
    };
  });

  // Result: Lowest score wins
  const bestCombo = scoredCombos.sort((a, b) => a.score - b.score)[0];
  const court = availableCourts.length > 0 ? availableCourts[0] : undefined;

  return {
    matchCreated: true,
    courtId: court?.id,
    courtName: court?.name,
    teamA: bestCombo.teamA.map(p => p.id),
    teamB: bestCombo.teamB.map(p => p.id),
    analysis: bestCombo.score >= 25 
      ? `Prioritized wait time and social variety (${bestCombo.skillGap}pt gap).` 
      : `Optimal balance found with ${bestCombo.skillGap}pt gap.`
  };
}
