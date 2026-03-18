# BabyBuddy — Mobile Quick-Entry & Insights Engine

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Phase 1 of broader mobile + intelligence improvements. Health tracking and developmental milestones deferred to a later phase.

---

## Overview

Two tightly related features delivered together:

1. **Mobile Quick-Entry** — PWA experience optimized for iOS, with a bottom sheet FAB for zero-friction logging.
2. **Insights Engine** — Age-aware rule engine that surfaces patterns and recommendations, with optional LLM-powered summaries.

End goal is a publishable app, so all configuration is generic (no hardcoded homelab URLs), LLM providers are user-configurable, and PWA metadata is brand-neutral.

---

## Section 1 — PWA & iOS Integration

### PWA Manifest

- Add `manifest.json` to Django static files (`babybuddy/static/babybuddy/manifest.json`)
- Fields: `name`, `short_name`, `display: standalone`, `start_url: /`, `theme_color: #020617`, `background_color: #020617`, icon set (192×192, 512×512 PNG)
- Django injects `<link rel="manifest" href="...">` in `ant_app.html`

### iOS Meta Tags

Add to `ant_app.html` `<head>`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta
  name="apple-mobile-web-app-status-bar-style"
  content="black-translucent"
/>
<link rel="apple-touch-icon" href="..." />
```

### Service Worker

- Minimal cache-first strategy for app shell and static assets
- Scope: `/static/babybuddy/ant/` assets only
- No complex offline data sync — just fast load and blank-screen prevention
- **Serving mechanism**: `sw.js` is served by a dedicated Django view (`ServiceWorkerView`) at `/sw.js` (root scope required for full-page interception). This view renders `sw.js` as a Django template (Content-Type: `application/javascript`, `Service-Worker-Allowed: /` header set). The `/sw.js` URL is excluded from the SW's own `fetch` event handler via an explicit URL check to prevent self-interception.
- **Cache invalidation**: The rendered `sw.js` template contains `const CACHE_NAME = "babybuddy-v{{ STATIC_VERSION }}"`. `ServiceWorkerView.get()` explicitly reads `os.environ.get("BUILD_HASH", "dev")` and passes it to the template as `{"STATIC_VERSION": build_hash}`. The Django template engine substitutes it into the JS string at render time. `BUILD_HASH` is set as a Docker build arg in `Dockerfile` (`ARG BUILD_HASH` → `ENV BUILD_HASH=${BUILD_HASH}`) and passed at build time: `docker compose build --build-arg BUILD_HASH=$(git rev-parse --short HEAD)`. For dev environments without the env var, `"dev"` is used (no cache invalidation needed locally). On SW `activate`, all caches not matching `CACHE_NAME` are deleted.
- Registered from `ant_app.html` via inline script: `navigator.serviceWorker.register('/sw.js')`
- **URL registration**: `path('sw.js', ServiceWorkerView.as_view(), name='service-worker')` registered in the **root `urlconf`** (`babybuddy/urls.py` at the top level, not under any app prefix). This is required for the SW scope to cover `/` — if registered under a prefix like `/babybuddy/sw.js`, the SW can only intercept requests under `/babybuddy/`.

### Deep-Link URLs

New URL aliases that pre-select a specific log form:

| URL                 | Action                        |
| ------------------- | ----------------------------- |
| `/log/diaper/`      | Open diaper change form       |
| `/log/feeding/`     | Open feeding form             |
| `/log/sleep/start/` | Start sleep timer immediately |
| `/log/pumping/`     | Open pumping form             |
| `/log/temperature/` | Open temperature form         |
| `/log/note/`        | Open note form                |
| `/log/weight/`      | Open weight form              |

**Implementation**: Each URL maps to `QuickLogFormView`, a subclass of `AntFormMixin` (the existing mixin in `babybuddy/views.py`):

1. Determines the active child: uses `?child=<id>` query param if present; otherwise falls back to the child with the lowest `pk` among children belonging to the user. If no children exist, redirects to the add-child page.
2. Instantiates the model's Django form with `initial` values merged from URL query params: `form = ModelForm(initial={**defaults_from_querystring})`. The merge happens **before** form instantiation, so `_build_ant_form_bootstrap` receives a bound-or-unbound form with pre-populated `initial` — consistent with how `AntFormMixin.get_form_kwargs()` already works.
3. Calls `_build_ant_form_bootstrap(request, child, form)` and returns `ant_app.html` with `pageType: "form"`.

Pre-fill query params use the same field names as the Django form (e.g. `?method=bottle&amount=120`). Unknown params are silently ignored. **Merge precedence**: query params take priority over `last_used_defaults`. The view builds initial values as `{**last_used_defaults_for_child_type, **filtered_query_params}` — most-explicit source wins. **Timer-start tiles**: Sleep instant-log bypasses the form entirely (POST to `/api/quick-log/sleep/`); `QuickLogFormView` is only invoked for the long-press full-form path. For Sleep long-press, `initial` is built from `last_used_defaults` + query params as normal, but the Sleep form itself has no timer-start logic — it opens the standard Sleep form (with start/end time fields). iOS Shortcuts can bookmark these for one-tap access from the home screen.

---

## Section 2 — Bottom Sheet Quick-Entry

### Floating Action Button (FAB)

- Persistent "+" button in `AppShell.jsx`, bottom-right corner
- Respects iOS safe area: `padding-bottom: env(safe-area-inset-bottom)`
- Color: `colorPrimary` (`#4db6ff`), circular, 56px, subtle shadow

