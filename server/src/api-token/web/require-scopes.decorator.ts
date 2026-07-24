import { SetMetadata } from '@nestjs/common';
import { ApiScope } from '../domain/api-scope';

export const REQUIRE_SCOPES_KEY = 'require_scopes';

// Declares the scopes a machine (bearer) token must hold to reach a handler.
// Cookie/JWT (interactive human) requests are exempt — they carry full user
// authority, not a scoped token.
export const RequireScopes = (...scopes: ApiScope[]) => SetMetadata(REQUIRE_SCOPES_KEY, scopes);
