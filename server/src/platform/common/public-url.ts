import { Request } from 'express';

// The externally-reachable base URL of this deployment (scheme + host, no trailing
// slash). OAuth metadata, the `issuer`, and redirect/callback URLs must all agree
// on this value, so it lives in one place.
//
// Prefers an explicitly configured `app.publicUrl` (set it in production when the
// app sits behind a reverse proxy). Falls back to deriving it from the request,
// honouring `X-Forwarded-Proto` / `X-Forwarded-Host` set by the proxy.
export function resolvePublicUrl(req: Request, configured: string | undefined): string {
  const explicit = configured?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }
  const proto = forwardedValue(req.headers['x-forwarded-proto']) ?? req.protocol;
  const host = forwardedValue(req.headers['x-forwarded-host']) ?? req.get('host') ?? 'localhost';
  return `${proto}://${host}`;
}

function forwardedValue(header: string | string[] | undefined): string | undefined {
  if (!header) {
    return undefined;
  }
  const raw = Array.isArray(header) ? header[0] : header;
  // A forwarded header can list several hops ("https, http"); the first is the client-facing one.
  return raw.split(',')[0]?.trim() || undefined;
}
