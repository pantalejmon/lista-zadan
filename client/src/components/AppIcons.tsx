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

/** Serwis domu — koło zębate: sześć zębów rozłożonych co 60°, symetryczne
    względem środka kafelka, więc czyta się czysto nawet przy 24 px. */
export function IconTileHomeService(props: TileIconProps) {
  return (
    <Tile
      {...props}
      glyph={
        <path d="M9.2 1.98Q9.05 0.99 10.03 0.77A11.4 11.4 0 0 1 13.97 0.77Q14.95 0.99 14.8 1.98L14.56 3.59Q14.41 4.58 15.34 4.95A7.8 7.8 0 0 1 16.44 5.58Q17.22 6.2 18 5.58L19.28 4.56Q20.06 3.94 20.74 4.68A11.4 11.4 0 0 1 22.71 8.1Q23.01 9.05 22.08 9.42L20.56 10.01Q19.63 10.38 19.77 11.37A7.8 7.8 0 0 1 19.77 12.63Q19.63 13.62 20.56 13.99L22.08 14.58Q23.01 14.95 22.71 15.9A11.4 11.4 0 0 1 20.74 19.32Q20.06 20.06 19.28 19.44L18 18.42Q17.22 17.8 16.44 18.42A7.8 7.8 0 0 1 15.34 19.05Q14.41 19.42 14.56 20.41L14.8 22.02Q14.95 23.01 13.97 23.23A11.4 11.4 0 0 1 10.03 23.23Q9.05 23.01 9.2 22.02L9.44 20.41Q9.59 19.42 8.66 19.05A7.8 7.8 0 0 1 7.56 18.42Q6.78 17.8 6 18.42L4.72 19.44Q3.94 20.06 3.26 19.32A11.4 11.4 0 0 1 1.29 15.9Q0.99 14.95 1.92 14.58L3.44 13.99Q4.37 13.62 4.23 12.63A7.8 7.8 0 0 1 4.23 11.37Q4.37 10.38 3.44 10.01L1.92 9.42Q0.99 9.05 1.29 8.1A11.4 11.4 0 0 1 3.26 4.68Q3.94 3.94 4.72 4.56L6 5.58Q6.78 6.2 7.56 5.58A7.8 7.8 0 0 1 8.66 4.95Q9.59 4.58 9.44 3.59L9.2 1.98ZM12 7.8A4.2 4.2 0 1 0 12 16.2A4.2 4.2 0 1 0 12 7.8Z" />
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
