import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getWeek,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import type { DayCounts } from '../hooks/useTodoCounts';

interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  counts: DayCounts;
}

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

function DayButton({
  day,
  selectedDate,
  currentMonth,
  counts,
  onSelectDate,
}: {
  day: Date;
  selectedDate: Date;
  currentMonth: Date;
  counts: DayCounts;
  onSelectDate: (date: Date) => void;
}) {
  const dateKey = format(day, 'yyyy-MM-dd');
  const inMonth = isSameMonth(day, currentMonth);
  const selected = isSameDay(day, selectedDate);
  const today = isToday(day);
  const dayCount = counts[dateKey];
  const allDone = dayCount && dayCount.total === dayCount.completed;

  return (
    <button
      onClick={() => onSelectDate(day)}
      className={`
        relative flex flex-col items-center justify-center
        py-2 rounded-xl transition-all duration-150
        ${!inMonth ? 'opacity-30' : ''}
        ${selected
          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
          : today
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }
        active:scale-95
      `}
    >
      <span className="text-sm leading-none">{format(day, 'd')}</span>
      {dayCount && (
        <div className="flex gap-0.5 mt-1">
          {dayCount.total <= 3 ? (
            Array.from({ length: dayCount.total }).map((_, i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full ${
                  selected
                    ? 'bg-white/70'
                    : allDone
                      ? 'bg-emerald-400'
                      : i < dayCount.completed
                        ? 'bg-emerald-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))
          ) : (
            <div
              className={`text-[9px] leading-none font-medium ${
                selected
                  ? 'text-white/70'
                  : allDone
                    ? 'text-emerald-500'
                    : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {dayCount.completed}/{dayCount.total}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export function Calendar({
  selectedDate,
  onSelectDate,
  currentMonth,
  onMonthChange,
  counts,
}: CalendarProps) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('calendar-collapsed') === '1');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // In collapsed mode, show only the week containing the selected date
  const selectedWeekNum = getWeek(selectedDate, { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  const activeWeek = weeks.find((week) =>
    week.some((d) => getWeek(d, { weekStartsOn: 1 }) === selectedWeekNum && isSameMonth(d, currentMonth))
  ) || weeks.find((week) => week.some((d) => isSameDay(d, selectedDate))) || weeks[0];

  const displayDays = collapsed ? activeWeek : allDays;

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          aria-label="Poprzedni miesiąc"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => {
            onSelectDate(new Date());
            onMonthChange(startOfMonth(new Date()));
          }}
          className="text-lg font-semibold capitalize hover:text-primary-500 transition-colors"
        >
          {format(currentMonth, 'LLLL yyyy', { locale: pl })}
        </button>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 -mr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          aria-label="Następny miesiąc"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5 transition-all duration-300">
        {displayDays.map((day) => (
          <DayButton
            key={format(day, 'yyyy-MM-dd')}
            day={day}
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            counts={counts}
            onSelectDate={onSelectDate}
          />
        ))}
      </div>

      {/* Collapse/expand toggle */}
      <button
        onClick={() => setCollapsed((c) => { const next = !c; localStorage.setItem('calendar-collapsed', next ? '1' : '0'); return next; })}
        className="w-full flex justify-center pt-2 pb-0.5"
        aria-label={collapsed ? 'Rozwiń kalendarz' : 'Zwiń kalendarz'}
      >
        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span>{collapsed ? 'Rozwiń' : 'Zwiń'}</span>
        </div>
      </button>
    </div>
  );
}
