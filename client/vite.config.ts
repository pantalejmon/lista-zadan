import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }
const buildDate = new Date().toISOString().slice(0, 10)

export default defineConfig({
  // Compile-time constants surfaced in the UI (discreet version label).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Kontrakt wyglądu (motywy, akcenty, rozmiary tekstu, ukrywalne moduły)
      // ma jedno źródło — waliduje go serwer, a UI renderuje dokładnie to, co
      // serwer przyjmie. To zwykłe stałe bez zależności; bundler je wkleja,
      // więc klient nie zyskuje żadnej zależności runtime od serwera.
      '@shared': fileURLToPath(new URL('../server/src/common', import.meta.url)),
    },
  },
  server: {
    host: true,
    // Dev-serwer musi móc odczytać plik kontraktu spoza katalogu klienta.
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Socket.io (todos/meal/home/chat gateways) — without this the dev client
      // opens the socket against Vite's port and hangs on "connecting".
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
