# Konfiguracja powiadomień push (Web Push)

## Ważne: Google/Firebase Console **nie jest potrzebne**

Aplikacja używa **standardowego Web Push z kluczami VAPID** — to protokół
przeglądarkowy, nie Firebase. Chrome na Androidzie (i desktopie) korzysta ze
swojego push service (endpoint FCM) **automatycznie**, w tle protokołu Web Push.
Nie zakładasz projektu w Firebase, nie generujesz `Server Key`, nie dotykasz
Google Cloud Console.

> Google Console / Firebase SDK byłyby potrzebne tylko, gdybyśmy zdecydowali się
> używać biblioteki Firebase Messaging po stronie klienta. **Celowo tego nie
> robimy** — `web-push` + VAPID wystarcza i jest prostsze.

Jedyne, co musisz zrobić, to **wygenerować parę kluczy VAPID** i wkleić je do
konfiguracji serwera.

## Krok po kroku

### 1. Wygeneruj klucze VAPID

```bash
npx web-push generate-vapid-keys
# albo:
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

Dostaniesz `publicKey` i `privateKey`.

### 2. Wklej je do `server/config.local.yaml`

Ten plik jest w `.gitignore` (trzyma sekrety — nie trafia do repo). Utwórz go,
jeśli nie istnieje:

```yaml
vapid:
  subject: 'mailto:twoj-email@example.com'   # kontakt dla push service
  publicKey:  'BExxxxxxxx...'                 # z kroku 1
  privateKey: 'xxxxxxxx...'                   # z kroku 1
```

`config.local.yaml` jest nakładany na `config.yaml`, więc nadpisze puste
placeholdery.

### 3. Zrestartuj serwer

Po starcie w logu **zniknie** ostrzeżenie:

```
WARN [PushService] VAPID keys not configured — push notifications are disabled.
```

Jeśli go nie ma — klucze są wczytane i push jest aktywny.

### 4. HTTPS jest wymagany

Web Push i service worker działają **tylko po HTTPS** (wyjątek: `http://localhost`
do testów lokalnych). Na produkcji apka musi być serwowana po `https://`.

### 5. Włącz powiadomienia w aplikacji

1. Zaloguj się przez Google.
2. W menu (po lewej) kliknij **„Włącz powiadomienia”** — przeglądarka poprosi o
   zgodę.
3. Po zgodzie subskrypcja urządzenia zapisze się na serwerze
   (`POST /api/push/subscribe`).

### 6. Test

Z drugiego konta/urządzenia napisz wiadomość na czacie gospodarstwa — pierwsze
urządzenie dostanie powiadomienie push (także przy zamkniętej/zminimalizowanej
karcie).

## Android / PWA

Na Androidzie push działa najlepiej, gdy apka jest **zainstalowana jako PWA**
(„Dodaj do ekranu głównego” w Chrome). Wtedy powiadomienia zachowują się jak
natywne i docierają przy zamkniętej aplikacji.

## Jak to działa (skrót)

- **Klucz publiczny VAPID** ląduje w przeglądarce (`GET /api/push/vapid-public-key`)
  i identyfikuje nasz serwer przy subskrypcji.
- Przeglądarka zwraca **subskrypcję** (`endpoint` + klucze `p256dh`/`auth`),
  którą zapisujemy per użytkownik.
- Serwer wysyła powiadomienie biblioteką `web-push`, podpisując je kluczem
  **prywatnym** VAPID; push service przeglądarki dostarcza je do urządzenia,
  a `service worker` (`sw.js`) pokazuje notyfikację.
- Wygasłe/odwołane subskrypcje (odpowiedź `404/410`) są automatycznie usuwane.

### Deep-link i odpowiedź z powiadomienia

`PushPayload` (`push-subscription.model.ts`) niesie oprócz `title`/`body`/`tag`
dwa pola sterujące zachowaniem notyfikacji:

- **`url`** — cel tapnięcia jako hash SPA (np. `'/#chat'`). Aplikacja nie ma
  routera — sekcje to stan Reacta — więc `sw.js` po tapnięciu **focusuje** otwarte
  okno i `postMessage`’uje mu `{ type: 'notification-navigate', url, data }`, a przy
  zimnym starcie otwiera PWA na `#sekcja`. `App.tsx` czyta hash na starcie i
  nasłuchuje wiadomości z SW, po czym przełącza sekcję (i gospodarstwo z `data`).
  Bez tego każde powiadomienie lądowało na liście zadań.
- **`data`** — kontekst dla SW/appki, np. `{ type: 'chat', householdId }`.
- **`actions`** — przyciski notyfikacji. Czat wysyła akcję
  `{ action: 'reply', type: 'text', … }`, którą **Android** renderuje jako pole
  odpowiedzi wprost w powiadomieniu. `sw.js` w `notificationclick` łapie
  `event.reply` i robi `POST /api/households/:householdId/messages`
  (`credentials: 'include'` — ciasteczko sesji jedzie z żądaniem, bo SW jest
  same-origin). iOS ignoruje `actions` i sprowadza się do zwykłego tapnięcia →
  deep-link do czatu.

## Zakres i plany

- Obecnie zaimplementowany wyzwalacz: **nowa wiadomość czatu** → push do
  pozostałych domowników (z deep-linkiem do czatu i akcją „Odpowiedz”).
- W planach (osobne taski): przypomnienia o zadaniach/przeglądach (#49),
  powiadomienia o aktywności na listach i zaproszeniach (#50), granularne
  ustawienia per typ (#51).
- Zakres platform: **Android + Chrome/Chromium** (świadomie bez iOS/Safari).
