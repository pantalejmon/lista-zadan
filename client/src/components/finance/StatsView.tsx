import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getStats,
  formatCurrency,
  formatDay,
  type FinanceStats,
  type Wallet,
} from '../../lib/financeApi';

interface StatsViewProps {
  householdId: string;
  wallet: Wallet;
  liveKey: number;
}

export function StatsView({ householdId, wallet, liveKey }: StatsViewProps) {
  const [stats, setStats] = useState<FinanceStats | null>(null);

  const load = useCallback(async () => {
    setStats(await getStats(householdId, wallet.id));
  }, [householdId, wallet.id]);

  useEffect(() => { load(); }, [load, liveKey]);

  if (!stats) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const empty = stats.trend.length === 0;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Przychody" value={stats.income} tone="income" />
        <StatTile label="Wydatki" value={stats.expenses} tone="expense" />
        <StatTile label="Saldo" value={stats.balance} tone={stats.balance >= 0 ? 'income' : 'expense'} />
      </div>

      {empty ? (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
          Brak danych — dodaj transakcje, żeby zobaczyć statystyki.
        </p>
      ) : (
        <>
          <CategoryBars data={stats.byCategory} total={stats.expenses} />
          <BalanceTrend trend={stats.trend} />
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: 'income' | 'expense' }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-3 py-3">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-base sm:text-lg font-bold tabular-nums truncate ${
        tone === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
      }`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

// Magnitude comparison across categories → horizontal bars in a single hue with
// direct value labels (not a multi-colour pie: angles are hard to compare and
// nine hues can't be told apart reliably).
function CategoryBars({ data, total }: { data: { category: string; total: number }[]; total: number }) {
  if (data.length === 0) {
    return null;
  }
  const max = Math.max(...data.map((d) => d.total));

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <h2 className="text-sm font-semibold mb-3">Wydatki wg kategorii</h2>
      <ul className="space-y-2.5">
        {data.map((d) => (
          <li key={d.category}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{d.category}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                {formatCurrency(d.total)}
                {total > 0 && <span className="text-gray-400 dark:text-gray-500"> · {Math.round((d.total / total) * 100)}%</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-600 dark:bg-primary-400"
                style={{ width: `${Math.max(2, (d.total / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const WIDTH = 400;
const HEIGHT = 150;
const PAD = { top: 12, right: 8, bottom: 20, left: 8 };

// Single-series trend over time: 2px line + soft area, recessive grid, hover
// crosshair with a tooltip (no label on every point).
function BalanceTrend({ trend }: { trend: { at: number; balance: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (trend.length < 2) {
    return (
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <h2 className="text-sm font-semibold mb-1">Saldo w czasie</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">Za mało transakcji na wykres trendu.</p>
      </section>
    );
  }

  const chartW = WIDTH - PAD.left - PAD.right;
  const chartH = HEIGHT - PAD.top - PAD.bottom;
  const balances = trend.map((p) => p.balance);
  const minBal = Math.min(...balances, 0);
  const maxBal = Math.max(...balances, 0);
  const range = maxBal - minBal || 1;
  const minT = trend[0].at;
  const maxT = trend[trend.length - 1].at;
  const timeRange = maxT - minT || 1;

  const x = (at: number) => PAD.left + ((at - minT) / timeRange) * chartW;
  const y = (balance: number) => PAD.top + chartH - ((balance - minBal) / range) * chartH;

  const line = trend.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.at).toFixed(1)} ${y(p.balance).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(maxT).toFixed(1)} ${y(minBal).toFixed(1)} L ${x(minT).toFixed(1)} ${y(minBal).toFixed(1)} Z`;
  const zeroY = y(0);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    trend.forEach((p, i) => {
      const dist = Math.abs(x(p.at) - svgX);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  const active = hover !== null ? trend[hover] : null;

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold">Saldo w czasie</h2>
        {active ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {formatDay(active.at)} · <span className="font-medium text-gray-700 dark:text-gray-200">{formatCurrency(active.balance)}</span>
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">min {formatCurrency(minBal)} · max {formatCurrency(maxBal)}</span>
        )}
      </div>

      <div className="text-primary-600 dark:text-primary-400">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-40 touch-none"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* zero baseline / grid */}
          <line
            x1={PAD.left} y1={zeroY} x2={WIDTH - PAD.right} y2={zeroY}
            stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3"
          />

          <defs>
            <linearGradient id="financeTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#financeTrendFill)" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {active && (
            <g>
              <line
                x1={x(active.at)} y1={PAD.top} x2={x(active.at)} y2={PAD.top + chartH}
                stroke="currentColor" strokeOpacity="0.4"
              />
              {/* 2px surface ring so the marker reads over the line */}
              <circle cx={x(active.at)} cy={y(active.balance)} r="5" fill="currentColor" stroke="var(--color-surface, #fff)" strokeWidth="2" className="[--color-surface:#fff] dark:[--color-surface:#111827]" />
            </g>
          )}

          <text x={PAD.left} y={HEIGHT - 4} className="fill-gray-400 text-[9px]">{formatDay(minT)}</text>
          <text x={WIDTH - PAD.right} y={HEIGHT - 4} textAnchor="end" className="fill-gray-400 text-[9px]">{formatDay(maxT)}</text>
        </svg>
      </div>
    </section>
  );
}
