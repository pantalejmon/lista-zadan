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
import { CreateHouseholdDto } from './dto/create-household.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { User } from '@platform/auth/domain/user.model';

@Controller('households')
@UseGuards(JwtAuthGuard)
export class HouseholdController {
  constructor(private readonly sharingService: SharingService) {}

  @Get()
  async getHouseholds(@Req() req: { user: User }) {
    return this.sharingService.getHouseholds(req.user.id);
  }

  @Post()
  async createHousehold(@Req() req: { user: User }, @Body() dto: CreateHouseholdDto) {
    return this.sharingService.createHousehold(dto.name, req.user.id);
  }

  @Post('setup')
  async setupHousehold(@Req() req: { user: User }, @Body() dto: CreateHouseholdDto) {
    return this.sharingService.setupHousehold(dto.name, req.user.id);
  }

  @Put(':id')
  async renameHousehold(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Body() dto: CreateHouseholdDto,
  ) {
    return this.sharingService.renameHousehold(id, dto.name, req.user.id);
  }

  @Get(':id/members')
  async getMembers(@Req() req: { user: User }, @Param('id') id: string) {
    return this.sharingService.getHouseholdMembers(id, req.user.id);
  }

  @Patch(':id/members/:memberId')
  async changeMemberRole(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.sharingService.changeMemberRole(id, memberId, dto.role, req.user.id);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    await this.sharingService.removeMember(id, memberId, req.user.id);
  }

  @Post(':id/leave')
  async leaveHousehold(@Req() req: { user: User }, @Param('id') id: string) {
    await this.sharingService.leaveHousehold(id, req.user.id);
  }

  @Post(':id/invitations')
  async invite(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.sharingService.inviteToHousehold(id, dto.email, dto.role, req.user.id);
  }
}

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly sharingService: SharingService) {}

  @Get('suggestions')
  async getSuggestions(@Req() req: { user: User }) {
    return this.sharingService.getContactSuggestions(req.user.id);
  }
}
