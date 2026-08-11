import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from '../domain/chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChatMessageResponse } from '../domain/chat-message.model';
import { JwtAuthGuard } from '@platform/auth/web/jwt-auth.guard';
import { User } from '@platform/auth/domain/user.model';

@Controller('households')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get(':householdId/messages')
  getMessages(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ): Promise<ChatMessageResponse[]> {
    const userId = (req.user as User).id;
    return this.chatService.getMessages(
      householdId,
      userId,
      limit ? Number(limit) : undefined,
      before ? Number(before) : undefined,
    );
  }

  @Post(':householdId/messages')
  async sendMessage(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<ChatMessageResponse> {
    const userId = (req.user as User).id;
    const message = await this.chatService.sendMessage(householdId, userId, dto.text);
    this.chatGateway.notifyMessage(householdId, message);
    return message;
  }
}
