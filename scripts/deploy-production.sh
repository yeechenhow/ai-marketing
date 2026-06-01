#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/ai-marketing}"
cd "$APP_DIR"

if [[ ! -f package.json ]]; then
  echo "ERROR: $APP_DIR/package.json not found. Deploy sync may have failed."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "ERROR: $APP_DIR/.env not found on the server."
  echo "Create it once on Lightsail with at least DATABASE_URL, AUTH_SECRET, AUTH_URL."
  echo "Example: cp .env.example .env && nano .env"
  exit 1
fi

if [[ "${SKIP_GIT_PULL:-false}" != "true" ]]; then
  echo "==> Pulling latest code..."
  git pull origin main
else
  echo "==> Skipping git pull (code synced from GitHub Actions)."
fi

echo "==> Installing dependencies..."
npm install

echo "==> Syncing database schema..."
npx prisma generate
if ! npx prisma db push --accept-data-loss; then
  echo ""
  echo "ERROR: Database sync failed."
  echo "  - If DATABASE_URL uses 127.0.0.1, PostgreSQL must run ON this server."
  echo "  - If you use Lightsail Database, use that endpoint in DATABASE_URL (not 127.0.0.1)."
  echo "  - Run: bash scripts/check-lightsail-server.sh"
  exit 1
fi

echo "==> Seeding demo data..."
ALLOW_DEMO_SEED=true npm run db:seed || echo "WARN: demo seed skipped or partial (may already exist)."

echo "==> Building app..."
npm run build

echo "==> Restarting app..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart ai-marketing || pm2 start npm --name "ai-marketing" --cwd "$APP_DIR" -- start
else
  echo "ERROR: pm2 is not installed. Run: npm install -g pm2"
  exit 1
fi

echo "==> Deploy complete."
