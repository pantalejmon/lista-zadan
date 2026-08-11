import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTokenService } from '../domain/api-token.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { ApiTokenResponse, ApiTokenCreated } from '../domain/api-token.model';
import { ALL_SCOPES } from '../domain/api-scope';
import { JwtAuthGuard } from '@platform/auth/web/jwt-auth.guard';
import { MachineOrJwtAuthGuard, type MachineRequest } from './machine-or-jwt-auth.guard';
import { User } from '@platform/auth/domain/user.model';

@Controller('tokens')
export class ApiTokenController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  // Token administration is session-only: a machine token cannot mint more tokens.
  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() req: Request): Promise<ApiTokenResponse[]> {
    return this.apiTokenService.listTokens(this.userId(req));
  }

  @Get('scopes')
  @UseGuards(JwtAuthGuard)
  scopes(): { scopes: string[] } {
    return { scopes: ALL_SCOPES };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: Request, @Body() dto: CreateApiTokenDto): Promise<ApiTokenCreated> {
    return this.apiTokenService.createToken(this.userId(req), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  revoke(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.apiTokenService.revokeToken(id, this.userId(req));
  }

  // Connector self-test: resolves whoever is calling (session or bearer token).
  @Get('whoami')
  @UseGuards(MachineOrJwtAuthGuard)
  whoami(@Req() req: MachineRequest): {
    userId: string;
    email: string;
    auth: 'session' | 'token';
    householdId: string | null;
    scopes: string[] | null;
  } {
    const user = req.user as User;
    const token = req.apiToken;
    return {
      userId: user.id,
      email: user.email,
      auth: token ? 'token' : 'session',
      householdId: token ? token.householdId : null,
      scopes: token ? token.scopes : null,
    };
  }

  private userId(req: Request): string {
    return (req.user as User).id;
  }
}
