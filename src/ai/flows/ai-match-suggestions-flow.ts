'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting balanced badminton matches.
 *
 * - aiMatchSuggestions - A function that handles the AI-driven match suggestion process.
 * - AiMatchSuggestionsInput - The input type for the aiMatchSuggestions function.
 * - AiMatchSuggestionsOutput - The return type for the aiMatchSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema for the public function and flow
const AiMatchSuggestionsInputSchema = z.object({
  playersInQueue: z.array(z.object({
    name: z.string().describe("The player's name."),
    skillLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Pro"]).describe("The player's skill level."),
    playStyle: z.enum(["Aggressive", "Defensive", "All-Rounder", "Tactical"]).describe("The player's preferred play style."),
  })).describe("A list of players currently in the queue with their details."),
});
export type AiMatchSuggestionsInput = z.infer<typeof AiMatchSuggestionsInputSchema>;

// Output Schema
const AiMatchSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    players: z.array(z.array(z.string())).describe("An array of teams/pairs. Each inner array contains player names."),
    justification: z.string().describe("An explanation of why this grouping creates a balanced and enjoyable match based on skill and play style."),
  })).describe("A list of suggested player groupings for balanced matches."),
});
export type AiMatchSuggestionsOutput = z.infer<typeof AiMatchSuggestionsOutputSchema>;

// Internal Prompt Input Schema (simplified for text presentation to LLM)
const MatchSuggestionPromptInputSchema = z.object({
  playersInfoString: z.string().describe("A human-readable string listing players in the queue with their details."),
});

// Prompt definition
const matchSuggestionPrompt = ai.definePrompt({
  name: 'matchSuggestionPrompt',
  input: {schema: MatchSuggestionPromptInputSchema},
  output: {schema: AiMatchSuggestionsOutputSchema}, // Genkit will use this to enforce JSON output format
  prompt: `You are an AI assistant specialized in creating balanced badminton matches. Your goal is to suggest pairings or teams from a list of available players to ensure enjoyable and competitive games, considering their skill levels and play styles.\n\nHere are the players currently in the queue:\n{{{playersInfoString}}}\n\nPlease suggest the most balanced match setup (e.g., two doubles pairs, or two teams for a 2v2 game) from these players. Provide a clear justification for why your suggestion creates a balanced and enjoyable match.\n\nFocus on creating one optimal match suggestion. Ensure that the suggested match setup is balanced and utilizes as many of the provided players as possible. If fewer than two players are available, indicate that a match cannot be formed yet.\n\nOutput your suggestion in JSON format.\n`,
});

// Flow definition
const aiMatchSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiMatchSuggestionsFlow',
    inputSchema: AiMatchSuggestionsInputSchema,
    outputSchema: AiMatchSuggestionsOutputSchema,
  },
  async (input) => {
    let playersInfoString: string;

    if (input.playersInQueue.length === 0) {
      playersInfoString = "No players are currently in the queue.";
    } else {
      playersInfoString = input.playersInQueue.map((p, index) =>
        `${index + 1}. ${p.name} (Skill: ${p.skillLevel}, Style: ${p.playStyle})`
      ).join('\n');
    }

    const {output} = await matchSuggestionPrompt({
      playersInfoString: playersInfoString,
    });

    if (!output) {
      throw new Error('AI failed to generate match suggestions.');
    }

    return output;
  }
);

// Wrapper function
export async function aiMatchSuggestions(input: AiMatchSuggestionsInput): Promise<AiMatchSuggestionsOutput> {
  return aiMatchSuggestionsFlow(input);
}
