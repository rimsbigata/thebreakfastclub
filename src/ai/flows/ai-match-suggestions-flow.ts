
'use server';
/**
 * @fileOverview BreakfastClub AI Commissioner Matchmaking.
 * Structured to receive club data and return perfectly balanced matches 
 * while strictly obeying partner history and skill gap rules.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PlayerInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  skillLevel: z.number().describe("1 to 7 (1:Novice, 7:Elite)"),
  gamesPlayed: z.number(),
  partnerHistory: z.array(z.string()).describe("IDs of recent partners, newest first"),
});

const CourtInputSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const MatchSuggestionInputSchema = z.object({
  availablePlayers: z.array(PlayerInputSchema),
  availableCourts: z.array(CourtInputSchema),
});

const MatchSuggestionOutputSchema = z.object({
  matchCreated: z.boolean(),
  courtName: z.string().optional(),
  courtId: z.string().optional(),
  teamA: z.array(z.string()).describe("Player IDs for Team A"),
  teamB: z.array(z.string()).describe("Player IDs for Team B"),
  teamANames: z.array(z.string()).optional().describe("Player Names for Team A"),
  teamBNames: z.array(z.string()).optional().describe("Player Names for Team B"),
  analysis: z.string().optional().describe("1-sentence explanation of why this match was chosen"),
  error: z.string().optional(),
});

export type MatchSuggestionInput = z.infer<typeof MatchSuggestionInputSchema>;
export type MatchSuggestionOutput = z.infer<typeof MatchSuggestionOutputSchema>;

const matchSuggestionPrompt = ai.definePrompt({
  name: 'matchSuggestionPrompt',
  input: { schema: MatchSuggestionInputSchema },
  output: { schema: MatchSuggestionOutputSchema },
  prompt: `Act as the "BreakfastClub AI Commissioner," an expert badminton tournament director. 
Your goal is to generate a fair, competitive, and socially diverse doubles match.

---
CORE INPUT DATA:
Players: {{#each availablePlayers}} - {{name}} (ID: {{id}}, Skill: {{skillLevel}}, Games: {{gamesPlayed}}, History: {{partnerHistory}}) {{/each}}
Courts: {{#each availableCourts}} - {{name}} (ID: {{id}}) {{/each}}

---
STRICT MATCHMAKING RULES:
1. PRIORITY SELECTION: Pick the 4 players from 'availablePlayers' who have the lowest 'gamesPlayed'.

2. TEAM BALANCING (MINIMAX SKILL GAP): 
   - Calculate total skill points for Team A and Team B.
   - Minimize the "Skill Gap". A 10 vs 10 match is perfect. 
   - Avoid gaps of 3 points or more unless mathematically unavoidable.

3. REPEAT PARTNER PENALTY (STRICT):
   - Check 'partnerHistory' of the selected players.
   - If Player X was partnered with Player Y in their most recent game (index 0 of partnerHistory), you are STRONGLY FORBIDDEN from pairing them again.
   - Assign a +100 point penalty to any pairing that is an immediate repeat. 
   - Prefer a slightly uneven skill gap (e.g., gap of 2) over a repeat partnership.

4. COURT ASSIGNMENT:
   - Assign to the first available court in 'availableCourts'.

Return teamA and teamB as arrays of Player IDs.`,
});

export async function generateMatch(input: MatchSuggestionInput): Promise<MatchSuggestionOutput> {
  const {output} = await matchSuggestionPrompt(input);
  if (!output) throw new Error("AI Commissioner failed to respond");
  return output;
}
