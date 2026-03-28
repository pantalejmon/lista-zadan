import { useState, useRef } from 'react';
import { format, addMonths } from 'date-fns';
import type { RecurrenceType, RecurrenceConfig } from '../lib/types';

interface AddTodoProps {
  selectedDate: string; // YYYY-MM-DD
  onAdd: (text: string, time?: string) => void;
  onAddRecurring: (text: string, time: string | undefined, config: RecurrenceConfig) => void;
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  monthly: 'Co miesiąc',
};

export function AddTodo({ selectedDate, onAdd, onAddRecurring }: AddTodoProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [time, setTime] = useState('');
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [dateFrom, setDateFrom] = useState(selectedDate);
  const [dateTo, setDateTo] = useState(() => format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setText('');
    setTime('');
    setShowRecurrence(false);
    setRecurrenceType('daily');
    setOpen(false);
  };

  const handleOpen = () => {
    setDateFrom(selectedDate);
    setDateTo(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (showRecurrence) {
      if (!dateFrom || !dateTo || dateFrom > dateTo) return;
      onAddRecurring(trimmed, time || undefined, {
        type: recurrenceType,
        dateFrom,
        dateTo,
      });
    } else {
      onAdd(trimmed, time || undefined);
    }
    reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') reset();
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="
          w-full flex items-center gap-3 p-3 rounded-2xl
          border-2 border-dashed border-gray-200 dark:border-gray-700
          text-gray-400 dark:text-gray-500
          hover:border-primary-300 dark:hover:border-primary-600
          hover:text-primary-500
          transition-all duration-200
          active:scale-[0.98]
        "
      >
        <div className="w-5 h-5 rounded-md border-2 border-current flex items-center justify-center">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
          </svg>
        </div>
        <span className="text-sm font-medium">Dodaj zadanie...</span>
      </button>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-3 p-3 rounded-2xl bg-white dark:bg-gray-800 border border-primary-200 dark:border-primary-800 shadow-lg shadow-primary-500/10">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-sm font-medium placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
        placeholder="Co trzeba zrobić?"
      />

      {/* Time row */}
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        />
        <span className="text-xs text-gray-400">(opcjonalnie)</span>
      </div>

      {/* Recurrence toggle */}
      <button
        type="button"
        onClick={() => setShowRecurrence((s) => !s)}
        className={`
          flex items-center gap-2 text-xs font-medium px-2 py-1.5 rounded-lg self-start transition-all
          ${showRecurrence
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }
        `}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Cykliczne
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${showRecurrence ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Recurrence options */}
      {showRecurrence && (
        <div className="animate-slide-down flex flex-col gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          {/* Frequency */}
          <div className="flex items-center gap-1.5">
            {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setRecurrenceType(type)}
                className={`
                  text-xs px-2.5 py-1 rounded-lg transition-all
                  ${recurrenceType === type
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                  }
                `}
              >
                {RECURRENCE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              Od
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              Do
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </label>
          </div>

          {dateFrom && dateTo && dateFrom > dateTo && (
            <p className="text-xs text-red-500">Data "od" musi być przed datą "do"</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={reset}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1"
        >
          Anuluj
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || (showRecurrence && (!dateFrom || !dateTo || dateFrom > dateTo))}
          className="text-xs bg-primary-500 text-white px-3 py-1.5 rounded-lg hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {showRecurrence ? 'Dodaj cyklicznie' : 'Dodaj'}
        </button>
      </div>
    </div>
  );
}
