#!/usr/bin/env bash
# scripts/test-dojims.sh
# Використання: ./scripts/test-dojims.sh <userId> <BASE_URL>
# Приклад:      ./scripts/test-dojims.sh abc123 http://localhost:3001

set -e

USER_ID="${1:?Вкажи userId першим аргументом}"
BASE="${2:-http://localhost:3001}"
FAST_FORWARD_URL="$BASE/api/debug/fast-forward"

echo "=== ТЕСТ ДОЖИМІВ для userId=$USER_ID ==="
echo ""

fast_forward() {
  local MINUTES=$1
  local LABEL=$2
  echo "⏩ Fast-forward $MINUTES хв ($LABEL)..."
  curl -s -X POST "$FAST_FORWARD_URL" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"$USER_ID\",\"minutesToAdvance\":$MINUTES}" | jq .
  echo ""
  echo "⏳ Чекаємо 5 сек щоб scheduler спрацював..."
  sleep 5
}

echo "--- КРОК 1: Dojim 0 (immediate) ---"
echo "Перевір в Telegram що після open_focus_payment прийшло повідомлення з кнопками оплати"
echo "Натисни Enter коли перевірив..."
read -r

echo "--- КРОК 2: Dojim 1 (+24h) ---"
fast_forward 1441 "24h+1min"
echo "✅ Перевір в Telegram що прийшов Dojim 1 (текст про результат тесту)"
echo "Натисни Enter коли перевірив..."
read -r

echo "--- КРОК 3: Dojim 2 (+48h) ---"
fast_forward 1441 "ще +24h"
echo "✅ Перевір в Telegram що прийшов Dojim 2 (текст 'Можна ще місяць думати...')"
echo "Натисни Enter коли перевірив..."
read -r

echo "--- КРОК 4: Dojim 3 (+72h) ---"
fast_forward 1441 "ще +24h"
echo "✅ Перевір в Telegram що прийшов Dojim 3 (текст 'Я не буду переконувати...')"
echo "Натисни Enter коли перевірив..."
read -r

echo "--- КРОК 5: Dojim 4 (+5d) ---"
fast_forward 2881 "ще +48h (сумарно ~5d)"
echo "✅ Перевір в Telegram що прийшов Dojim 4 (текст 'Якщо ти ще думаєш...')"
echo "Натисни Enter коли перевірив..."
read -r

echo "--- КРОК 6: Dojim 5 (+7d) ---"
fast_forward 2881 "ще +48h (сумарно ~7d)"
echo "✅ Перевір в Telegram що прийшов Dojim 5 (текст 'Останнє нагадування...')"
echo "Натисни Enter коли перевірив..."
read -r

echo ""
echo "=== ТЕСТ ZOOM НАГАДУВАНЬ ==="

echo "--- Zoom -24h нагадування ---"
fast_forward 1441 "Zoom -24h"
echo "✅ Перевір в Telegram нагадування про Zoom за 24h"
echo "Натисни Enter коли перевірив..."
read -r

echo "--- Zoom -2h нагадування ---"
fast_forward 1321 "Zoom -2h (22h+1min)"
echo "✅ Перевір в Telegram нагадування про Zoom за 2h"
echo "Натисни Enter коли перевірив..."
read -r

echo ""
echo "=== ТЕСТ POST-ZOOM BRIDGE (Блок 14) ==="
fast_forward 60 "post-zoom"
echo "✅ Перевір в Telegram повідомлення про перехід в ABSystem AI"
echo ""
echo "=== ТЕСТ ЗАВЕРШЕНО ==="