### `QuickLogSheet.jsx` Component

New component, rendered inside `AppShell`. State: `open / closed`.

**Interaction:**

- Tap "+" → sheet animates up (Ant `Drawer` with `placement="bottom"`, or custom CSS transition)
- Tap backdrop → dismiss
- Swipe down → dismiss

**Layout inside sheet:**

- Handle bar at top
- Two rows of 4 action tiles each:
  - Row 1: Diaper · Feed · Sleep · Pump
  - Row 2: Temp · Timer · Note · Weight
- Status strip at bottom: last event per category ("Diaper 45m ago · Fed 2h · Sleeping 23m"). **Data source**: the strip data is passed from `AppShell` via a `quickStatus` prop injected by the dashboard bootstrap (`bootstrap.quickStatus`). Non-dashboard pages do not include `quickStatus` → the strip is simply hidden when the prop is absent. The `ChildDashboardView` bootstrap is extended with: `"quickStatus": {"lastDiaper": "45m ago", "lastFeeding": "2h ago", "activeSleep": "23m"}`. This is a minor addition to the existing dashboard view serialization.

**Two interaction modes:**

- **Single tap** → instant log with smart defaults, toast confirmation ("Diaper logged ✓"), sheet stays open for follow-on logs
- **Long-press (500ms)** → navigate to full detail form, sheet closes

### Smart Defaults

- `last_used_defaults` JSON field added to `UserSettings` model (Django `JSONField`, default `{}`)
- Structure: keyed by `"<child_id>.<entry_type>"` to support multi-child households:
  ```json
  {
    "1.feeding": { "method": "bottle", "amount": 120, "breast_milk": false },
    "1.diaper": { "wet": true, "solid": false },
    "1.pumping": { "amount": null }
  }
  ```
- Updated on every successful quick-log POST: merge incoming saved values into the existing dict, then `save(update_fields=["last_used_defaults"])`. **Concurrency**: this is a read-modify-write without locking. For Phase 1 (single-user homelab), concurrent quick-log posts by the same user are not a realistic scenario, so no locking is required. This is explicitly deferred — a future multi-user version would replace this with `select_for_update()` or a `JSONField` update via `F()` expression.
- Pre-fills the instant log payload and the detail form's initial values via `buildInitialFormState`

