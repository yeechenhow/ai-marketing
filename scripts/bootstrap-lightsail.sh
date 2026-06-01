#!/usr/bin/env bash
# Run ONCE on the Lightsail instance (via browser SSH or local ssh).
set -euo pipefail

echo "==> Lightsail bootstrap for ai-marketing"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install Node 20+ first."
  exit 1
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing pm2..."
  sudo npm install -g pm2
fi

mkdir -p ~/ai-marketing

if [[ ! -f ~/ai-marketing/.env ]]; then
  echo ""
  echo "IMPORTANT: Create ~/ai-marketing/.env before the first GitHub deploy."
  echo "Required variables:"
  echo "  DATABASE_URL=postgresql://..."
  echo "  AUTH_SECRET=long-random-string"
  echo "  AUTH_URL=https://vboox.com"
  echo "  NEXT_PUBLIC_APP_URL=https://vboox.com"
  echo ""
  echo "After GitHub Actions deploys, the app will build and start via pm2."
fi

echo "==> Bootstrap done. Add GitHub secrets and push to main (or re-run Deploy workflow)."
