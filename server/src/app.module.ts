import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { TodoModule } from './todo/todo.module';
import { SharingModule } from './sharing/sharing.module';
import { MealModule } from './meal/meal.module';
import { HomeModule } from './home/home.module';
import { FinanceModule } from './finance/finance.module';
import { ApiTokenModule } from './api-token/api-token.module';
import { OAuthModule } from './oauth/oauth.module';
import { McpModule } from './mcp/mcp.module';
import { ChatModule } from './chat/chat.module';
import { PushModule } from './push/push.module';
import { CreateTodoTable1711612800000 } from './migration/1711612800000-CreateTodoTable';
import { CreateUserTable1711612900000 } from './migration/1711612900000-CreateUserTable';
import { AddUserIdToTodo1711613000000 } from './migration/1711613000000-AddUserIdToTodo';
import { CreateSharingTables1711613100000 } from './migration/1711613100000-CreateSharingTables';
import { AddListIdToTodo1711613200000 } from './migration/1711613200000-AddListIdToTodo';
import { AddMonthToTodoAndMakeDateNullable1711613300000 } from './migration/1711613300000-AddMonthToTodoAndMakeDateNullable';
import { AddUpdatedAtToTodo1711613400000 } from './migration/1711613400000-AddUpdatedAtToTodo';
import { AddHouseholdTables1721800000000 } from './migration/1721800000000-AddHouseholdTables';
import { AddStorageQuotaToUser1743206400000 } from './migration/1743206400000-AddStorageQuotaToUser';
import { AddShoppingListSupport1763251200000 } from './migration/1763251200000-AddShoppingListSupport';
import { AddMealTables1763424000000 } from './migration/1763424000000-AddMealTables';
import { AddChatTable1763510400000 } from './migration/1763510400000-AddChatTable';
import { AddPushSubscriptionTable1763596800000 } from './migration/1763596800000-AddPushSubscriptionTable';
import { AddProductTable1763683200000 } from './migration/1763683200000-AddProductTable';
import { AddPantryTable1763769600000 } from './migration/1763769600000-AddPantryTable';
import { AddCookedToMealEntry1763856000000 } from './migration/1763856000000-AddCookedToMealEntry';
import { AddHomeServiceTables1763942400000 } from './migration/1763942400000-AddHomeServiceTables';
import { AddApiTokenTable1764028800000 } from './migration/1764028800000-AddApiTokenTable';
import { AddHomeProvidersRenovations1764115200000 } from './migration/1764115200000-AddHomeProvidersRenovations';
import { AddFinanceTables1764201600000 } from './migration/1764201600000-AddFinanceTables';
import { AddSettingsToUser1764288000000 } from './migration/1764288000000-AddSettingsToUser';
import { AddOAuthTables1764374400000 } from './migration/1764374400000-AddOAuthTables';
import { AddRecipeCategory1764460800000 } from './migration/1764460800000-AddRecipeCategory';
import { AddProductNutrition1764547200000 } from './migration/1764547200000-AddProductNutrition';
import { AddRecipeServings1764633600000 } from './migration/1764633600000-AddRecipeServings';
import { AddMealEntryParticipants1764720000000 } from './migration/1764720000000-AddMealEntryParticipants';
import { AddMealEntryOverrides1764806400000 } from './migration/1764806400000-AddMealEntryOverrides';
import { AllowAdHocMealEntry1764892800000 } from './migration/1764892800000-AllowAdHocMealEntry';
import { AddNutritionGoalTable1764979200000 } from './migration/1764979200000-AddNutritionGoalTable';
import { AddProductOrigin1765065600000 } from './migration/1765065600000-AddProductOrigin';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: config.get<string>('database.type') as 'better-sqlite3',
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [
          CreateTodoTable1711612800000,
          CreateUserTable1711612900000,
          AddUserIdToTodo1711613000000,
          CreateSharingTables1711613100000,
          AddListIdToTodo1711613200000,
          AddMonthToTodoAndMakeDateNullable1711613300000,
          AddUpdatedAtToTodo1711613400000,
          AddHouseholdTables1721800000000,
          AddStorageQuotaToUser1743206400000,
          AddShoppingListSupport1763251200000,
          AddMealTables1763424000000,
          AddChatTable1763510400000,
          AddPushSubscriptionTable1763596800000,
          AddProductTable1763683200000,
          AddPantryTable1763769600000,
          AddCookedToMealEntry1763856000000,
          AddHomeServiceTables1763942400000,
          AddApiTokenTable1764028800000,
          AddHomeProvidersRenovations1764115200000,
          AddFinanceTables1764201600000,
          AddSettingsToUser1764288000000,
          AddOAuthTables1764374400000,
          AddRecipeCategory1764460800000,
          AddProductNutrition1764547200000,
          AddRecipeServings1764633600000,
          AddMealEntryParticipants1764720000000,
          AddMealEntryOverrides1764806400000,
          AllowAdHocMealEntry1764892800000,
          AddNutritionGoalTable1764979200000,
          AddProductOrigin1765065600000,
        ],
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'client', 'dist'),
      exclude: ['/api/{*path}'],
    }),
    AuthModule,
    TodoModule,
    SharingModule,
    MealModule,
    HomeModule,
    FinanceModule,
    ApiTokenModule,
    OAuthModule,
    McpModule,
    ChatModule,
    PushModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
