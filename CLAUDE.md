# BabyBuddy — Codebase Reference

## Stack

- **Backend**: Django (Python), REST via `babybuddy/`, `core/`, `dashboard/`, `reports/` apps
- **Frontend**: React + Vite + Ant Design (dark theme), in `frontend/src/`
- **Bridge**: Django views serialize a `bootstrap` JSON object → embedded in `ant_app.html` → React reads it from `window.__ANT_BOOTSTRAP__`
- **Build**: `npm run build` inside `frontend/` → outputs to `babybuddy/static/babybuddy/ant/`
- **Dev server**: `gulp` (runs Django + Vite together) or `gulp runserver` + `cd frontend && npm run dev`

## Key Files

| Path                                         | Purpose                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/App.jsx`                       | Root: routes `bootstrap.pageType` → page component                                                                         |
| `frontend/src/components/AppShell.jsx`       | Layout shell: nav, header, child switcher                                                                                  |
| `frontend/src/pages/GeneralPages.jsx`        | List, form, child-detail, dashboard-home, timeline, reports, auth pages                                                    |
| `frontend/src/pages/DashboardPages.jsx`      | Child dashboard, settings, sleep week chart                                                                                |
| `frontend/src/lib/app-utils.jsx`             | Shared utils: `AntFieldControl`, `HiddenFieldInput`, `buildInitialFormState`, `formatHiddenValue`, `DASHBOARD_CARD_TITLES` |
| `babybuddy/views.py`                         | Auth, settings, welcome bootstraps; `_base_strings()`, `_nav_urls()`, `AntFormMixin`                                       |
| `core/views.py`                              | List/form/detail bootstraps; `_serialize_bound_field()`, `_build_ant_form_bootstrap()`, `_build_child_switcher()`          |
| `dashboard/views.py`                         | Dashboard bootstraps; `_serialize_children()`, `_build_ant_strings()`, `SECTION_CARD_MAP`                                  |
| `babybuddy/models.py`                        | `DASHBOARD_ITEM_CHOICES` (card registry), `UserSettings`                                                                   |
| `babybuddy/templates/babybuddy/ant_app.html` | Single HTML shell that embeds bootstrap JSON                                                                               |
| `locale/de/LC_MESSAGES/django.po`            | German translations                                                                                                        |

## Bootstrap Pattern (critical)

Every Django view returns one bootstrap dict serialized to JSON in the template. React reads it and renders the matching page.

```python
# Django view:
context["ant_bootstrap"] = {
    "pageType": "settings",          # → App.jsx router key
    "currentPath": request.path,
    "locale": "de",
    "csrfToken": get_token(request),
    "user": {"displayName": "..."},
    "urls": {**_nav_urls(), "addChild": reverse("core:child-add")},
    "strings": {**_base_strings(), "myKey": _("My string")},
    "messages": _serialize_messages(request),
    # page-specific keys: formPage, listPage, dashboard, childDetail, etc.
}
```

**`_nav_urls()` / `_build_nav_urls(request)`** — always spread into `urls`. Provides `dashboard`, `timeline`, `settings`, `logout`.
**`addChild` in `urls`** — include it on every page so the nav item stays visible.
**`_base_strings()` / `_build_ant_strings()`** — spread into `strings`. Provides common labels.

## pageType → Component Map

| pageType          | Component                             |
| ----------------- | ------------------------------------- |
| `dashboard-home`  | `DashboardHomePage` (GeneralPages)    |
| `dashboard-child` | `ChildDashboardPage` (DashboardPages) |
| `settings`        | `SettingsPage` (DashboardPages)       |
| `list`            | `ListPage` (GeneralPages)             |
| `form`            | `AntFormPage` (GeneralPages)          |
| `confirm-delete`  | `AntFormPage` with `deleteMode`       |
| `child-detail`    | `ChildDetailPage` (GeneralPages)      |
| `timeline`        | `TimelinePage` (GeneralPages)         |
| `report-list`     | `ReportListPage` (GeneralPages)       |
| `report-detail`   | `ReportDetailPage` (GeneralPages)     |
| `auth-form`       | `AntFormPage` (GeneralPages)          |
| `welcome`         | `WelcomePage` (GeneralPages)          |
| `message`         | `MessagePage` (GeneralPages)          |
| `device-access`   | `DeviceAccessPage` (GeneralPages)     |

AppShell `pageMeta` maps `pageType` to `{eyebrow, title}` shown in the top header. Set both to `null` if the page renders its own prominent heading.

## Form System

Django forms are serialized by `_serialize_bound_field()` in `core/views.py` into field objects:

```python
{ "name": "start", "type": "time", "label": "Start", "value": "14:30:00",
  "required": true, "widget": "TimeInput", "choices": [], "errors": [] }
