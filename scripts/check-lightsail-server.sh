#!/usr/bin/env bash
# Run this ON the Lightsail server: bash ~/ai-marketing/scripts/check-lightsail-server.sh
set -uo pipefail

APP_DIR="${APP_DIR:-$HOME/ai-marketing}"
cd "$APP_DIR" 2>/dev/null || { echo "FAIL: ~/ai-marketing folder missing"; exit 1; }

echo "========== Lightsail server check =========="
echo ""

pass=0
fail=0

ok()   { echo "OK:   $1"; pass=$((pass + 1)); }
bad()  { echo "FAIL: $1"; fail=$((fail + 1)); }
warn() { echo "WARN: $1"; }

# Node
if command -v node >/dev/null 2>&1; then
  v=$(node -v)
  if [[ "$v" =~ v2[0-9] ]]; then ok "Node $v"; else warn "Node $v (need 20+)"; fi
else
  bad "Node.js not installed"
fi

# npm
command -v npm >/dev/null 2>&1 && ok "npm installed" || bad "npm not installed"

# pm2
command -v pm2 >/dev/null 2>&1 && ok "pm2 installed" || bad "pm2 missing — run: sudo npm install -g pm2"

# App files
[[ -f package.json ]] && ok "package.json exists" || bad "package.json missing (deploy sync failed?)"

# .env
if [[ -f .env ]]; then
  ok ".env file exists"
  grep -q '^DATABASE_URL=' .env && ok "DATABASE_URL is set" || bad "DATABASE_URL missing in .env"
  grep -q '^AUTH_SECRET=' .env && ok "AUTH_SECRET is set" || bad "AUTH_SECRET missing in .env"
  grep -q 'https://vboox.com' .env && ok "AUTH_URL uses https://vboox.com" || warn "AUTH_URL should be https://vboox.com"
else
  bad ".env missing — create ~/ai-marketing/.env"
fi

# PostgreSQL port (only if DATABASE_URL uses 127.0.0.1)
if [[ -f .env ]] && grep -q '127.0.0.1' .env; then
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && ok "PostgreSQL responding on 127.0.0.1:5432" || bad "PostgreSQL NOT running on this server (127.0.0.1:5432). Install Postgres OR use Lightsail Database host in DATABASE_URL"
  else
    if (echo >/dev/tcp/127.0.0.1/5432) 2>/dev/null; then
      ok "Port 5432 open on localhost"
    else
      bad "Nothing listening on 127.0.0.1:5432 — Postgres not running on this server"
    fi
  fi
fi

# Prisma DB test
if [[ -f .env ]] && command -v npx >/dev/null 2>&1; then
  echo ""
  echo "Testing database connection (prisma)..."
  if npx prisma db execute --stdin <<< "SELECT 1" >/dev/null 2>&1; then
    ok "Database connection works"
  else
    bad "Cannot connect to database — check DATABASE_URL user/password/host/database name"
    echo "      If you use Lightsail Database (separate), host is NOT 127.0.0.1"
    echo "      Copy full URL from: Lightsail console → Databases → Connection details"
  fi
fi

echo ""
echo "========== Result: $pass passed, $fail failed =========="
if [[ $fail -gt 0 ]]; then
  echo "Fix the FAIL items above, then run deploy again."
  exit 1
fi
echo "Server looks ready. Run: SKIP_GIT_PULL=true bash scripts/deploy-production.sh"
