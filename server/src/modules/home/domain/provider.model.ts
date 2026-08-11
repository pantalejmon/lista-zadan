import { randomUUID } from 'crypto';
import { CreateProviderDto } from '../web/dto/create-provider.dto';

export interface ProviderResponse {
  id: string;
  name: string;
  trade: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: number;
}

// A contractor/contact (hydraulik, elektryk, kominiarz…) referenced by maintenance.
export class Provider {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly name: string,
    readonly trade: string | null,
    readonly phone: string | null,
    readonly email: string | null,
    readonly notes: string | null,
    readonly createdAt: number,
  ) {}

  static createFromDto(dto: CreateProviderDto, householdId: string): Provider {
    return new Provider(
      randomUUID(),
      householdId,
      dto.name.trim(),
      clean(dto.trade),
      clean(dto.phone),
      clean(dto.email),
      clean(dto.notes),
      Date.now(),
    );
  }

  update(dto: CreateProviderDto): Provider {
    return new Provider(
      this.id,
      this.householdId,
      dto.name.trim(),
      clean(dto.trade),
      clean(dto.phone),
      clean(dto.email),
      clean(dto.notes),
      this.createdAt,
    );
  }

  toResponse(): ProviderResponse {
    return {
      id: this.id,
      name: this.name,
      trade: this.trade,
      phone: this.phone,
      email: this.email,
      notes: this.notes,
      createdAt: this.createdAt,
    };
  }
}

function clean(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
