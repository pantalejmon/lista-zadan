import { Entity, Column, PrimaryColumn } from 'typeorm';
import { Todo } from '../domain/todo.model';

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

  toDomain(): Todo {
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
    return entity;
  }
}
