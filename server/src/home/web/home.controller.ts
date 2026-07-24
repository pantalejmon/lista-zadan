import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { HomeService, type HomeAssetWithMaintenance } from '../domain/home.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { HomeAssetResponse } from '../domain/home-asset.model';
import { MaintenanceResponse } from '../domain/maintenance.model';
import { JwtAuthGuard } from '../../auth/web/jwt-auth.guard';
import { User } from '../../auth/domain/user.model';

@Controller('home')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  // ---- assets ----

  @Get('assets')
  getAssets(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
  ): Promise<HomeAssetWithMaintenance[]> {
    return this.homeService.getAssets(this.requireHousehold(householdId), this.userId(req));
  }

  @Post('assets')
  createAsset(
    @Req() req: Request,
    @Body() dto: CreateAssetDto,
    @Query('householdId') householdId?: string,
  ): Promise<HomeAssetResponse> {
    return this.homeService.createAsset(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Put('assets/:id')
  updateAsset(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateAssetDto,
  ): Promise<HomeAssetResponse> {
    return this.homeService.updateAsset(id, this.userId(req), dto);
  }

  @Delete('assets/:id')
  deleteAsset(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.homeService.deleteAsset(id, this.userId(req));
  }

  // ---- maintenance ----

  @Post('maintenance')
  createMaintenance(
    @Req() req: Request,
    @Body() dto: CreateMaintenanceDto,
    @Query('householdId') householdId?: string,
  ): Promise<MaintenanceResponse> {
    return this.homeService.createMaintenance(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Put('maintenance/:id')
  updateMaintenance(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateMaintenanceDto,
  ): Promise<MaintenanceResponse> {
    return this.homeService.updateMaintenance(id, this.userId(req), dto);
  }

  @Post('maintenance/:id/complete')
  completeMaintenance(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CompleteMaintenanceDto,
  ): Promise<MaintenanceResponse> {
    return this.homeService.completeMaintenance(id, this.userId(req), dto);
  }

  @Delete('maintenance/:id')
  deleteMaintenance(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.homeService.deleteMaintenance(id, this.userId(req));
  }

  private userId(req: Request): string {
    return (req.user as User).id;
  }

  private requireHousehold(householdId?: string): string {
    if (!householdId) {
      throw new BadRequestException('householdId query parameter is required');
    }
    return householdId;
  }
}
