import { useState, useRef, useEffect } from 'react';
import type { Todo } from '../lib/types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onUpdate: (id: string, text: string, time?: string) => void;
  onDelete: (id: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onUnassign?: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete, onDeleteGroup, onUnassign }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(todo.text);
  const [time, setTime] = useState(todo.time || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onUpdate(todo.id, trimmed, time || undefined);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setText(todo.text);
      setTime(todo.time || '');
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="animate-fade-in flex flex-col gap-2 p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-sm font-medium placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          placeholder="Treść zadania..."
        />
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
          {time && (
            <button
              onClick={() => setTime('')}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Usuń czas
            </button>
          )}
          {onUnassign && todo.date && (
            <button
              onClick={() => {
                onUnassign(todo.id);
                setEditing(false);
              }}
              className="text-xs text-amber-500 hover:text-amber-600 px-2 py-1"
            >
              Usuń datę
            </button>
          )}
          <div className="flex-1" />
          {todo.recurrenceGroupId && onDeleteGroup && (
            <button
              onClick={() => {
                onDeleteGroup(todo.recurrenceGroupId!);
                setEditing(false);
              }}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
            >
              Usuń wszystkie cykliczne
            </button>
          )}
          <button
            onClick={() => {
              setText(todo.text);
              setTime(todo.time || '');
              setEditing(false);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="text-xs bg-primary-500 text-white px-3 py-1 rounded-lg hover:bg-primary-600 active:scale-95 transition-all"
          >
            Zapisz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onToggle(todo.id)}
      className={`
        group flex items-center gap-3 p-3 rounded-2xl cursor-pointer
        bg-white dark:bg-gray-800/80
        border border-gray-100 dark:border-gray-800
        shadow-sm hover:shadow-md
        transition-all duration-200 active:scale-[0.98]
        ${todo.completed ? 'opacity-60' : ''}
      `}
    >
      {/* Checkbox */}
      <div
        className={`
          flex-shrink-0 w-5 h-5 rounded-md border-2
          flex items-center justify-center transition-all duration-200
          ${todo.completed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-300 dark:border-gray-600 group-hover:border-primary-400 dark:group-hover:border-primary-400'
          }
        `}
      >
        {todo.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''
          }`}
        >
          {todo.text}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {todo.time && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                <circle cx="12" cy="12" r="9" strokeLinecap="round" />
              </svg>
              {todo.time}
            </span>
          )}
          {todo.recurrenceGroupId && (
            <span className="inline-flex items-center gap-0.5 text-xs text-primary-400 dark:text-primary-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              cykliczne
            </span>
          )}
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="flex-shrink-0 p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-500 dark:hover:text-gray-300 active:text-gray-600 transition-all"
        aria-label="Edytuj"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
        className="flex-shrink-0 p-2 min-w-10 min-h-10 flex items-center justify-center rounded-lg text-gray-300 dark:text-gray-600 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 active:text-red-500 transition-all"
        aria-label="Usuń"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
