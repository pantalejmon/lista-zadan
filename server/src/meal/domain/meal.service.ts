import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ListRole } from '../../sharing/domain/list-role';
import { SharingService } from '../../sharing/domain/sharing.service';
import { Recipe, type RecipeResponse } from './recipe.model';
import { MealEntry, type MealEntryResponse } from './meal-entry.model';
import { MealShoppingItem, type MealShoppingItemResponse } from './meal-shopping-item.model';
import { RecipeRepositoryPort } from './recipe.repository.port';
import { MealEntryRepositoryPort } from './meal-entry.repository.port';
import { MealShoppingItemRepositoryPort } from './meal-shopping-item.repository.port';
import { ProductRepositoryPort } from './product.repository.port';
import { Product, type ProductResponse } from './product.model';
import { PantryItemRepositoryPort } from './pantry-item.repository.port';
import { PantryItem, type PantryItemResponse } from './pantry-item.model';
import { computeRecipeNutrition, scaleNutrition, type Nutrition, type RecipeNutrition } from './nutrition';
import { NutritionGoal, type NutritionGoalResponse } from './nutrition-goal.model';
import { NutritionGoalRepositoryPort } from './nutrition-goal.repository.port';
import { effectiveIngredients } from './effective-ingredients';
import { ListedQuantities } from './listed-quantities';
import type { MealType, RecipeIngredient } from './recipe-ingredient';
import { MealParticipant } from './meal-participant';
import { MealGateway } from '../web/meal.gateway';
import { CreateRecipeDto } from '../web/dto/create-recipe.dto';
import { CreateEntryDto } from '../web/dto/create-entry.dto';
import { CreateProductDto } from '../web/dto/create-product.dto';
import { AdjustEntryDto } from '../web/dto/adjust-entry.dto';
import { RecipeIngredientDto } from '../web/dto/recipe-ingredient.dto';
import { SetNutritionGoalDto } from '../web/dto/set-nutrition-goal.dto';

const WRITE_ROLES: ListRole[] = ['owner', 'editor'];
const READ_ROLES: ListRole[] = ['owner', 'editor', 'viewer'];

export interface PlannerEntryResponse extends MealEntryResponse {
  recipe: RecipeResponse | null;
  // Makro tego konkretnego posiłku (po korektach w slocie). `recipe.nutrition`
  // opisuje sam przepis i nie zna korekt.
  nutrition: RecipeNutrition | null;
}

export interface MealShareResponse {
  entryId: string;
  mealType: MealType;
  title: string;
  portions: number;
  nutrition: Nutrition;
  // `false`, gdy część składników tego posiłku nie dała się policzyć.
  complete: boolean;
}

export interface DayBalanceResponse {
  dayOfWeek: number;
  date: string;
  nutrition: Nutrition;
  meals: MealShareResponse[];
  // Ile posiłków tego dnia policzono tylko częściowo — UI musi to pokazać,
  // inaczej suma wygląda na pewnik.
  incompleteMeals: number;
}

export interface MemberBalanceResponse {
  userId: string;
  displayName: string;
  goal: NutritionGoalResponse | null;
  days: DayBalanceResponse[];
  weekTotal: Nutrition;
}

// Czego bilans nie policzył i dlaczego. Bez tego pusty ekran mówi tylko „brak danych",
// a user nie ma jak zgadnąć, że winne są nieprzypisane posiłki albo produkty bez makro (#111).
export interface BalanceSkippedResponse {
  noParticipants: number;
  noNutrition: number;
  // Produkty, którym brakuje wartości odżywczych — nazwy do pokazania wprost.
  missingProducts: string[];
}

export interface NutritionBalanceResponse {
  weekStart: string;
  onlyCooked: boolean;
  members: MemberBalanceResponse[];
  skipped: BalanceSkippedResponse;
}

export interface NeedResponse {
  productId: string | null;
  name: string;
  unit: string;
  required: number;
  inStock: number;
  shortfall: number;
  // Ile tej pozycji leży już (niekupione) na liście zakupów. `onListUnknownQty`
  // znaczy „jest na liście, ale bez ilości" — wtedy uznajemy pozycję za załatwioną,
  // bo user sam ją tam dopisał.
  onList: number;
  onListUnknownQty: boolean;
  packageSize?: number;
  toBuy: number;
  packages?: number;
}