```

React renders them via `AntFieldControl` in `app-utils.jsx`. Form state is stored as formatted strings (`"HH:mm:ss"` for time, `"YYYY-MM-DD"` for date). `HiddenFieldInput` renders the actual `<input type="hidden">` submitted to Django.

**Time parsing rule**: always use `dayjs(value, formatArray, true)` — never bare `dayjs(value)` for time strings.

## Adding a Dashboard Card

1. **`babybuddy/models.py`** — add to `DASHBOARD_ITEM_CHOICES`:
   ```python
   ("card.sleep.my_card", _("sleep - My Card")),
   ```
2. **`dashboard/views.py`** — add key to relevant section in `SECTION_CARD_MAP`
3. **`frontend/src/lib/app-utils.jsx`** — add title to `DASHBOARD_CARD_TITLES`
4. **`frontend/src/pages/DashboardPages.jsx`** — add render case in `ChildDashboardPage` card renderer; add `lg={24}` override if full-width
5. **`locale/de/LC_MESSAGES/django.po`** — add `msgid`/`msgstr` for the card label

## i18n

- All user-visible strings in Python: `_("My string")` (gettext)
- Pass strings to React via `bootstrap.strings`, never hardcode English in JSX
- German translations: `locale/de/LC_MESSAGES/django.po`
- After editing `.po` files run: `gulp compilemessages`

## Child Switcher

`_build_child_switcher(request, current_child=child)` in `core/views.py` / `reports/views.py` — returns `null` if ≤1 child, otherwise `{label, value, options[]}`. Rendered in `AppShell` header as an Ant `<Select>`.

## AppShell Nav

`navItems` in `AppShell.jsx` includes `addChild` only if `bootstrap.urls.addChild` is present. Always include it in the view's `urls` dict.

## Ant Design Theme

Dark theme. Key tokens:

- `colorPrimary`: `#4db6ff`
- `colorBgBase`: `#020617`
- `colorBgContainer`: `#0f172a`
- `colorBorder`: `#1e3a5f`
- `borderRadius`: 18

Section accent colors (`SECTION_META` in `app-utils.jsx`):

- diaper `#ff7875` · feedings `#69b1ff` · pumpings `#b37feb` · sleep `#ffd666` · tummytime `#5cdb8b`

## Commands

```bash
# Frontend
cd frontend && npm run build      # production build
cd frontend && npm run dev        # Vite dev server (HMR)

# Django
pipenv run python manage.py runserver
pipenv run python manage.py migrate
pipenv run python manage.py makemigrations
pipenv run python manage.py compilemessages

# Gulp shortcuts
gulp                  # build + runserver
gulp collectstatic
gulp format           # black + djlint + prettier
gulp lint
gulp test
```

## Conventions

- No Bootstrap/jQuery — fully removed. Ant Design only.
- All feature flags (`_ant_dashboard_enabled()` etc.) return `True` — no legacy branches.
- Static files in `babybuddy/static/` are gitignored (built artifacts). Only commit source.
- Python formatting: `black` + `djlint`. JS formatting: `prettier`.
- Commit hook via `lefthook` runs prettier — fix formatting before committing.

## Code Review Standards

After completing any implementation, review the code for:

- Functions longer than 30 lines (likely doing too much)
- Logic duplicated more than twice (extract to utility)
- Any `any` type usage in TypeScript (replace with real types)
- Components with more than 3 props that could be grouped into an object
- Missing error handling on async operations

Run /simplify before presenting code to the user.
