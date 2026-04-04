#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
COMPOSE_FILE="/etc/docker/containers/fu-ball-live-table/docker-compose.yml"
PUBLIC_URL="https://fu-ball.194.164.194.141.sslip.io"

echo "==> Building frontend"
cd "$FRONTEND_DIR"
npm run build

echo
echo "==> Running frontend tests"
npm test

echo
echo "==> Redeploying Docker service"
sudo docker compose -f "$COMPOSE_FILE" up -d --build

echo
echo "==> Verifying public endpoint"
HTTP_HEADERS="$(curl -I -sS "$PUBLIC_URL")"
printf '%s\n' "$HTTP_HEADERS"

if ! grep -q "HTTP/2 200" <<<"$HTTP_HEADERS"; then
  echo
  echo "Deployment verification failed for $PUBLIC_URL" >&2
  exit 1
fi

echo
echo "==> Deployment complete"
echo "$PUBLIC_URL"
