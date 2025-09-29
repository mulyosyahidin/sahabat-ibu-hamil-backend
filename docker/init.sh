#!/bin/sh
set -euo pipefail

echo "🚀 Starting backend initialization..."

MAX_ATTEMPTS=${MAX_ATTEMPTS:-30}
SLEEP_SECONDS=${SLEEP_SECONDS:-2}

# Pastikan DATABASE_URL tersedia
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL tidak ditemukan di environment"
  exit 1
fi

echo "⏳ Waiting for database via Prisma (DATABASE_URL)…"
i=1
until [ $i -gt "$MAX_ATTEMPTS" ]; do
  if echo 'SELECT 1;' | npx prisma db execute --stdin --url "$DATABASE_URL" >/dev/null 2>&1; then
    echo "✅ Database reachable"
    break
  fi
  echo "🔄 Attempt $i/$MAX_ATTEMPTS - DB not ready, sleeping ${SLEEP_SECONDS}s…"
  i=$((i+1))
  sleep "$SLEEP_SECONDS"
done

if [ $i -gt "$MAX_ATTEMPTS" ]; then
  echo "❌ Database still unreachable after $MAX_ATTEMPTS attempts"
  exit 1
fi

echo "🔄 Running Prisma migrations…"
npx prisma migrate deploy

# (opsional) JANGAN generate di runtime jika filesystem read-only
# npx prisma generate

echo "🌱 Seeding (if available)…"
if [ -f prisma/seed.ts ]; then
  echo "📝 Running TypeScript seed script..."
  if npx tsx prisma/seed.ts; then
    echo "✅ TypeScript seeding completed successfully"
  else
    echo "⚠️ TypeScript seeding failed, but continuing..."
  fi
elif [ -f prisma/seed.js ]; then
  echo "📝 Running JavaScript seed script..."
  if node prisma/seed.js; then
    echo "✅ JavaScript seeding completed successfully"
  else
    echo "⚠️ JavaScript seeding failed, but continuing..."
  fi
elif npm run -s db:seed >/dev/null 2>&1; then
  echo "✅ NPM seeding completed successfully"
else
  echo "ℹ️ No seed script found or seeding not configured, skipping"
fi

echo "🚀 Starting the application…"
if [ "${NODE_ENV:-}" = "production" ]; then
  echo "📦 Running in production mode"
  exec npm run start:prod
else
  echo "🔧 Running in development mode"
  exec npm run start
fi
