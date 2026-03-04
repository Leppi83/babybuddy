#!/usr/bin/env bash
set -e

cd /app

# Migrations + Static
python manage.py migrate --noinput
python manage.py collectstatic --noinput || true

# Einfacher Start (dev-like)
python manage.py runserver 0.0.0.0:8000