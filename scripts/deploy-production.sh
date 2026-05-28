#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/ai-marketing}"
cd "$APP_DIR"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm install

echo "==> Syncing database schema..."
npx prisma generate
npx prisma db push

echo "==> Building app..."
npm run build

echo "==> Restarting app..."
pm2 restart ai-marketing || pm2 start npm --name "ai-marketing" --cwd "$APP_DIR" -- start

echo "==> Deploy complete."
