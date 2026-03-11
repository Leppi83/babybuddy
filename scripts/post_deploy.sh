#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/etc/komodo/stacks/baby_buddy"
COMPOSE=(docker compose -p baby_buddy -f docker-compose.prod.yml --env-file .env.prod)

cd "${PROJECT_DIR}"

echo "==> Collecting static files"
"${COMPOSE[@]}" exec babybuddy python manage.py collectstatic --noinput --clear

echo "==> Restarting app container"
"${COMPOSE[@]}" restart babybuddy

echo "==> Post deploy finished"
