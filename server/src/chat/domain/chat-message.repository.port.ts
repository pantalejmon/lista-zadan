import { ChatMessage } from './chat-message.model';

export abstract class ChatMessageRepositoryPort {
  // Newest-first, optionally older than a given timestamp (cursor pagination).
  abstract findByHousehold(householdId: string, limit: number, before?: number): Promise<ChatMessage[]>;
  abstract save(message: ChatMessage): Promise<void>;
}
