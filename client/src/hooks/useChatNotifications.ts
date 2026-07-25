import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { ChatMessage } from '../lib/chatApi';

// Always-on (when logged in) listener that counts unread chat messages so a badge
// can appear on the Czat nav item even when the user isn't in the chat. Own
// messages and messages received while the chat is open don't count. Kept separate
// from useChat (which powers the chat view) so it works regardless of which section
// is mounted.
export function useChatNotifications(
  householdId: string | undefined,
  enabled: boolean,
  active: boolean,
  currentUserId: string | undefined,
) {
  const [unread, setUnread] = useState(0);
  const activeRef = useRef(active);
  const userRef = useRef(currentUserId);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      setUnread(0);
    }
  }, [active]);
  useEffect(() => { userRef.current = currentUserId; }, [currentUserId]);

  useEffect(() => {
    if (!enabled || !householdId) {
      setUnread(0);
      return;
    }
    const base = import.meta.env.VITE_API_URL ?? '';
    const socket = io(`${base || window.location.origin}/chat`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
    });
    socket.on('connect', () => socket.emit('subscribe', { householdId }));
    socket.on('chat:message', (msg: ChatMessage) => {
      if (msg.householdId !== householdId || msg.userId === userRef.current || activeRef.current) {
        return;
      }
      setUnread((n) => n + 1);
    });
    return () => { socket.disconnect(); };
  }, [householdId, enabled]);

  return { unread, clear: () => setUnread(0) };
}
