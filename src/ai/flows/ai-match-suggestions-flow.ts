
'use server';
/**
 * @fileOverview Fast AI Matchmaking flow for TheBreakfastClub.
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
  prompt: `Fast Mode: Balanced 2v2 doubles match generator.

Players: {{#each availablePlayers}} - {{name}} (ID: {{id}}, Skill: {{skillLevel}}, Played: {{gamesPlayed}}) {{/each}}
Courts: {{#each availableCourts}} - {{name}} (ID: {{id}}) {{/each}}

Rules:
1. Team skills must be nearly equal.
2. Prioritize players with fewest 'gamesPlayed'.
3. Assign to the first available court.

Output JSON only.`,
});

export async function generateMatch(input: MatchSuggestionInput): Promise<MatchSuggestionOutput> {
  const {output} = await matchSuggestionPrompt(input);
  if (!output) throw new Error("Failed to generate match suggestion");
  return output;
}
