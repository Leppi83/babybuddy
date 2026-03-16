# Ant Design Migration Plan

## Goal

Move Baby Buddy to a React + Ant Design UI without keeping Shadcn or Bootstrap components as the long-term UI layer.

## Phase 1: Foundation

- Build a dedicated React frontend in `frontend/` with Ant Design as the only component system.
- Mount the React bundle from Django templates through a single app shell template.
- Keep Django as backend, auth provider, routing source, and API provider.
- Introduce `DASHBOARD_ANT_ENABLED` as the rollout switch for dashboard routes.

## Phase 2: First Migration Slice

- Replace the dashboard overview with an Ant Design page.
- Replace the child dashboard with an Ant Design page.
- Replace the old Django navbar on Ant-enabled dashboard routes with the React/Ant app shell.
- Reuse existing API endpoints and settings persistence instead of rebuilding business logic.

## Phase 3: Settings and Navigation Completion

- Migrate user settings to React + Ant Design.
- Move dashboard visibility, order, and hidden-section controls into Ant forms.
- Replace remaining navbar dropdown behavior with Ant navigation patterns.

## Phase 4: Lists and Forms

- Migrate list screens first:
  - children
  - notes
  - feedings
  - diaper changes
  - sleep
  - measurements
- Migrate form screens second:
  - add/edit flows
  - detail screens
  - delete confirmations

## Phase 5: Auth and Utility Screens

- Migrate login and password reset flows to React + Ant Design.
- Migrate welcome, user management, and support/settings utility screens.

## Removal Plan

Remove old UI code only after the Ant route for that area is in production-ready shape.

### Remove first

- Unused Shadcn React primitives in `frontend/src/components/ui`
- Shadcn-specific preview app structure in `frontend/src`

### Remove second

- Django dashboard templates replaced by Ant pages
- Dashboard-specific Bootstrap/legacy JS hooks that are no longer used
- Shadcn preview template and assets once the Ant dashboard is stable

### Remove last

- Bootstrap-driven page templates still serving migrated routes
- jQuery behaviors tied only to migrated pages
- Gulp-managed CSS/JS paths that no remaining page depends on

## Acceptance Criteria Per Area

- Feature parity is good enough for daily use.
- German and English texts are available.
- Mobile layout works on iPhone-sized screens.
- Docker build includes the Ant bundle.
- Old route-specific template, JS, and CSS can be deleted without breaking unrelated pages.

## Current Status

- Branch created: `ant_design_migration`
- Ant Design frontend dependencies added
- React app shell created
- Dashboard overview migrated to Ant Design
- Child dashboard migrated to Ant Design
- Dashboard routes can render through the Ant app shell
- Dockerfile updated to build the React bundle
- Night sleep circle dashboard card added and documented in [night-sleep-circle-card.md](/Users/hennigchristian/Projects/Codex/babybuddy/docs/night-sleep-circle-card.md)

## Next Steps

1. Review the Ant dashboard UX on desktop and mobile.
2. Decide whether user settings is the next migration target.
3. Remove the old Shadcn preview route and assets after dashboard sign-off.
