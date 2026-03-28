import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TodoListRepositoryPort } from '../domain/todo-list.repository.port';
import { TodoList } from '../domain/todo-list.model';
import { TodoListEntity } from './todo-list.entity';

@Injectable()
export class TodoListRepositoryAdapter extends TodoListRepositoryPort {
  constructor(
    @InjectRepository(TodoListEntity)
    private readonly repo: Repository<TodoListEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<TodoList | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity?.toDomain() ?? null;
  }

  async findByUser(userId: string): Promise<TodoList[]> {
    const entities = await this.repo.findBy({ ownerId: userId });
    return entities.map((e) => e.toDomain());
  }

  async findDefaultByUser(userId: string): Promise<TodoList | null> {
    const entity = await this.repo.findOneBy({ ownerId: userId, isDefault: true });
    return entity?.toDomain() ?? null;
  }

  async save(list: TodoList): Promise<void> {
    await this.repo.save(TodoListEntity.fromDomain(list));
  }

  async update(list: TodoList): Promise<void> {
    await this.repo.save(TodoListEntity.fromDomain(list));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
