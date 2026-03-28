import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/web/jwt-auth.guard';
import { SharingService } from '../domain/sharing.service';
import { CreateTodoListDto } from './dto/create-todo-list.dto';
import { UpdateTodoListDto } from './dto/update-todo-list.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import type { User } from '../../auth/domain/user.model';

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
    return this.sharingService.createList(dto.name, req.user.id);
  }

  @Put(':listId')
  async updateList(
    @Req() req: { user: User },
    @Param('listId') listId: string,
    @Body() dto: UpdateTodoListDto,
  ) {
    return this.sharingService.updateList(listId, dto.name, req.user.id);
  }

  @Delete(':listId')
  async deleteList(@Req() req: { user: User }, @Param('listId') listId: string) {
    await this.sharingService.deleteList(listId, req.user.id);
  }

  @Get(':listId/members')
  async getMembers(@Req() req: { user: User }, @Param('listId') listId: string) {
    return this.sharingService.getMembers(listId, req.user.id);
  }

  @Delete(':listId/members/:memberId')
  async removeMember(
    @Req() req: { user: User },
    @Param('listId') listId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.sharingService.removeMember(listId, memberId, req.user.id);
  }

  @Post(':listId/invitations')
  async inviteToList(
    @Req() req: { user: User },
    @Param('listId') listId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.sharingService.inviteToList(listId, dto.email, dto.role, req.user.id);
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