### Instant Log Django Endpoint

`POST /api/quick-log/<entry_type>/` — plain Django view (no DRF), session-authenticated, CSRF-protected via the token already embedded in every bootstrap as `bootstrap.csrfToken`. The React FAB reads this token and sends it as the `X-CSRFToken` header. Returns JSON `{"status": "ok", "entry_id": ...}` on success or `{"status": "error", "errors": [...]}` on failure. The view deserializes the request body, applies smart defaults merged with any supplied overrides, and saves via the existing model's `save()`.

**Quick-entry tile types (exactly 8):**

| Tile   | Model          | Default fields applied                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Diaper | `DiaperChange` | wet=true, solid=false                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Feed   | `Feeding`      | method from last_used_defaults                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Sleep  | `Timer`        | creates a new open-ended `Timer` (name="Sleep", `start=now`, `end=None`); does NOT create a `Sleep` record directly — the user ends it from the dashboard timer card. **Active timer conflict**: before creating, the view checks `Timer.objects.filter(child=child, name="Sleep", end=None).exists()`. If an active sleep timer already exists, the endpoint returns `{"status": "error", "errors": ["Sleep timer already active"]}` with HTTP 409 — no new timer created. The React tile shows a visual indicator (pulsing dot) when `bootstrap.quickStatus.activeSleep` is non-null, signalling the timer is running. **Smart defaults**: Sleep is excluded from `last_used_defaults` — a Timer has no meaningful user-configurable default fields to remember. |
| Pump   | `Pumping`      | duration/amount blank, timer started                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Temp   | `Temperature`  | no default value, opens full form                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Timer  | `Timer`        | generic timer, name blank                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Note   | `Note`         | opens full form (no sensible default)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Weight | `Weight`       | opens full form (no sensible default)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Single-tap for Temp, Note, and Weight navigates to the full form (same as long-press) since no useful default exists.

---

## Section 3 — Insights Engine

### `core/insights.py` — Rule Engine

Pure Python module, no ORM imports at module level (importable without Django setup for testing).

**Data structures:**

```python
@dataclass
class Insight:
    id: str          # format: "{child_id}.{rule_name}.{YYYY-MM-DD}", e.g. "3.sleep_short_naps.2026-03-18"
    severity: str    # "info" | "warning" | "alert"
    category: str    # "sleep" | "feeding" | "diaper" | "growth"
    title: str
    body: str
    action_label: str | None
    action_url: str | None
```

**Insight ID format**: `f"{child.id}.{rule_name}.{date.today().isoformat()}"` where `rule_name` is the snake_case name of the rule function (e.g. `sleep_short_naps`). Including `child.id` prevents cross-child dismissal collisions. Day granularity means the same recurring condition resurfaces after midnight with a new ID suffix, overriding the previous day's dismissal.

**Age stages** (derived from `child.birth_date`):

- `newborn`: 0–12 weeks
- `infant`: 3–12 months
- `toddler`: 1–3 years
- `child`: 3+ years

**Rule registry:** Dict mapping stage → list of rule functions. Each rule function signature:

```python
def rule_name(child, data: dict) -> list[Insight]: ...
```

**`data` dict** — assembled by `build_insights_data(child)` in `core/insights.py` (one ORM-aware function, called by views). Returns:

