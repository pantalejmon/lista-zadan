# Google OAuth — konfiguracja

## 1. Google Cloud Console

1. Wejdź na [Google Cloud Console](https://console.cloud.google.com/)
2. Stwórz nowy projekt (lub użyj istniejącego)
3. **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - App name: `Lista Zadań`
   - User support email: twój email
   - Authorized domains: `janjakubik.pl`
   - Zapisz
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Lista Zadań`
   - Authorized JavaScript origins:
     - `http://localhost:5173` (dev frontend)
     - `http://localhost:3000` (dev backend)
     - `https://lista-zadan.janjakubik.pl` (produkcja)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (dev)
     - `https://lista-zadan.janjakubik.pl/auth/google/callback` (produkcja)
   - Kliknij **Create**
5. Skopiuj **Client ID** i **Client Secret**

## 2. Konfiguracja lokalna (dev)

Stwórz plik `server/config.local.yaml` (gitignored przez `*.local`):

```yaml
google:
  clientId: 'skopiowany-client-id.apps.googleusercontent.com'
  clientSecret: 'skopiowany-client-secret'

jwt:
  secret: 'wygeneruj-poleceniem-ponizej'
```

Generowanie JWT secret:

```bash
openssl rand -hex 32
```

## 3. Konfiguracja produkcyjna (VPS)

Na VPS `server/config.local.yaml`:

```yaml
server:
  port: 3000

cors:
  origin: 'https://lista-zadan.janjakubik.pl'

google:
  clientId: 'twoj-client-id.apps.googleusercontent.com'
  clientSecret: 'twoj-secret'
  callbackUrl: 'https://lista-zadan.janjakubik.pl/auth/google/callback'

jwt:
  secret: 'wygenerowany-secret'
```

## 4. Nginx reverse proxy

Backend serwuje zarówno API jak i zbudowany frontend — cały ruch idzie na jeden port.

```nginx
server {
    listen 443 ssl;
    server_name lista-zadan.janjakubik.pl;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 80;
    server_name lista-zadan.janjakubik.pl;
    return 301 https://$host$request_uri;
}
```

Nie trzeba osobnych location bloków — NestJS obsługuje wszystko (statyczne pliki + API + auth callback).
