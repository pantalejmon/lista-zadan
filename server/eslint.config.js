const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');

const INFRASTRUCTURE_IS_PRIVATE = {
  group: ['@modules/*/infrastructure/*', '@platform/*/infrastructure/*'],
  message:
    'Encje i repozytoria są prywatne dla modułu. Zaimportuj moduł i wstrzyknij jego publiczny serwis.',
};

const PLATFORM_KNOWS_NO_DOMAIN = {
  group: ['@modules/*', '@modules/**'],
  message:
    'platform/ nie może zależeć od domen — zależność idzie tylko w drugą stronę. '
    + 'Jeśli warstwa techniczna potrzebuje czegoś od domeny, to domena ma się do niej zgłosić '
    + '(patrz McpToolRegistry).',
};

module.exports = tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      // Use the TS-aware version: it understands constructor parameter
      // properties and abstract/overload method params (the base rule does not).
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Granica modułu, egzekwowana przez build zamiast przez pamięć.
      // Importy **wewnątrz** modułu są względne (`./infrastructure/...`), więc
      // zakaz na formę aliasową trafia dokładnie w przypadek „ktoś z zewnątrz
      // sięga po cudze repozytorium/encję" — czyli w regułę z CLAUDE.md
      // „Repositories never leak outside their module".
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [INFRASTRUCTURE_IS_PRIVATE],
      }],
    },
  },
  {
    // Warstwa techniczna nie zna domen. To ta reguła, której brak pozwolił
    // narzędziom MCP wszystkich modułów zamieszkać w `mcp/domain/tools/`.
    files: ['src/platform/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [INFRASTRUCTURE_IS_PRIVATE, PLATFORM_KNOWS_NO_DOMAIN],
      }],
    },
  },
);
