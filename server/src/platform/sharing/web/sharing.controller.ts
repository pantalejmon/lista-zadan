import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@platform/auth/web/jwt-auth.guard';
import { SharingService } from '../domain/sharing.service';
import { CreateTodoListDto } from './dto/create-todo-list.dto';
import { UpdateTodoListDto } from './dto/update-todo-list.dto';
import { MoveTodoListDto } from './dto/move-todo-list.dto';
import type { User } from '@platform/auth/domain/user.model';

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Get()
  async getLists(@Req() req: { user: User }) {
    return this.sharingService.getListsForUser(req.user.id);
  }

  @Post()
  async createList(@Req() req: { user: User }, @Body() dto: CreateTodoListDto) {
    return this.sharingService.createList(dto.name, req.user.id, dto.householdId);
  }

  @Put(':listId')
  async updateList(
    @Req() req: { user: User },
    @Param('listId') listId: string,
    @Body() dto: UpdateTodoListDto,
  ) {
    return this.sharingService.updateList(listId, dto.name, req.user.id);
  }

  @Patch(':listId/household')
  async moveList(
    @Req() req: { user: User },
    @Param('listId') listId: string,
    @Body() dto: MoveTodoListDto,
  ) {
    return this.sharingService.moveList(listId, dto.householdId, req.user.id);
  }

  @Delete(':listId')
  async deleteList(@Req() req: { user: User }, @Param('listId') listId: string) {
    await this.sharingService.deleteList(listId, req.user.id);
  }
}

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationController {
  constructor(private readonly sharingService: SharingService) {}

  @Get('pending')
  async getPendingInvitations(@Req() req: { user: User }) {
    return this.sharingService.getPendingInvitations(req.user.email);
  }

  @Post(':id/accept')
  async acceptInvitation(@Req() req: { user: User }, @Param('id') id: string) {
    await this.sharingService.acceptInvitation(id, req.user.id, req.user.email);
  }

  @Post(':id/decline')
  async declineInvitation(@Req() req: { user: User }, @Param('id') id: string) {
    await this.sharingService.declineInvitation(id, req.user.email);
  }
}
