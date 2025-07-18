// contexts/WebSocketContext.tsx - Fixed timing issue
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { wsClient, WSClientEvents } from "@/lib/wsClient";
import { AuthContext } from "@/contexts/AuthContext";

// Kiểu cho handler
export type WSHandler = (data: any) => void;
export type WSHandlersMap = { [event in WSClientEvents]?: Set<WSHandler> };

interface IWebSocketContext {
  subscribe: (event: WSClientEvents, handler: WSHandler) => void;
  unsubscribe: (event: WSClientEvents, handler: WSHandler) => void;
  emit: (event: WSClientEvents, data: any) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<IWebSocketContext | undefined>(
  undefined
);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useContext(AuthContext);
  const handlersRef = useRef<WSHandlersMap>({});
  const eventHandlersRef = useRef<Map<WSClientEvents, (data: any) => void>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const pendingSubscriptionsRef = useRef<Array<{ event: WSClientEvents; handler: WSHandler }>>([]);

  // Tạo hoặc lấy event handler cho event cụ thể
  const getEventHandler = (event: WSClientEvents) => {
    if (!eventHandlersRef.current.has(event)) {
      const handler = (data: any) => {
        const handlers = handlersRef.current[event];
        if (handlers && handlers.size > 0) {
          handlers.forEach((fn) => {
            try {
              fn(data);
            } catch (error) {
              console.error(`[WebSocketContext] Error in handler for ${event}:`, error);
            }
          });
        }
      };
      eventHandlersRef.current.set(event, handler);
    }
    return eventHandlersRef.current.get(event)!;
  };

  const subscribe = (event: WSClientEvents, handler: WSHandler) => {
    if (!handlersRef.current[event]) {
      handlersRef.current[event] = new Set();
    }
    handlersRef.current[event]!.add(handler);

    if (isConnected) {
      // Đăng ký ngay nếu đã connected
      const eventHandler = getEventHandler(event);
      wsClient.on(event, eventHandler);
    } else {
      // Lưu để đăng ký sau khi connected
      pendingSubscriptionsRef.current.push({ event, handler });
    }
  };

  const unsubscribe = (event: WSClientEvents, handler: WSHandler) => {
    handlersRef.current[event]?.delete(handler);
    
    if (handlersRef.current[event]?.size === 0) {
      // Remove listener từ wsClient
      const eventHandler = eventHandlersRef.current.get(event);
      if (eventHandler) {
        wsClient.off(event, eventHandler);
        eventHandlersRef.current.delete(event);
      }
      delete handlersRef.current[event];
    }
  };

  useEffect(() => {
    if (!token) return;
    wsClient.connect(token);
    
    // Listen for connection events
    const handleConnect = () => {
      setIsConnected(true);
      
      // Process pending subscriptions
      const uniqueEvents = new Set(pendingSubscriptionsRef.current.map(p => p.event));
      uniqueEvents.forEach(event => {
        if (handlersRef.current[event] && handlersRef.current[event]!.size > 0) {
          const eventHandler = getEventHandler(event);
          wsClient.on(event, eventHandler);
        }
      });
      pendingSubscriptionsRef.current = [];
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    wsClient.socket?.on('connect', handleConnect);
    wsClient.socket?.on('disconnect', handleDisconnect);

    return () => {
      
      // Clean up all event handlers
      eventHandlersRef.current.forEach((handler, event) => {
        wsClient.off(event, handler);
      });
      eventHandlersRef.current.clear();
      handlersRef.current = {};
      pendingSubscriptionsRef.current = [];
      
      setIsConnected(false);
      wsClient.disconnect();
    };
  }, [token]);

  const emit = (event: WSClientEvents, data: any) => {
    wsClient.emit(event, data);
  };

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, emit, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx)
    throw new Error(
      "useWebSocketContext must be used within WebSocketProvider"
    );
  return ctx;
};