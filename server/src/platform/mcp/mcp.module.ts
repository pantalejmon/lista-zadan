import { Module } from '@nestjs/common';
import { AuthModule } from '@platform/auth/auth.module';
import { ApiTokenModule } from '@platform/api-token/api-token.module';
import { McpRegistryModule } from './mcp-registry.module';
import { McpToolRegistry } from './domain/mcp-tool.registry';
import { McpService } from './domain/mcp.service';
import { McpController } from './web/mcp.controller';

// Serwer MCP: **sam protokół**. Nie zna żadnej domeny — narzędzia wnoszą do
// rejestru moduły, które je posiadają. Wcześniej ten plik importował każdy
// moduł funkcjonalny i wstrzykiwał każdy serwis do jednej fabryki, więc dodanie
// modułu zawsze oznaczało zmianę tutaj.
//
// `AuthModule` i `ApiTokenModule` zostają: tożsamość i scope'y są częścią
// protokołu (bramkowanie `tools/list` i `tools/call`), a nie wiedzą domenową.
@Module({
  imports: [AuthModule, ApiTokenModule, McpRegistryModule],
  controllers: [McpController],
  providers: [
    {
      provide: McpService,
      useFactory: (registry: McpToolRegistry) => new McpService(registry),
      inject: [McpToolRegistry],
    },
  ],
})
export class McpModule {}
