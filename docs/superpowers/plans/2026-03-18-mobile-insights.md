# Mobile Quick-Entry & Insights Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA/iOS integration, a bottom-sheet quick-entry FAB, and an age-aware insights engine with optional LLM summaries to BabyBuddy.

**Architecture:** Three independent phases building on each other: (1) PWA shell — service worker with versioned cache, manifest shortcuts for deep-links; (2) Quick-Entry — instant-log Django endpoint + React bottom sheet with 8 tiles; (3) Insights — pure Python rule engine, dashboard banner, dedicated insights page, optional streaming LLM summary.

**Tech Stack:** Django 4.x, React 18 + Vite + Ant Design, Django JSONField, Django cache framework (LocMemCache), Python dataclasses, native EventSource API, `http.client` / `urllib` (or `requests` already in Pipfile) for LLM HTTP calls.

---

## Existing State (read before touching anything)

- `babybuddy/templates/babybuddy/ant_base.html` — already has iOS meta tags, manifest link, and `navigator.serviceWorker.register('/sw.js')`. No URL currently serves `/sw.js`.
- `babybuddy/static/babybuddy/root/sw.js` — existing static service worker (hardcoded `CACHE = "babybuddy-v2"`). No Django template versioning yet.
- `babybuddy/static_src/root/site.webmanifest` — existing manifest; gulp copies it to `babybuddy/static/babybuddy/root/`.
- `babybuddy/models.py` — Settings model (note: class is called `Settings`, not `UserSettings`). Has JSONField fields already.
- `dashboard/views.py` — `ChildDashboard` view builds bootstrap at line ~769.
- `core/urls.py`, `dashboard/urls.py`, `babybuddy/urls.py` — URL namespaces.

---

## File Map

### New Files

| Path                                        | Purpose                                                   |
| ------------------------------------------- | --------------------------------------------------------- |
| `babybuddy/templates/babybuddy/sw.js`       | Service worker template (Django injects `STATIC_VERSION`) |
| `core/insights.py`                          | Rule engine + `build_insights_data` + `build_llm_context` |
| `core/llm.py`                               | Provider-agnostic LLM streaming client                    |
| `core/tests/test_insights.py`               | Unit tests for insights rule engine                       |
| `core/tests/test_quick_log.py`              | Unit tests for quick-log endpoint                         |
| `frontend/src/components/QuickLogSheet.jsx` | FAB + bottom sheet + 8 tiles                              |
| `frontend/src/pages/InsightsPages.jsx`      | Insights page + LLM summary modal                         |

### Modified Files

| Path                                         | Change                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `babybuddy/static_src/root/site.webmanifest` | Update theme_color, add deep-link shortcuts                                                        |
| `babybuddy/static/babybuddy/root/sw.js`      | Delete (replaced by Django template view)                                                          |
| `babybuddy/models.py`                        | Add `last_used_defaults`, `llm_provider`, `llm_model`, `llm_base_url`, `llm_api_key` to `Settings` |
| `babybuddy/urls.py`                          | Add `sw.js`, deep-link, quick-log, insights-summary URLs                                           |
| `babybuddy/views.py`                         | Add `ServiceWorkerView`, `QuickLogFormView`; extend settings bootstrap with LLM fields             |
| `core/views.py`                              | Add `QuickLogView` (POST instant-log API)                                                          |
| `core/urls.py`                               | Add `children/<int:pk>/insights/` URL                                                              |
| `dashboard/views.py`                         | Add `ChildInsightsView`; extend `ChildDashboard` bootstrap with `insights` + `quickStatus`         |
| `frontend/src/App.jsx`                       | Add `insights` pageType route                                                                      |
| `frontend/src/components/AppShell.jsx`       | Add FAB + `QuickLogSheet` render                                                                   |
| `frontend/src/pages/DashboardPages.jsx`      | Add insights banner to child dashboard                                                             |

---

## Phase 1 — PWA & iOS Integration

### Task 1: ServiceWorkerView — serve `/sw.js` as a versioned Django template

**Files:**

- Create: `babybuddy/templates/babybuddy/sw.js`
- Modify: `babybuddy/views.py` (add `ServiceWorkerView`)
- Modify: `babybuddy/urls.py` (add `sw.js` URL before `urlpatterns`)
- Delete: `babybuddy/static/babybuddy/root/sw.js`

- [ ] **Step 1: Write the failing test**

```python
# babybuddy/tests/tests_views.py — add inside ViewsTestCase:
def test_service_worker_is_served(self):
    response = self.c.get("/sw.js")
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response["Content-Type"], "application/javascript")
    self.assertIn("Service-Worker-Allowed", response)
    self.assertIn(b"CACHE_NAME", response.content)

def test_service_worker_cache_name_uses_build_hash(self):
    import os
    from unittest.mock import patch
    with patch.dict(os.environ, {"BUILD_HASH": "abc123"}):
        response = self.c.get("/sw.js")
    self.assertIn(b"babybuddy-vabc123", response.content)
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  babybuddy.tests.tests_views.ViewsTestCase.test_service_worker_is_served -v 2
```

Expected: 404 (no URL exists yet)

- [ ] **Step 3: Create the sw.js Django template**

`babybuddy/templates/babybuddy/sw.js`:

```javascript
// BabyBuddy Service Worker
const CACHE_NAME = "babybuddy-v{{ STATIC_VERSION }}";
const SW_URL = "/sw.js";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add("/login/").catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Prevent self-interception
  if (url.pathname === SW_URL) return;

  // API calls: always network
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache-first
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, response.clone()));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // HTML navigation: network-first with offline fallback
  if (
    request.mode === "navigate" ||
    request.headers.get("Accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const login = await caches.match("/login/");
          if (login) return login;
          return new Response("App is offline. Please reconnect.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }),
    );
  }
});
```

- [ ] **Step 4: Add `ServiceWorkerView` to `babybuddy/views.py`**

Add after existing imports, before the class definitions (alongside other views):

```python
import os
from django.http import HttpResponse
from django.template import loader as template_loader
from django.views.decorators.cache import never_cache

class ServiceWorkerView(View):
    @method_decorator(never_cache)
    def get(self, request):
        build_hash = os.environ.get("BUILD_HASH", "dev")
        template = template_loader.get_template("babybuddy/sw.js")
        content = template.render({"STATIC_VERSION": build_hash})
        response = HttpResponse(content, content_type="application/javascript")
        response["Service-Worker-Allowed"] = "/"
        return response
```

- [ ] **Step 5: Register URL in `babybuddy/urls.py`**

Add at the top of `urlpatterns` (before `admin/`):

```python
from .views import ServiceWorkerView

urlpatterns = [
    path("sw.js", ServiceWorkerView.as_view(), name="service-worker"),
    path("admin/", admin.site.urls),
    # ... rest unchanged
]
```

- [ ] **Step 6: Delete the static sw.js that was served from the wrong path**

```bash
rm babybuddy/static/babybuddy/root/sw.js
```

The `ant_base.html` already has `navigator.serviceWorker.register('/sw.js')` — no change needed there.

- [ ] **Step 7: Run tests to confirm they pass**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  babybuddy.tests.tests_views.ViewsTestCase.test_service_worker_is_served \
  babybuddy.tests.tests_views.ViewsTestCase.test_service_worker_cache_name_uses_build_hash -v 2
