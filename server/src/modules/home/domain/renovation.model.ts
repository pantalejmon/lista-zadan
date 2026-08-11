import { randomUUID } from 'crypto';
import { CreateRenovationDto } from '../web/dto/create-renovation.dto';

export type RenovationStatus = 'planned' | 'in_progress' | 'done';

const STATUSES: RenovationStatus[] = ['planned', 'in_progress', 'done'];

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface RenovationResponse {
  id: string;
  title: string;
  status: RenovationStatus;
  description: string | null;
  budget: number | null;
  cost: number | null;
  checklist: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
}

// A renovation/project with budget-vs-cost tracking and a checklist.
export class Renovation {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly title: string,
    readonly status: RenovationStatus,
    readonly description: string | null,
    readonly budget: number | null,
    readonly cost: number | null,
    readonly checklist: ChecklistItem[],
    readonly createdAt: number,
    readonly updatedAt: number,
  ) {}

  static createFromDto(dto: CreateRenovationDto, householdId: string): Renovation {
    const now = Date.now();
    return new Renovation(
      randomUUID(),
      householdId,
      dto.title.trim(),
      normaliseStatus(dto.status),
      clean(dto.description),
      normaliseMoney(dto.budget),
      normaliseMoney(dto.cost),
      normaliseChecklist(dto.checklist),
      now,
      now,
    );
  }

  update(dto: CreateRenovationDto): Renovation {
    return new Renovation(
      this.id,
      this.householdId,
      dto.title.trim(),
      normaliseStatus(dto.status),
      clean(dto.description),
      normaliseMoney(dto.budget),
      normaliseMoney(dto.cost),
      normaliseChecklist(dto.checklist),
      this.createdAt,
      Date.now(),
    );
  }

  toResponse(): RenovationResponse {
    return {
      id: this.id,
      title: this.title,
      status: this.status,
      description: this.description,
      budget: this.budget,
      cost: this.cost,
      checklist: this.checklist,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function clean(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normaliseStatus(status: string | undefined): RenovationStatus {
  return status && STATUSES.includes(status as RenovationStatus) ? (status as RenovationStatus) : 'planned';
}

function normaliseMoney(value: number | undefined | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normaliseChecklist(items: CreateRenovationDto['checklist']): ChecklistItem[] {
  if (!items) {
    return [];
  }
  return items
    .filter((i) => i.text?.trim())
    .map((i) => ({
      id: i.id?.trim() || randomUUID(),
      text: i.text.trim(),
      done: Boolean(i.done),
    }));
}
