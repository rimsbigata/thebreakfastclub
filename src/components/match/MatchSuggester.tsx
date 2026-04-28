
"use client";

import { useState } from 'react';
import { Player } from '@/lib/types';
import { aiMatchSuggestions, AiMatchSuggestionsOutput } from '@/ai/flows/ai-match-suggestions-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, UserPlus, Users2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MatchSuggesterProps {
  playersInQueue: Player[];
}

export function MatchSuggester({ playersInQueue }: MatchSuggesterProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiMatchSuggestionsOutput | null>(null);

  const handleSuggest = async () => {
    if (playersInQueue.length < 2) return;
    setLoading(true);
    try {
      const result = await aiMatchSuggestions({
        playersInQueue: playersInQueue.map(p => ({
          name: p.name,
          skillLevel: p.skillLevel,
          playStyle: p.playStyle,
        })),
      });
      setSuggestions(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Match Suggestion
            </CardTitle>
            <CardDescription>
              We&apos;ll analyze skill levels and styles for the most competitive match.
            </CardDescription>
          </div>
          <Button 
            onClick={handleSuggest} 
            disabled={loading || playersInQueue.length < 2}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Analyze Match
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!suggestions && !loading && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-background/50">
            {playersInQueue.length < 2 
              ? "Need at least 2 players in the queue to suggest a match." 
              : "Click the button to generate balanced pairings."}
          </div>
        )}

        {loading && (
          <div className="space-y-4 py-8">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center text-sm font-medium animate-pulse">Calculating optimal match balance...</p>
          </div>
        )}

        {suggestions && !loading && (
          <div className="space-y-6">
            {suggestions.suggestions.map((suggestion, idx) => (
              <div key={idx} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  {suggestion.players.map((team, tIdx) => (
                    <div key={tIdx} className="p-4 bg-background rounded-lg border shadow-sm space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Team {tIdx + 1}
                        </span>
                        <Users2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        {team.map((playerName) => (
                          <div key={playerName} className="font-medium flex items-center gap-2">
                            {playerName}
                            <Badge variant="secondary" className="text-[10px] scale-90">
                              {playersInQueue.find(p => p.name === playerName)?.skillLevel}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="absolute left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full hidden md:block">VS</div>
                </div>
                <div className="bg-secondary/20 p-4 rounded-lg text-sm border italic">
                  <span className="font-bold not-italic mr-1">Justification:</span>
                  {suggestion.justification}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setSuggestions(null)} className="w-full">
              Clear Suggestion
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
