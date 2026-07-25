// An OAuth 2.0 protocol error (RFC 6749 §5.2 / §4.1.2.1). Carries the machine-readable
// `error` code clients branch on, plus the HTTP status to answer with. The web layer
// renders it as the `{ error, error_description }` JSON body (token endpoint) or as a
// redirect query (authorize endpoint).
export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'server_error';

export class OAuthError extends Error {
  constructor(
    readonly code: OAuthErrorCode,
    readonly description: string,
    readonly httpStatus = 400,
  ) {
    super(description);
    this.name = 'OAuthError';
  }
}