```

Expected: PASS

- [ ] **Step 8: Format and commit**

```bash
cd /path/to/babybuddy
pipenv run black babybuddy/views.py babybuddy/urls.py
git add babybuddy/templates/babybuddy/sw.js babybuddy/views.py babybuddy/urls.py
git rm babybuddy/static/babybuddy/root/sw.js
git add babybuddy/tests/tests_views.py
git commit -m "feat: serve /sw.js via Django view with BUILD_HASH cache versioning"
git push
```

---

### Task 2: Update PWA manifest with dark theme and deep-link shortcuts

**Files:**

- Modify: `babybuddy/static_src/root/site.webmanifest`
- Run: `gulp extras` to copy to static

- [ ] **Step 1: Update `babybuddy/static_src/root/site.webmanifest`**

Replace the entire file:

```json
{
  "name": "Baby Buddy",
  "short_name": "Baby Buddy",
  "icons": [
    {
      "src": "android-chrome-192x192.png?v=20260306",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "android-chrome-512x512.png?v=20260306",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "lang": "en-US",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#020617",
  "background_color": "#020617",
  "shortcuts": [
    { "name": "Log Diaper", "url": "/log/diaper/" },
    { "name": "Log Feeding", "url": "/log/feeding/" },
    { "name": "Start Sleep", "url": "/log/sleep/start/" },
    { "name": "Log Pumping", "url": "/log/pumping/" },
    { "name": "Log Temperature", "url": "/log/temperature/" },
    { "name": "Log Note", "url": "/log/note/" },
    { "name": "Log Weight", "url": "/log/weight/" }
  ]
}
```

- [ ] **Step 2: Copy to static**

```bash
npx gulp extras
```

- [ ] **Step 3: Commit**

```bash
git add babybuddy/static_src/root/site.webmanifest babybuddy/static/babybuddy/root/site.webmanifest
git commit -m "feat: update PWA manifest with dark theme and deep-link shortcuts"
git push
```

---

### Task 3: Deep-link form views for `/log/<type>/`

**Files:**

- Modify: `babybuddy/views.py` (add `QuickLogFormView`)
- Modify: `babybuddy/urls.py` (add deep-link URL patterns)

The spec says `QuickLogFormView` subclasses `AntFormMixin`. Read `_build_ant_form_bootstrap` in `babybuddy/views.py` first to confirm its signature before writing code.

- [ ] **Step 1: Write the failing test**

```python
# babybuddy/tests/tests_views.py — add inside ViewsTestCase:
def test_deep_link_diaper(self):
    # requires at least one child (fake() creates some)
    response = self.c.get("/log/diaper/")
    self.assertEqual(response.status_code, 200)
    bootstrap = _bootstrap_payload(response)
    self.assertIsNotNone(bootstrap)
    self.assertEqual(bootstrap["pageType"], "form")

def test_deep_link_unknown_type_returns_404(self):
    response = self.c.get("/log/unknowntype/")
    self.assertEqual(response.status_code, 404)

def test_deep_link_no_children_redirects(self):
    # Create a user with no children
    from django.contrib.auth import get_user_model
    User = get_user_model()
    childless_user = User.objects.create_user(username="childless", password="testpass")
    c2 = HttpClient()
    c2.login(username="childless", password="testpass")
    response = c2.get("/log/diaper/")
    self.assertEqual(response.status_code, 302)
    self.assertIn("/children/add/", response["Location"])
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  babybuddy.tests.tests_views.ViewsTestCase.test_deep_link_diaper -v 2
```

Expected: 404

- [ ] **Step 3: Implement `QuickLogFormView` in `babybuddy/views.py`**

Add after `ServiceWorkerView`. The view maps entry type names to existing add view classes (reusing their forms):

```python
from core import models as core_models, forms as core_forms

_QUICK_LOG_FORM_MAP = {
    "diaper": {
        "form_class": core_forms.DiaperChangeForm,
        "title": "Log Diaper Change",
        "submit_url_name": "core:diaperchange-add",
    },
    "feeding": {
        "form_class": core_forms.FeedingForm,
        "title": "Log Feeding",
        "submit_url_name": "core:feeding-add",
    },
    "sleep": {
        "form_class": core_forms.SleepForm,
        "title": "Log Sleep",
        "submit_url_name": "core:sleep-add",
    },
    "pumping": {
        "form_class": core_forms.PumpingForm,
        "title": "Log Pumping",
        "submit_url_name": "core:pumping-add",
    },
    "temperature": {
        "form_class": core_forms.TemperatureForm,
        "title": "Log Temperature",
        "submit_url_name": "core:temperature-add",
    },
    "note": {
        "form_class": core_forms.NoteForm,
        "title": "Log Note",
        "submit_url_name": "core:note-add",
    },
    "weight": {
        "form_class": core_forms.WeightForm,
        "title": "Log Weight",
        "submit_url_name": "core:weight-add",
    },
}


class QuickLogFormView(LoginRequiredMixin, View):
    """
    Deep-link form pre-populated with smart defaults. Maps /log/<type>/ to the
    existing Django form for that entry type, rendered via ant_app.html.
    """

    def get(self, request, entry_type, **kwargs):
        config = _QUICK_LOG_FORM_MAP.get(entry_type)
        if config is None:
            from django.http import Http404
            raise Http404

        # Resolve the active child
        child = self._get_child(request)
        if child is None:
            return redirect(reverse("core:child-add"))

        # Merge smart defaults with query params (query params win)
        user_settings = request.user.settings
        defaults_key = f"{child.id}.{entry_type}"
        last_defaults = getattr(user_settings, "last_used_defaults", {}) or {}
        base_defaults = last_defaults.get(defaults_key, {})
        allowed_params = {
            k: v for k, v in request.GET.items() if k not in ("child",)
        }
        initial = {**base_defaults, **allowed_params, "child": child.id}

        form = config["form_class"](initial=initial)
        cancel_url = reverse("dashboard:dashboard-child", kwargs={"slug": child.slug})
        bootstrap = _build_ant_form_bootstrap(
            request,
            title=config["title"],
            kicker="Quick Entry",
            form=form,
            submit_label="Save",
            cancel_url=cancel_url,
        )
        # Override the form action URL so it POSTs to the correct add view,
        # not to /log/<type>/ (which only handles GET).
        bootstrap["urls"]["self"] = reverse(config["submit_url_name"])
        return render(request, "babybuddy/ant_app.html", {"ant_bootstrap": bootstrap})

    def _get_child(self, request):
        child_id = request.GET.get("child")
        if child_id:
            try:
                return core_models.Child.objects.get(pk=child_id)
            except core_models.Child.DoesNotExist:
                pass
        return core_models.Child.objects.order_by("pk").first()
```

> **Note:** Check `_build_ant_form_bootstrap` signature in `babybuddy/views.py` before writing — it accepts `action_url` only if that kwarg exists; if not, pass a custom `submit_url` via `formPage` override or subclass as needed. If `action_url` is not a supported kwarg, pass the form with `form.Meta.submit_url` or use the existing URL from the add view.

- [ ] **Step 4: Add URL patterns to `babybuddy/urls.py`**

Add directly to `urlpatterns` (the top-level list, alongside `admin/`). Register the specific `sleep/start/` URL **before** the generic `<str:entry_type>/` pattern so Django matches it first:

```python
urlpatterns = [
    path("sw.js", ServiceWorkerView.as_view(), name="service-worker"),
    # Deep-link form shortcuts — specific before generic
    path("log/sleep/start/", views.QuickLogFormView.as_view(),
         {"entry_type": "sleep"}, name="quick-log-sleep-start"),
    path("log/<str:entry_type>/", views.QuickLogFormView.as_view(), name="quick-log-form"),
    path("admin/", admin.site.urls),
    # ... rest unchanged
]
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  babybuddy.tests.tests_views.ViewsTestCase.test_deep_link_diaper \
  babybuddy.tests.tests_views.ViewsTestCase.test_deep_link_unknown_type_returns_404 \
  babybuddy.tests.tests_views.ViewsTestCase.test_deep_link_no_children_redirects -v 2
```

Expected: PASS

- [ ] **Step 6: Format and commit**

```bash
pipenv run black babybuddy/views.py babybuddy/urls.py
git add babybuddy/views.py babybuddy/urls.py babybuddy/tests/tests_views.py
git commit -m "feat: add deep-link form views for /log/<type>/ quick entry"
git push
```

---

## Phase 2 — Bottom Sheet Quick-Entry

### Task 4: Add `last_used_defaults` field to `Settings` model + migration

**Files:**

- Modify: `babybuddy/models.py`
- Create: migration (auto-generated)

- [ ] **Step 1: Write the failing test**

```python
# babybuddy/tests/tests_models.py — add to existing test class or new class:
class SettingsLastUsedDefaultsTest(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        self.user = get_user_model().objects.create_user(
            username="testdefaults", password="pass"
        )

    def test_last_used_defaults_default_is_empty_dict(self):
        settings = self.user.settings
        self.assertEqual(settings.last_used_defaults, {})

    def test_last_used_defaults_stores_and_retrieves(self):
        settings = self.user.settings
        settings.last_used_defaults = {"1.feeding": {"method": "bottle", "amount": 120}}
        settings.save(update_fields=["last_used_defaults"])
        settings.refresh_from_db()
        self.assertEqual(settings.last_used_defaults["1.feeding"]["method"], "bottle")
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  babybuddy.tests.tests_models -v 2
```

Expected: AttributeError / column does not exist

- [ ] **Step 3: Add field to `babybuddy/models.py`**

In the `Settings` class, after `dashboard_hidden_sections`:

```python
last_used_defaults = models.JSONField(
    default=dict,
    blank=True,
    verbose_name=_("Last used quick-entry defaults"),
)
```

- [ ] **Step 4: Generate and run migration**

```bash
pipenv run python manage.py makemigrations babybuddy --settings=babybuddy.settings.base
pipenv run python manage.py migrate --settings=babybuddy.settings.test
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  babybuddy.tests.tests_models -v 2
```

Expected: PASS

- [ ] **Step 6: Format and commit**

```bash
pipenv run black babybuddy/models.py
git add babybuddy/models.py babybuddy/migrations/
git add babybuddy/tests/tests_models.py
git commit -m "feat: add last_used_defaults JSONField to Settings model"
git push
```

---

### Task 5: Instant log API endpoint — `POST /api/quick-log/<entry_type>/`

**Files:**

- Modify: `core/views.py` (add `QuickLogView`)
- Modify: `babybuddy/urls.py` (add URL)
- Create: `core/tests/test_quick_log.py`

- [ ] **Step 1: Write the failing tests**

```python
# core/tests/test_quick_log.py
import json
from django.contrib.auth import get_user_model
from django.test import TestCase, Client as HttpClient
from django.utils import timezone
from faker import Faker
from core import models


class QuickLogViewTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from django.core.management import call_command
        call_command("migrate", verbosity=0)
        fake = Faker()
        fake_profile = fake.simple_profile()
        cls.credentials = {"username": fake_profile["username"], "password": fake.password()}
        cls.user = get_user_model().objects.create_user(is_superuser=True, **cls.credentials)
        cls.child = models.Child.objects.create(
            first_name="Test", last_name="Child",
            birth_date=timezone.localdate() - timezone.timedelta(days=90),
        )
        cls.c = HttpClient(enforce_csrf_checks=False)
        cls.c.login(**cls.credentials)

    def _post(self, entry_type, data):
        return self.c.post(
            f"/api/quick-log/{entry_type}/",
            data=json.dumps(data),
            content_type="application/json",
        )

    def test_diaper_quick_log_creates_record(self):
        count_before = models.DiaperChange.objects.count()
        response = self._post("diaper", {"child": self.child.id, "wet": True, "solid": False})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data["status"], "ok")
        self.assertIn("entry_id", data)
        self.assertEqual(models.DiaperChange.objects.count(), count_before + 1)

    def test_feeding_quick_log_updates_last_used_defaults(self):
        response = self._post("feeding", {
            "child": self.child.id,
            "type": "breast milk",
            "method": "bottle",
            "start": timezone.now().isoformat(),
            "end": (timezone.now() + timezone.timedelta(minutes=10)).isoformat(),
        })
        self.assertEqual(response.status_code, 200)
        self.user.settings.refresh_from_db()
        key = f"{self.child.id}.feeding"
        self.assertIn(key, self.user.settings.last_used_defaults)
        self.assertEqual(self.user.settings.last_used_defaults[key]["method"], "bottle")

    def test_sleep_timer_creates_timer(self):
        count_before = models.Timer.objects.count()
        response = self._post("sleep", {"child": self.child.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Timer.objects.count(), count_before + 1)
        timer = models.Timer.objects.filter(child=self.child, name="Sleep", end=None).first()
        self.assertIsNotNone(timer)

    def test_sleep_timer_conflict_returns_409(self):
        # Create existing active sleep timer
        models.Timer.objects.create(
            child=self.child, user=self.user, name="Sleep", start=timezone.now(), end=None
        )
        response = self._post("sleep", {"child": self.child.id})
        self.assertEqual(response.status_code, 409)
        data = json.loads(response.content)
        self.assertEqual(data["status"], "error")

    def test_unknown_type_returns_404(self):
        response = self._post("unicorn", {"child": self.child.id})
        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_returns_302(self):
        anon = HttpClient()
        response = anon.post("/api/quick-log/diaper/", content_type="application/json",
                             data=json.dumps({}))
        self.assertEqual(response.status_code, 302)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  core.tests.test_quick_log -v 2
```

Expected: 404 (no URL)

- [ ] **Step 3: Implement `QuickLogView` in `core/views.py`**

Add at the bottom of `core/views.py` before the last import block:

```python
import json as _json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator


_QUICK_LOG_DEFAULTS_FIELDS = {
    "feeding": ["type", "method", "amount"],
    "diaper": ["wet", "solid", "color"],
    "pumping": ["amount"],
}

_QUICK_LOG_INSTANT_TYPES = {"diaper", "feeding", "pumping", "timer"}
_QUICK_LOG_FORM_ONLY_TYPES = {"temperature", "note", "weight"}


@method_decorator(login_required, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class QuickLogView(View):
    """
    POST /api/quick-log/<entry_type>/
    Instant-log endpoint. Returns JSON {"status": "ok", "entry_id": N} or
    {"status": "error", "errors": [...]}.
    """

    def post(self, request, entry_type, **kwargs):
        from django.http import Http404

        try:
            body = _json.loads(request.body)
        except (_json.JSONDecodeError, UnicodeDecodeError):
            body = {}

        child_id = body.get("child")
        if not child_id:
            return JsonResponse({"status": "error", "errors": ["child required"]}, status=400)

        try:
            child = models.Child.objects.get(pk=child_id)
        except models.Child.DoesNotExist:
            return JsonResponse({"status": "error", "errors": ["child not found"]}, status=404)

        now = timezone.now()

        if entry_type == "diaper":
            obj = models.DiaperChange.objects.create(
                child=child,
                time=now,
                wet=body.get("wet", True),
                solid=body.get("solid", False),
            )
            self._save_defaults(request, child, "diaper", body)
            return JsonResponse({"status": "ok", "entry_id": obj.pk})

        elif entry_type == "feeding":
            start = self._parse_dt(body.get("start", now.isoformat())) or now
            end_raw = body.get("end")
            end = self._parse_dt(end_raw) if end_raw else now
            obj = models.Feeding.objects.create(
                child=child,
                start=start,
                end=end,
                type=body.get("type", "breast milk"),
                method=body.get("method", "bottle"),
                amount=body.get("amount"),
            )
            self._save_defaults(request, child, "feeding", body)
            return JsonResponse({"status": "ok", "entry_id": obj.pk})

        elif entry_type == "pumping":
            obj = models.Pumping.objects.create(
                child=child,
                time=now,
                amount=body.get("amount"),
            )
            self._save_defaults(request, child, "pumping", body)
            return JsonResponse({"status": "ok", "entry_id": obj.pk})

        elif entry_type == "sleep":
            # Check for active sleep timer conflict
            if models.Timer.objects.filter(child=child, name="Sleep", end=None).exists():
                return JsonResponse(
                    {"status": "error", "errors": ["Sleep timer already active"]},
                    status=409,
                )
            obj = models.Timer.objects.create(
                child=child,
                user=request.user,
                name="Sleep",
                start=now,
                end=None,
            )
            return JsonResponse({"status": "ok", "entry_id": obj.pk})

        elif entry_type == "timer":
            obj = models.Timer.objects.create(
                child=child,
                user=request.user,
                name=body.get("name", ""),
                start=now,
                end=None,
            )
            return JsonResponse({"status": "ok", "entry_id": obj.pk})

        elif entry_type in _QUICK_LOG_FORM_ONLY_TYPES:
            return JsonResponse(
                {"status": "error", "errors": [f"{entry_type} requires full form"]},
                status=400,
            )

        raise Http404

    def _save_defaults(self, request, child, entry_type, body):
        fields = _QUICK_LOG_DEFAULTS_FIELDS.get(entry_type, [])
        saved = {k: body[k] for k in fields if k in body}
        if not saved:
            return
        settings = request.user.settings
        key = f"{child.id}.{entry_type}"
        defaults = settings.last_used_defaults or {}
        defaults[key] = {**defaults.get(key, {}), **saved}
        settings.last_used_defaults = defaults
        settings.save(update_fields=["last_used_defaults"])

    @staticmethod
    def _parse_dt(value):
        if not value:
            return None
        try:
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(value)
            if dt and timezone.is_naive(dt):
                dt = timezone.make_aware(dt)
            return dt
        except (ValueError, TypeError):
            return None
```

- [ ] **Step 4: Add URL to `babybuddy/urls.py`**

Add directly to `urlpatterns` in `babybuddy/urls.py`:

```python
from core.views import QuickLogView

urlpatterns = [
    path("sw.js", ServiceWorkerView.as_view(), name="service-worker"),
    path("api/quick-log/<str:entry_type>/", QuickLogView.as_view(), name="quick-log"),
    # ... rest unchanged
]
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  core.tests.test_quick_log -v 2
```

Expected: All PASS

- [ ] **Step 6: Format and commit**

```bash
pipenv run black core/views.py babybuddy/urls.py
git add core/views.py babybuddy/urls.py core/tests/test_quick_log.py
git commit -m "feat: add instant-log API endpoint POST /api/quick-log/<type>/"
git push
```

---

### Task 6: `QuickLogSheet.jsx` — bottom sheet with 8 tiles

**Files:**

- Create: `frontend/src/components/QuickLogSheet.jsx`

This is a React component with no backend changes — pure frontend work.

- [ ] **Step 1: Create `frontend/src/components/QuickLogSheet.jsx`**

```jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Drawer, message } from "antd";

const TILES = [
  { key: "diaper", label: "Diaper", icon: "💧", instant: true },
  { key: "feeding", label: "Feed", icon: "🍼", instant: true },
  { key: "sleep", label: "Sleep", icon: "😴", instant: true },
  { key: "pumping", label: "Pump", icon: "🫧", instant: true },
  { key: "temperature", label: "Temp", icon: "🌡️", instant: false },
  { key: "timer", label: "Timer", icon: "⏱️", instant: true },
  { key: "note", label: "Note", icon: "📝", instant: false },
  { key: "weight", label: "Weight", icon: "⚖️", instant: false },
];

const LONG_PRESS_MS = 500;

function TileButton({ tile, child, csrfToken, quickStatus, onInstantLog }) {
  const timerRef = useRef(null);
  const [pressing, setPressing] = useState(false);

  const isActiveSleep = tile.key === "sleep" && quickStatus?.activeSleep;

  const startPress = useCallback(() => {
    setPressing(true);
    timerRef.current = setTimeout(() => {
      setPressing(false);
      // Long press → navigate to full form
      window.location.href = `/log/${tile.key}/${child ? `?child=${child.id}` : ""}`;
    }, LONG_PRESS_MS);
  }, [tile.key, child]);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
    setPressing(false);
  }, []);

  const handleTap = useCallback(() => {
    clearTimeout(timerRef.current);
    setPressing(false);
    if (!tile.instant) {
      window.location.href = `/log/${tile.key}/${child ? `?child=${child.id}` : ""}`;
      return;
    }
    onInstantLog(tile.key);
  }, [tile, child, onInstantLog]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      onPointerDown={startPress}
      onPointerUp={handleTap}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        width: "100%",
        aspectRatio: "1",
        background: pressing ? "#1e3a5f" : "#0f172a",
        border: `1px solid ${pressing ? "#4db6ff" : "#1e3a5f"}`,
        borderRadius: 18,
        color: "#e2e8f0",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        position: "relative",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <span style={{ fontSize: 24 }}>{tile.icon}</span>
      <span style={{ fontSize: 11, opacity: 0.8 }}>{tile.label}</span>
      {isActiveSleep && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#ffd666",
            animation: "pulse 1.5s infinite",
          }}
        />
      )}
    </button>
  );
}

