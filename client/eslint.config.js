import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const PLATFORM_KNOWS_NO_DOMAIN = {
  group: ['@modules/*', '@modules/**'],
  message:
    'platform/ nie może zależeć od domen — zależność idzie tylko w drugą stronę. '
    + 'Powłoka, storage i auth mają działać bez wiedzy o tym, jakie moduły istnieją.',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // This codebase intentionally loads data via setState inside mount effects
      // (useLists, useTodos, useWebSocket, ...). The rule (added in a newer
      // eslint-plugin-react-hooks) flags that idiom project-wide; keep it off.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Warstwa techniczna nie zna domen — egzekwowane przez build, nie przez pamięć.
    files: ['src/platform/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [PLATFORM_KNOWS_NO_DOMAIN] }],
    },
  },
])
