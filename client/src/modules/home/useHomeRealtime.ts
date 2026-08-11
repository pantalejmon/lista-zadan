import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Subscribes to live home-service (assets/maintenance) changes for a household.
export function useHomeRealtime(householdId: string | undefined, enabled: boolean, onChange: () => void) {
  const socketRef = useRef<Socket | null>(null);
  const cb = useRef(onChange);
  useEffect(() => { cb.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!enabled || !householdId) {
      return;
    }
    const base = import.meta.env.VITE_API_URL ?? '';
    const origin = base || window.location.origin;
    const socket = io(`${origin}/home`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('subscribe', { householdId }));
    socket.on('home:changed', (data: { householdId: string }) => {
      if (data.householdId === householdId) {
        cb.current();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [householdId, enabled]);
}
