import { ApiToken } from '../../api-token/domain/api-token.model';
import { scopeSatisfied } from '../../api-token/domain/api-scope';
import { McpTool, ToolContext } from './mcp-tool';

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'lista-zadan', version: '1.0.0' };

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

// Identity resolved by the auth guard and handed to the JSON-RPC layer.
export interface McpCaller {
  userId: string;
  email: string;
  token: ApiToken | null;
}

// Minimal MCP server over JSON-RPC (Streamable HTTP, non-streaming responses).
// Handles initialize / tools/list / tools/call / ping. Tools are gated by the
// caller's token scopes; interactive (cookie) callers see every tool.
export class McpService {
  constructor(private readonly tools: McpTool[]) {}

  // Returns the JSON-RPC response, or null for notifications (no id).
  async handle(request: JsonRpcRequest, caller: McpCaller): Promise<JsonRpcResponse | null> {
    const isNotification = request.id === undefined || request.id === null;
    const id = request.id ?? null;

    try {
      switch (request.method) {
        case 'initialize':
          return this.ok(id, {
            protocolVersion: this.negotiateVersion(request.params),
            capabilities: { tools: {} },
            serverInfo: SERVER_INFO,
          });
        case 'notifications/initialized':
          return null;
        case 'ping':
          return this.ok(id, {});
        case 'tools/list':
          return this.ok(id, { tools: this.visibleTools(caller).map(toToolInfo) });
        case 'tools/call':
          return await this.callTool(id, request.params ?? {}, caller);
        default:
          if (isNotification) {
            return null;
          }
          return this.err(id, -32601, `Method not found: ${request.method}`);
      }
    } catch (e) {
      return this.err(id, -32603, e instanceof Error ? e.message : 'Internal error');
    }
  }

  private async callTool(
    id: string | number | null,
    params: Record<string, unknown>,
    caller: McpCaller,
  ): Promise<JsonRpcResponse> {
    const name = typeof params.name === 'string' ? params.name : '';
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return this.err(id, -32602, `Unknown tool: ${name}`);
    }
    const missingScopes = this.missingScopes(caller, tool);
    if (missingScopes.length > 0) {
      return this.err(id, -32000, `Token missing required scope(s): ${missingScopes.join(', ')}`);
    }
    const args = (params.arguments as Record<string, unknown> | undefined) ?? {};
    const ctx = this.buildContext(caller);
    try {
      const result = await tool.handler(args, ctx);
      return this.ok(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      });
    } catch (e) {
      // Tool-level failure: surface to the model as an error result, not a protocol error.
      return this.ok(id, {
        content: [{ type: 'text', text: e instanceof Error ? e.message : 'Tool failed' }],
        isError: true,
      });
    }
  }

  private buildContext(caller: McpCaller): ToolContext {
    const bound = caller.token?.householdId ?? null;
    return {
      userId: caller.userId,
      email: caller.email,
      token: caller.token,
      requireHousehold: (argHouseholdId?: string): string => {
        if (bound) {
          if (argHouseholdId && argHouseholdId !== bound) {
            throw new Error('Token is not authorised for this household');
          }
          return bound;
        }
        if (!argHouseholdId) {
          throw new Error('householdId is required (token is not bound to a household)');
        }
        return argHouseholdId;
      },
    };
  }

  private visibleTools(caller: McpCaller): McpTool[] {
    return this.tools.filter((t) => this.missingScopes(caller, t).length === 0);
  }

  // Scopes the tool requires that the caller's token does not satisfy. Empty for
  // interactive (cookie) callers, who carry full authority.
  private missingScopes(caller: McpCaller, tool: McpTool): string[] {
    if (!caller.token) {
      return [];
    }
    const granted = new Set(caller.token.scopes);
    return tool.requiredScopes.filter((scope) => !scopeSatisfied(granted, scope));
  }

  private negotiateVersion(params: Record<string, unknown> | undefined): string {
    const requested = params?.protocolVersion;
    return typeof requested === 'string' ? requested : PROTOCOL_VERSION;
  }

  private ok(id: string | number | null, result: unknown): JsonRpcResponse {
    return { jsonrpc: '2.0', id, result };
  }

  private err(id: string | number | null, code: number, message: string): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}

function toToolInfo(tool: McpTool): { name: string; description: string; inputSchema: Record<string, unknown> } {
  return { name: tool.name, description: tool.description, inputSchema: tool.inputSchema };
}
