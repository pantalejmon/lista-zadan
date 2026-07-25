import { BadRequestException } from '@nestjs/common';
import type { ListRole } from '../../sharing/domain/list-role';
import { SharingService } from '../../sharing/domain/sharing.service';
import { AuthService } from '../../auth/domain/auth.service';
import { PushService } from '../../push/domain/push.service';
import { ChatMessage, type ChatMessageResponse } from './chat-message.model';
import { ChatMessageRepositoryPort } from './chat-message.repository.port';

const MEMBER_ROLES: ListRole[] = ['owner', 'editor', 'viewer'];
const MAX_TEXT = 2000;
const DEFAULT_LIMIT = 50;

export class ChatService {
  constructor(
    private readonly repo: ChatMessageRepositoryPort,
    private readonly sharingService: SharingService,
    private readonly authService: AuthService,
    private readonly pushService: PushService,
  ) {}

  async getMessages(
    householdId: string,
    userId: string,
    limit = DEFAULT_LIMIT,
    before?: number,
  ): Promise<ChatMessageResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, MEMBER_ROLES);
    const capped = Math.min(Math.max(limit, 1), 100);
    const messages = await this.repo.findByHousehold(householdId, capped, before);
    // repo returns newest-first; present oldest-first for the chat view
    const ordered = [...messages].reverse();
    return this.enrich(ordered);
  }

  async sendMessage(householdId: string, userId: string, text: string): Promise<ChatMessageResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, MEMBER_ROLES);
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Message text cannot be empty');
    }
    if (trimmed.length > MAX_TEXT) {
      throw new BadRequestException('Message too long');
    }
    const message = ChatMessage.create(householdId, userId, trimmed);
    await this.repo.save(message);
    const [response] = await this.enrich([message]);
    void this.notifyMembers(householdId, userId, response);
    return response;
  }

  // Push to household members other than the author (fire-and-forget; failures must not block sending).
  private async notifyMembers(
    householdId: string,
    authorId: string,
    message: ChatMessageResponse,
  ): Promise<void> {
    try {
      const members = await this.sharingService.getHouseholdMembers(householdId, authorId);
      const recipientIds = members.map((m) => m.userId).filter((id) => id !== authorId);
      await this.pushService.sendToUsers(recipientIds, {
        title: `💬 ${message.authorName}`,
        body: message.text.slice(0, 140),
        // Deep-link straight into this household's chat (not the task list).
        url: '/#chat',
        tag: `chat-${householdId}`,
        data: { type: 'chat', householdId },
        // Reply inline from the notification (Android). The SW posts the typed
        // text back to POST /households/:householdId/messages.
        actions: [
          { action: 'reply', type: 'text', title: 'Odpowiedz', placeholder: 'Napisz odpowiedź…' },
        ],
      });
    } catch {
      // ignore — chat delivery already succeeded via REST + WebSocket
    }
  }

  private async enrich(messages: ChatMessage[]): Promise<ChatMessageResponse[]> {
    const authorCache = new Map<string, { displayName: string; avatarUrl: string | null }>();
    const result: ChatMessageResponse[] = [];
    for (const message of messages) {
      let author = authorCache.get(message.userId);
      if (!author) {
        const user = await this.authService.findUserById(message.userId);
        author = { displayName: user?.displayName ?? 'Ktoś', avatarUrl: user?.avatarUrl ?? null };
        authorCache.set(message.userId, author);
      }
      result.push(message.toResponse(author.displayName, author.avatarUrl));
    }
    return result;
  }
}
