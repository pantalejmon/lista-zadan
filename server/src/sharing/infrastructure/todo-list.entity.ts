import { Entity, PrimaryColumn, Column } from 'typeorm';
import { TodoList } from '../domain/todo-list.model';

@Entity('todo_list')
export class TodoListEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  name!: string;

  @Column('varchar')
  ownerId!: string;

  @Column('varchar')
  householdId!: string;

  @Column('boolean', { default: false })
  isDefault!: boolean;

  @Column('bigint')
  createdAt!: number;

  toDomain(): TodoList {
    return new TodoList(
      this.id,
      this.name,
      this.ownerId,
      this.householdId,
      this.isDefault,
      Number(this.createdAt),
    );
  }

  static fromDomain(model: TodoList): TodoListEntity {
    const entity = new TodoListEntity();
    entity.id = model.id;
    entity.name = model.name;
    entity.ownerId = model.ownerId;
    entity.householdId = model.householdId;
    entity.isDefault = model.isDefault;
    entity.createdAt = model.createdAt;
    return entity;
  }
}
