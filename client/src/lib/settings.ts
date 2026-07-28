// User appearance settings: theme (light/dark variants), accent colour and font
// size. All three are applied by flipping CSS custom properties on <html> — the
// whole app already reads its colours through Tailwind's `var(--color-*)` tokens,
// so overriding those variables (see index.css) recolours everything at once
// without touching a single component.

// Lista dopuszczalnych wartości ma jedno źródło — `server/src/common/appearance.ts`.
// Tę samą listę egzekwuje walidacja żądania i schemat narzędzia MCP, więc UI nie
// zaproponuje opcji, której serwer nie przyjmie. Tu dokładamy tylko warstwę
// prezentacji: etykiety i próbki kolorów.
import {
  ACCENTS,
  FONT_SIZES,
  HIDEABLE_MODULES as HIDEABLE_MODULE_IDS,
  THEMES,
  type AccentId,
  type FontSizeId,
  type HideableModule,
  type ThemeId,
} from '@shared/appearance';

export type { AccentId, FontSizeId, HideableModule, ThemeId };

export interface Settings {
  theme: ThemeId;
  accent: AccentId;
  fontSize: FontSizeId;
  hiddenModules: HideableModule[];
}

export const SETTINGS_KEY = 'lista-zadan:settings';

export const DEFAULT_SETTINGS: Settings = { theme: 'light', accent: 'slate', fontSize: 'md', hiddenModules: [] };

// `Record` po typie z kontraktu: dodanie modułu do listy dopuszczalnych bez
// opisania go tutaj nie skompiluje się.
const MODULE_META: Record<HideableModule, { label: string; description: string }> = {
  meals: { label: 'Posiłki', description: 'Planer, przepisy, zakupy' },
  home: { label: 'Serwis domu', description: 'Przeglądy, gwarancje, koszty' },
  finance: { label: 'Finanse', description: 'Portfele, wydatki, statystyki' },
  chat: { label: 'Czat', description: 'Rozmowy domowników' },
};

export const HIDEABLE_MODULES: { id: HideableModule; label: string; description: string }[] =
  HIDEABLE_MODULE_IDS.map((id) => ({ id, ...MODULE_META[id] }));

// Root font-size drives every rem-based size in the app, so this scales text and
// spacing together — the accessible way to make the UI bigger, not just bolder.
export const FONT_SIZE_PX: Record<FontSizeId, string> = {
  sm: '15px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

// Address-bar / status-bar colour per theme (kept in sync with the surfaces in
// index.css and the no-FOUC script in index.html).
export const THEME_META_COLOR: Record<ThemeId, string> = {
  light: '#ffffff',
  sand: '#f1e9db',
  dark: '#0a0a0b',
  midnight: '#0b1120',
};

const DARK_THEMES: ThemeId[] = ['dark', 'midnight'];

export function isDarkTheme(theme: ThemeId): boolean {
  return DARK_THEMES.includes(theme);
}

// Quick sun/moon toggle jumps to the sibling theme, keeping the warm/cool family
// (biały↔grafit, piaskowy↔granatowy) so a chosen variant survives the switch.
export const THEME_TOGGLE: Record<ThemeId, ThemeId> = {
  light: 'dark',
  dark: 'light',
  sand: 'midnight',
  midnight: 'sand',
};

export interface ThemeOption {
  id: ThemeId;
  label: string;
  mode: 'Jasny' | 'Ciemny';
  dark: boolean;
  // Swatch preview colours (page background + a card sitting on it).
  bg: string;
  card: string;
}

const THEME_META: Record<ThemeId, Omit<ThemeOption, 'id'>> = {
  light: { label: 'Biały', mode: 'Jasny', dark: false, bg: '#f8fafc', card: '#ffffff' },
  sand: { label: 'Piaskowy', mode: 'Jasny', dark: false, bg: '#f1e9db', card: '#faf6ee' },
  dark: { label: 'Grafit', mode: 'Ciemny', dark: true, bg: '#0a0a0b', card: '#18181b' },
  midnight: { label: 'Granatowy', mode: 'Ciemny', dark: true, bg: '#0b1120', card: '#131c31' },
};

export const THEME_OPTIONS: ThemeOption[] = THEMES.map((id) => ({ id, ...THEME_META[id] }));

export interface AccentOption {
  id: AccentId;
  label: string;
  color: string;
}

// Próbka to krok 500 rampy z index.css. Kolejność bierze się z kontraktu
// (ułożonego jak koło barw), więc rząd próbek czyta się jak paleta.
const ACCENT_META: Record<AccentId, { label: string; color: string }> = {
  slate: { label: 'Stalowy', color: '#5b7f95' },
  blue: { label: 'Błękitny', color: '#2563eb' },
  teal: { label: 'Turkusowy', color: '#0d9488' },
  emerald: { label: 'Zielony', color: '#10b981' },
  violet: { label: 'Fioletowy', color: '#8b5cf6' },
  plum: { label: 'Śliwkowy', color: '#a21caf' },
  rose: { label: 'Różowy', color: '#f43f5e' },
  terracotta: { label: 'Ceglany', color: '#c2410c' },
  amber: { label: 'Bursztyn', color: '#c97e1f' },
};

export const ACCENT_OPTIONS: AccentOption[] = ACCENTS.map((id) => ({ id, ...ACCENT_META[id] }));

export interface FontSizeOption {
  id: FontSizeId;
  label: string;
}

const FONT_SIZE_LABELS: Record<FontSizeId, string> = {
  sm: 'Mały',
  md: 'Normalny',
  lg: 'Duży',
  xl: 'Bardzo duży',
};

export const FONT_SIZE_OPTIONS: FontSizeOption[] = FONT_SIZES.map((id) => ({
  id,
  label: FONT_SIZE_LABELS[id],
}));

export function applySettings(settings: Settings): void {
  const root = document.documentElement;
  root.classList.toggle('dark', isDarkTheme(settings.theme));
  root.dataset.theme = settings.theme;
  root.dataset.accent = settings.accent;
  root.style.fontSize = FONT_SIZE_PX[settings.fontSize] ?? FONT_SIZE_PX.md;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', THEME_META_COLOR[settings.theme] ?? THEME_META_COLOR.light);
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Settings>;
      return {
        ...DEFAULT_SETTINGS,
        ...stored,
        // Zapisy sprzed tej opcji nie mają pola — bez tego byłoby `undefined`
        // i każdy `.includes` by wybuchł.
        hiddenModules: stored.hiddenModules ?? [],
      };
    }
    // Migrate the old standalone dark toggle so existing users keep their mode.
    const legacy = localStorage.getItem('theme');
    if (legacy === 'dark') {
      return { ...DEFAULT_SETTINGS, theme: 'dark' };
    }
    if (legacy === 'light') {
      return { ...DEFAULT_SETTINGS, theme: 'light' };
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return { ...DEFAULT_SETTINGS, theme: 'dark' };
    }
  } catch {
    // Corrupt/unavailable storage — fall through to defaults.
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage full/blocked — settings still apply for this session.
  }
}
