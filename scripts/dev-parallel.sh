#!/bin/bash

set -euo pipefail

echo "=== Starway Studio — Parallel Test Mode ==="

echo "[1/3] Starting backend on :3001..."
pnpm -C backend dev &
BACKEND_PID=$!

echo "[2/3] Starting frontend on :5173..."
pnpm -C apps/web dev &
FRONTEND_PID=$!

echo "[3/3] Starting ngrok tunnel..."
sleep 3
ngrok http 3001 --log=stdout &
NGROK_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" "$NGROK_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

sleep 5
echo ""
echo "=== READY ==="
echo "Local frontend:  http://localhost:5173"
echo "Local backend:   http://localhost:3001"
echo "Public backend:  check ngrok output"
echo "Health check:    http://localhost:3001/health/ready"
echo ""
echo "Ctrl+C to stop all"

wait