```python
{
  # Raw querysets (evaluated once, passed to all rules)
  "feedings_24h":  Feeding.objects.filter(child=child, start__gte=now-24h),
  "feedings_7d":   Feeding.objects.filter(child=child, start__gte=now-7d),
  "sleeps_24h":    Sleep.objects.filter(child=child, start__gte=now-24h),
  "sleeps_7d":     Sleep.objects.filter(child=child, start__gte=now-7d),
  "diapers_24h":   DiaperChange.objects.filter(child=child, time__gte=now-24h),
  # Convenience last-event objects (None if no data)
  "last_feeding":  Feeding.objects.filter(child=child).order_by("-start").first(),
  "last_sleep":    Sleep.objects.filter(child=child).order_by("-start").first(),
  "last_diaper":   DiaperChange.objects.filter(child=child).order_by("-time").first(),
  # Pre-computed aggregates (Python floats / timedelta, None if insufficient data)
  "avg_feeding_interval_7d":  timedelta | None,   # mean gap between feeding start times
  "avg_sleep_duration_7d":    timedelta | None,   # mean of Sleep.duration for completed sleeps
  "avg_nap_count_7d":         float | None,       # mean naps per day (sleeps ending before 19:00)
  "avg_nap_duration_prev_7d": timedelta | None,   # prior 7-day avg for comparison rules
  "total_sleep_24h":          timedelta | None,   # sum of Sleep.duration in last 24h
}
```

`build_insights_data` is the only function in `core/insights.py` that imports from Django ORM. Rule functions receive the pre-built dict and perform only Python-level comparisons — no additional DB queries.

**Example rules (non-exhaustive):**

| Stage   | Rule                                     | Severity |
| ------- | ---------------------------------------- | -------- |
| newborn | No feeding in 3h+ daytime                | alert    |
| newborn | <8 feedings in last 24h                  | warning  |
| infant  | Nap duration down 25%+ vs last week      | warning  |
| infant  | Night wake count up 30%+ vs last week    | info     |
| toddler | Bedtime shifted 45+ min vs 7-day avg     | info     |
| all     | No diaper in 8h+                         | warning  |
| all     | Sleep total >3h below age recommendation | warning  |

### Computation & Caching

- Called from `dashboard/views.py` in both `ChildDashboardView` and `ChildInsightsView`
- Results cached 5 min per child: `cache.get/set(f"insights_{child.id}", ...)`
- Uses Django's built-in cache framework. **Cache backend**: `LocMemCache` (Django default) is acceptable — a container restart clears the cache and the first page load recomputes. No Redis required for Phase 1.
- **`ChildDashboardView` change**: The existing dashboard bootstrap is extended with an `insights` key containing the serialized insight list. The banner React component reads from `bootstrap.insights` (already available at page load — no separate fetch). Cold-start (cache miss): insights computed inline, adds ~50ms. If `insights` is an empty list, the banner is not rendered.
- **`ChildInsightsView`**: Same computation, no caching shortcut needed (this view IS the insights page, so fresh data is appropriate; it still benefits from the 5-min cache if visited soon after the dashboard).

### Dashboard Banner

- If any `alert` or `warning` insights exist, a dismissable banner renders at the top of the child dashboard
- Dismissed state: `localStorage` key `dismissed_insights_<child_id>`, stores a list of insight IDs with ISO-date timestamps: `[{"id": "sleep.short_naps.2026-03-18", "dismissedAt": "2026-03-18T10:00:00Z"}]`
- **Dismissal TTL**: 24 hours. After 24h, any re-appearing insight (same ID prefix, new date suffix) is treated as new. This ensures recurring issues are not silently hidden.
- Insight IDs use date granularity (day-level), so the same condition on a new calendar day resurfaces naturally.
- Banner shows count + highest-severity color (`#ff7875` for alert, `#ffd666` for warning), links to Insights page

### Insights Page

- New `pageType: "insights"` in React router (`App.jsx`)
- New `InsightsPage` component in `InsightsPages.jsx`
- New Django view in `dashboard/views.py`: `ChildInsightsView`
- **URL**: `path('children/<int:pk>/insights/', ChildInsightsView.as_view(), name='child-insights')` registered in `core/urls.py` alongside other child-detail URLs
- **Navigation entry point**: Link added to the child dashboard page ("View all insights" link on the dashboard banner, and a nav item or button on the child detail page). The URL is included in `bootstrap.urls.insights` on every page that includes a child context.
- Layout: insights grouped by category (Sleep, Feeding, Diaper, Growth), each as a card with title, body, optional action button
- Empty state: "No issues detected — everything looks on track."

