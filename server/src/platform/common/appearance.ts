// Kontrakt wyglądu — **jedyne** miejsce, w którym żyje lista dopuszczalnych
// motywów, akcentów, rozmiarów tekstu i ukrywalnych modułów.
//
// Czytają go trzy strony:
//   • `UpdateSettingsDto`      — walidacja żądania (serwer jest tu autorytetem),
//   • narzędzie MCP `update_settings` — schemat dla agenta,
//   • klient (`client/src/lib/settings.ts`) przez alias `@shared/appearance`.
//
// Wcześniej te listy były przepisane w trzech miejscach i rozjazd oznaczał, że
// UI pozwala wybrać wartość, którą serwer odrzuca.
//
// **Dokładając nowy akcent** trzeba jeszcze dodać:
//   • etykietę i próbkę koloru w `ACCENT_META` (klient) — tego pilnuje typ,
//   • blok `:root[data-accent="…"]` z rampą 50–900 w `client/src/index.css`
//     — tego nie da się sprawdzić kompilatorem, więc to jedyny ręczny krok.

export const THEMES = ['light', 'sand', 'dark', 'midnight'] as const;

// Kolejność jak na kole barw — od chłodnych, przez zielenie, po ciepłe. Klient
// renderuje próbki w tej kolejności, więc rząd czyta się jak paleta.
export const ACCENTS = [
  'slate',
  'blue',
  'teal',
  'emerald',
  'violet',
  'plum',
  'rose',
  'terracotta',
  'amber',
] as const;

export const FONT_SIZES = ['sm', 'md', 'lg', 'xl'] as const;

// Zadań nie ma na liście: w trybie lokalnym to jedyna sekcja, więc nie da się
// ich ukryć.
export const HIDEABLE_MODULES = ['meals', 'home', 'finance', 'chat'] as const;

export type ThemeId = (typeof THEMES)[number];
export type AccentId = (typeof ACCENTS)[number];
export type FontSizeId = (typeof FONT_SIZES)[number];
export type HideableModule = (typeof HIDEABLE_MODULES)[number];
