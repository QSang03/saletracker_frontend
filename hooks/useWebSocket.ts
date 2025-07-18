import { useEffect, useRef } from 'react';
import { wsClient, WSClientEvents } from '@/lib/wsClient';

export function useWebSocket(token: string | null, eventHandlers: { [event in WSClientEvents]?: (data: any) => void }) {
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    if (!token) return;
    wsClient.connect(token);
    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      wsClient.on(event, handler as any);
    });
    return () => {
      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        wsClient.off(event, handler as any);
      });
      wsClient.disconnect();
    };
  }, [token]);
}
