import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../domain/todo.model';
import { TodoRepositoryPort } from '../domain/todo.repository.port';
import { TodoEntity } from './todo.entity';

@Injectable()
export class TodoRepositoryAdapter extends TodoRepositoryPort {
  constructor(
    @InjectRepository(TodoEntity)
    private readonly repo: Repository<TodoEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<Todo | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity?.toDomain() ?? null;
  }

  async findByDate(date: string): Promise<Todo[]> {
    const entities = await this.repo.findBy({ date });
    return entities.map((e) => e.toDomain());
  }

  async findAll(): Promise<Todo[]> {
    const entities = await this.repo.find();
    return entities.map((e) => e.toDomain());
  }

  async save(todo: Todo): Promise<void> {
    await this.repo.save(TodoEntity.fromDomain(todo));
  }

  async saveMany(todos: Todo[]): Promise<void> {
    const entities = todos.map((t) => TodoEntity.fromDomain(t));
    await this.repo.save(entities);
  }

  async update(todo: Todo): Promise<void> {
    await this.repo.save(TodoEntity.fromDomain(todo));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByRecurrenceGroupId(groupId: string): Promise<void> {
    await this.repo.delete({ recurrenceGroupId: groupId });
  }

  async findDistinctDates(): Promise<string[]> {
    const result = await this.repo
      .createQueryBuilder('todo')
      .select('DISTINCT todo.date', 'date')
      .orderBy('todo.date', 'ASC')
      .getRawMany<{ date: string }>();
    return result.map((r) => r.date);
  }
}
