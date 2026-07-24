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
import { SetCookedDto } from './dto/set-cooked.dto';
import { CreateShoppingItemDto } from './dto/create-shopping-item.dto';
import { UpdateShoppingItemDto } from './dto/update-shopping-item.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { SetPantryStockDto, AdjustPantryStockDto } from './dto/set-pantry-stock.dto';
import { RecipeResponse } from '../domain/recipe.model';
import { ProductResponse } from '../domain/product.model';
import { PantryItemResponse } from '../domain/pantry-item.model';
import { NeedResponse } from '../domain/meal.service';
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

  // ---- products (dictionary) ----

  @Get('products')
  getProducts(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
    @Query('q') q?: string,
  ): Promise<ProductResponse[]> {
    const hh = this.requireHousehold(householdId);
    if (q !== undefined) {
      return this.mealService.searchProducts(hh, this.userId(req), q);
    }
    return this.mealService.getProducts(hh, this.userId(req));
  }

  @Post('products')
  createProduct(
    @Req() req: Request,
    @Body() dto: CreateProductDto,
    @Query('householdId') householdId?: string,
  ): Promise<ProductResponse> {
    return this.mealService.createProduct(this.requireHousehold(householdId), this.userId(req), dto);
  }

  @Put('products/:id')
  updateProduct(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponse> {
    return this.mealService.updateProduct(id, this.userId(req), dto);
  }

  @Delete('products/:id')
  deleteProduct(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.mealService.deleteProduct(id, this.userId(req));
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

  @Patch('planner/entry/:id/cooked')
  setCooked(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SetCookedDto,
  ): Promise<MealEntryResponse> {
    return this.mealService.setCooked(id, this.userId(req), dto.cooked);
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

  // ---- pantry ----

  @Get('pantry')
  getPantry(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
  ): Promise<PantryItemResponse[]> {
    return this.mealService.getPantry(this.requireHousehold(householdId), this.userId(req));
  }

  @Post('pantry')
  setStock(
    @Req() req: Request,
    @Body() dto: SetPantryStockDto,
    @Query('householdId') householdId?: string,
  ): Promise<PantryItemResponse> {
    return this.mealService.setStock(this.requireHousehold(householdId), this.userId(req), dto.productId, dto.quantity);
  }

  @Patch('pantry')
  adjustStock(
    @Req() req: Request,
    @Body() dto: AdjustPantryStockDto,
    @Query('householdId') householdId?: string,
  ): Promise<PantryItemResponse> {
    return this.mealService.adjustStock(this.requireHousehold(householdId), this.userId(req), dto.productId, dto.delta);
  }

  @Delete('pantry/:id')
  removePantryItem(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.mealService.removePantryItem(id, this.userId(req));
  }

  // ---- needs (planer vs spiżarnia) ----

  @Get('needs')
  computeNeeds(
    @Req() req: Request,
    @Query('householdId') householdId?: string,
    @Query('week') week?: string,
  ): Promise<NeedResponse[]> {
    if (!week) {
      throw new BadRequestException('week query parameter is required');
    }
    return this.mealService.computeNeeds(this.requireHousehold(householdId), this.userId(req), week);
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
