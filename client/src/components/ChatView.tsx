import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import type { ChatMessage } from '../lib/chatApi';

interface ChatViewProps {
  isCloud: boolean;
  householdId: string | undefined;
  householdName: string | undefined;
  currentUserId: string | undefined;
  onLogin: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function ChatView({ isCloud, householdId, householdName, currentUserId, onLogin }: ChatViewProps) {
  const { messages, loading, status, send } = useChat(householdId, isCloud);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isCloud) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 text-gray-400 dark:text-gray-500">
        <svg className="w-12 h-12 mb-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4-.8L3 20l.8-3.2A7.9 7.9 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-gray-600 dark:text-gray-300 font-medium">Czat rodzinny wymaga zalogowania</p>
        <p className="text-sm mt-1 max-w-xs">Zaloguj się przez Google, aby pisać z domownikami w ramach gospodarstwa.</p>
        <button
          onClick={onLogin}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          Zaloguj przez Google
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) {
      return;
    }
    setText('');
    try {
      await send(value);
    } catch {
      setText(value);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100svh-3rem-env(safe-area-inset-top))] sm:h-[calc(100svh-3.5rem-env(safe-area-inset-top))] min-h-0">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 max-w-2xl mx-auto w-full">
        <span className="text-sm font-semibold truncate">{householdName ?? 'Gospodarstwo'}</span>
        <span className={`ml-auto inline-flex items-center gap-1.5 text-xs ${status === 'connected' ? 'text-emerald-500' : 'text-gray-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-gray-400 animate-pulse'}`} />
          {status === 'connected' ? 'na żywo' : 'łączenie...'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto w-full space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
              Brak wiadomości. Napisz pierwszą! 👋
            </p>
          ) : (
            messages.map((m) => <MessageRow key={m.id} message={m} own={m.userId === currentUserId} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto w-full flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Napisz wiadomość..."
            className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 active:scale-95 transition-all"
            aria-label="Wyślij"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageRow({ message, own }: { message: ChatMessage; own: boolean }) {
  if (own) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="rounded-2xl rounded-br-md bg-primary-500 text-white px-3.5 py-2 text-sm break-words whitespace-pre-wrap">
            {message.text}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 text-right mt-0.5 pr-1">{formatTime(message.createdAt)}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      {message.authorAvatarUrl ? (
        <img src={message.authorAvatarUrl} alt="" className="w-7 h-7 rounded-full shrink-0" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
          {initials(message.authorName)}
        </div>
      )}
      <div className="max-w-[75%]">
        <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5 ml-1">{message.authorName}</div>
        <div className="rounded-2xl rounded-bl-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-3.5 py-2 text-sm break-words whitespace-pre-wrap">
          {message.text}
        </div>
        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ml-1">{formatTime(message.createdAt)}</div>
      </div>
    </div>
  );
}
