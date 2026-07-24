import { Entity, Column, PrimaryColumn, Index } from 'typeorm';
import { ChatMessage } from '../domain/chat-message.model';

@Entity('chat_message')
export class ChatMessageEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  householdId!: string;

  @Column('varchar')
  userId!: string;

  @Column('text')
  text!: string;

  @Column('bigint')
  createdAt!: number;

  toDomain(): ChatMessage {
    return new ChatMessage(this.id, this.householdId, this.userId, this.text, Number(this.createdAt));
  }

  static fromDomain(message: ChatMessage): ChatMessageEntity {
    const entity = new ChatMessageEntity();
    entity.id = message.id;
    entity.householdId = message.householdId;
    entity.userId = message.userId;
    entity.text = message.text;
    entity.createdAt = message.createdAt;
    return entity;
  }
}
