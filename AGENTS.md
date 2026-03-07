# AGENTS.md
- Build & start: docker compose up --build -d
- Logs: docker compose logs -f babybuddy
- Tests: docker compose exec babybuddy python manage.py test
- Stop: docker compose down

- Push lokal: 
  - cd /Users/hennigchristian/Projects/Codex/babybuddy
  - git checkout ui_shadcn_migration
  - git push origin ui_shadcn_migration
- Deploy VM: cd /etc/komodo/stacks/baby_buddy
  - git checkout ui_shadcn_migration
  - git pull --rebase origin ui_shadcn_migration
  - docker compose -p baby_buddy -f docker-compose.prod.yml --env-file .env.prod up --build -d
  - docker compose -p baby_buddy -f docker-compose.prod.yml --env-file .env.prod exec babybuddy python manage.py collectstatic --noinput --clear
  - docker compose -p baby_buddy -f docker-compose.prod.yml --env-file .env.prod restart babybuddy