export class MealService {
  constructor(
    private readonly recipeRepo: RecipeRepositoryPort,
    private readonly entryRepo: MealEntryRepositoryPort,
    private readonly shoppingRepo: MealShoppingItemRepositoryPort,
    private readonly productRepo: ProductRepositoryPort,
    private readonly pantryRepo: PantryItemRepositoryPort,
    private readonly goalRepo: NutritionGoalRepositoryPort,
    private readonly sharingService: SharingService,
    private readonly gateway: MealGateway,
  ) {}

  // ---- recipes ----

  async getRecipes(householdId: string, userId: string): Promise<RecipeResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const [recipes, products] = await Promise.all([
      this.recipeRepo.findByHousehold(householdId),
      this.productRepo.findByHousehold(householdId),
    ]);
    return recipes
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => this.toRecipeResponse(r, products));
  }

  async getRecipe(id: string, userId: string): Promise<RecipeResponse> {
    const recipe = await this.findRecipeOrThrow(id);
    await this.sharingService.assertHouseholdPermission(recipe.householdId, userId, READ_ROLES);
    const products = await this.productRepo.findByHousehold(recipe.householdId);
    return this.toRecipeResponse(recipe, products);
  }

  async createRecipe(dto: CreateRecipeDto, householdId: string, userId: string): Promise<RecipeResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const recipe = Recipe.createFromDto(dto, householdId);
    await this.recipeRepo.save(recipe);
    this.gateway.notifyChanged(householdId);
    const products = await this.productRepo.findByHousehold(householdId);
    return this.toRecipeResponse(recipe, products);
  }

  async updateRecipe(id: string, dto: CreateRecipeDto, userId: string): Promise<RecipeResponse> {
    const recipe = await this.findRecipeOrThrow(id);
    await this.sharingService.assertHouseholdPermission(recipe.householdId, userId, WRITE_ROLES);
    const updated = recipe.update(dto);
    await this.recipeRepo.update(updated);
    this.gateway.notifyChanged(recipe.householdId);
    const products = await this.productRepo.findByHousehold(recipe.householdId);
    return this.toRecipeResponse(updated, products);
  }

  async deleteRecipe(id: string, userId: string): Promise<void> {
    const recipe = await this.findRecipeOrThrow(id);
    await this.sharingService.assertHouseholdPermission(recipe.householdId, userId, WRITE_ROLES);
    await this.entryRepo.deleteByRecipe(id);
    await this.recipeRepo.delete(id);
    this.gateway.notifyChanged(recipe.householdId);
  }

  // ---- products (dictionary) ----

  async getProducts(householdId: string, userId: string): Promise<ProductResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const products = await this.productRepo.findByHousehold(householdId);
    return products
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
      .map((p) => p.toResponse());
  }

  async searchProducts(householdId: string, userId: string, query: string): Promise<ProductResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const products = await this.productRepo.findByHousehold(householdId);
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
      .slice(0, 8)
      .map((p) => p.toResponse());
  }

  async createProduct(householdId: string, userId: string, dto: CreateProductDto): Promise<ProductResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    // De-dup by name within the household — return existing rather than creating a twin.
    const existing = (await this.productRepo.findByHousehold(householdId)).find(
      (p) => p.name.toLowerCase() === dto.name.trim().toLowerCase(),
    );
    if (existing) {
      return existing.toResponse();
    }
    const product = Product.createFromDto(dto, householdId);
    await this.productRepo.save(product);
    this.gateway.notifyChanged(householdId);
    return product.toResponse();
  }

  async updateProduct(id: string, userId: string, dto: CreateProductDto): Promise<ProductResponse> {
    const product = await this.findProductOrThrow(id);
    await this.sharingService.assertHouseholdPermission(product.householdId, userId, WRITE_ROLES);
    const updated = product.update(dto);
    await this.productRepo.save(updated);
    this.gateway.notifyChanged(product.householdId);
    return updated.toResponse();
  }

  async deleteProduct(id: string, userId: string): Promise<void> {
    const product = await this.findProductOrThrow(id);
    await this.sharingService.assertHouseholdPermission(product.householdId, userId, WRITE_ROLES);
    await this.productRepo.delete(id);
    this.gateway.notifyChanged(product.householdId);
  }

  // ---- planner ----

  async getWeek(householdId: string, userId: string, weekStart: string): Promise<PlannerEntryResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const entries = await this.entryRepo.findByWeek(householdId, weekStart);
    const products = await this.productRepo.findByHousehold(householdId);
    const result: PlannerEntryResponse[] = [];
    for (const entry of entries) {
      const { recipe, ingredients, servings } = await this.resolveEntry(entry);
      result.push({
        ...entry.toResponse(),
        recipe: recipe ? this.toRecipeResponse(recipe, products) : null,
        // Makro **tego posiłku** — po korektach ze slotu i niezależnie od tego, czy
        // stoi za nim przepis, czy posiłek doraźny. Stąd bierze je bilans.
        nutrition: ingredients.length > 0
          ? computeRecipeNutrition(ingredients, products, servings)
          : null,
      });
    }
    return result;
  }

  async addEntry(
    householdId: string,
    userId: string,
    dto: CreateEntryDto,
  ): Promise<MealEntryResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const existing = await this.entryRepo.findSlot(
      householdId,
      dto.weekStart,
      dto.dayOfWeek,
      dto.mealType,
    );
    // Slot trzyma przepis **albo** posiłek doraźny — jedno i tylko jedno.
    if (!dto.recipeId === !dto.custom) {
      throw new BadRequestException('Podaj recipeId albo custom (posiłek doraźny), nie oba naraz');
    }
    const custom = dto.custom
      ? { title: dto.custom.title.trim(), ingredients: normaliseCustomIngredients(dto.custom.ingredients) }
      : null;
    const participants = dto.participants
      ? await this.validateParticipants(householdId, userId, dto.participants)
      : null;
    if (existing) {
      const replaced = custom ? existing.withCustom(custom) : existing.withRecipe(dto.recipeId as string);
      const updated = participants ? replaced.withParticipants(participants) : replaced;
      await this.entryRepo.update(updated);
      this.gateway.notifyChanged(householdId);
      return updated.toResponse();
    }
    // Nowy posiłek trafia domyślnie do bilansu **wszystkich** domowników po jednej
    // porcji. Wcześniej startował bez uczestników, więc bilans z definicji nie liczył
    // nic, dopóki user nie wszedł w każdy kafel z osobna (#111). Kto nie je — tego się
    // odklikuje w „Kto je ten posiłek?"; jawnie przesłana pusta lista zostaje pusta.
    const assigned = participants ?? (await this.allMembersAsParticipants(householdId, userId));
    const entry = custom
      ? MealEntry.createCustom(
        householdId,
        dto.weekStart,
        dto.dayOfWeek,
        dto.mealType,
        custom,
        assigned,
      )
      : MealEntry.createFromRecipe(
        householdId,
        dto.weekStart,
        dto.dayOfWeek,
        dto.mealType,
        dto.recipeId as string,
        assigned,
      );
    await this.entryRepo.save(entry);
    this.gateway.notifyChanged(householdId);
    return entry.toResponse();
  }

  // Kto je dany posiłek i w ilu porcjach — podstawa bilansu odżywczego.
  // Pusta lista = „nieprzypisany": posiłek nadal liczy się do zakupów i spiżarni,
  // ale nie wchodzi do niczyjego bilansu.
  async setParticipants(
    id: string,
    userId: string,
    participants: MealParticipant[],
  ): Promise<MealEntryResponse> {
    const entry = await this.entryRepo.findById(id);
    if (!entry) {
      throw new NotFoundException(`Meal entry ${id} not found`);
    }
    await this.sharingService.assertHouseholdPermission(entry.householdId, userId, WRITE_ROLES);
    const validated = await this.validateParticipants(entry.householdId, userId, participants);
    const updated = entry.withParticipants(validated);
    await this.entryRepo.update(updated);
    this.gateway.notifyChanged(entry.householdId);
    return updated.toResponse();
  }

  private async allMembersAsParticipants(householdId: string, userId: string): Promise<MealParticipant[]> {
    const members = await this.sharingService.getHouseholdMembers(householdId, userId);
    return members.map((m) => ({ userId: m.userId, portions: 1 }));
  }

  // Do bilansu może wejść tylko domownik z tego gospodarstwa — inaczej przez API
  // dałoby się dopisać komuś posiłki spoza jego domu. Duplikaty scalamy, zamiast
  // liczyć tę samą osobę dwa razy.
  private async validateParticipants(
    householdId: string,
    userId: string,
    participants: MealParticipant[],
  ): Promise<MealParticipant[]> {
    if (participants.length === 0) {
      return [];
    }
    const members = await this.sharingService.getHouseholdMembers(householdId, userId);
    const memberIds = new Set(members.map((m) => m.userId));
    const merged = new Map<string, number>();
    for (const participant of participants) {
      if (!memberIds.has(participant.userId)) {
        throw new BadRequestException(`User ${participant.userId} is not a member of this household`);
      }
      merged.set(participant.userId, participant.portions);
    }
    return [...merged.entries()].map(([id, portions]) => ({ userId: id, portions }));
  }

  async removeEntry(id: string, userId: string): Promise<void> {
    const entry = await this.entryRepo.findById(id);
    if (!entry) {
      return;
    }
    await this.sharingService.assertHouseholdPermission(entry.householdId, userId, WRITE_ROLES);
    await this.entryRepo.delete(id);
    this.gateway.notifyChanged(entry.householdId);
  }

  // Loop closer: marking a planned meal as cooked subtracts its ingredients from
  // the pantry; un-marking adds them back. Idempotent — toggling to the same
  // state does nothing.
  async setCooked(id: string, userId: string, cooked: boolean): Promise<MealEntryResponse> {
    const entry = await this.entryRepo.findById(id);
    if (!entry) {
      throw new NotFoundException(`Meal entry ${id} not found`);
    }
    await this.sharingService.assertHouseholdPermission(entry.householdId, userId, WRITE_ROLES);
    if (entry.cooked === cooked) {
      return entry.toResponse();
    }
    // Cooking consumes stock (negative), un-cooking restores it (positive).
    // Liczone z **efektywnych** składników (przepis albo posiłek doraźny, po
    // korektach), więc podwójna porcja odejmuje podwójnie — i tyle samo oddaje
    // przy cofnięciu.
    const { ingredients } = await this.resolveEntry(entry);
    await this.applyIngredientsToPantry(entry.householdId, ingredients, cooked ? -1 : 1);
    const updated = entry.withCooked(cooked);
    await this.entryRepo.update(updated);
    this.gateway.notifyChanged(entry.householdId);
    return updated.toResponse();
  }

  // Korekta przepisu w slocie: mnożnik porcji i/lub bezwzględne nadpisania
  // ilości. Sam przepis zostaje nietknięty — to zmiana jednego posiłku.
  //
  // Gdy wpis jest już oznaczony jako ugotowany, spiżarnia dostaje **różnicę**:
  // oddajemy stare ilości i pobieramy nowe. Inaczej „ugotowałem, potem zmieniłem
  // na podwójną porcję, potem cofnąłem" oddałoby do spiżarni więcej, niż z niej
  // zeszło.
  async adjustEntry(id: string, userId: string, dto: AdjustEntryDto): Promise<MealEntryResponse> {
    const entry = await this.entryRepo.findById(id);
    if (!entry) {
      throw new NotFoundException(`Meal entry ${id} not found`);
    }
    await this.sharingService.assertHouseholdPermission(entry.householdId, userId, WRITE_ROLES);
    const portionScale = dto.portionScale ?? entry.portionScale;
    const overrides = dto.ingredientOverrides ?? entry.ingredientOverrides;
    const updated = entry.withAdjustments(portionScale, overrides);

    if (entry.cooked) {
      const before = await this.resolveEntry(entry);
      const after = await this.resolveEntry(updated);
      await this.applyIngredientsToPantry(entry.householdId, before.ingredients, 1);
      await this.applyIngredientsToPantry(entry.householdId, after.ingredients, -1);
    }

    await this.entryRepo.update(updated);
    this.gateway.notifyChanged(entry.householdId);
    return updated.toResponse();
  }

  // ---- bilans odżywczy ----

  async getNutritionGoals(householdId: string, userId: string): Promise<NutritionGoalResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const goals = await this.goalRepo.findByHousehold(householdId);
    return goals.map((g) => g.toResponse());
  }

  async setNutritionGoal(
    householdId: string,
    userId: string,
    dto: SetNutritionGoalDto,
  ): Promise<NutritionGoalResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const members = await this.sharingService.getHouseholdMembers(householdId, userId);
    if (!members.some((m) => m.userId === dto.userId)) {
      throw new BadRequestException(`User ${dto.userId} is not a member of this household`);
    }
    const target = { kcal: dto.kcal, protein: dto.protein, fat: dto.fat, carbs: dto.carbs };
    const existing = await this.goalRepo.findByHouseholdAndUser(householdId, dto.userId);
    const goal = existing ? existing.withTarget(target) : NutritionGoal.create(householdId, dto.userId, target);
    await this.goalRepo.save(goal);
    this.gateway.notifyChanged(householdId);
    return goal.toResponse();
  }

  // Ile kto zjadł w danym tygodniu. Makro posiłku dzielone jest między domowników
  // proporcjonalnie do ich porcji:
  //
  //   udział domownika = makro na porcję (po korektach ze slotu) × jego porcje
  //
  // `onlyCooked` zawęża do posiłków odhaczonych jako ugotowane. Domyślnie liczymy
  // **zaplanowane**: planer jest planem, więc bilans na przyszły tydzień pokazywałby
  // same zera.
  async getNutritionBalance(
    householdId: string,
    userId: string,
    weekStart: string,
    onlyCooked: boolean,
  ): Promise<NutritionBalanceResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const [entries, products, goals, members] = await Promise.all([
      this.entryRepo.findByWeek(householdId, weekStart),
      this.productRepo.findByHousehold(householdId),
      this.goalRepo.findByHousehold(householdId),
      this.sharingService.getHouseholdMembers(householdId, userId),
    ]);
    const goalByUser = new Map(goals.map((g) => [g.userId, g]));
    const shares = new Map<string, Map<number, MealShareResponse[]>>();
    // Liczone tylko wśród posiłków, które w ogóle wchodzą w zakres — posiłek pominięty
    // przez filtr „tylko ugotowane" nie jest problemem do zgłoszenia.
    const skipped: BalanceSkippedResponse = { noParticipants: 0, noNutrition: 0, missingProducts: [] };
    const missingProducts = new Set<string>();

    for (const entry of entries) {
      if (onlyCooked && !entry.cooked) {
        continue;
      }
      if (entry.participants.length === 0) {
        skipped.noParticipants += 1;
        continue;
      }
      const { recipe, ingredients, servings } = await this.resolveEntry(entry);
      if (ingredients.length === 0) {
        skipped.noNutrition += 1;
        continue;
      }
      const nutrition = computeRecipeNutrition(ingredients, products, servings);
      for (const name of nutrition.missing) {
        missingProducts.add(name);
      }
      if (nutrition.coverage === 0) {
        skipped.noNutrition += 1;
        continue;
      }
      const title = recipe?.title ?? entry.custom?.title ?? 'Posiłek';
      for (const participant of entry.participants) {
        const byDay = shares.get(participant.userId) ?? new Map<number, MealShareResponse[]>();
        const dayMeals = byDay.get(entry.dayOfWeek) ?? [];
        dayMeals.push({
          entryId: entry.id,
          mealType: entry.mealType,
          title,
          portions: participant.portions,
          nutrition: scaleNutrition(nutrition.perServing, participant.portions),
          complete: nutrition.coverage === 1,
        });
        byDay.set(entry.dayOfWeek, dayMeals);
        shares.set(participant.userId, byDay);
      }
    }

    skipped.missingProducts = [...missingProducts].sort((a, b) => a.localeCompare(b, 'pl'));

    return {
      weekStart,
      onlyCooked,
      skipped,
      members: members.map((member) => {
        const byDay = shares.get(member.userId) ?? new Map<number, MealShareResponse[]>();
        const days: DayBalanceResponse[] = [];
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
          const meals = byDay.get(dayOfWeek) ?? [];
          days.push({
            dayOfWeek,
            date: addDays(weekStart, dayOfWeek),
            nutrition: sumNutrition(meals.map((m) => m.nutrition)),
            meals,
            incompleteMeals: meals.filter((m) => !m.complete).length,
          });
        }
        return {
          userId: member.userId,
          displayName: member.displayName || member.email,
          goal: goalByUser.get(member.userId)?.toResponse() ?? null,
          days,
          weekTotal: sumNutrition(days.map((d) => d.nutrition)),
        };
      }),
    };
  }

  // ---- shopping ----

  async getShopping(householdId: string, userId: string): Promise<MealShoppingItemResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const items = await this.shoppingRepo.findByHousehold(householdId);
    return items.sort((a, b) => a.createdAt - b.createdAt).map((i) => i.toResponse());
  }

  async addShoppingItem(householdId: string, userId: string, name: string): Promise<MealShoppingItemResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const item = MealShoppingItem.create(householdId, name);
    await this.shoppingRepo.save(item);
    this.gateway.notifyChanged(householdId);
    return item.toResponse();
  }

  async toggleShoppingItem(id: string, userId: string, isChecked: boolean): Promise<MealShoppingItemResponse> {
    const item = await this.findShoppingItemOrThrow(id);
    await this.sharingService.assertHouseholdPermission(item.householdId, userId, WRITE_ROLES);
    // Loop closer: checking off a purchase adds it to the pantry; un-checking
    // reverses that. Only items with a known quantity and a name-matched,
    // pantry-tracked product move stock.
    if (item.isChecked !== isChecked && item.quantity && item.quantity > 0) {
      const product = await this.findTrackedProductByName(item.householdId, item.name);
      if (product) {
        await this.adjustPantryInternal(item.householdId, product.id, isChecked ? item.quantity : -item.quantity);
      }
    }
    const updated = item.withChecked(isChecked);
    await this.shoppingRepo.update(updated);
    this.gateway.notifyChanged(item.householdId);
    return updated.toResponse();
  }

  async removeShoppingItem(id: string, userId: string): Promise<void> {
    const item = await this.findShoppingItemOrThrow(id);
    await this.sharingService.assertHouseholdPermission(item.householdId, userId, WRITE_ROLES);
    await this.shoppingRepo.delete(id);
    this.gateway.notifyChanged(item.householdId);
  }

  // Pantry-aware: buys only what's missing, rounded up to whole packages.
  //
  // Powtarzalne bez skutków ubocznych: `computeNeedsInternal` odejmuje to, co już
  // leży na liście, więc drugie kliknięcie „Generuj" nie dokłada drugiego kompletu
  // (#108). Czyszczenia listy tu nie ma i być nie powinno — skasowałoby ręczne dopiski.
  async generateFromPlan(householdId: string, userId: string, weekStart: string, days?: number[]): Promise<number> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const needs = await this.computeNeedsInternal(householdId, weekStart, days);
    const items = needs
      .filter((n) => n.toBuy > 0)
      .map((n) => MealShoppingItem.create(householdId, n.name, n.toBuy, n.unit));
    await this.shoppingRepo.saveMany(items);
    this.gateway.notifyChanged(householdId);
    return items.length;
  }

  // ---- pantry ----

  async getPantry(householdId: string, userId: string): Promise<PantryItemResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    const [items, products] = await Promise.all([
      this.pantryRepo.findByHousehold(householdId),
      this.productRepo.findByHousehold(householdId),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));
    return items
      .map((it) => {
        const product = byId.get(it.productId);
        return product ? this.toPantryResponse(it, product) : null;
      })
      .filter((x): x is PantryItemResponse => x !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }

  async setStock(householdId: string, userId: string, productId: string, quantity: number): Promise<PantryItemResponse> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, WRITE_ROLES);
    const product = await this.findProductOrThrow(productId);
    if (product.householdId !== householdId) {
      throw new NotFoundException('Product not in this household');
    }
    const existing = await this.pantryRepo.findByHouseholdAndProduct(householdId, productId);
    const item = existing ? existing.withQuantity(quantity) : PantryItem.create(householdId, productId, quantity);
    await this.pantryRepo.save(item);
    this.gateway.notifyChanged(householdId);
    return this.toPantryResponse(item, product);
  }

  async adjustStock(householdId: string, userId: string, productId: string, delta: number): Promise<PantryItemResponse> {
    const existing = await this.pantryRepo.findByHouseholdAndProduct(householdId, productId);
    const next = Math.max(0, (existing?.quantity ?? 0) + delta);
    return this.setStock(householdId, userId, productId, next);
  }

  async removePantryItem(id: string, userId: string): Promise<void> {
    const item = await this.pantryRepo.findById(id);
    if (!item) {
      return;
    }
    await this.sharingService.assertHouseholdPermission(item.householdId, userId, WRITE_ROLES);
    await this.pantryRepo.delete(id);
    this.gateway.notifyChanged(item.householdId);
  }

  // ---- needs (planer vs spiżarnia → czego brakuje) ----

  async computeNeeds(householdId: string, userId: string, weekStart: string, days?: number[]): Promise<NeedResponse[]> {
    await this.sharingService.assertHouseholdPermission(householdId, userId, READ_ROLES);
    return this.computeNeedsInternal(householdId, weekStart, days);
  }

  // `days` (optional) restricts the calculation to those weekdays (0=Mon…6=Sun),
  // so the user can shop for just part of the week. Empty/undefined = whole week.
  private async computeNeedsInternal(householdId: string, weekStart: string, days?: number[]): Promise<NeedResponse[]> {
    const all = await this.entryRepo.findByWeek(householdId, weekStart);
    const entries = days && days.length > 0 ? all.filter((e) => days.includes(e.dayOfWeek)) : all;
    const products = await this.productRepo.findByHousehold(householdId);
    const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
    const pantry = await this.pantryRepo.findByHousehold(householdId);
    const stockByProduct = new Map(pantry.map((x) => [x.productId, x.quantity]));
    const onList = await this.shoppingListCoverage(householdId);

    const agg = new Map<
      string,
      { productId: string | null; name: string; unit: string; required: number; packageSize: number | null }
    >();
    for (const entry of entries) {
      // Korekty ze slotu (mnożnik porcji, nadpisania ilości) muszą wejść do
      // zakupów — inaczej podwójna porcja kupiłaby pojedynczą. Posiłki doraźne
      // liczą się tak samo, ze swoich `custom.ingredients`.
      const { ingredients } = await this.resolveEntry(entry);
      for (const ri of ingredients) {
        const product = byName.get(ri.name.toLowerCase());
        if (product && !product.trackInPantry) {
          continue; // „do smaku" — pomijamy w spiżarni/zakupach
        }
        const key = product ? product.id : `name:${ri.name.toLowerCase()}`;
        const current = agg.get(key);
        if (current) {
          current.required += ri.quantity;
        } else {
          agg.set(key, {
            productId: product?.id ?? null,
            name: product?.name ?? ri.name,
            unit: product?.baseUnit ?? ri.unit,
            required: ri.quantity,
            packageSize: product?.packageSize ?? null,
          });
        }
      }
    }

    const needs: NeedResponse[] = [];
    for (const a of agg.values()) {
      const inStock = a.productId ? (stockByProduct.get(a.productId) ?? 0) : 0;
      const shortfall = Math.max(0, a.required - inStock);
      // Niedobór minus to, co już czeka na liście zakupów. Pozycja dopisana ręcznie,
      // bez ilości, zamyka temat w całości — user wie, co kupuje, my nie zgadujemy.
      const listed = onList.get(a.name.toLowerCase());
      const listedQty = listed?.quantityIn(a.unit) ?? 0;
      const uncountable = listed?.hasUncountable(a.unit) ?? false;
      const remaining = uncountable ? 0 : Math.max(0, shortfall - listedQty);
      let toBuy = 0;
      let packages: number | undefined;
      if (remaining > 0) {
        if (a.packageSize && a.packageSize > 0) {
          packages = Math.ceil(remaining / a.packageSize);
          toBuy = packages * a.packageSize;
        } else {
          toBuy = remaining;
        }
      }
      needs.push({
        productId: a.productId,
        name: a.name,
        unit: a.unit,
        required: a.required,
        inStock,
        shortfall,
        onList: listedQty,
        onListUnknownQty: uncountable,
        packageSize: a.packageSize ?? undefined,
        toBuy,
        packages,
      });
    }
    return needs.sort((x, y) => x.name.localeCompare(y.name, 'pl'));
  }

  // Co z niekupionych pozycji listy zakupów pokrywa braki, po nazwie produktu.
  // Bez tego „czego brakuje" pokazuje pozycje dopisane minutę wcześniej, a każde
  // kolejne „Generuj z planu" dokłada drugi komplet tych samych zakupów (#108, #109).
  private async shoppingListCoverage(householdId: string): Promise<Map<string, ListedQuantities>> {
    const items = await this.shoppingRepo.findByHousehold(householdId);
    const coverage = new Map<string, ListedQuantities>();
    for (const item of items) {
      if (item.isChecked) {
        continue; // kupione → wpadło już do spiżarni i liczy się jako `inStock`
      }
      const key = item.name.trim().toLowerCase();
      const listed = coverage.get(key) ?? new ListedQuantities();
      listed.add(item.quantity, item.unit);
      coverage.set(key, listed);
    }
    return coverage;
  }

  // Applies ingredients to the pantry with the given sign (-1 consumes,
  // +1 restores). Only pantry-tracked, name-matched products move. Wołający
  // podaje **efektywne** składniki (po korektach w slocie), nie surowy przepis.
  private async applyIngredientsToPantry(
    householdId: string,
    ingredients: readonly RecipeIngredient[],
    sign: number,
  ): Promise<void> {
    const products = await this.productRepo.findByHousehold(householdId);
    const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
    for (const ri of ingredients) {
      const product = byName.get(ri.name.toLowerCase());
      if (!product || !product.trackInPantry || ri.quantity <= 0) {
        continue;
      }
      await this.adjustPantryInternal(householdId, product.id, sign * ri.quantity);
    }
  }

  // Adjusts pantry stock without re-checking permissions — callers own the
  // permission gate. Floors at zero.
  private async adjustPantryInternal(householdId: string, productId: string, delta: number): Promise<void> {
    const existing = await this.pantryRepo.findByHouseholdAndProduct(householdId, productId);
    const next = Math.max(0, (existing?.quantity ?? 0) + delta);
    const item = existing ? existing.withQuantity(next) : PantryItem.create(householdId, productId, next);
    await this.pantryRepo.save(item);
  }

  private async findTrackedProductByName(householdId: string, name: string): Promise<Product | null> {
    const products = await this.productRepo.findByHousehold(householdId);
    const match = products.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    return match && match.trackInPantry ? match : null;
  }

  private toPantryResponse(item: PantryItem, product: Product): PantryItemResponse {
    return {
      id: item.id,
      productId: item.productId,
      name: product.name,
      baseUnit: product.baseUnit,
      packageSize: product.packageSize ?? undefined,
      quantity: item.quantity,
    };
  }

  // ---- internals ----

  // Składniki wpisu po korektach — z przepisu albo z posiłku doraźnego. Jedyne
  // miejsce, które rozstrzyga „skąd biorą się składniki tego wpisu"; reszta
  // serwisu pyta tutaj, zamiast sięgać po `recipeId` na własną rękę.
  private async resolveEntry(
    entry: MealEntry,
  ): Promise<{ recipe: Recipe | null; ingredients: RecipeIngredient[]; servings: number }> {
    const recipe = entry.recipeId ? await this.recipeRepo.findById(entry.recipeId) : null;
    const base = recipe?.recipeIngredients ?? entry.custom?.ingredients ?? [];
    return {
      recipe,
      ingredients: effectiveIngredients(base, entry.portionScale, entry.ingredientOverrides),
      // Posiłek doraźny to zawsze jedna porcja — nie ma czego dzielić.
      servings: recipe?.servings ?? 1,
    };
  }

  // Makro liczy się z produktów gospodarstwa, których model przepisu nie zna —
  // stąd doklejenie tutaj, a nie w `Recipe.toResponse()`.
  private toRecipeResponse(recipe: Recipe, products: Product[]): RecipeResponse {
    return {
      ...recipe.toResponse(),
      nutrition: computeRecipeNutrition(recipe.recipeIngredients, products, recipe.servings),
    };
  }

  private async findRecipeOrThrow(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepo.findById(id);
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  private async findShoppingItemOrThrow(id: string): Promise<MealShoppingItem> {
    const item = await this.shoppingRepo.findById(id);
    if (!item) {
      throw new NotFoundException(`Shopping item ${id} not found`);
    }
    return item;
  }

  private async findProductOrThrow(id: string): Promise<Product> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }
}

