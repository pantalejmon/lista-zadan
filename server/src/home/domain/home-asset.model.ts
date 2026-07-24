import { randomUUID } from 'crypto';
import { CreateAssetDto } from '../web/dto/create-asset.dto';

export interface HomeAssetResponse {
  id: string;
  name: string;
  type: string;
  location: string | null;
  installedAt: string | null;
  warrantyUntil: string | null;
  model: string | null;
  serial: string | null;
  notes: string | null;
  createdAt: number;
}

export class HomeAsset {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly name: string,
    readonly type: string,
    readonly location: string | null,
    readonly installedAt: string | null,
    readonly warrantyUntil: string | null,
    readonly model: string | null,
    readonly serial: string | null,
    readonly notes: string | null,
    readonly createdAt: number,
  ) {}

  static createFromDto(dto: CreateAssetDto, householdId: string): HomeAsset {
    return new HomeAsset(
      randomUUID(),
      householdId,
      dto.name.trim(),
      dto.type.trim(),
      clean(dto.location),
      clean(dto.installedAt),
      clean(dto.warrantyUntil),
      clean(dto.model),
      clean(dto.serial),
      clean(dto.notes),
      Date.now(),
    );
  }

  update(dto: CreateAssetDto): HomeAsset {
    return new HomeAsset(
      this.id,
      this.householdId,
      dto.name.trim(),
      dto.type.trim(),
      clean(dto.location),
      clean(dto.installedAt),
      clean(dto.warrantyUntil),
      clean(dto.model),
      clean(dto.serial),
      clean(dto.notes),
      this.createdAt,
    );
  }

  toResponse(): HomeAssetResponse {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      location: this.location,
      installedAt: this.installedAt,
      warrantyUntil: this.warrantyUntil,
      model: this.model,
      serial: this.serial,
      notes: this.notes,
      createdAt: this.createdAt,
    };
  }
}

function clean(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
