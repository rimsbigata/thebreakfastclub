
'use server';
/**
 * @fileOverview AI Matchmaking flow for TheBreakfastClub.
 * Suggests a balanced 2v2 doubles match based on skill, history, and fairness.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PlayerInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  skillLevel: z.number().describe("1 to 7"),
  gamesPlayed: z.number(),
  partnerHistory: z.array(z.string()),
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
  matchFound: z.boolean(),
  courtName: z.string().optional(),
  courtId: z.string().optional(),
  teamA: z.array(z.string()).describe("Player IDs for Team A"),
  teamB: z.array(z.string()).describe("Player IDs for Team B"),
  justification: z.string().optional(),
});

export type MatchSuggestionInput = z.infer<typeof MatchSuggestionInputSchema>;
export type MatchSuggestionOutput = z.infer<typeof MatchSuggestionOutputSchema>;

const matchSuggestionPrompt = ai.definePrompt({
  name: 'matchSuggestionPrompt',
  input: { schema: MatchSuggestionInputSchema },
  output: { schema: MatchSuggestionOutputSchema },
  prompt: `Act as a Badminton Tournament Director. Generate a balanced doubles match (2 vs 2).

Inputs Provided:
Players: {{#each availablePlayers}} - {{name}} (ID: {{id}}, Skill: {{skillLevel}}, Played: {{gamesPlayed}}, History: {{partnerHistory}}) {{/each}}
Courts: {{#each availableCourts}} - {{name}} (ID: {{id}}) {{/each}}

Rules:
1. Balance teams: The sum of skillLevels for Team A should be roughly equal to Team B.
2. Avoid repeats: Check 'partnerHistory'—do not pair two players who have played together recently.
3. Fairness: Prioritize players with the lowest 'gamesPlayed' count.
4. Court Assignment: Assign the match to the first available court.

Output Format (JSON Only):
{
  "matchFound": true,
  "courtName": "Court A",
  "courtId": "ID",
  "teamA": ["playerID1", "playerID2"],
  "teamB": ["playerID3", "playerID4"],
  "justification": "Explanation of why this match was chosen"
}`,
});

export async function generateMatch(input: MatchSuggestionInput): Promise<MatchSuggestionOutput> {
  const {output} = await matchSuggestionPrompt(input);
  if (!output) throw new Error("Failed to generate match suggestion");
  return output;
}