**Bootstrap shape:**

```python
{
  "pageType": "insights",
  "child": { "id": ..., "name": ..., "ageWeeks": ... },
  "insights": [
    { "id": "...", "severity": "warning", "category": "sleep",
      "title": "...", "body": "...", "actionLabel": null, "actionUrl": null }
  ],
  "strings": { ... },
  "urls": { ... }
}
```

### LLM Integration

**Provider config** (new fields on `UserSettings`):

- `llm_provider`: choices `none / ollama / openai / anthropic` (default: `none`)
- `llm_model`: free text (e.g. `llama3`, `gpt-4o`, `claude-sonnet-4-6`)
- `llm_base_url`: for Ollama, e.g. `http://localhost:11434`
- `llm_api_key`: `CharField(max_length=500, blank=True, default="")`. Stored as plaintext in Phase 1 (single-user homelab, same trust boundary as the DB). **Acknowledged tradeoff**: acceptable for self-hosted single-user deployments. Before public release, replace with an encrypted field (e.g. `django-encrypted-fields`). The Settings page displays it masked (`sk-...xxxx` — show only last 4 chars, or blank placeholder if empty). The admin displays it unmasked (acceptable since admin is superuser-only).

**`core/llm.py`** — provider-agnostic client:

```python
def generate_summary(provider, model, base_url, api_key, context: str) -> Generator[str, None, None]:
    """Yields raw text chunks (strings). Does NOT yield SSE-formatted lines.
    Raises LLMError(message: str) on configuration errors (bad key, unreachable host).
    Each yielded value is a plain text fragment (e.g. "The baby" → " slept" → " well.").
    """
```

- Ollama: `POST /api/generate` (streaming JSON, extract `response` field per line)
- OpenAI-compatible: chat completions streaming, extract `choices[0].delta.content`
- Anthropic: Messages API streaming, extract `delta.text` from `content_block_delta` events

**SSE formatting** is the responsibility of the Django view (`InsightsSummaryView`), not `core/llm.py`:

```python
# In InsightsSummaryView:
def stream():
    try:
        for chunk in generate_summary(...):
            yield f"data: {json.dumps(chunk)}\n\n"
        yield "event: done\ndata: \n\n"
    except LLMError as e:
        yield f"event: error\ndata: {json.dumps(str(e))}\n\n"

return StreamingHttpResponse(stream(), content_type="text/event-stream")
```

**React EventSource handler**:

- `es.onmessage` → parse `JSON.parse(event.data)`, append to modal text
- `es.addEventListener('done', ...)` → close `EventSource`, mark complete
- `es.addEventListener('error', ...)` → show error message from `event.data`, close
- `es.onerror` (network-level) → show generic "Connection lost" message, close

**"Ask AI" button** on Insights page:

- Only shown if `llm_provider != "none"`
- `GET /api/insights/summary/?child=<child_id>` — GET is the **final decision**, required for native `EventSource` compatibility. `EventSource` does not support custom headers, so CSRF tokens cannot be sent. **Auth**: `@login_required` (session cookie check only). **CSRF**: Django's `CsrfViewMiddleware` only checks the CSRF token for "unsafe" HTTP methods (POST, PUT, PATCH, DELETE) — GET is a safe method and is not checked by the middleware (see Django source: `REASON_NO_CSRF_COOKIE` check is skipped for safe methods). The view must be decorated with `@csrf_exempt` explicitly anyway as a belt-and-suspenders measure, to protect against misconfigured middleware or future wrapping that might re-enable CSRF enforcement. Decorator order: `@login_required` wraps `@csrf_exempt`. This endpoint must never be changed to POST — if needed, switch to `fetch()` + `ReadableStream`.
- Django view calls rule engine, formats structured context via `build_llm_context()`, calls `core/llm.py`, and streams response as `text/event-stream` with `data: <chunk>\n\n` framing. Final chunk sends `event: done\ndata: \n\n` to signal completion.
- React uses the native `EventSource` API: `new EventSource('/api/insights/summary/?child=X')`. On `message` event, appends chunk to modal text. On `done` event (via `es.addEventListener('done', ...)`), closes `EventSource`. On `error`, shows error state.
- No third-party streaming library needed.

