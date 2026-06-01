#!/bin/bash

set -euo pipefail

ROOT_DIR="/Users/viravira/Documents/starway-studio"
BACKEND_ENV="$ROOT_DIR/backend/.env"

NGROK_URL=$(
  curl -s http://localhost:4040/api/tunnels \
    | python3 -c "import sys, json; data=json.load(sys.stdin); print((data.get('tunnels') or [{}])[0].get('public_url',''))" \
    2>/dev/null
)

if [ -z "${NGROK_URL}" ]; then
  echo "Ngrok не запущено. Запусти: ngrok http 3001"
  exit 1
fi

if [ ! -f "$BACKEND_ENV" ]; then
  echo "Не знайдено backend/.env"
  exit 1
fi

set -a
source "$BACKEND_ENV"
set +a

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "TELEGRAM_BOT_TOKEN відсутній у backend/.env"
  exit 1
fi

WEBHOOK_URL="${NGROK_URL}/api/telegram/webhook"
echo "Встановлюю webhook: ${WEBHOOK_URL}"

curl -s -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\"}" | python3 -m json.tool

echo "Webhook встановлено: ${WEBHOOK_URL}"
