#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/etc/komodo/stacks/baby_buddy"
BRANCH="master"
COMPOSE=(docker compose -p baby_buddy -f docker-compose.prod.yml --env-file .env.prod)

cd "${PROJECT_DIR}"

echo "==> Updating branch ${BRANCH}"
git checkout "${BRANCH}"
git pull --rebase origin "${BRANCH}"

echo "==> Building and recreating babybuddy container"
"${COMPOSE[@]}" build babybuddy
"${COMPOSE[@]}" up -d --force-recreate babybuddy

echo "==> Collecting static files"
"${COMPOSE[@]}" exec babybuddy python manage.py collectstatic --noinput --clear

echo "==> Restarting app container"
"${COMPOSE[@]}" restart babybuddy

echo "==> Done"
