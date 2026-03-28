#!/bin/bash
set -e

cd /home/jjakubik/lista-zadan
git pull
npm install
npm run build
pm2 restart lista-zadan
