#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use
fi
npm install --registry=https://npm-mirror.gitverse.ru --fetch-retries=1 --fetch-timeout=30000
npm test
npm run build
printf '\nГотово. Запуск: npm run dev\n'
