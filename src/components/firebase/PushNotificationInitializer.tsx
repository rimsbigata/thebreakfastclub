'use client';

import { useEffect, useRef } from 'react';
import { useClub } from '@/context/ClubContext';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import {
  listenForForegroundPushMessages,
  registerPushMessagingToken,
  savePushTokenForPlayer,
} from '@/firebase/pushNotifications';

export function PushNotificationInitializer() {
  const { currentPlayer } = useClub();
  const { firebaseApp, firestore } = useFirebase();
  const { toast } = useToast();
  const tokenRef = useRef<string | null>(null);
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    if (!currentPlayer) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (Notification.permission === 'denied') {
      return;
    }

    const registerToken = async () => {
      try {
        const token = await registerPushMessagingToken(firebaseApp);
        if (!token) {
          return;
        }

        if (tokenRef.current === token) {
          return;
        }

        tokenRef.current = token;
        await savePushTokenForPlayer(firestore, currentPlayer.id, token);

        toast({
          title: 'Push notifications enabled',
          description: 'Your browser is now registered to receive match alerts.',
        });
      } catch (error) {
        console.error('PushNotificationInitializer:', error);
      }
    };

    if (Notification.permission === 'default' && !permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      registerToken();
      return;
    }

    if (Notification.permission === 'granted') {
      registerToken();
    }
  }, [currentPlayer, firebaseApp, firestore, toast]);

  useEffect(() => {
    if (!currentPlayer) {
      return;
    }

    if (typeof window === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    const startListener = async () => {
      unsubscribe = await listenForForegroundPushMessages(firebaseApp, payload => {
        const title = payload.notification?.title ?? 'New badminton update';
        const description = payload.notification?.body ?? 'A new notification has arrived.';

        toast({ title, description });
      });
    };

    startListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentPlayer, firebaseApp, toast]);

  return null;
}