export function QuickLogSheet({
  open,
  onClose,
  child,
  csrfToken,
  quickStatus,
}) {
  const [messageApi, contextHolder] = message.useMessage();

  const handleInstantLog = useCallback(
    async (entryType) => {
      if (!child) {
        messageApi.warning("No child selected");
        return;
      }
      try {
        const res = await fetch(`/api/quick-log/${entryType}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ child: child.id }),
        });
        const data = await res.json();
        if (data.status === "ok") {
          const labels = {
            sleep: "Sleep timer started ✓",
            timer: "Timer started ✓",
          };
          messageApi.success(labels[entryType] ?? `${entryType} logged ✓`);
        } else if (res.status === 409) {
          messageApi.warning(data.errors?.[0] ?? "Already active");
        } else {
          messageApi.error(data.errors?.join(", ") ?? "Error");
        }
      } catch {
        messageApi.error("Network error");
      }
    },
    [child, csrfToken, messageApi],
  );

  const statusItems = quickStatus
    ? [
        quickStatus.lastDiaper && `Diaper ${quickStatus.lastDiaper}`,
        quickStatus.lastFeeding && `Fed ${quickStatus.lastFeeding}`,
        quickStatus.activeSleep
          ? `Sleeping ${quickStatus.activeSleep}`
          : quickStatus.lastSleep && `Slept ${quickStatus.lastSleep}`,
      ].filter(Boolean)
    : [];

  return (
    <>
      {contextHolder}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
      <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        height="auto"
        closable={false}
        styles={{
          body: { padding: "8px 16px 16px", background: "#0f172a" },
          mask: { backdropFilter: "blur(2px)" },
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingBottom: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "#1e3a5f",
            }}
          />
        </div>

        {/* 4×2 tile grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: statusItems.length ? 12 : 0,
          }}
        >
          {TILES.map((tile) => (
            <TileButton
              key={tile.key}
              tile={tile}
              child={child}
              csrfToken={csrfToken}
              quickStatus={quickStatus}
              onInstantLog={handleInstantLog}
            />
          ))}
        </div>

        {/* Status strip */}
        {statusItems.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              textAlign: "center",
              paddingBottom: `max(8px, env(safe-area-inset-bottom))`,
            }}
          >
            {statusItems.join(" · ")}
          </div>
        )}
      </Drawer>
    </>
  );
}
```

- [ ] **Step 2: Build and smoke-test manually**

```bash
cd frontend && npm run build
```

No runtime errors expected yet — the component is not rendered anywhere yet.

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/components/QuickLogSheet.jsx
git commit -m "feat: add QuickLogSheet bottom sheet component with 8 action tiles"
git push
```

---

### Task 7: FAB button in `AppShell.jsx` + `quickStatus` from dashboard bootstrap

**Files:**

- Modify: `frontend/src/components/AppShell.jsx`
- Modify: `dashboard/views.py` (add `quickStatus` to `ChildDashboard` bootstrap)

- [ ] **Step 1: Read `AppShell.jsx` top section to understand bootstrap props**

```bash
head -60 frontend/src/components/AppShell.jsx
```

- [ ] **Step 2: Add `quickStatus` to `ChildDashboard` bootstrap in `dashboard/views.py`**

In `ChildDashboard.get_context_data`, after `"strings": _build_ant_strings()`, add:

```python
"quickStatus": _build_quick_status(self.object),
```

Add the helper function (before the view class):

```python
def _build_quick_status(child):
    """Returns a status dict for the quick-entry status strip, or None."""
    from django.utils import timesince as timesince_module

    def _ago(dt):
        if dt is None:
            return None
        return timesince_module.timesince(dt).split(",")[0] + " ago"

    last_diaper = DiaperChange.objects.filter(child=child).order_by("-time").first()
    last_feeding = Feeding.objects.filter(child=child).order_by("-start").first()
    active_timer = Timer.objects.filter(child=child, name="Sleep", end=None).first()
    last_sleep = Sleep.objects.filter(child=child).order_by("-start").first()

    return {
        "lastDiaper": _ago(last_diaper.time) if last_diaper else None,
        "lastFeeding": _ago(last_feeding.start) if last_feeding else None,
        "activeSleep": _ago(active_timer.start) if active_timer else None,
        "lastSleep": _ago(last_sleep.start) if last_sleep else None,
    }
```

Update the `from core.models import ...` line at the top of `dashboard/views.py`. The existing import does NOT include `Timer` — add it explicitly:

```python
from core.models import Child, DiaperChange, Feeding, Pumping, Sleep, Timer
```

(Replace the existing `from core.models import ...` line with this one.)

- [ ] **Step 3: Add FAB + QuickLogSheet to `AppShell.jsx`**

Read the current full `AppShell.jsx`, then add:

1. Import at top: `import { QuickLogSheet } from "./QuickLogSheet";`
2. Add state: `const [sheetOpen, setSheetOpen] = useState(false);`
3. Add FAB button just before the closing `</div>` or `</ConfigProvider>` of the shell:

```jsx
{/* Floating Action Button */}
<button
  onClick={() => setSheetOpen(true)}
  aria-label="Quick log entry"
  style={{
    position: "fixed",
    bottom: `calc(20px + env(safe-area-inset-bottom))`,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#4db6ff",
    border: "none",
    color: "#020617",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(77,182,255,0.4)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  +
</button>

<QuickLogSheet
  open={sheetOpen}
  onClose={() => setSheetOpen(false)}
  child={bootstrap.currentChild ?? null}
  csrfToken={bootstrap.csrfToken}
  quickStatus={bootstrap.quickStatus ?? null}
/>
```

- [ ] **Step 4: Build and test**

```bash
cd frontend && npm run build && cd ..
pipenv run python manage.py test --settings=babybuddy.settings.test \
  dashboard.tests.tests_views -v 2
```

Expected: existing dashboard tests PASS; FAB visible in browser on child dashboard.

- [ ] **Step 5: Format and commit**

```bash
cd frontend && npx prettier --write src/components/AppShell.jsx src/components/QuickLogSheet.jsx && cd ..
pipenv run black dashboard/views.py
git add frontend/src/components/AppShell.jsx dashboard/views.py
git commit -m "feat: add FAB + QuickLogSheet to AppShell, quickStatus to dashboard bootstrap"
git push
```

---

## Phase 3 — Insights Engine

### Task 8: `core/insights.py` — rule engine + `build_insights_data`

**Files:**

- Create: `core/insights.py`
- Create: `core/tests/test_insights.py`

- [ ] **Step 1: Write the failing tests**

```python
# core/tests/test_insights.py
import datetime
from dataclasses import dataclass
from unittest.mock import MagicMock, patch
from django.test import TestCase
from django.utils import timezone


class InsightDataclassTest(TestCase):
    def test_insight_fields(self):
        from core.insights import Insight
        ins = Insight(
            id="3.sleep_short_naps.2026-03-18",
            severity="warning",
            category="sleep",
            title="Short naps",
            body="Naps are shorter than last week.",
            action_label=None,
            action_url=None,
        )
        self.assertEqual(ins.severity, "warning")
        self.assertEqual(ins.category, "sleep")


class AgeStageTest(TestCase):
    def test_newborn_stage(self):
        from core.insights import get_age_stage
        birth = datetime.date.today() - datetime.timedelta(weeks=4)
        self.assertEqual(get_age_stage(birth), "newborn")

    def test_infant_stage(self):
        from core.insights import get_age_stage
        birth = datetime.date.today() - datetime.timedelta(days=180)
        self.assertEqual(get_age_stage(birth), "infant")

    def test_toddler_stage(self):
        from core.insights import get_age_stage
        birth = datetime.date.today() - datetime.timedelta(days=500)
        self.assertEqual(get_age_stage(birth), "toddler")

    def test_child_stage(self):
        from core.insights import get_age_stage
        birth = datetime.date.today() - datetime.timedelta(days=1200)
        self.assertEqual(get_age_stage(birth), "child")


class RuleEngineTest(TestCase):
    def _make_data(self, **overrides):
        """Return a minimal data dict with sensible defaults."""
        base = {
            "feedings_24h": [],
            "feedings_7d": [],
            "sleeps_24h": [],
            "sleeps_7d": [],
            "diapers_24h": [],
            "last_feeding": None,
            "last_sleep": None,
            "last_diaper": None,
            "avg_feeding_interval_7d": None,
            "avg_sleep_duration_7d": None,
            "avg_nap_count_7d": None,
            "avg_nap_duration_prev_7d": None,
            "total_sleep_24h": None,
        }
        base.update(overrides)
        return base

    def test_no_diaper_8h_triggers_warning(self):
        from core.insights import run_rules
        from unittest.mock import MagicMock
        child = MagicMock()
        child.id = 1
        child.birth_date = datetime.date.today() - datetime.timedelta(days=90)
        data = self._make_data(last_diaper=None)
        insights = run_rules(child, data)
        ids = [i.id for i in insights]
        self.assertTrue(any("no_diaper" in iid for iid in ids))

    def test_newborn_no_feeding_3h_triggers_alert(self):
        from core.insights import run_rules
        from unittest.mock import MagicMock
        child = MagicMock()
        child.id = 1
        child.birth_date = datetime.date.today() - datetime.timedelta(weeks=2)
        # last_feeding more than 3 hours ago during daytime
        mock_feeding = MagicMock()
        mock_feeding.start = timezone.now() - datetime.timedelta(hours=4)
        data = self._make_data(last_feeding=mock_feeding, feedings_24h=[mock_feeding])
        insights = run_rules(child, data)
        self.assertTrue(any(i.severity == "alert" for i in insights))

    def test_no_insights_when_data_is_healthy(self):
        from core.insights import run_rules
        from unittest.mock import MagicMock
        child = MagicMock()
        child.id = 1
        child.birth_date = datetime.date.today() - datetime.timedelta(days=90)
        now = timezone.now()
        mock_diaper = MagicMock()
        mock_diaper.time = now - datetime.timedelta(hours=1)
        mock_feeding = MagicMock()
        mock_feeding.start = now - datetime.timedelta(hours=1)
        data = self._make_data(last_diaper=mock_diaper, last_feeding=mock_feeding,
                               diapers_24h=[mock_diaper] * 8, feedings_24h=[mock_feeding] * 8)
        insights = run_rules(child, data)
        self.assertEqual(len(insights), 0)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  core.tests.test_insights -v 2
```

Expected: ImportError (module doesn't exist yet)

- [ ] **Step 3: Create `core/insights.py`**

```python
# core/insights.py
"""
Age-aware insights rule engine.

Importable without Django setup — only build_insights_data touches the ORM.
"""
import datetime
from dataclasses import dataclass


@dataclass
class Insight:
    id: str
    severity: str   # "info" | "warning" | "alert"
    category: str   # "sleep" | "feeding" | "diaper" | "growth"
    title: str
    body: str
    action_label: str | None
    action_url: str | None


def get_age_stage(birth_date: datetime.date) -> str:
    """Return age stage string based on birth_date."""
    today = datetime.date.today()
    age_days = (today - birth_date).days
    age_weeks = age_days / 7
    age_months = age_days / 30.44
    if age_weeks < 12:
        return "newborn"
    if age_months < 12:
        return "infant"
    if age_months < 36:
        return "toddler"
    return "child"


def _make_id(child, rule_name: str) -> str:
    return f"{child.id}.{rule_name}.{datetime.date.today().isoformat()}"


# ── Rule functions ──────────────────────────────────────────────────────────

def _rule_no_diaper_8h(child, data: dict) -> list[Insight]:
    """All stages: no diaper change in 8+ hours."""
    from django.utils import timezone
    last = data.get("last_diaper")
    if last is None:
        return [Insight(
            id=_make_id(child, "no_diaper_ever"),
            severity="warning",
            category="diaper",
            title="No diaper changes recorded",
            body="No diaper change has been logged yet. Track changes to spot patterns.",
            action_label=None,
            action_url=None,
        )]
    age = timezone.now() - last.time
    if age >= datetime.timedelta(hours=8):
        hours = int(age.total_seconds() // 3600)
        return [Insight(
            id=_make_id(child, "no_diaper_8h"),
            severity="warning",
            category="diaper",
            title=f"No diaper change in {hours}h",
            body=f"It's been {hours} hours since the last diaper change. Consider checking soon.",
            action_label="Log diaper",
            action_url="/log/diaper/",
        )]
    return []


def _rule_newborn_feeding_interval(child, data: dict) -> list[Insight]:
    """Newborn: no feeding in 3+ hours during daytime."""
    from django.utils import timezone
    last = data.get("last_feeding")
    if last is None:
        return []
    now = timezone.now()
    local_hour = timezone.localtime(now).hour
    if local_hour < 7 or local_hour >= 22:
        return []  # nighttime — skip
    age = now - last.start
    if age >= datetime.timedelta(hours=3):
        hours = int(age.total_seconds() // 3600)
        return [Insight(
            id=_make_id(child, "newborn_feeding_interval"),
            severity="alert",
            category="feeding",
            title=f"No feeding in {hours}h",
            body=(
                f"Newborns typically need feeding every 2–3 hours. "
                f"It's been {hours}h since the last feed."
            ),
            action_label="Log feeding",
            action_url="/log/feeding/",
        )]
    return []


def _rule_newborn_low_feeding_count(child, data: dict) -> list[Insight]:
    """Newborn: fewer than 8 feedings in last 24h."""
    count = len(list(data.get("feedings_24h", [])))
    if count == 0:
        return []
    if count < 8:
        return [Insight(
            id=_make_id(child, "newborn_low_feeding_count"),
            severity="warning",
            category="feeding",
            title=f"Only {count} feedings in 24h",
            body=(
                f"Newborns typically need 8–12 feedings per day. "
                f"Only {count} have been logged in the last 24 hours."
            ),
            action_label=None,
            action_url=None,
        )]
    return []


def _rule_all_low_sleep(child, data: dict) -> list[Insight]:
    """All stages: total sleep more than 3h below age recommendation."""
    total = data.get("total_sleep_24h")
    if total is None:
        return []
    stage = get_age_stage(child.birth_date)
    recommended = {
        "newborn": datetime.timedelta(hours=16),
        "infant":  datetime.timedelta(hours=14),
        "toddler": datetime.timedelta(hours=12),
        "child":   datetime.timedelta(hours=10),
    }
    rec = recommended.get(stage)
    if rec is None:
        return []
    deficit = rec - total
    if deficit >= datetime.timedelta(hours=3):
        total_h = total.total_seconds() / 3600
        rec_h = rec.total_seconds() / 3600
        return [Insight(
            id=_make_id(child, "low_total_sleep"),
            severity="warning",
            category="sleep",
            title=f"Low sleep: {total_h:.1f}h vs {rec_h:.0f}h recommended",
            body=(
                f"Total sleep in the last 24h ({total_h:.1f}h) is more than 3h below "
                f"the recommended {rec_h:.0f}h for {stage}s."
            ),
            action_label=None,
            action_url=None,
        )]
    return []


def _rule_infant_nap_duration_drop(child, data: dict) -> list[Insight]:
    """Infant: nap duration down 25%+ vs previous 7-day average."""
    current = data.get("avg_sleep_duration_7d")
    prev = data.get("avg_nap_duration_prev_7d")
    if current is None or prev is None or prev.total_seconds() == 0:
        return []
    drop = (prev - current) / prev
    if drop >= 0.25:
        pct = int(drop * 100)
        return [Insight(
            id=_make_id(child, "infant_nap_duration_drop"),
            severity="warning",
            category="sleep",
            title=f"Nap duration down {pct}% this week",
            body=(
                f"Average nap duration has dropped {pct}% compared to the prior week. "
                "This can signal a sleep regression or developmental leap."
            ),
            action_label=None,
            action_url=None,
        )]
    return []


# ── Rule registry ───────────────────────────────────────────────────────────

_RULES_BY_STAGE = {
    "newborn": [
        _rule_newborn_feeding_interval,
        _rule_newborn_low_feeding_count,
        _rule_all_low_sleep,
        _rule_no_diaper_8h,
    ],
    "infant": [
        _rule_infant_nap_duration_drop,
        _rule_all_low_sleep,
        _rule_no_diaper_8h,
    ],
    "toddler": [
        _rule_all_low_sleep,
        _rule_no_diaper_8h,
    ],
    "child": [
        _rule_all_low_sleep,
    ],
}


def run_rules(child, data: dict) -> list[Insight]:
    """Run all rules applicable to child's age stage. Returns list of Insight objects."""
    stage = get_age_stage(child.birth_date)
    rules = _RULES_BY_STAGE.get(stage, [])
    results = []
    for rule_fn in rules:
        try:
            results.extend(rule_fn(child, data))
        except Exception:
            pass  # never let a buggy rule crash the page
    return results


# ── ORM data assembly (only function that touches Django ORM) ───────────────

def build_insights_data(child) -> dict:
    """
    Assemble the data dict for rule evaluation. This is the ONLY function in
    this module that may import from Django ORM.
    """
    from django.utils import timezone
    from core.models import DiaperChange, Feeding, Sleep

    now = timezone.now()
    cutoff_24h = now - timezone.timedelta(hours=24)
    cutoff_7d = now - timezone.timedelta(days=7)
    cutoff_14d = now - timezone.timedelta(days=14)

    feedings_24h = list(Feeding.objects.filter(child=child, start__gte=cutoff_24h))
    feedings_7d = list(Feeding.objects.filter(child=child, start__gte=cutoff_7d))
    sleeps_24h = list(Sleep.objects.filter(child=child, start__gte=cutoff_24h))
    sleeps_7d = list(Sleep.objects.filter(child=child, start__gte=cutoff_7d))
    sleeps_prev_7d = list(Sleep.objects.filter(
        child=child, start__gte=cutoff_14d, start__lt=cutoff_7d
    ))
    diapers_24h = list(DiaperChange.objects.filter(child=child, time__gte=cutoff_24h))

    last_feeding = Feeding.objects.filter(child=child).order_by("-start").first()
    last_sleep = Sleep.objects.filter(child=child).order_by("-start").first()
    last_diaper = DiaperChange.objects.filter(child=child).order_by("-time").first()

    def _mean_duration(items, attr="duration"):
        durations = [getattr(i, attr) for i in items if getattr(i, attr)]
        if not durations:
            return None
        total = sum((d.total_seconds() for d in durations), 0.0)
        return timezone.timedelta(seconds=total / len(durations))

    def _total_duration(items, attr="duration"):
        durations = [getattr(i, attr) for i in items if getattr(i, attr)]
        if not durations:
            return None
        return timezone.timedelta(seconds=sum(d.total_seconds() for d in durations))

    # Naps = sleeps ending before 19:00 local time
    def _is_nap(sleep_obj):
        if not sleep_obj.end:
            return False
        end_local = timezone.localtime(sleep_obj.end)
        return end_local.hour < 19

    naps_7d = [s for s in sleeps_7d if _is_nap(s)]
    naps_prev_7d = [s for s in sleeps_prev_7d if _is_nap(s)]

    return {
        "feedings_24h": feedings_24h,
        "feedings_7d": feedings_7d,
        "sleeps_24h": sleeps_24h,
        "sleeps_7d": sleeps_7d,
        "diapers_24h": diapers_24h,
        "last_feeding": last_feeding,
        "last_sleep": last_sleep,
        "last_diaper": last_diaper,
        "avg_feeding_interval_7d": None,  # complex; omitted in Phase 1
        "avg_sleep_duration_7d": _mean_duration(naps_7d),
        "avg_nap_count_7d": (len(naps_7d) / 7.0) if naps_7d else None,
        "avg_nap_duration_prev_7d": _mean_duration(naps_prev_7d),
        "total_sleep_24h": _total_duration(sleeps_24h),
    }


def build_llm_context(child, data: dict, insights: list) -> str:
    """Build a plain-text prompt for the LLM. Caps ~1500 tokens."""
    from django.utils import timezone

    stage = get_age_stage(child.birth_date)
    age_weeks = (datetime.date.today() - child.birth_date).days // 7

    def _ago(dt):
        if dt is None:
            return "unknown"
        diff = timezone.now() - dt
        hours = int(diff.total_seconds() // 3600)
        if hours < 1:
            return "< 1h ago"
        return f"{hours}h ago"

    feedings_per_day = len(data["feedings_7d"]) / 7.0
    total_sleep_h = (
        data["total_sleep_24h"].total_seconds() / 3600
        if data["total_sleep_24h"] else 0
    )
    avg_nap = (
        data["avg_sleep_duration_7d"].total_seconds() / 3600
        if data["avg_sleep_duration_7d"] else 0
    )

    sleep_guidelines = {"newborn": 16, "infant": 14, "toddler": 12, "child": 10}
    feeding_guidelines = {"newborn": "8–12/day", "infant": "4–6/day", "toddler": "3 meals", "child": "3 meals"}

    insight_lines = "\n".join(
        f"- [{i.severity.upper()}] {i.title}: {i.body}" for i in insights
    ) or "- None detected"

    return f"""Child: {child.first_name}, {age_weeks} weeks old ({stage})
Period: last 7 days

Logged data summary:
- Feedings per day (avg): {feedings_per_day:.1f}  (age guideline: {feeding_guidelines.get(stage, "varies")})
- Total sleep per day (avg): {total_sleep_h:.1f}h  (age guideline: {sleep_guidelines.get(stage, "??")}h)
- Avg nap duration (7d): {avg_nap:.1f}h
- Last feeding: {_ago(data["last_feeding"].start if data["last_feeding"] else None)}
- Last diaper: {_ago(data["last_diaper"].time if data["last_diaper"] else None)}

Current insights:
{insight_lines}

You are a helpful assistant for new parents. Provide a brief (3-5 sentence), warm, reassuring
summary of this data and one concrete, evidence-based suggestion. Do not diagnose or replace
medical advice. If data is sparse, acknowledge that and suggest logging more consistently."""
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  core.tests.test_insights -v 2
```

Expected: PASS

- [ ] **Step 5: Format and commit**

```bash
pipenv run black core/insights.py core/tests/test_insights.py
git add core/insights.py core/tests/test_insights.py
git commit -m "feat: add insights rule engine with age-stage rules and LLM context builder"
git push
```

---

### Task 9: `ChildInsightsView` + URL + `InsightsPages.jsx` + `App.jsx` route

**Files:**

- Modify: `dashboard/views.py` (add `ChildInsightsView`)
- Modify: `core/urls.py` (add `children/<int:pk>/insights/` URL)
- Modify: `frontend/src/App.jsx` (add `insights` route)
- Create: `frontend/src/pages/InsightsPages.jsx`

- [ ] **Step 1: Write the failing Django test**

```python
# dashboard/tests/tests_views.py — add inside existing test class:
def test_insights_page(self):
    # requires at least one child (fake() creates some)
    from core.models import Child
    child = Child.objects.first()
    if child is None:
        return
    response = self.c.get(f"/children/{child.pk}/insights/")
    self.assertEqual(response.status_code, 200)
    from core.tests.tests_views import _bootstrap_payload
    bootstrap = _bootstrap_payload(response)
    self.assertIsNotNone(bootstrap)
    self.assertEqual(bootstrap["pageType"], "insights")
    self.assertIn("insights", bootstrap)
    self.assertIsInstance(bootstrap["insights"], list)
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  dashboard.tests.tests_views -v 2
```

Expected: 404

- [ ] **Step 3: Add `ChildInsightsView` to `dashboard/views.py`**

Add imports at top of `dashboard/views.py`:

```python
from django.core.cache import cache
from core.insights import build_insights_data, run_rules
```

Add the view:

```python
class ChildInsightsView(PermissionRequiredMixin, DetailView):
    model = Child
    permission_required = ("core.view_child",)
    template_name = "babybuddy/ant_app.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        child = self.object

        cache_key = f"insights_{child.id}"
        insights = cache.get(cache_key)
        if insights is None:
            data = build_insights_data(child)
            insights = run_rules(child, data)
            cache.set(cache_key, insights, 300)

        context["ant_page_title"] = "Insights"
        context["ant_bootstrap"] = {
            "pageType": "insights",
            "currentPath": self.request.path,
            "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
            "csrfToken": get_token(self.request),
            "user": {"displayName": _display_name(self.request.user)},
            "urls": {
                **_build_nav_urls(self.request),
                "childDashboard": reverse(
                    "dashboard:dashboard-child", kwargs={"slug": child.slug}
                ),
            },
            "child": {
                "id": child.id,
                "name": str(child),
                "ageWeeks": (datetime.date.today() - child.birth_date).days // 7,
            },
            "insights": [
                {
                    "id": ins.id,
                    "severity": ins.severity,
                    "category": ins.category,
                    "title": ins.title,
                    "body": ins.body,
                    "actionLabel": ins.action_label,
                    "actionUrl": ins.action_url,
                }
                for ins in insights
            ],
            "strings": _build_ant_strings(),
        }
        return context
```

Add `import datetime` to `dashboard/views.py` imports if not present.

- [ ] **Step 4: Add URL to `core/urls.py`**

```python
from . import views
# Add at the bottom of urlpatterns:
path("children/<int:pk>/insights/", views.ChildInsightsView.as_view(), name="child-insights"),
```

Wait — `ChildInsightsView` is in `dashboard/views.py`, not `core/views.py`. Add the URL to `dashboard/urls.py` instead:

```python
# dashboard/urls.py
urlpatterns = [
    path("dashboard/", views.Dashboard.as_view(), name="dashboard"),
    path("children/<str:slug>/dashboard/", views.ChildDashboard.as_view(), name="dashboard-child"),
    path("children/<int:pk>/insights/", views.ChildInsightsView.as_view(), name="child-insights"),
]
```

> Note: The spec says `core/urls.py` but the view lives in `dashboard/views.py`. `dashboard/urls.py` is correct to maintain namespace conventions.

- [ ] **Step 5: Create `frontend/src/pages/InsightsPages.jsx`**

```jsx
import { Empty, Tag, Button, Space } from "antd";

const SEVERITY_COLORS = {
  alert: "#ff7875",
  warning: "#ffd666",
  info: "#4db6ff",
};

const CATEGORY_LABELS = {
  sleep: "Sleep",
  feeding: "Feeding",
  diaper: "Diaper",
  growth: "Growth",
};

function InsightCard({ insight }) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: `1px solid ${SEVERITY_COLORS[insight.severity] ?? "#1e3a5f"}`,
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Tag
          color={SEVERITY_COLORS[insight.severity]}
          style={{
            color: "#020617",
            border: "none",
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {insight.severity.toUpperCase()}
        </Tag>
        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
          {insight.title}
        </span>
      </div>
      <p style={{ color: "#94a3b8", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
        {insight.body}
      </p>
      {insight.actionLabel && insight.actionUrl && (
        <div style={{ marginTop: 10 }}>
          <Button
            size="small"
            href={insight.actionUrl}
            style={{ borderColor: "#1e3a5f", color: "#4db6ff" }}
          >
            {insight.actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function InsightsPage({ bootstrap }) {
  const { child, insights, urls } = bootstrap;

  const byCategory = insights.reduce((acc, ins) => {
    const cat = ins.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ins);
    return acc;
  }, {});

  const categories = Object.keys(byCategory).sort();

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 2 }}>
          {child.name} · {child.ageWeeks}w
        </div>
        <h1
          style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}
        >
          Insights
        </h1>
      </div>

      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <Button
          type="link"
          href={urls.childDashboard}
          style={{ color: "#4db6ff", padding: 0 }}
        >
          ← Back to dashboard
        </Button>
      </div>

      {/* Empty state */}
      {insights.length === 0 && (
        <Empty
          description={
            <span style={{ color: "#64748b" }}>
              No issues detected — everything looks on track.
            </span>
          }
          style={{ marginTop: 60 }}
        />
      )}

      {/* Insights grouped by category */}
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div
            style={{
              color: "#64748b",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </div>
          {byCategory[cat].map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Add `insights` route to `frontend/src/App.jsx`**

Read `App.jsx` and find the `pageType` switch/if block. Add:

```jsx
import { InsightsPage } from "./pages/InsightsPages";

// In the router:
case "insights":
  return <AppShell bootstrap={bootstrap}><InsightsPage bootstrap={bootstrap} /></AppShell>;
```

- [ ] **Step 7: Build and run tests**

```bash
cd frontend && npm run build && cd ..
pipenv run python manage.py test --settings=babybuddy.settings.test \
  dashboard.tests.tests_views -v 2
```

Expected: PASS

- [ ] **Step 8: Format and commit**

```bash
cd frontend && npx prettier --write src/pages/InsightsPages.jsx src/App.jsx && cd ..
pipenv run black dashboard/views.py dashboard/urls.py
git add dashboard/views.py dashboard/urls.py
git add frontend/src/pages/InsightsPages.jsx frontend/src/App.jsx
git commit -m "feat: add ChildInsightsView, insights page URL, and InsightsPages.jsx"
git push
```

---

### Task 10: Insights data in `ChildDashboard` bootstrap + dashboard banner

**Files:**

- Modify: `dashboard/views.py` (extend `ChildDashboard` bootstrap with `insights`)
- Modify: `frontend/src/pages/DashboardPages.jsx` (add banner)

- [ ] **Step 1: Write the failing test**

```python
# dashboard/tests/tests_views.py — add to existing test class:
def test_child_dashboard_has_insights_key(self):
    from core.models import Child
    child = Child.objects.first()
    if child is None:
        return
    response = self.c.get(f"/children/{child.slug}/dashboard/")
    self.assertEqual(response.status_code, 200)
    from core.tests.tests_views import _bootstrap_payload
    bootstrap = _bootstrap_payload(response)
    self.assertIn("insights", bootstrap)
    self.assertIsInstance(bootstrap["insights"], list)
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  dashboard.tests.tests_views.DashboardTestCase.test_child_dashboard_has_insights_key -v 2
```

Expected: AssertionError (key missing)

- [ ] **Step 3: Extend `ChildDashboard.get_context_data` in `dashboard/views.py`**

In `ChildDashboard.get_context_data`, add `insights` and `quickStatus` keys to the bootstrap dict right after `"strings": _build_ant_strings()`:

```python
"insights": _build_insights_for_bootstrap(self.object),
"quickStatus": _build_quick_status(self.object),
```

Add the helper function (after `_build_quick_status`):

```python
def _build_insights_for_bootstrap(child):
    from core.insights import build_insights_data, run_rules
    from django.core.cache import cache

    cache_key = f"insights_{child.id}"
    insights = cache.get(cache_key)
    if insights is None:
        data = build_insights_data(child)
        insights = run_rules(child, data)
        cache.set(cache_key, insights, 300)

    return [
        {
            "id": ins.id,
            "severity": ins.severity,
            "category": ins.category,
            "title": ins.title,
            "body": ins.body,
            "actionLabel": ins.action_label,
            "actionUrl": ins.action_url,
        }
        for ins in insights
    ]
```

- [ ] **Step 4: Add insights banner to `DashboardPages.jsx`**

Read `DashboardPages.jsx`, find `ChildDashboardPage`. Add at the very top of the render output (before section cards):

```jsx
// At top of ChildDashboardPage component, after const declarations:
const { insights = [], urls, currentChild } = bootstrap;
const alertInsights = insights.filter(
  (i) => i.severity === "alert" || i.severity === "warning",
);

// Near top of JSX return, before the main content:
{
  alertInsights.length > 0 && (
    <InsightsBanner
      insights={alertInsights}
      urls={urls}
      childId={currentChild?.id}
    />
  );
}
```

Add `InsightsBanner` component (can be in same file or imported from InsightsPages):

```jsx
import { Alert, Button } from "antd";

function InsightsBanner({ insights, urls, childId }) {
  const [dismissed, setDismissed] = React.useState(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(`dismissed_insights_${childId}`) || "[]",
      );
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return stored
        .filter((e) => new Date(e.dismissedAt).getTime() > cutoff)
        .map((e) => e.id);
    } catch {
      return [];
    }
  });

  const visible = insights.filter((i) => !dismissed.includes(i.id));
  if (visible.length === 0) return null;

  const hasAlert = visible.some((i) => i.severity === "alert");
  const bannerColor = hasAlert ? "#ff7875" : "#ffd666";

  const handleDismiss = () => {
    const now = new Date().toISOString();
    const entries = visible.map((i) => ({ id: i.id, dismissedAt: now }));
    try {
      const existing = JSON.parse(
        localStorage.getItem(`dismissed_insights_${childId}`) || "[]",
      );
      localStorage.setItem(
        `dismissed_insights_${childId}`,
        JSON.stringify([...existing, ...entries]),
      );
    } catch {}
    setDismissed((prev) => [...prev, ...visible.map((i) => i.id)]);
  };

  const insightsUrl = urls.childInsights;

  return (
    <Alert
      type={hasAlert ? "error" : "warning"}
      message={
        <span>
          {visible.length} insight{visible.length > 1 ? "s" : ""} detected
          {insightsUrl && (
            <Button
              type="link"
              size="small"
              href={insightsUrl}
              style={{ color: bannerColor, paddingLeft: 8 }}
            >
              View all →
            </Button>
          )}
        </span>
      }
      closable
      onClose={handleDismiss}
      style={{ marginBottom: 12, borderRadius: 12 }}
    />
  );
}
```

Also add `"childInsights"` to the existing `urls` dict inside `ChildDashboard.get_context_data` in `dashboard/views.py`. Do NOT replace the entire dict — add one key to the existing dict:

```python
# Find the existing "urls": { ... } dict in the bootstrap and ADD this key:
"childInsights": reverse("dashboard:child-insights", kwargs={"pk": self.object.pk}),
```

The full `urls` dict in `ChildDashboard` should end up looking like:

```python
"urls": {
    **_build_nav_urls(self.request),
    "layout": reverse("babybuddy:user-settings"),
    "current": self.request.get_full_path(),
    "childDashboardTemplate": reverse(
        "dashboard:dashboard-child", kwargs={"slug": "__CHILD_SLUG__"}
    ),
    "childInsights": reverse("dashboard:child-insights", kwargs={"pk": self.object.pk}),
},
```

- [ ] **Step 5: Build and run tests**

```bash
cd frontend && npm run build && cd ..
pipenv run python manage.py test --settings=babybuddy.settings.test \
  dashboard.tests.tests_views -v 2
```

Expected: PASS

- [ ] **Step 6: Format and commit**

```bash
cd frontend && npx prettier --write src/pages/DashboardPages.jsx && cd ..
pipenv run black dashboard/views.py
git add dashboard/views.py frontend/src/pages/DashboardPages.jsx
git commit -m "feat: add insights banner to child dashboard and insights key to bootstrap"
git push
```

---

### Task 11: LLM settings fields on `Settings` model + settings UI

**Files:**

- Modify: `babybuddy/models.py` (add LLM fields)
- Create: migration
- Modify: `babybuddy/views.py` (extend settings bootstrap with LLM values)

- [ ] **Step 1: Write the failing test**

```python
# babybuddy/tests/tests_models.py — add to SettingsLastUsedDefaultsTest or new class:
class SettingsLLMFieldsTest(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        self.user = get_user_model().objects.create_user(
            username="testllm", password="pass"
        )

    def test_llm_provider_default_is_none(self):
        self.assertEqual(self.user.settings.llm_provider, "none")

    def test_llm_fields_exist(self):
        s = self.user.settings
        s.llm_provider = "ollama"
        s.llm_model = "llama3"
        s.llm_base_url = "http://localhost:11434"
        s.llm_api_key = ""
        s.save()
        s.refresh_from_db()
        self.assertEqual(s.llm_provider, "ollama")
        self.assertEqual(s.llm_model, "llama3")
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  babybuddy.tests.tests_models.SettingsLLMFieldsTest -v 2
```

Expected: AttributeError

- [ ] **Step 3: Add LLM fields to `babybuddy/models.py`**

After `last_used_defaults`, **inside the `Settings` class body**:

All four fields and the choices list go **inside the `Settings` class body** (4-space indent):

```python
    LLM_PROVIDER_CHOICES = [
        ("none", _("None")),
        ("ollama", _("Ollama (local)")),
        ("openai", _("OpenAI")),
        ("anthropic", _("Anthropic")),
    ]

    llm_provider = models.CharField(
        choices=LLM_PROVIDER_CHOICES,
        default="none",
        max_length=20,
        verbose_name=_("AI provider"),
    )
    llm_model = models.CharField(
        blank=True,
        default="",
        max_length=100,
        verbose_name=_("AI model"),
        help_text=_("e.g. llama3, gpt-4o, claude-sonnet-4-6"),
    )
    llm_base_url = models.CharField(
        blank=True,
        default="",
        max_length=500,
        verbose_name=_("AI base URL"),
        help_text=_("For Ollama: http://localhost:11434"),
    )
    llm_api_key = models.CharField(
        blank=True,
        default="",
        max_length=500,
        verbose_name=_("AI API key"),
    )
```

- [ ] **Step 4: Generate migration**

```bash
pipenv run python manage.py makemigrations babybuddy --settings=babybuddy.settings.base
pipenv run python manage.py migrate --settings=babybuddy.settings.test
```

- [ ] **Step 5: Extend settings bootstrap in `babybuddy/views.py`**

In `_build_settings_bootstrap`, add to the returned dict's `"settings"` key:

```python
"ai": {
    "provider": user_settings.llm_provider,
    "model": user_settings.llm_model,
    "baseUrl": user_settings.llm_base_url,
    "apiKeySet": bool(user_settings.llm_api_key),
},
```

- [ ] **Step 6: Add AI settings section to `DashboardPages.jsx` SettingsPage**

Find `SettingsPage` in `DashboardPages.jsx`. Add an "AI Assistant" section that renders 4 fields: Provider (select), Model (text), Base URL (text, shown only when provider=ollama), API Key (password input, shown only when provider in openai/anthropic). On save, POST to the existing settings form action with the same form keys (match whatever `UserSettings` form field names are in `babybuddy/forms.py`).

> Read `babybuddy/forms.py` to find the UserSettings form fields before implementing this step.

- [ ] **Step 7: Run tests and commit**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  babybuddy.tests.tests_models -v 2
cd frontend && npm run build && cd ..
pipenv run black babybuddy/models.py babybuddy/views.py
git add babybuddy/models.py babybuddy/migrations/ babybuddy/views.py
git add babybuddy/tests/tests_models.py
git commit -m "feat: add LLM provider/model/key fields to Settings model"
git push
```

---

### Task 12: `core/llm.py` — provider-agnostic LLM streaming client

**Files:**

- Create: `core/llm.py`

- [ ] **Step 1: Write the failing test**

```python
# core/tests/test_insights.py — add:
class LLMClientTest(TestCase):
    def test_llm_error_raised_for_none_provider(self):
        from core.llm import generate_summary, LLMError
        with self.assertRaises(LLMError):
            list(generate_summary("none", "", "", "", "context"))

    def test_llm_error_raised_for_unknown_provider(self):
        from core.llm import generate_summary, LLMError
        with self.assertRaises(LLMError):
            list(generate_summary("unknown", "", "", "", "context"))
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  core.tests.test_insights.LLMClientTest -v 2
```

- [ ] **Step 3: Create `core/llm.py`**

```python
# core/llm.py
"""
Provider-agnostic LLM streaming client.
Yields plain text chunks. SSE formatting is the caller's responsibility.
"""
import json
import urllib.request
import urllib.error
from typing import Generator


class LLMError(Exception):
    """Raised for configuration errors (bad key, unreachable host)."""
    pass


def generate_summary(
    provider: str,
    model: str,
    base_url: str,
    api_key: str,
    context: str,
) -> Generator[str, None, None]:
    """
    Yields raw text chunks. Raises LLMError on configuration/connection errors.
    """
    if provider == "none":
        raise LLMError("No AI provider configured.")

    if provider == "ollama":
        yield from _ollama_stream(model, base_url, context)
    elif provider == "openai":
        yield from _openai_stream(model, api_key, context)
    elif provider == "anthropic":
        yield from _anthropic_stream(model, api_key, context)
    else:
        raise LLMError(f"Unknown provider: {provider}")


def _ollama_stream(model: str, base_url: str, context: str) -> Generator[str, None, None]:
    base_url = (base_url or "http://localhost:11434").rstrip("/")
    url = f"{base_url}/api/generate"
    payload = json.dumps({"model": model, "prompt": context, "stream": True}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            for line in resp:
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    chunk = obj.get("response", "")
                    if chunk:
                        yield chunk
                    if obj.get("done"):
                        return
                except json.JSONDecodeError:
                    continue
    except urllib.error.URLError as e:
        raise LLMError(f"Cannot reach Ollama at {base_url}: {e}") from e


def _openai_stream(model: str, api_key: str, context: str) -> Generator[str, None, None]:
    if not api_key:
        raise LLMError("OpenAI API key is not configured.")
    url = "https://api.openai.com/v1/chat/completions"
    payload = json.dumps({
        "model": model or "gpt-4o-mini",
        "messages": [{"role": "user", "content": context}],
        "stream": True,
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    return
                try:
                    obj = json.loads(data)
                    chunk = obj["choices"][0]["delta"].get("content", "")
                    if chunk:
                        yield chunk
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
    except urllib.error.HTTPError as e:
        raise LLMError(f"OpenAI error {e.code}: {e.reason}") from e
    except urllib.error.URLError as e:
        raise LLMError(f"Cannot reach OpenAI: {e}") from e


def _anthropic_stream(model: str, api_key: str, context: str) -> Generator[str, None, None]:
    if not api_key:
        raise LLMError("Anthropic API key is not configured.")
    url = "https://api.anthropic.com/v1/messages"
    payload = json.dumps({
        "model": model or "claude-haiku-4-5-20251001",
        "max_tokens": 1024,
        "stream": True,
        "messages": [{"role": "user", "content": context}],
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line.startswith("data: "):
                    continue
                try:
                    obj = json.loads(line[6:])
                    if obj.get("type") == "content_block_delta":
                        chunk = obj.get("delta", {}).get("text", "")
                        if chunk:
                            yield chunk
                except (json.JSONDecodeError, KeyError):
                    continue
    except urllib.error.HTTPError as e:
        raise LLMError(f"Anthropic error {e.code}: {e.reason}") from e
    except urllib.error.URLError as e:
        raise LLMError(f"Cannot reach Anthropic: {e}") from e
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  core.tests.test_insights.LLMClientTest -v 2
```

Expected: PASS

- [ ] **Step 5: Format and commit**

```bash
pipenv run black core/llm.py
git add core/llm.py core/tests/test_insights.py
git commit -m "feat: add provider-agnostic LLM streaming client (Ollama, OpenAI, Anthropic)"
git push
```

---

### Task 13: `InsightsSummaryView` SSE endpoint + React EventSource handler

**Files:**

- Modify: `dashboard/views.py` (add `InsightsSummaryView`)
- Modify: `babybuddy/urls.py` (add `/api/insights/summary/`)
- Modify: `frontend/src/pages/InsightsPages.jsx` (add "Ask AI" button + streaming modal)

- [ ] **Step 1: Write the failing test**

```python
# dashboard/tests/tests_views.py — add:
def test_insights_summary_endpoint_no_provider(self):
    """With no LLM provider configured (default 'none'), returns SSE error event."""
    from core.models import Child
    child = Child.objects.first()
    if child is None:
        return
    response = self.c.get(f"/api/insights/summary/?child={child.pk}")
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response["Content-Type"], "text/event-stream")
    content = b"".join(response.streaming_content)
    self.assertIn(b"event: error", content)

def test_insights_summary_requires_login(self):
    from core.models import Child
    from django.test import Client as HttpClient
    child = Child.objects.first()
    if child is None:
        return
    anon = HttpClient()
    response = anon.get(f"/api/insights/summary/?child={child.pk}")
    self.assertEqual(response.status_code, 302)
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test \
  dashboard.tests.tests_views -v 2
```

- [ ] **Step 3: Add `InsightsSummaryView` to `dashboard/views.py`**

```python
import json as _json
from django.http import StreamingHttpResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


@method_decorator(login_required, name="dispatch")
@method_decorator(csrf_exempt, name="dispatch")
class InsightsSummaryView(View):
    """
    GET /api/insights/summary/?child=<id>
    Streams an LLM summary as Server-Sent Events.
    Uses GET (required for native EventSource compatibility — no CSRF token support).
    """

    def get(self, request):
        child_id = request.GET.get("child")
        try:
            child = Child.objects.get(pk=child_id)
        except (Child.DoesNotExist, ValueError, TypeError):
            return StreamingHttpResponse(
                iter([f'event: error\ndata: {_json.dumps("Child not found")}\n\n']),
                content_type="text/event-stream",
            )

        user_settings = request.user.settings

        def stream():
            from core.insights import build_insights_data, run_rules, build_llm_context
            from core.llm import generate_summary, LLMError
            from django.core.cache import cache

            # Always build fresh data for LLM context (cache only stores insights list)
            data = build_insights_data(child)
            cache_key = f"insights_{child.id}"
            insights = cache.get(cache_key)
            if insights is None:
                insights = run_rules(child, data)
                cache.set(cache_key, insights, 300)

            context = build_llm_context(child, data, insights)

            try:
                for chunk in generate_summary(
                    provider=user_settings.llm_provider,
                    model=user_settings.llm_model,
                    base_url=user_settings.llm_base_url,
                    api_key=user_settings.llm_api_key,
                    context=context,
                ):
                    yield f"data: {_json.dumps(chunk)}\n\n"
                yield "event: done\ndata: \n\n"
            except Exception as e:
                yield f"event: error\ndata: {_json.dumps(str(e))}\n\n"

        response = StreamingHttpResponse(stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
```

- [ ] **Step 4: Add URL to `babybuddy/urls.py`**

```python
from dashboard.views import InsightsSummaryView

urlpatterns = [
    path("sw.js", ServiceWorkerView.as_view(), name="service-worker"),
    path("api/quick-log/<str:entry_type>/", QuickLogView.as_view(), name="quick-log"),
    path("api/insights/summary/", InsightsSummaryView.as_view(), name="insights-summary"),
    # ... rest unchanged
]
```

- [ ] **Step 5: Add "Ask AI" button + streaming modal to `InsightsPages.jsx`**

Add `AskAIModal` component:

```jsx
import { Modal, Button, Spin } from "antd";
import { useState, useRef } from "react";

function AskAIModal({ childId, open, onClose }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const esRef = useRef(null);

  const start = () => {
    if (esRef.current) esRef.current.close();
    setText("");
    setError(null);
    setLoading(true);

    const es = new EventSource(`/api/insights/summary/?child=${childId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        setText((prev) => prev + JSON.parse(e.data));
      } catch {}
    };
    es.addEventListener("done", () => {
      setLoading(false);
      es.close();
    });
    es.addEventListener("error", (e) => {
      setLoading(false);
      try {
        setError(JSON.parse(e.data));
      } catch {
        setError("Connection error");
      }
      es.close();
    });
    es.onerror = () => {
      if (loading) {
        setLoading(false);
        setError("Connection lost");
      }
      es.close();
    };
  };

  const handleOpen = () => {
    if (!text && !loading) start();
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        esRef.current?.close();
        onClose();
      }}
      footer={null}
      title="AI Summary"
      styles={{ body: { background: "#0f172a", minHeight: 120 } }}
      afterOpenChange={(visible) => {
        if (visible) handleOpen();
      }}
    >
      {loading && !text && (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      )}
      {error && <p style={{ color: "#ff7875" }}>{error}</p>}
      {text && (
        <p
          style={{ color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}
        >
          {text}
          {loading && <span style={{ opacity: 0.5 }}>▌</span>}
        </p>
      )}
    </Modal>
  );
}
```

In `InsightsPage`, add the button (shown only when `bootstrap.settings?.ai?.provider !== "none"`):

```jsx
const showAI =
  bootstrap.settings?.ai?.provider && bootstrap.settings.ai.provider !== "none";
const [aiOpen, setAiOpen] = useState(false);

// In JSX, after the back link:
{
  showAI && (
    <>
      <Button
        onClick={() => setAiOpen(true)}
        style={{ marginBottom: 16, borderColor: "#1e3a5f", color: "#4db6ff" }}
      >
        ✨ Ask AI for summary
      </Button>
      <AskAIModal
        childId={bootstrap.child.id}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
      />
    </>
  );
}
```

Also extend `ChildInsightsView` bootstrap in `dashboard/views.py` to include settings:

```python
"settings": {
    "ai": {
        "provider": request.user.settings.llm_provider,
    }
},
```

- [ ] **Step 6: Build and run all tests**

```bash
cd frontend && npm run build && cd ..
pipenv run python manage.py test --settings=babybuddy.settings.test -v 2
```

Expected: All PASS

- [ ] **Step 7: Format and commit**

```bash
cd frontend && npx prettier --write src/pages/InsightsPages.jsx && cd ..
pipenv run black dashboard/views.py babybuddy/urls.py
git add dashboard/views.py babybuddy/urls.py
git add frontend/src/pages/InsightsPages.jsx
git commit -m "feat: add SSE insights summary endpoint and AI summary modal on insights page"
git push
```

---

## Final Verification

- [ ] **Run full test suite**

```bash
pipenv run python manage.py test --settings=babybuddy.settings.test --parallel \
  --exclude-tag isolate -v 1
```

Expected: All PASS

- [ ] **Build frontend for production**

```bash
cd frontend && npm run build && cd ..
```

- [ ] **Manual smoke test** — launch dev server and verify:
  1. `/sw.js` responds with 200, JS content, `Service-Worker-Allowed: /` header
  2. Child dashboard shows FAB "+" button, tapping opens QuickLogSheet
  3. Tapping "Diaper" tile creates a record and shows toast
  4. Tapping "Sleep" tile creates a timer; second tap returns 409 with warning toast
  5. Long-pressing any tile navigates to `/log/<type>/` form
  6. `/children/<pk>/insights/` renders insights page
  7. Dashboard shows insight banner if there are warnings/alerts
  8. Settings page shows AI provider dropdown (with `llm_provider` choices)
  9. If AI provider configured: "Ask AI" button on insights page streams response

```bash
gulp runserver
```
