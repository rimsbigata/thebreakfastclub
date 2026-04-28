'use client';

import { useEffect, useMemo } from 'react';
import { useClub } from '@/context/ClubContext';
import { useToast } from '@/hooks/use-toast';

export function PlayerMatchAlerts() {
  const { currentPlayer, matches, courts } = useClub();
  const { toast } = useToast();

  const assignedMatch = useMemo(() => {
    if (!currentPlayer) return null;
    return matches.find(match =>
      !match.isCompleted &&
      match.courtId &&
      [...match.teamA, ...match.teamB].includes(currentPlayer.id)
    ) ?? null;
  }, [currentPlayer, matches]);

  useEffect(() => {
    if (!currentPlayer || !assignedMatch?.courtId) return;

    const alertKey = `tbc_match_alert_${currentPlayer.id}_${assignedMatch.id}_${assignedMatch.courtId}`;
    if (localStorage.getItem(alertKey)) return;

    const courtName = courts.find(court => court.id === assignedMatch.courtId)?.name ?? 'your court';
    const title = 'Court assigned';
    const description = `${courtName} is ready. You can now play.`;

    toast({ title, description });
    localStorage.setItem(alertKey, '1');

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body: description });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body: description });
          }
        });
      }
    }
  }, [assignedMatch, courts, currentPlayer, toast]);

  return null;
}
