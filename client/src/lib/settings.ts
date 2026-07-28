// User appearance settings: theme (light/dark variants), accent colour and font
// size. All three are applied by flipping CSS custom properties on <html> — the
// whole app already reads its colours through Tailwind's `var(--color-*)` tokens,
// so overriding those variables (see index.css) recolours everything at once
// without touching a single component.

export type ThemeId = 'light' | 'sand' | 'dark' | 'midnight';
export type AccentId = 'slate' | 'emerald' | 'violet' | 'amber' | 'rose';
export type FontSizeId = 'sm' | 'md' | 'lg' | 'xl';

// Moduły, których użytkownik nie chce widzieć w menu. Zadania są zawsze
// dostępne (w trybie lokalnym to jedyna sekcja), więc nie da się ich ukryć.
export type HideableModule = 'meals' | 'home' | 'finance' | 'chat';

export interface Settings {
  theme: ThemeId;
  accent: AccentId;
  fontSize: FontSizeId;
  hiddenModules: HideableModule[];
}

export const SETTINGS_KEY = 'lista-zadan:settings';

export const DEFAULT_SETTINGS: Settings = { theme: 'light', accent: 'slate', fontSize: 'md', hiddenModules: [] };

export const HIDEABLE_MODULES: { id: HideableModule; label: string; description: string }[] = [
  { id: 'meals', label: 'Posiłki', description: 'Planer, przepisy, zakupy' },
  { id: 'home', label: 'Serwis domu', description: 'Przeglądy, gwarancje, koszty' },
  { id: 'finance', label: 'Finanse', description: 'Portfele, wydatki, statystyki' },
  { id: 'chat', label: 'Czat', description: 'Rozmowy domowników' },
];

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

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'light', label: 'Biały', mode: 'Jasny', dark: false, bg: '#f8fafc', card: '#ffffff' },
  { id: 'sand', label: 'Piaskowy', mode: 'Jasny', dark: false, bg: '#f1e9db', card: '#faf6ee' },
  { id: 'dark', label: 'Grafit', mode: 'Ciemny', dark: true, bg: '#0a0a0b', card: '#18181b' },
  { id: 'midnight', label: 'Granatowy', mode: 'Ciemny', dark: true, bg: '#0b1120', card: '#131c31' },
];

export interface AccentOption {
  id: AccentId;
  label: string;
  color: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'slate', label: 'Stalowy', color: '#5b7f95' },
  { id: 'emerald', label: 'Zielony', color: '#10b981' },
  { id: 'violet', label: 'Fioletowy', color: '#8b5cf6' },
  { id: 'amber', label: 'Bursztyn', color: '#c97e1f' },
  { id: 'rose', label: 'Różowy', color: '#f43f5e' },
];

export interface FontSizeOption {
  id: FontSizeId;
  label: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { id: 'sm', label: 'Mały' },
  { id: 'md', label: 'Normalny' },
  { id: 'lg', label: 'Duży' },
  { id: 'xl', label: 'Bardzo duży' },
];

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
