import { Module } from '@nestjs/common';
import { McpToolRegistry } from './domain/mcp-tool.registry';

// Sam rejestr, bez kontrolera i bez protokołu — moduły domenowe importują to,
// żeby wnieść swoje narzędzia, i nie ciągną przy okazji całego serwera MCP.
@Module({
  providers: [McpToolRegistry],
  exports: [McpToolRegistry],
})
export class McpRegistryModule {}
