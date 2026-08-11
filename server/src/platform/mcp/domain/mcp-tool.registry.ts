import { Injectable } from '@nestjs/common';
import { McpTool } from './mcp-tool';

// Rejestr narzędzi MCP. Moduły domenowe wnoszą tu swoje narzędzia przy starcie
// (`onModuleInit`), dzięki czemu warstwa protokołu nie musi znać żadnej domeny —
// wcześniej `McpModule` importował **każdy** moduł funkcjonalny i wstrzykiwał
// **każdy** serwis do jednej fabryki.
//
// NestJS nie ma providerów `multi` (to wzorzec angularowy), więc zamiast
// wstrzykiwać tablicę wkładów, moduły rejestrują się same.
@Injectable()
export class McpToolRegistry {
  private readonly byName = new Map<string, McpTool>();

  // Nazwa narzędzia jest jego identyfikatorem w protokole, więc kolizja musi
  // wysypać start aplikacji, a nie po cichu przesłonić cudze narzędzie —
  // przy rejestracji rozproszonej po modułach nikt nie widzi całej listy naraz.
  register(tools: McpTool[]): void {
    for (const tool of tools) {
      const existing = this.byName.get(tool.name);
      if (existing) {
        throw new Error(`Duplicate MCP tool name: ${tool.name}`);
      }
      this.byName.set(tool.name, tool);
    }
  }

  // Sortowanie po nazwie: kolejność rejestracji zależy od kolejności inicjalizacji
  // modułów, a lista narzędzi ma być stabilna między uruchomieniami.
  all(): McpTool[] {
    return [...this.byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
