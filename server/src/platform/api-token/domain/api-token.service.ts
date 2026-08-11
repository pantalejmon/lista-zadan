import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SharingService } from '@platform/sharing/domain/sharing.service';
import { ApiToken, type ApiTokenResponse, type ApiTokenCreated } from './api-token.model';
import { ApiTokenRepositoryPort } from './api-token.repository.port';
import { isValidScope, type ApiScope } from './api-scope';
import { CreateApiTokenDto } from '../web/dto/create-api-token.dto';

const MAX_EXPIRY_DAYS = 365;

export class ApiTokenService {
  constructor(
    private readonly repo: ApiTokenRepositoryPort,
    private readonly sharingService: SharingService,
  ) {}

  async listTokens(userId: string): Promise<ApiTokenResponse[]> {
    const tokens = await this.repo.findByUser(userId);
    return tokens
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((t) => t.toResponse());
  }

  async createToken(userId: string, dto: CreateApiTokenDto): Promise<ApiTokenCreated> {
    const scopes = this.validateScopes(dto.scopes);
    const householdId = dto.householdId?.trim() || null;
    if (householdId) {
      // A household-scoped token can only target a household the user belongs to.
      await this.sharingService.assertHouseholdPermission(householdId, userId, ['owner', 'editor', 'viewer']);
    }
    const expiresAt = this.resolveExpiry(dto.expiresInDays);
    const { model, secret } = ApiToken.issue(userId, dto.name, scopes, householdId, expiresAt);
    await this.repo.save(model);
    return { ...model.toResponse(), token: secret };
  }

  // Mints an access token on behalf of the OAuth authorization flow. Scopes are
  // already validated (they came from the consented authorization request); the
  // token is not bound to a household (like an interactive session, it can reach
  // every household the user belongs to, gated per-tool at call time).
  async issueOAuthToken(
    userId: string,
    name: string,
    scopes: ApiScope[],
    expiresInDays: number,
  ): Promise<ApiTokenCreated> {
    const expiresAt = this.resolveExpiry(expiresInDays);
    const { model, secret } = ApiToken.issue(userId, name, scopes, null, expiresAt);
    await this.repo.save(model);
    return { ...model.toResponse(), token: secret };
  }

  async revokeToken(id: string, userId: string): Promise<void> {
    const token = await this.repo.findById(id);
    if (!token || token.userId !== userId) {
      throw new NotFoundException(`Token ${id} not found`);
    }
    if (token.revokedAt !== null) {
      return;
    }
    await this.repo.save(token.withRevoked(Date.now()));
  }

  // Resolves a raw bearer token to its (active) model, recording last use.
  // Returns null when the token is unknown, revoked, or expired.
  async authenticate(rawToken: string): Promise<ApiToken | null> {
    if (!ApiToken.looksLikeToken(rawToken)) {
      return null;
    }
    const token = await this.repo.findByHash(ApiToken.hash(rawToken));
    const now = Date.now();
    if (!token || !token.isActive(now)) {
      return null;
    }
    // Best-effort last-used tracking; don't fail the request if this write races.
    await this.repo.save(token.withLastUsed(now));
    return token;
  }

  private validateScopes(scopes: string[]): ApiScope[] {
    if (!Array.isArray(scopes) || scopes.length === 0) {
      throw new BadRequestException('At least one scope is required');
    }
    const invalid = scopes.filter((s) => !isValidScope(s));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid scopes: ${invalid.join(', ')}`);
    }
    return [...new Set(scopes)] as ApiScope[];
  }

  private resolveExpiry(expiresInDays: number | undefined): number | null {
    if (expiresInDays === undefined || expiresInDays === null) {
      return null;
    }
    if (expiresInDays <= 0 || expiresInDays > MAX_EXPIRY_DAYS) {
      throw new BadRequestException(`expiresInDays must be between 1 and ${MAX_EXPIRY_DAYS}`);
    }
    return Date.now() + expiresInDays * 86_400_000;
  }

  // Ensures a bearer-authenticated request's target household matches the token's
  // household binding (when the token is household-scoped).
  assertHouseholdAllowed(token: ApiToken, householdId: string): void {
    if (token.householdId !== null && token.householdId !== householdId) {
      throw new ForbiddenException('Token is not authorised for this household');
    }
  }
}
