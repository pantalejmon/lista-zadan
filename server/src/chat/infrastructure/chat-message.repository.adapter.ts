import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ChatMessageRepositoryPort } from '../domain/chat-message.repository.port';
import { ChatMessage } from '../domain/chat-message.model';
import { ChatMessageEntity } from './chat-message.entity';

@Injectable()
export class ChatMessageRepositoryAdapter extends ChatMessageRepositoryPort {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly repo: Repository<ChatMessageEntity>,
  ) {
    super();
  }

  async findByHousehold(householdId: string, limit: number, before?: number): Promise<ChatMessage[]> {
    const entities = await this.repo.find({
      where: before ? { householdId, createdAt: LessThan(before) } : { householdId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return entities.map((e) => e.toDomain());
  }

  async save(message: ChatMessage): Promise<void> {
    await this.repo.save(ChatMessageEntity.fromDomain(message));
  }
}
