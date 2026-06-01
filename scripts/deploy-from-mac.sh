#!/usr/bin/env bash
# Deploy from your Mac to Lightsail (use when GitHub Actions SSH times out).
# Usage:
#   export LIGHTSAIL_HOST=18.136.137.5
#   export LIGHTSAIL_USER=ubuntu
#   export LIGHTSAIL_KEY=~/Downloads/LightsailDefaultKey-ap-southeast-1.pem
#   bash scripts/deploy-from-mac.sh
set -euo pipefail

HOST="${LIGHTSAIL_HOST:?Set LIGHTSAIL_HOST to your public static IP (e.g. 18.136.137.5)}"
USER="${LIGHTSAIL_USER:-ubuntu}"
KEY="${LIGHTSAIL_KEY:-$HOME/Downloads/LightsailDefaultKey-ap-southeast-1.pem}"
KEY="${KEY/#\~/$HOME}"
APP_DIR="~/ai-marketing"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$HOST" == 172.* ]] || [[ "$HOST" == 10.* ]] || [[ "$HOST" == 192.168.* ]]; then
  echo "ERROR: $HOST looks like a PRIVATE IP."
  echo "Use the public Static IP from Lightsail (e.g. 18.x.x.x), not 172.26.x.x"
  exit 1
fi

if [[ ! -f "$KEY" ]]; then
  echo "ERROR: Key not found: $KEY"
  echo "Set LIGHTSAIL_KEY to your .pem path"
  exit 1
fi

chmod 400 "$KEY"

echo "==> Testing SSH to $USER@$HOST ..."
ssh -i "$KEY" -o ConnectTimeout=15 -o BatchMode=yes "$USER@$HOST" 'echo "SSH OK"'

echo "==> Syncing files..."
ssh -i "$KEY" "$USER@$HOST" "mkdir -p $APP_DIR"
rsync -avz \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude .env.local \
  -e "ssh -i $KEY" \
  "$ROOT/" "$USER@$HOST:$APP_DIR/"

echo "==> Running deploy on server..."
ssh -i "$KEY" "$USER@$HOST" \
  "chmod +x $APP_DIR/scripts/deploy-production.sh && SKIP_GIT_PULL=true bash $APP_DIR/scripts/deploy-production.sh"

echo "==> Done. Open https://vboox.com"
