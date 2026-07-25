import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type WsStatus = 'connected' | 'connecting' | 'disconnected';

interface UseWebSocketOptions {
  enabled: boolean;
  listId: string | undefined;
  onTodoChange: () => void;
}

export function useWebSocket({ enabled, listId, onTodoChange }: UseWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const subscribedListRef = useRef<string | null>(null);

  const stableOnChange = useRef(onTodoChange);
  useEffect(() => {
    stableOnChange.current = onTodoChange;
  }, [onTodoChange]);

  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setStatus('disconnected');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL ?? '';
    // Polling-first, then upgrade to websocket. Many mobile networks (and some
    // reverse proxies) block the raw WS upgrade handshake but allow HTTP polling —
    // websocket-first there means the socket never connects ("offline" forever),
    // whereas polling-first connects immediately and silently upgrades when it can.
    const socket = io(apiUrl || window.location.origin, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connect', () => {
      setStatus('connected');
      if (subscribedListRef.current) {
        socket.emit('subscribe', { listId: subscribedListRef.current });
      }
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('reconnect_attempt', () => {
      setStatus('connecting');
    });

    const handleChange = () => stableOnChange.current();

    socket.on('todo:created', handleChange);
    socket.on('todo:updated', handleChange);
    socket.on('todo:deleted', handleChange);
    socket.on('todo:recurrence-created', handleChange);
    socket.on('todo:recurrence-deleted', handleChange);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      subscribedListRef.current = null;
      setStatus('disconnected');
    };
  }, [enabled]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      subscribedListRef.current = listId ?? null;
      return;
    }

    const prevList = subscribedListRef.current;
    if (prevList && prevList !== listId) {
      socket.emit('unsubscribe', { listId: prevList });
    }
    if (listId) {
      socket.emit('subscribe', { listId });
    }
    subscribedListRef.current = listId ?? null;
  }, [listId]);

  const reconnect = useCallback(() => {
    socketRef.current?.connect();
  }, []);

  return { status, reconnect };
}
