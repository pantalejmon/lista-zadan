import { useState, useEffect } from 'react';
import { isPushAvailable, enablePush, disablePush, getExistingSubscription } from '../lib/push';

// Toggle in the sidebar to enable/disable Web Push on this device (cloud mode only).
export function PushToggle() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const avail = await isPushAvailable();
      if (cancelled) {
        return;
      }
      setAvailable(avail);
      if (avail) {
        const sub = await getExistingSubscription();
        if (!cancelled) {
          setEnabled(Boolean(sub));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!available) {
    return null;
  }

  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        const ok = await enablePush();
        setEnabled(ok);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors disabled:opacity-50"
    >
      <svg
        className={`w-5 h-5 ${enabled ? 'text-primary-500' : 'text-gray-400'}`}
        fill={enabled ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-left">
        {enabled ? 'Powiadomienia włączone' : 'Włącz powiadomienia'}
      </span>
      <span className={`w-9 h-5 rounded-full relative transition-colors ${enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-4' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
