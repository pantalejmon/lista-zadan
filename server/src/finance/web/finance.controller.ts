import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { FinanceService, type FinanceStatsResponse } from '../domain/finance.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { WalletResponse } from '../domain/wallet.model';
import { TransactionResponse } from '../domain/transaction.model';
import { RecurringTransactionResponse } from '../domain/recurring-transaction.model';
import { FINANCE_CATEGORIES } from '../domain/finance-category';
import { JwtAuthGuard } from '../../auth/web/jwt-auth.guard';
import { User } from '../../auth/domain/user.model';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('categories')
  categories(): { categories: string[] } {
    return { categories: [...FINANCE_CATEGORIES] };
  }

  // ---- wallets ----

  @Get('wallets')
  getWallets(@Req() req: Request, @Query('householdId') householdId?: string): Promise<WalletResponse[]> {
    return this.financeService.getWallets(this.requireHousehold(householdId), this.userId(req));
  }

  @Post('wallets')
  createWallet(
    @Req() req: Request,
    @Body() dto: CreateWalletDto,
    @Query('householdId') householdId?: string,
  ): Promise<WalletResponse> {
    return this.financeService.createWallet(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Put('wallets/:id')
  updateWallet(@Req() req: Request, @Param('id') id: string, @Body() dto: CreateWalletDto): Promise<WalletResponse> {
    return this.financeService.updateWallet(id, this.userId(req), dto);
  }

  @Delete('wallets/:id')
  deleteWallet(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.financeService.deleteWallet(id, this.userId(req));
  }

  // ---- transactions ----

  @Get('transactions')
  getTransactions(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
    @Query('walletId') walletId?: string,
  ): Promise<TransactionResponse[]> {
    return this.financeService.getTransactions(this.requireHousehold(householdId), this.userId(req), walletId);
  }

  @Post('transactions')
  createTransaction(
    @Req() req: Request,
    @Body() dto: CreateTransactionDto,
    @Query('householdId') householdId?: string,
  ): Promise<TransactionResponse> {
    return this.financeService.createTransaction(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Patch('transactions/:id')
  updateTransaction(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponse> {
    return this.financeService.updateTransaction(id, this.userId(req), dto);
  }

  @Delete('transactions/:id')
  deleteTransaction(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.financeService.deleteTransaction(id, this.userId(req));
  }

  // ---- recurring ----

  @Get('recurring')
  getRecurring(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
  ): Promise<RecurringTransactionResponse[]> {
    return this.financeService.getRecurring(this.requireHousehold(householdId), this.userId(req));
  }

  @Post('recurring')
  createRecurring(
    @Req() req: Request,
    @Body() dto: CreateRecurringDto,
    @Query('householdId') householdId?: string,
  ): Promise<RecurringTransactionResponse> {
    return this.financeService.createRecurring(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Put('recurring/:id')
  updateRecurring(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateRecurringDto,
  ): Promise<RecurringTransactionResponse> {
    return this.financeService.updateRecurring(id, this.userId(req), dto);
  }

  @Delete('recurring/:id')
  deleteRecurring(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.financeService.deleteRecurring(id, this.userId(req));
  }

  // ---- stats ----

  @Get('stats')
  getStats(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
    @Query('walletId') walletId?: string,
  ): Promise<FinanceStatsResponse> {
    return this.financeService.getStats(this.requireHousehold(householdId), this.userId(req), walletId);
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
