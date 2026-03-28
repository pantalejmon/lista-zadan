import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ListMember } from '../domain/list-member.model';
import type { ListRole } from '../domain/list-role';

@Entity('list_member')
export class ListMemberEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  listId!: string;

  @Column('varchar')
  userId!: string;

  @Column('varchar')
  role!: ListRole;

  @Column('bigint')
  joinedAt!: number;

  toDomain(): ListMember {
    return new ListMember(this.id, this.listId, this.userId, this.role, Number(this.joinedAt));
  }

  static fromDomain(model: ListMember): ListMemberEntity {
    const entity = new ListMemberEntity();
    entity.id = model.id;
    entity.listId = model.listId;
    entity.userId = model.userId;
    entity.role = model.role;
    entity.joinedAt = model.joinedAt;
    return entity;
  }
}