// Posiłek doraźny przechodzi tę samą normalizację co składniki przepisu:
// `ingredientId` domyślnie z nazwy, żeby korekty w slocie miały się czego uczepić.
function normaliseCustomIngredients(ingredients: RecipeIngredientDto[] | undefined): RecipeIngredient[] {
  if (!ingredients) {
    return [];
  }
  return ingredients
    .filter((i) => i.name?.trim())
    .map((i) => ({
      ingredientId: i.ingredientId?.trim() || i.name.trim(),
      name: i.name.trim(),
      quantity: typeof i.quantity === 'number' && Number.isFinite(i.quantity) ? i.quantity : 0,
      unit: i.unit?.trim() ?? '',
    }));
}

function sumNutrition(items: Nutrition[]): Nutrition {
  const total = items.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: acc.protein + n.protein,
      fat: acc.fat + n.fat,
      carbs: acc.carbs + n.carbs,
      // Błonnik i sól sumują się tylko z tych posiłków, które je znają — zamiast
      // udawać zero tam, gdzie produkt po prostu nie podaje wartości.
      fiber: n.fiber === undefined ? acc.fiber : (acc.fiber ?? 0) + n.fiber,
      salt: n.salt === undefined ? acc.salt : (acc.salt ?? 0) + n.salt,
      proteinPlant: n.proteinPlant === undefined ? acc.proteinPlant : (acc.proteinPlant ?? 0) + n.proteinPlant,
      proteinAnimal:
        n.proteinAnimal === undefined ? acc.proteinAnimal : (acc.proteinAnimal ?? 0) + n.proteinAnimal,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 } as Nutrition,
  );
  return {
    kcal: Math.round(total.kcal),
    protein: round1(total.protein),
    fat: round1(total.fat),
    carbs: round1(total.carbs),
    fiber: total.fiber === undefined ? undefined : round1(total.fiber),
    salt: total.salt === undefined ? undefined : round1(total.salt),
    proteinPlant: total.proteinPlant === undefined ? undefined : round1(total.proteinPlant),
    proteinAnimal: total.proteinAnimal === undefined ? undefined : round1(total.proteinAnimal),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