**Context construction** — `build_llm_context(child, data, insights) -> str` in `core/insights.py`. Assembles a plain-text prompt from the `data` dict and the insights list. The function caps context length at ~1500 tokens by limiting raw data lines. Template:

```
Child: {child.first_name}, {age_weeks} weeks old ({age_stage})
Period: last 7 days

Logged data summary:
- Feedings per day (avg): {feedings_per_day:.1f}  (age guideline: {guideline})
- Total sleep per day (avg): {total_sleep_h:.1f}h  (age guideline: {guideline})
- Nap count per day (avg): {nap_count:.1f}  (age guideline: {guideline})
- Last feeding: {last_feeding_ago}
- Last diaper: {last_diaper_ago}

Current insights:
{for insight in insights: "- [{severity}] {insight.title}: {insight.body}"}

You are a helpful assistant for new parents. Provide a brief (3-5 sentence), warm, reassuring
summary of this data and one concrete, evidence-based suggestion. Do not diagnose or replace
medical advice. If data is sparse, acknowledge that and suggest logging more consistently.
```

This context string is passed directly to `generate_summary()`.

---

## Architecture Notes

### Existing patterns followed

- New Django views use the same `ant_bootstrap` context pattern
- New React pages use the same `pageType` routing in `App.jsx`
- LLM config goes through the existing Settings page form system
- `core/insights.py` is callable from views only — no signals, no background tasks in Phase 1

### Extensibility hooks (for future Phase 2)

- Rules are registered in a dict — adding new rules requires no changes to the engine
- `core/llm.py` is provider-agnostic — adding new providers is additive
- Insight IDs are stable strings — future DB persistence is a straightforward migration

### What this does NOT include (deferred)

- Push notifications (requires VAPID keys, service worker background sync — Phase 2)
- Event-driven real-time insight recomputation (Celery/Django-Q — Phase 2)
- Health event tracking (illnesses, medications, doctor visits — separate spec)
- Developmental milestones (separate spec)
- Growth percentile charts on the insights page (data model exists, UI deferred)

---

## Files Changed / Created

### New files

| Path                                        | Purpose                |
| ------------------------------------------- | ---------------------- |
| `babybuddy/static/babybuddy/manifest.json`  | PWA manifest           |
| `babybuddy/static/babybuddy/sw.js`          | Service worker         |
| `core/insights.py`                          | Rule engine            |
| `core/llm.py`                               | LLM provider client    |
| `frontend/src/components/QuickLogSheet.jsx` | Bottom sheet component |
| `frontend/src/pages/InsightsPages.jsx`      | Insights page          |

### Modified files

| Path                                         | Change                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `babybuddy/templates/babybuddy/ant_app.html` | PWA meta tags, manifest link, SW registration                                                      |
| `babybuddy/models.py`                        | `last_used_defaults`, `llm_provider`, `llm_model`, `llm_base_url`, `llm_api_key` on `UserSettings` |
| `babybuddy/urls.py`                          | Deep-link URL aliases, quick-log API endpoint, insights summary endpoint                           |
| `core/views.py`                              | Quick-log API view                                                                                 |
| `dashboard/views.py`                         | `ChildInsightsView`, insights data in `ChildDashboardPage` bootstrap                               |
| `frontend/src/App.jsx`                       | Add `insights` pageType route                                                                      |
| `frontend/src/components/AppShell.jsx`       | FAB button, `QuickLogSheet` render                                                                 |
| `babybuddy/views.py`                         | LLM settings fields in settings bootstrap                                                          |
