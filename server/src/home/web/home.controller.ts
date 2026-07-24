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
import { CreateProviderDto } from './dto/create-provider.dto';
import { CreateRenovationDto } from './dto/create-renovation.dto';
import { HomeAssetResponse } from '../domain/home-asset.model';
import { MaintenanceResponse } from '../domain/maintenance.model';
import { ProviderResponse } from '../domain/provider.model';
import { RenovationResponse } from '../domain/renovation.model';
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

  // ---- providers (wykonawcy) ----

  @Get('providers')
  getProviders(@Req() req: Request, @Query('householdId') householdId?: string): Promise<ProviderResponse[]> {
    return this.homeService.getProviders(this.requireHousehold(householdId), this.userId(req));
  }

  @Post('providers')
  createProvider(
    @Req() req: Request,
    @Body() dto: CreateProviderDto,
    @Query('householdId') householdId?: string,
  ): Promise<ProviderResponse> {
    return this.homeService.createProvider(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Put('providers/:id')
  updateProvider(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateProviderDto): Promise<ProviderResponse> {
    return this.homeService.updateProvider(id, this.userId(req), dto);
  }

  @Delete('providers/:id')
  deleteProvider(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.homeService.deleteProvider(id, this.userId(req));
  }

  // ---- renovations (remonty) ----

  @Get('renovations')
  getRenovations(@Req() req: Request, @Query('householdId') householdId?: string): Promise<RenovationResponse[]> {
    return this.homeService.getRenovations(this.requireHousehold(householdId), this.userId(req));
  }

  @Post('renovations')
  createRenovation(
    @Req() req: Request,
    @Body() dto: CreateRenovationDto,
    @Query('householdId') householdId?: string,
  ): Promise<RenovationResponse> {
    return this.homeService.createRenovation(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Put('renovations/:id')
  updateRenovation(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateRenovationDto): Promise<RenovationResponse> {
    return this.homeService.updateRenovation(id, this.userId(req), dto);
  }

  @Delete('renovations/:id')
  deleteRenovation(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.homeService.deleteRenovation(id, this.userId(req));
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
