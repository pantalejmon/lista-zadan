import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getMessages, sendMessage, type ChatMessage } from './chatApi';

export type ChatStatus = 'connected' | 'connecting' | 'disconnected';

export function useChat(householdId: string | undefined, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ChatStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  // Load history when the household changes.
  useEffect(() => {
    if (!enabled || !householdId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getMessages(householdId)
      .then((msgs) => { if (!cancelled) { setMessages(msgs); } })
      .catch(() => { if (!cancelled) { setMessages([]); } })
      .finally(() => { if (!cancelled) { setLoading(false); } });
    return () => { cancelled = true; };
  }, [householdId, enabled]);

  // Live connection.
  useEffect(() => {
    if (!enabled || !householdId) {
      return;
    }
    const base = import.meta.env.VITE_API_URL ?? '';
    const origin = base || window.location.origin;
    const socket = io(`${origin}/chat`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
    });
    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('subscribe', { householdId });
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('chat:message', (msg: ChatMessage) => {
      if (msg.householdId === householdId) {
        appendMessage(msg);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    };
  }, [householdId, enabled, appendMessage]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!householdId || !trimmed) {
      return;
    }
    const msg = await sendMessage(householdId, trimmed);
    appendMessage(msg);
  }, [householdId, appendMessage]);

  return { messages, loading, status, send };
}
