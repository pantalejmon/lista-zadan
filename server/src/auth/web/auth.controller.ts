import { Controller, Get, Post, Put, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../domain/auth.service';
import { User } from '../domain/user.model';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserResponse } from './dto/user.response';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response): void {
    const user = req.user as User;
    const token = this.authService.generateJwt(user);

    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = this.config.get<string>('cors.origin') || '/';
    res.redirect(frontendUrl);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request): UserResponse {
    const user = req.user as User;
    return user.toResponse();
  }

  @Put('me/settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(@Req() req: Request, @Body() dto: UpdateSettingsDto): Promise<UpdateSettingsDto> {
    const user = req.user as User;
    await this.authService.updateUserSettings(user.id, dto);
    return dto;
  }

  @Post('logout')
  logout(@Res() res: Response): void {
    res.clearCookie('access_token');
    res.json({ ok: true });
  }
}
