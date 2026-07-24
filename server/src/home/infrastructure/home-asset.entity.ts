import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { HomeAsset } from '../domain/home-asset.model';

@Entity('home_asset')
export class HomeAssetEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  type!: string;

  @Column('varchar', { nullable: true })
  location!: string | null;

  @Column('varchar', { nullable: true })
  installedAt!: string | null;

  @Column('varchar', { nullable: true })
  warrantyUntil!: string | null;

  @Column('varchar', { nullable: true })
  model!: string | null;

  @Column('varchar', { nullable: true })
  serial!: string | null;

  @Column('varchar', { nullable: true })
  notes!: string | null;

  @Column('bigint')
  createdAt!: number;

  toDomain(): HomeAsset {
    return new HomeAsset(
      this.id,
      this.householdId,
      this.name,
      this.type,
      this.location,
      this.installedAt,
      this.warrantyUntil,
      this.model,
      this.serial,
      this.notes,
      Number(this.createdAt),
    );
  }

  static fromDomain(asset: HomeAsset): HomeAssetEntity {
    const entity = new HomeAssetEntity();
    entity.id = asset.id;
    entity.householdId = asset.householdId;
    entity.name = asset.name;
    entity.type = asset.type;
    entity.location = asset.location;
    entity.installedAt = asset.installedAt;
    entity.warrantyUntil = asset.warrantyUntil;
    entity.model = asset.model;
    entity.serial = asset.serial;
    entity.notes = asset.notes;
    entity.createdAt = asset.createdAt;
    return entity;
  }
}
