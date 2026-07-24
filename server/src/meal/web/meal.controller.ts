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
import { MealService, type PlannerEntryResponse } from '../domain/meal.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateShoppingItemDto } from './dto/create-shopping-item.dto';
import { UpdateShoppingItemDto } from './dto/update-shopping-item.dto';
import { RecipeResponse } from '../domain/recipe.model';
import { MealEntryResponse } from '../domain/meal-entry.model';
import { MealShoppingItemResponse } from '../domain/meal-shopping-item.model';
import { JwtAuthGuard } from '../../auth/web/jwt-auth.guard';
import { User } from '../../auth/domain/user.model';

@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealController {
  constructor(private readonly mealService: MealService) {}

  // ---- recipes ----

  @Get('recipes')
  getRecipes(@Req() req: Request, @Query('householdId') householdId?: string): Promise<RecipeResponse[]> {
    return this.mealService.getRecipes(this.requireHousehold(householdId), this.userId(req));
  }

  @Get('recipes/:id')
  getRecipe(@Req() req: Request, @Param('id') id: string): Promise<RecipeResponse> {
    return this.mealService.getRecipe(id, this.userId(req));
  }

  @Post('recipes')
  createRecipe(
    @Req() req: Request,
    @Body() dto: CreateRecipeDto,
    @Query('householdId') householdId?: string,
  ): Promise<RecipeResponse> {
    return this.mealService.createRecipe(dto, this.requireHousehold(householdId), this.userId(req));
  }

  @Put('recipes/:id')
  updateRecipe(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateRecipeDto,
  ): Promise<RecipeResponse> {
    return this.mealService.updateRecipe(id, dto, this.userId(req));
  }

  @Delete('recipes/:id')
  deleteRecipe(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.mealService.deleteRecipe(id, this.userId(req));
  }

  @Get('ingredients')
  searchIngredients(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
    @Query('q') q?: string,
  ): Promise<string[]> {
    return this.mealService.searchIngredients(this.requireHousehold(householdId), this.userId(req), q ?? '');
  }

  // ---- planner ----

  @Get('planner')
  getWeek(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
    @Query('week') week?: string,
  ): Promise<PlannerEntryResponse[]> {
    if (!week) {
      throw new BadRequestException('week query parameter is required');
    }
    return this.mealService.getWeek(this.requireHousehold(householdId), this.userId(req), week);
  }

  @Post('planner/entry')
  addEntry(
    @Req() req: Request,
    @Body() dto: CreateEntryDto,
    @Query('householdId') householdId?: string,
  ): Promise<MealEntryResponse> {
    return this.mealService.addEntry(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Delete('planner/entry/:id')
  removeEntry(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.mealService.removeEntry(id, this.userId(req));
  }

  // ---- shopping ----

  @Get('shopping')
  getShopping(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
  ): Promise<MealShoppingItemResponse[]> {
    return this.mealService.getShopping(this.requireHousehold(householdId), this.userId(req));
  }

  @Post('shopping')
  addShoppingItem(
    @Req() req: Request,
    @Body() dto: CreateShoppingItemDto,
    @Query('householdId') householdId?: string,
  ): Promise<MealShoppingItemResponse> {
    return this.mealService.addShoppingItem(this.requireHousehold(householdId), this.userId(req), dto.name);
  }

  @Patch('shopping/:id')
  toggleShoppingItem(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateShoppingItemDto,
  ): Promise<MealShoppingItemResponse> {
    return this.mealService.toggleShoppingItem(id, this.userId(req), dto.isChecked);
  }

  @Delete('shopping/:id')
  removeShoppingItem(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.mealService.removeShoppingItem(id, this.userId(req));
  }

  @Post('shopping/generate')
  async generate(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
    @Query('week') week?: string,
  ): Promise<{ count: number }> {
    if (!week) {
      throw new BadRequestException('week query parameter is required');
    }
    const count = await this.mealService.generateFromPlan(
      this.requireHousehold(householdId),
      this.userId(req),
      week,
    );
    return { count };
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
