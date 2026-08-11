import { randomUUID } from 'crypto';

export interface ChatMessageResponse {
  id: string;
  householdId: string;
  userId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: number;
}

export class ChatMessage {
  constructor(
    readonly id: string,
    readonly householdId: string,
    readonly userId: string,
    readonly text: string,
    readonly createdAt: number,
  ) {}

  static create(householdId: string, userId: string, text: string): ChatMessage {
    return new ChatMessage(randomUUID(), householdId, userId, text.trim(), Date.now());
  }

  toResponse(authorName: string, authorAvatarUrl: string | null): ChatMessageResponse {
    return {
      id: this.id,
      householdId: this.householdId,
      userId: this.userId,
      authorName,
      authorAvatarUrl,
      text: this.text,
      createdAt: this.createdAt,
    };
  }
}
