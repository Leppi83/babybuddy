# Night Sleep Circle Card

This note documents the Ant dashboard card added in commit `53da09c6`.

## Purpose

The `card.sleep.night_circle` card adds a radial overnight sleep view to the sleep section of the Ant dashboard.

It is intentionally isolated so it can be removed with minimal side effects.

## What The Card Shows

- Sleep segments as circular ring arcs
- Awake periods as derived gaps between sleep segments
- Feeding events as icon markers on the ring
- Diaper changes as icon markers on the ring
- A center summary for the selected night
- Small summary stats for bedtime, wake time, night feedings, and night changes

## Data Sources

The card does not require new backend API endpoints.

It uses dashboard data already fetched in the Ant child dashboard:

- Sleep entries from `/api/sleep/`
- Feeding entries from `/api/feedings/`
- Diaper change entries from `/api/changes/`

The frontend stores these in `dashboardData` in [DashboardPages.jsx](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/pages/DashboardPages.jsx).

## Main Files

- Component logic: [DashboardPages.jsx](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/pages/DashboardPages.jsx)
- Styles: [index.css](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/index.css)
- Frontend card title map: [app-utils.jsx](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/lib/app-utils.jsx)
- Dashboard section registration and strings: [dashboard/views.py](/Users/hennigchristian/Projects/Codex/babybuddy/dashboard/views.py)
- Settings bootstrap visibility list: [views.py](/Users/hennigchristian/Projects/Codex/babybuddy/babybuddy/views.py)
- Allowed dashboard item choices: [models.py](/Users/hennigchristian/Projects/Codex/babybuddy/babybuddy/models.py)

## How It Is Wired

### 1. Dashboard item registration

The card key is registered as:

- `card.sleep.night_circle`

This was added to:

- `Settings.DASHBOARD_ITEM_CHOICES` in [models.py](/Users/hennigchristian/Projects/Codex/babybuddy/babybuddy/models.py)
- The sleep section map in [dashboard/views.py](/Users/hennigchristian/Projects/Codex/babybuddy/dashboard/views.py)
- The frontend card title map in [app-utils.jsx](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/lib/app-utils.jsx)

### 2. Dashboard data

`loadDashboardData()` now stores:

- `sleepItems`
- `weekSleepItems`
- `feedingItems`
- `changeItems`

Only `feedingItems` and `changeItems` were added for this card.

### 3. Card rendering

The card is rendered by the `NightSleepCircleCard` component in [DashboardPages.jsx](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/pages/DashboardPages.jsx).

The `renderCardContent()` switch includes a dedicated branch for `card.sleep.night_circle`.

### 4. Default visibility

To avoid forcing users to reset dashboard settings, the card is inserted into the visible dashboard items list at runtime if it is missing.

That insertion happens in:

- [dashboard/views.py](/Users/hennigchristian/Projects/Codex/babybuddy/dashboard/views.py)
- [views.py](/Users/hennigchristian/Projects/Codex/babybuddy/babybuddy/views.py)

The insertion point is before `card.sleep.week_chart` when possible.

## Night Window Logic

The card currently visualizes one overnight window.

- The base window is `18:00` to `10:00`-style logic implemented as a 16-hour span starting at `18:00`
- If the latest completed night sleep ends before noon, that sleep is treated as belonging to the previous night
- Only non-nap sleep entries are used for the main ring
- Awake segments are derived from gaps of at least 5 minutes between merged sleep segments

This is a frontend-only interpretation layer and can be adjusted without schema changes.

## Why It Is Easy To Remove

The feature was kept deliberately modular:

- One card key: `card.sleep.night_circle`
- One main React component: `NightSleepCircleCard`
- One CSS block prefixed with `.ant-night-sleep-`
- Small registry additions in three mapping files

No API contract, model schema, or migration was added.

## How To Remove It

Delete or revert the following pieces:

1. Remove `("card.sleep.night_circle", _("Sleep - Night Sleep Circle"))` from [models.py](/Users/hennigchristian/Projects/Codex/babybuddy/babybuddy/models.py)
2. Remove `card.sleep.night_circle` from the sleep section card list in [dashboard/views.py](/Users/hennigchristian/Projects/Codex/babybuddy/dashboard/views.py)
3. Remove the related display strings like `nightSleepCircle`, `lastNight`, `awake`, `nightFeedings`, and `nightChanges` from [dashboard/views.py](/Users/hennigchristian/Projects/Codex/babybuddy/dashboard/views.py)
4. Remove the `card.sleep.night_circle` title mapping from [app-utils.jsx](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/lib/app-utils.jsx)
5. Remove the runtime insertion logic for `card.sleep.night_circle` from [dashboard/views.py](/Users/hennigchristian/Projects/Codex/babybuddy/dashboard/views.py)
6. Remove the runtime insertion logic for `card.sleep.night_circle` from [views.py](/Users/hennigchristian/Projects/Codex/babybuddy/babybuddy/views.py)
7. Remove the `NightSleepCircleCard` component and its `renderCardContent()` branch from [DashboardPages.jsx](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/pages/DashboardPages.jsx)
8. Remove the `.ant-night-sleep-*` CSS rules and theme variables from [index.css](/Users/hennigchristian/Projects/Codex/babybuddy/frontend/src/index.css)

After removal, rebuild and redeploy as usual.

## Deployment Reminder

Because the Ant app bundle is cached by URL, the card rollout also bumped the static asset query string in:

- [ant_app.html](/Users/hennigchristian/Projects/Codex/babybuddy/babybuddy/templates/babybuddy/ant_app.html)
- The Ant error templates in `babybuddy/templates/error/`

If the card changes again later, bump that cache key so deployed browsers fetch the new bundle.
