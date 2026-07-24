import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { McpService, type McpCaller } from '../domain/mcp.service';
import { MachineOrJwtAuthGuard, type MachineRequest } from '../../api-token/web/machine-or-jwt-auth.guard';
import { User } from '../../auth/domain/user.model';

// MCP endpoint (Streamable HTTP, non-streaming JSON responses). Accepts a single
// JSON-RPC request or a batch. Auth: session cookie OR machine bearer token.
@Controller('mcp')
@UseGuards(MachineOrJwtAuthGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post()
  async handle(
    @Req() req: MachineRequest,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const caller: McpCaller = {
      userId: (req.user as User).id,
      token: req.apiToken ?? null,
    };

    if (Array.isArray(body)) {
      const responses = (await Promise.all(body.map((msg) => this.mcpService.handle(msg, caller)))).filter(
        (r) => r !== null,
      );
      if (responses.length === 0) {
        res.status(HttpStatus.ACCEPTED).send();
        return;
      }
      res.status(HttpStatus.OK).json(responses);
      return;
    }

    const response = await this.mcpService.handle(body as never, caller);
    if (!response) {
      res.status(HttpStatus.ACCEPTED).send();
      return;
    }
    res.status(HttpStatus.OK).json(response);
  }
}
