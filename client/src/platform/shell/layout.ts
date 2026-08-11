// Offset pasków zakładek, które przyklejają się pod górną belką. Wysokość belki
// (h-12, od sm h-14) plus notch — trzyma to w jednym miejscu, bo inaczej zmiana
// wysokości belki po cichu rozjeżdża zakładki w każdej sekcji z osobna.
export const STICKY_UNDER_HEADER =
  'sticky top-[calc(3rem+env(safe-area-inset-top))] sm:top-[calc(3.5rem+env(safe-area-inset-top))]';
