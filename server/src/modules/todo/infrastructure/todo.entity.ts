import { Entity, Column, PrimaryColumn } from 'typeorm';
import { Todo, TodoKind } from '../domain/todo.model';
import { ShoppingItem } from '../domain/shopping-item';

@Entity('todo')
export class TodoEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  text!: string;

  @Column('boolean', { default: false })
  completed!: boolean;

  @Column('varchar', { nullable: true })
  date!: string | null;

  @Column('varchar', { nullable: true })
  time!: string | null;

  @Column('bigint')
  createdAt!: number;

  @Column('varchar', { nullable: true })
  recurrenceGroupId!: string | null;

  @Column('varchar', { nullable: true })
  userId!: string | null;

  @Column('varchar', { nullable: true })
  listId!: string | null;

  @Column('varchar', { nullable: true })
  month!: string | null;

  @Column('bigint', { nullable: true })
  updatedAt!: number | null;

  @Column('varchar', { default: 'task' })
  kind!: TodoKind;

  @Column('text', { nullable: true })
  items!: string | null;

  toDomain(): Todo {
    const parsedItems = this.kind === 'shopping' ? parseItems(this.items) : null;
    return new Todo(
      this.id,
      this.text,
      this.completed,
      this.date,
      this.time,
      Number(this.createdAt),
      this.recurrenceGroupId,
      this.userId,
      this.listId,
      this.month,
      Number(this.updatedAt ?? this.createdAt),
      this.kind,
      parsedItems,
    );
  }

  static fromDomain(todo: Todo): TodoEntity {
    const entity = new TodoEntity();
    entity.id = todo.id;
    entity.text = todo.text;
    entity.completed = todo.completed;
    entity.date = todo.date;
    entity.time = todo.time;
    entity.createdAt = todo.createdAt;
    entity.recurrenceGroupId = todo.recurrenceGroupId;
    entity.userId = todo.userId;
    entity.listId = todo.listId;
    entity.month = todo.month;
    entity.updatedAt = todo.updatedAt;
    entity.kind = todo.kind;
    entity.items = todo.items === null ? null : JSON.stringify(todo.items);
    return entity;
  }
}

function parseItems(raw: string | null): ShoppingItem[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((i): i is ShoppingItem =>
        typeof i === 'object' && i !== null &&
        typeof (i as ShoppingItem).id === 'string' &&
        typeof (i as ShoppingItem).text === 'string' &&
        typeof (i as ShoppingItem).checked === 'boolean' &&
        typeof (i as ShoppingItem).order === 'number',
      )
      .sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}
