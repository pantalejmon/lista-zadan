import { randomUUID } from 'crypto';
import { CreateMaintenanceDto } from '../web/dto/create-maintenance.dto';

// Status of a scheduled maintenance relative to today.
export type MaintenanceStatus = 'ok' | 'soon' | 'overdue' | 'none';

export interface MaintenanceResponse {
  id: string;
  assetId: string;
  type: string;
  intervalMonths: number | null;
  lastDoneAt: string | null;
  nextDueAt: string | null;
  cost: number | null;
  notes: string | null;
  providerId: string | null;
  providerName: string | null;
  status: MaintenanceStatus;
  daysUntilDue: number | null;
  createdAt: number;
}

export class Maintenance {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly assetId: string,
    readonly type: string,
    readonly intervalMonths: number | null,
    readonly lastDoneAt: string | null,
    readonly nextDueAt: string | null,
    readonly cost: number | null,
    readonly notes: string | null,
    readonly providerId: string | null,
    readonly createdAt: number,
  ) {}

  static createFromDto(dto: CreateMaintenanceDto, householdId: string): Maintenance {
    const interval = normaliseInterval(dto.intervalMonths);
    const lastDoneAt = clean(dto.lastDoneAt);
    // Prefer an explicit nextDueAt; otherwise derive it from last done + interval.
    const nextDueAt = clean(dto.nextDueAt) ?? deriveNextDue(lastDoneAt, interval);
    return new Maintenance(
      randomUUID(),
      householdId,
      dto.assetId,
      dto.type.trim(),
      interval,
      lastDoneAt,
      nextDueAt,
      normaliseCost(dto.cost),
      clean(dto.notes),
      clean(dto.providerId),
      Date.now(),
    );
  }

  update(dto: CreateMaintenanceDto): Maintenance {
    const interval = normaliseInterval(dto.intervalMonths);
    const lastDoneAt = clean(dto.lastDoneAt);
    const nextDueAt = clean(dto.nextDueAt) ?? deriveNextDue(lastDoneAt, interval);
    return new Maintenance(
      this.id,
      this.householdId,
      dto.assetId,
      dto.type.trim(),
      interval,
      lastDoneAt,
      nextDueAt,
      normaliseCost(dto.cost),
      clean(dto.notes),
      clean(dto.providerId),
      this.createdAt,
    );
  }

  // Loop closer: marking a maintenance as done sets lastDoneAt and recomputes
  // the next due date from the interval (null interval → no further schedule).
  withCompleted(doneAt: string, cost: number | null): Maintenance {
    return new Maintenance(
      this.id,
      this.householdId,
      this.assetId,
      this.type,
      this.intervalMonths,
      doneAt,
      deriveNextDue(doneAt, this.intervalMonths),
      cost ?? this.cost,
      this.notes,
      this.providerId,
      this.createdAt,
    );
  }

  statusAt(today: string, soonDays: number): MaintenanceStatus {
    if (!this.nextDueAt) {
      return 'none';
    }
    const days = daysBetween(today, this.nextDueAt);
    if (days < 0) {
      return 'overdue';
    }
    if (days <= soonDays) {
      return 'soon';
    }
    return 'ok';
  }

  toResponse(today: string, soonDays: number, providerName: string | null = null): MaintenanceResponse {
    return {
      id: this.id,
      assetId: this.assetId,
      type: this.type,
      intervalMonths: this.intervalMonths,
      lastDoneAt: this.lastDoneAt,
      nextDueAt: this.nextDueAt,
      cost: this.cost,
      notes: this.notes,
      providerId: this.providerId,
      providerName,
      status: this.statusAt(today, soonDays),
      daysUntilDue: this.nextDueAt ? daysBetween(today, this.nextDueAt) : null,
      createdAt: this.createdAt,
    };
  }
}

function clean(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normaliseInterval(months: number | undefined | null): number | null {
  return typeof months === 'number' && Number.isFinite(months) && months > 0 ? Math.round(months) : null;
}

function normaliseCost(cost: number | undefined | null): number | null {
  return typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? cost : null;
}

// Adds whole months to a YYYY-MM-DD date, clamping the day to the target month's length.
export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const base = new Date(Date.UTC(y, m - 1 + months, 1));
  const daysInMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, daysInMonth);
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${base.getUTCFullYear()}-${mm}-${dd}`;
}

function deriveNextDue(lastDoneAt: string | null, intervalMonths: number | null): string | null {
  if (!lastDoneAt || !intervalMonths) {
    return null;
  }
  return addMonths(lastDoneAt, intervalMonths);
}

// Whole-day difference (to - from); positive when `to` is in the future.
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
