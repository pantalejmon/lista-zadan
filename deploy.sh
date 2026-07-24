#!/bin/bash
set -e

cd /home/jjakubik/lista-zadan

# --ff-only: jeśli ktoś dłubał w plikach na serwerze, deploy ma paść, a nie robić merge'a
git pull --ff-only

# ci, nie install: instalacja dokładnie z lockfile'a, bez cichego podbijania zależności na prodzie
npm ci

npm run build

# startOrRestart: działa też przy pierwszym wdrożeniu i po restarcie maszyny,
# kiedy procesu jeszcze nie ma w pm2 (restart by się wtedy wywalił na set -e).
# Migracje bazy odpalają się same przy starcie aplikacji (migrationsRun w app.module.ts).
pm2 startOrRestart ecosystem.config.js --update-env
