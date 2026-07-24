// Spójny język ikon: kafelek o zaokrąglonych rogach wypełniony kolorem + biały
// symbol w środku — ten sam pomysł co znaczek aplikacji. Kolor kafelka bierze się
// z `currentColor`, więc sterujemy nim klasą `text-*`.
//
// Symbole są pełne (nie konturowe): przy 20–24 px cienkie kreski się gubią,
// a pełna sylwetka czyta się od razu.

interface TileIconProps {
  className?: string;
  /** Zaokrąglenie kafelka; domyślne pasuje do rozmiarów 24–36 px. */
  radius?: number;
}

function Tile({ className = 'w-8 h-8', glyph, radius = 6.5 }: TileIconProps & { glyph: React.ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx={radius} fill="currentColor" />
      {/* Symbol rysowany w układzie 24×24 i wpasowany w środek kafelka */}
      <g transform="translate(4.1 4.1) scale(0.658)" fill="white" fillRule="evenodd" clipRule="evenodd">
        {glyph}
      </g>
    </svg>
  );
}

/** Znak aplikacji — domek z drzwiami. */
export function IconBrandHome(props: TileIconProps) {
  return (
    <Tile
      {...props}
      glyph={
        <path d="M12.74 2.53a1.05 1.05 0 0 0-1.48 0L2.4 11.06a1.05 1.05 0 0 0 .74 1.8h1.2v7.03c0 .88.71 1.6 1.59 1.6h4.02v-5.06a2.05 2.05 0 0 1 4.1 0v5.06h4.02c.88 0 1.6-.72 1.6-1.6v-7.04h1.19a1.05 1.05 0 0 0 .74-1.79l-8.86-8.53Z" />
      }
    />
  );
}

/** Zadania — ptaszek, w duchu pierwotnego znaku aplikacji. */
export function IconTileTasks(props: TileIconProps) {
  return (
    <Tile
      {...props}
      glyph={
        <path d="M20.9 5.6a1.6 1.6 0 0 1 .05 2.26L10.8 18.5a1.6 1.6 0 0 1-2.3.02l-5.3-5.3a1.6 1.6 0 1 1 2.26-2.26l4.13 4.13 8.99-9.44a1.6 1.6 0 0 1 2.26-.05Z" />
      }
    />
  );
}

/** Posiłki — widelec i nóż. */
export function IconTileMeals(props: TileIconProps) {
  return (
    <Tile
      {...props}
      glyph={
        <>
          <path d="M5.1 2.2c.5 0 .9.4.9.9v4.3h.9V3.1a.9.9 0 1 1 1.8 0v4.3h.9V3.1a.9.9 0 1 1 1.8 0v5.4c0 1.4-.9 2.6-2.2 3.02V20.9a1.1 1.1 0 0 1-2.2 0v-9.36A3.2 3.2 0 0 1 4.2 8.5V3.1c0-.5.4-.9.9-.9Z" />
          <path d="M17.3 2.2c1.6 0 2.6 2.9 2.6 5.9 0 2.2-.6 3.6-1.7 4.16V20.9a1.1 1.1 0 0 1-2.2 0V3.3c0-.6.5-1.1 1.1-1.1h.2Z" />
        </>
      }
    />
  );
}

/** Serwis domu — koło zębate (czytelne nawet w małym kafelku). */
export function IconTileHomeService(props: TileIconProps) {
  return (
    <Tile
      {...props}
      glyph={
        <path d="M10.6 1.9a1.9 1.9 0 0 0-1.87 1.58l-.13.8c-.03.16-.15.32-.36.4-.3.13-.6.25-.87.42-.2.11-.4.1-.54.05l-.76-.29a1.9 1.9 0 0 0-2.3.83l-.7 1.2a1.9 1.9 0 0 0 .44 2.41l.63.52c.12.1.2.29.18.5a6.6 6.6 0 0 0 0 1.02c.02.21-.06.4-.18.5l-.63.52a1.9 1.9 0 0 0-.44 2.41l.7 1.2c.47.82 1.45 1.16 2.3.83l.76-.29c.14-.05.34-.06.54.05.28.17.57.3.87.42.2.08.33.24.36.4l.13.8A1.9 1.9 0 0 0 10.6 22.1h1.4a1.9 1.9 0 0 0 1.87-1.58l.13-.8c.03-.16.15-.32.36-.4.3-.13.6-.25.87-.42.2-.11.4-.1.54-.05l.76.29c.85.33 1.83-.01 2.3-.83l.7-1.2a1.9 1.9 0 0 0-.44-2.41l-.63-.52c-.12-.1-.2-.29-.18-.5a6.6 6.6 0 0 0 0-1.02c-.02-.21.06-.4.18-.5l.63-.52a1.9 1.9 0 0 0 .44-2.41l-.7-1.2a1.9 1.9 0 0 0-2.3-.83l-.76.29c-.14.05-.34.06-.54-.05a6.5 6.5 0 0 0-.87-.42c-.2-.08-.33-.24-.36-.4l-.13-.8A1.9 1.9 0 0 0 12 1.9h-1.4Zm1.4 13.6a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      }
    />
  );
}

/** Finanse — banknot. */
export function IconTileFinance(props: TileIconProps) {
  return (
    <Tile
      {...props}
      glyph={
        <path d="M2.2 7.6A2.6 2.6 0 0 1 4.8 5h14.4a2.6 2.6 0 0 1 2.6 2.6v8.8a2.6 2.6 0 0 1-2.6 2.6H4.8a2.6 2.6 0 0 1-2.6-2.6V7.6Zm9.8 7.15a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" />
      }
    />
  );
}

/** Czat — dymek z trzema kropkami. */
export function IconTileChat(props: TileIconProps) {
  return (
    <Tile
      {...props}
      glyph={
        <path d="M4.6 3.3h14.8a2.4 2.4 0 0 1 2.4 2.4v8.6a2.4 2.4 0 0 1-2.4 2.4h-8.3l-4.4 3.6a1 1 0 0 1-1.63-.77V16.7H4.6a2.4 2.4 0 0 1-2.4-2.4V5.7a2.4 2.4 0 0 1 2.4-2.4Zm3.4 8.4a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Zm4 0a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Zm4 0a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" />
      }
    />
  );
}
