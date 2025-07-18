import { useEffect, useRef } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { WSClientEvents } from '@/lib/wsClient';

export const useWSHandler = (event: WSClientEvents, handler: (data: any) => void) => {
  const { subscribe, unsubscribe } = useWebSocketContext();
  const handlerRef = useRef(handler);
  const isSubscribedRef = useRef(false);
  const stableHandlerRef = useRef<((data: any) => void) | null>(null);

  // Always update handler ref
  handlerRef.current = handler;

  // Create stable handler once
  if (!stableHandlerRef.current) {
    stableHandlerRef.current = (data: any) => {
      handlerRef.current(data);
    };
  }

  useEffect(() => {
    const stableHandler = stableHandlerRef.current!;
    
    // Skip if already subscribed
    if (isSubscribedRef.current) {
      console.log(`[useWSHandler] Already subscribed to ${event}, skipping...`);
      return;
    }

    console.log(`[useWSHandler] Subscribing to event '${event}'`);
    subscribe(event, stableHandler);
    isSubscribedRef.current = true;

    return () => {
      console.log(`[useWSHandler] Unsubscribing from event '${event}'`);
      unsubscribe(event, stableHandler);
      isSubscribedRef.current = false;
    };
  }, [event]); // CHỈ depend vào event, KHÔNG depend vào subscribe/unsubscribe

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      if (isSubscribedRef.current && stableHandlerRef.current) {
        unsubscribe(event, stableHandlerRef.current);
        isSubscribedRef.current = false;
      }
    };
  }, []);
};