import { ApiToken } from '../../api-token/domain/api-token.model';
import { ApiScope } from '../../api-token/domain/api-scope';

// Context handed to every tool invocation. `token` is null for interactive
// (cookie) callers, who carry full user authority and no scope restriction.
export interface ToolContext {
  userId: string;
  token: ApiToken | null;
  // Resolves the household a tool should act on: a household-bound token pins it
  // (and rejects a mismatching argument); otherwise the argument is required.
  requireHousehold(argHouseholdId?: string): string;
}

export interface McpTool {
  name: string;
  description: string;
  // Every scope here must be satisfied by the caller's token. Cross-module tools
  // (e.g. read meals + write todo) list more than one.
  requiredScopes: ApiScope[];
  // JSON Schema for the tool arguments (advertised to the client via tools/list).
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

export function stringArg(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function requireStringArg(args: Record<string, unknown>, key: string): string {
  const value = stringArg(args, key);
  if (!value) {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

export function boolArg(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === 'boolean' ? value : undefined;
}
