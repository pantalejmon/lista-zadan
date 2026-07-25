// Machine-token scopes: <module>:<access>. A token carries a set of these and
// can only reach endpoints whose required scopes it satisfies.

export const SCOPE_MODULES = ['todo', 'meals', 'home', 'households', 'finance'] as const;
export type ScopeModule = (typeof SCOPE_MODULES)[number];

export type ScopeAccess = 'read' | 'write';

export type ApiScope = `${ScopeModule}:${ScopeAccess}`;

export const ALL_SCOPES: ApiScope[] = SCOPE_MODULES.flatMap(
  (m): ApiScope[] => [`${m}:read`, `${m}:write`],
);

const SCOPE_PATTERN = /^(todo|meals|home|households|finance):(read|write)$/;

export function isValidScope(scope: string): scope is ApiScope {
  return SCOPE_PATTERN.test(scope);
}

// A `write` grant implies the matching `read`. So a token holding `todo:write`
// satisfies a `todo:read` requirement, but not vice versa.
export function scopeSatisfied(granted: ReadonlySet<string>, required: ApiScope): boolean {
  if (granted.has(required)) {
    return true;
  }
  if (required.endsWith(':read')) {
    const module = required.slice(0, -':read'.length);
    return granted.has(`${module}:write`);
  }
  return false;
}
