# Dashboard Redesign — Design Spec

**Goal:** Replace the 19-card dashboard with a streamlined view centered on a 24h activity dial, promote insights to first-class status, and split topic-specific detail into dedicated tabbed pages.

**Architecture:** Django serves the same bootstrap JSON pattern. React renders a new `ActivityDial` SVG component, a simplified `ChildDashboardPage`, new topic page components, and an updated `AppShell` navigation. Existing API endpoints are reused; new endpoints added only for medical data and well-child exams.

**Tech Stack:** React + Ant Design (dark/light themes), SVG for the activity dial, Django REST for data, existing Postgres models extended for medical data and exam tracking. Sensitive health data encrypted at rest.

---

## 1. Information Architecture

### Core Activity Types

Four activity types are tracked throughout the app. These appear on the dial, in insights, on topic pages, and in quick entry:

| Activity | Color                | Icon                         | Description                 |
| -------- | -------------------- | ---------------------------- | --------------------------- |
| Sleep    | `#fbbf24` (amber)    | `MoonOutlined` / custom moon | Sleep periods + naps        |
| Feeding  | `#38bdf8` (sky blue) | custom bottle / breast       | Breast, bottle, solid feeds |
| Diaper   | `#ff6b8b` (red)      | custom droplet               | Wet, solid, mixed changes   |
| Pumping  | `#c084fc` (purple)   | custom pump                  | Breast pump sessions        |

**Removed:** Tummy time is removed as a core activity. It remains accessible as a data type via the full forms but is not surfaced on the dial, insights, or topic pages.

### Dashboard (2 elements)

1. **Activity Dial** — 24h circular clock, hero element (see §2)
2. **Insights Card** — always visible below the dial (see §3)

### Quick Entry (own page, nav item)

Tile grid for logging activities. Same UX as today's quick-entry card, promoted to its own page (see §4).

### Topic Pages (via "Insights" nav submenu)

Four activity topic pages + one child data page, each with tabbed sub-sections (see §5):

- Sleep
- Feeding
- Diaper
- Pumping
- Child Data

### What Gets Removed

- **FAB (+) button** — replaced by Quick Entry nav item
- **19-card child dashboard** — replaced by dial + insights
- **Central card picker in Settings** — replaced by per-section configuration on each topic page
- **"Time since last X" as permanent cards** — replaced by threshold-based insights
- **Separate Insights page** — insights now live on the dashboard card + contextually in topic pages
- **Quick status strip in header** — dial center shows current status; Quick Entry page shows context strip
- **Tummy time as a core activity** — demoted from dashboard/dial; remains in data entry forms

---

## 2. Activity Dial

A 24-hour circular clock that serves as the dashboard hero. Two concentric layers:

### Atmosphere Ring (inner)

- **Purpose:** Show time-of-day context only. No activity data on this ring.
- **Gradient:** Smooth conic blend from bright sky blue (midday) → warm tones (afternoon) → deep navy (dusk) → near-black (midnight) → navy (pre-dawn) → brightening (dawn) → back to sky blue. Implementation should use a true CSS conic-gradient or canvas for seamless blending.
- **Hour labels:** 0, 3, 6, 9, 12, 15, 18, 21 rendered directly on the ring. Uses the chart text size (see §13 Typography). Opacity matches the ring brightness — dimmer at night, brighter during day.
- **Celestial accents:** Scattered small stars in the night zone, crescent moon near midnight, sun glow near midday. Subtle, not distracting.
- **Bedtime marker:** A subtle line + icon on the atmosphere ring at the child's configured `usual_bedtime` field (from `core.Child` model).

### Activity Ring (outer)

- **Purpose:** All events live here on a single shared ring.
- **Duration events** (sleep, feeding, pumping): colored arcs spanning start→end time, using the activity colors defined in §1.
- **Instant events** (diaper): colored dots at their time position.
- **Overlapping:** Arcs overlay each other when concurrent (e.g. a night feed during a sleep period). Most recent events drawn last (on top).
- **Hover/tap:** Any arc or dot shows a tooltip with time, duration, and details (e.g. "Feeding: 06:30–06:55 (25m, Breast L+R)").

### Center

- **Default state:** Current time + current status (awake/sleeping + duration since last state change).
- **With active insights:** Rotates between the time/status display and the most urgent insight. Tapping scrolls to the insights card.
- **Text size:** Compact — time uses subtitle size, status uses chart text size (see §13).

### Rotation

- **NOW always at 12 o'clock** (top).
- **Counter-clockwise rotation:** Past activities drift to the left, future/upcoming time is to the right. Like reading a timeline left-to-right, wrapped around a circle.

### Data Source

- Fetches from existing API endpoints: `/api/sleep/`, `/api/feedings/`, `/api/changes/`, `/api/pumping/`, `/api/timers/`
- Time window: last 24 hours from current time.
- Auto-refreshes based on user's `dashboard_refresh_rate` setting.

### Responsive Behavior

- **Desktop/tablet:** Full circle, ~340–380px diameter.
- **Mobile:** Full circle initially. If testing reveals it's too large, fall back to a compact strip with mini-dial + key stats that expands to full circle on tap (deferred decision).

---

## 3. Insights Card

Always visible below the activity dial. Provides a consistent location for alerts and status.

### Active Insights State

- Insights grouped by severity: alert (red) → warning (amber) → info (blue).
- Each insight shows: colored severity indicator, title, body text, action button.
- Action buttons link to Quick Entry with the appropriate type pre-selected, or to the relevant topic page.
- Most urgent insight also appears in the dial center (rotating with time display).
- Individual insights dismissible (24h TTL via localStorage, as today). Dismissed insights don't appear in the dial center.

### All-Clear State

- Shows a calm "All good" message when no insights are active.
- Consistent card placement — never hidden.

### Insight Rules

Existing rules from `core/insights.py` plus enhanced threshold-based rules:

- No diaper change in X hours (configurable, default 8h)
- No feeding in X hours (age-dependent defaults)
- Low feeding count in 24h (newborns: < 8)
- No stool in X days (configurable, default 3 days)
- Sleep pattern deviations
- Growth/weight percentile alerts
- Upcoming well-child exam in the exam window

Thresholds configurable per-section via the topic page settings drawer (see §6).

### AI Summary

If LLM is configured in user settings, an expandable "AI Summary" section at the bottom of the insights card. Uses the existing `InsightsSummaryView` SSE endpoint.

---

## 4. Quick Entry Page

Own page accessible from the navigation bar. Replaces the dashboard card and the FAB.

### Layout

- **Quick Status strip** at top: last diaper (time ago), last feed (time ago + type), sleep status (awake/sleeping + duration), last pump (time ago + amount). Provides context before logging.
- **Tile grid:** Diaper, Feeding, Sleep, Pumping, Temperature, Timer, Note, Weight. Each tile uses the activity icon from §14 where applicable.
- **Instant tiles** (diaper, feeding, sleep, timer): immediate API POST, success toast.
- **Form tiles** (pumping, temperature, note, weight): navigate to full form.
- **Long-press** any tile: navigate to full form with more options.
- **Child switcher** visible in the header.

### No Redesign Needed

Existing QuickLogSheet component logic is reused. The change is structural: promoted from a dashboard card + FAB to its own routed page.

---

## 5. Topic Pages

Four activity topic pages + one child data page, accessible via the "Insights" nav submenu. Each follows a consistent pattern.

### Common Structure

- Header: child name + child switcher
- Tab bar for sub-sections (Ant Design `Tabs` component)
- Gear icon per tab → opens settings drawer for thresholds/defaults (see §6)
- Cards within each tab can be hidden/shown via a toggle, persisted per user per section
- Small link icon on each dashboard insight → opens the relevant topic page section

### 5.1 Sleep

| Tab             | Content                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------- |
| Overview        | Current status (awake/sleeping), today's total sleep, nap count, next expected sleep window |
| History         | Recent sleep list with nap/night labels, filterable                                         |
| Charts          | Sleep week chart, sleep pattern graph, sleep totals over time                               |
| Recommendations | Age-based sleep recommendations (existing engine from `core/recommendations/sleep.py`)      |

### 5.2 Feeding

| Tab      | Content                                                          |
| -------- | ---------------------------------------------------------------- |
| Overview | Today's feed count, last feed details, breastfeeding L/R balance |
| History  | Recent feedings list, filterable by method/type                  |
| Charts   | Feeding amounts, duration trends, feeding pattern, intervals     |

### 5.3 Diaper

| Tab      | Content                                           |
| -------- | ------------------------------------------------- |
| Overview | Today's count, wet/solid breakdown                |
| History  | Recent changes list                               |
| Charts   | Diaper types over time, change intervals, amounts |

### 5.4 Pumping

| Tab      | Content                                 |
| -------- | --------------------------------------- |
| Overview | Today's total volume, last pump details |
| History  | Recent pumping list with side/amount    |
| Charts   | Pumping amounts over time, daily totals |

### 5.5 Child Data

| Tab           | Content                                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview      | Growth silhouette (baby shape scaled to entered height with ruler reference) + compact percentile gauges (height, weight, head circumference, BMI — each showing P3–P97 with child's position highlighted) |
| Vorsorge      | Well-child exam tracker (see §5.5.1)                                                                                                                                                                       |
| Medical       | Blood type, birth weight/height, allergies, free-text notes (see §5.5.2)                                                                                                                                   |
| Growth Charts | Existing report graphs: weight, height, BMI, head circumference over time with percentile curves                                                                                                           |

#### 5.5.1 Well-Child Exam (Vorsorge) Tracker

A country-aware timeline of scheduled well-child exams.

**German schedule (default):** U1–U9, U7a:

- U1: at birth
- U2: 3rd–10th day
- U3: 4th–5th week
- U4: 3rd–4th month
- U5: 6th–7th month
- U6: 10th–12th month
- U7: 21st–24th month
- U7a: 34th–36th month
- U8: 46th–48th month
- U9: 60th–64th month

**Display:**

- **Status per exam:** Completed (green, with date), Upcoming/due (highlighted, with time window), Future (dimmed).
- **Time windows** calculated from the child's birth date based on the selected country's official schedule.
- **Expandable detail** per exam: collapsed by default with a chevron (▼). Tap to toggle. Shows what doctors typically check at that exam (developmental milestones, measurements, tests).
- **Mark as completed:** User can mark an exam done and record the date.
- **Insight integration:** When an exam window opens, an insight fires on the dashboard (e.g. "U5 is due — schedule between Mar 15 – Apr 15").

**Country-aware architecture:** Exam schedules are defined as pluggable data modules per country (see §9). The user selects their country in Settings (see §6), which determines:

- Which exam schedule is shown (German U-exams, UK Red Book checks, US well-child visits, etc.)
- Which exam detail questions/milestones are displayed
- (Future) Which percentile datasets are used for growth charts

Initially only the German schedule is implemented. The architecture supports adding other countries by providing a new schedule data module without code changes.

**Data model:** New `ChildExam` model: child (FK), exam_type (string, e.g. "U5" or "2-month"), country_code, completed_date (nullable), notes (text). Exam schedules are computed from birth date, not stored.

#### 5.5.2 Medical Data

New `ChildMedicalData` model with encrypted sensitive fields (see §15):

- Blood type (choice field: A+, A-, B+, B-, AB+, AB-, O+, O-)
- Birth weight (decimal, grams)
- Birth height (decimal, cm)
- Allergies (text field)
- Medical notes (text field)

Displayed as a compact card grid. All fields optional — card shows "Not recorded" for empty fields with an "Add" button.

---

## 6. Configurability

### Per-Section Card Visibility

Each topic page tab has a hide/show toggle per card. Options:

- A menu accessible from each tab/section showing available/selected cards (list with checkboxes).
- Persisted per user per section in the database. Extends the existing `dashboard_visible_items` pattern to topic pages. New field: `topic_page_visible_items` (JSON dict keyed by topic+tab).

### Per-Section Settings Drawer

Gear icon on each tab opens a settings drawer with:

- **Sleep:** Default bedtime, wake time, nap count target, alert thresholds
- **Feeding:** Alert threshold hours (age-dependent default), target feed count, default feeding method
- **Diaper:** Alert threshold hours (default 8h), stool alert days (default 3)
- **Pumping:** Daily volume target, default pump duration
- **Child Data:** Percentile dataset (WHO vs country-specific if available)

Settings stored per user per section. New model or extension of existing `UserSettings`.

### Global Settings (Settings page)

The Settings page retains: language, timezone, refresh rate, theme, LLM configuration, user account settings. New additions:

- **Country** (dropdown): Determines well-child exam schedule and (future) percentile datasets. Default: Germany. Stored on `UserSettings`.

### Removed

- Central 19-card dual-list picker in the Settings page.

---

## 7. Navigation

### Desktop (Left Sidebar)

```
[Logo] Baby Buddy

  🏠 Dashboard          (HomeOutlined)
  ➕ Quick Entry        (PlusCircleOutlined)
  💡 Insights ▸         (BulbOutlined)
      😴 Sleep           (custom moon icon)
      🍼 Feeding         (custom bottle icon)
      💧 Diaper          (custom droplet icon)
      🫧 Pumping         (custom pump icon)
      📊 Child Data      (LineChartOutlined)
  📅 Timeline           (HistoryOutlined)
  ─────────
  ❤️ Children ▸         (HeartOutlined)
      Overview
      Add Child
  ─────────
  ⚙️ Settings           (SettingOutlined)
  🚪 Logout             (LogoutOutlined)

  [Theme Switcher]
```

Insights submenu expands/collapses like the existing Children submenu. All items have icons — on collapsed sidebar or narrow viewport, only icons are shown.

### Mobile (Bottom Nav)

```
[ 🏠 ] [ ➕ ] [ 💡 ] [ 📅 ] [ ••• ]
```

Icons only on mobile bottom nav. Labels shown below icons when space permits.

- **Insights** tap opens a vertical picker sheet (bottom drawer) listing the 5 topics with their icons. User selects one → navigates to that topic page.
- **More** opens the existing bottom sheet with: Children, Settings, Theme, Logout.

### Child Switcher

Remains in the top header on all pages (as today). Switches context globally.

---

## 8. Responsive Behavior

| Element           | Desktop (lg+)                                   | Tablet (md)                | Mobile (sm/xs)                         |
| ----------------- | ----------------------------------------------- | -------------------------- | -------------------------------------- |
| Activity Dial     | Full circle, ~380px                             | Full circle, ~340px        | Full circle, may collapse if too large |
| Insights Card     | Below dial, max-width constrained               | Full width                 | Full width                             |
| Quick Entry       | Tile grid, 4 columns                            | 4 columns                  | 2 columns                              |
| Topic Pages       | Tab bar + content, comfortable spacing          | Same                       | Tabs may scroll horizontally           |
| Navigation        | Left sidebar (280px, collapsible to icons only) | Left sidebar (collapsible) | Bottom nav bar (icons only) + sheets   |
| Nav Labels        | Text + icon                                     | Text + icon or icon only   | Icon only                              |
| Percentile Gauges | Inline next to silhouette                       | Inline                     | Stacked below silhouette               |
| Well-Child Exams  | List with expanded detail                       | Same                       | Same, full-width cards                 |

---

## 9. Data Model Changes

### New Models

```python
class ChildExam(models.Model):
    child = models.ForeignKey(Child, on_delete=models.CASCADE, related_name="exams")
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPE_CHOICES)
    country_code = models.CharField(max_length=5, default="DE")
    completed_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ("child", "exam_type", "country_code")

class ChildMedicalData(models.Model):
    """Sensitive health data — encrypted at rest (see §15)."""
    child = models.OneToOneField(Child, on_delete=models.CASCADE, related_name="medical_data")
    blood_type = models.CharField(max_length=3, blank=True, choices=BLOOD_TYPE_CHOICES)
    birth_weight_g = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    birth_height_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    allergies = models.TextField(blank=True)
    medical_notes = models.TextField(blank=True)
```

### Extended Models

```python
# UserSettings — new fields
topic_page_visible_items = models.JSONField(default=dict, blank=True)
topic_page_settings = models.JSONField(default=dict, blank=True)
# Stores: {"sleep": {"alert_hours": 4, "bedtime": "19:30", ...}, "diaper": {"alert_hours": 6}, ...}
country = models.CharField(max_length=5, default="DE", choices=COUNTRY_CHOICES)
```

### Exam Schedule Architecture (pluggable, computed)

```python
# core/exam_schedules/__init__.py
# Each country module exports EXAM_SCHEDULE and EXAM_DETAILS

# core/exam_schedules/de.py
EXAM_SCHEDULE = {
    "U1": {"window": (timedelta(days=0), timedelta(days=0)), "label": _("U1 — Neugeborenen-Erstuntersuchung")},
    "U2": {"window": (timedelta(days=3), timedelta(days=10)), "label": _("U2 — 3. bis 10. Lebenstag")},
    "U3": {"window": (timedelta(weeks=4), timedelta(weeks=5)), "label": _("U3 — 4. bis 5. Lebenswoche")},
    "U4": {"window": (timedelta(days=90), timedelta(days=120)), "label": _("U4 — 3. bis 4. Lebensmonat")},
    "U5": {"window": (timedelta(days=180), timedelta(days=210)), "label": _("U5 — 6. bis 7. Lebensmonat")},
    "U6": {"window": (timedelta(days=300), timedelta(days=365)), "label": _("U6 — 10. bis 12. Lebensmonat")},
    "U7": {"window": (timedelta(days=630), timedelta(days=730)), "label": _("U7 — 21. bis 24. Lebensmonat")},
    "U7a": {"window": (timedelta(days=1020), timedelta(days=1095)), "label": _("U7a — 34. bis 36. Lebensmonat")},
    "U8": {"window": (timedelta(days=1380), timedelta(days=1460)), "label": _("U8 — 46. bis 48. Lebensmonat")},
    "U9": {"window": (timedelta(days=1800), timedelta(days=1950)), "label": _("U9 — 60. bis 64. Lebensmonat")},
}

EXAM_DETAILS = {
    "U5": [
        _("Can the child grab objects with both hands?"),
        _("Does the child turn from back to belly?"),
        _("Does the child react to sounds and voices?"),
        _("Babbling, laughing, vocalizing?"),
        _("Weight, height, head circumference measurement"),
        _("Vision and hearing test"),
    ],
    # ... other exams
}

# To add a new country: create core/exam_schedules/gb.py, us.py, etc.
# with the same EXAM_SCHEDULE and EXAM_DETAILS structure.
```

---

## 10. Migration Strategy

This is a large redesign. Recommended phased approach:

1. **Phase 1 — Activity Dial + Insights Card:** Build the new dashboard (dial + insights). Keep existing topic cards accessible via a "Classic View" toggle or the existing dashboard URL during transition.
2. **Phase 2 — Topic Pages:** Build the 4 activity topic pages with tabbed content, migrating existing card content into them.
3. **Phase 3 — Quick Entry Page + Navigation:** Promote quick entry to its own page, update navigation (sidebar + bottom nav + icons), remove FAB.
4. **Phase 4 — Child Data Enhancements:** Add growth silhouette, percentile gauges, well-child exam tracker, medical data models with encryption.
5. **Phase 5 — Cleanup:** Remove old card rendering code, central card picker, tummy time from core activities, legacy dashboard components.

Each phase produces a working, deployable state.

---

## 11. URL Structure

### Topic Pages

```
/dashboard/<child_slug>/topics/sleep/
/dashboard/<child_slug>/topics/feeding/
/dashboard/<child_slug>/topics/diaper/
/dashboard/<child_slug>/topics/pumping/
/dashboard/<child_slug>/topics/child-data/
```

### Quick Entry

```
/dashboard/<child_slug>/quick-entry/
```

Active tab within a topic page is managed client-side (React state or URL hash), not a separate Django URL.

### API Endpoints (new)

```
GET/POST  /api/children/<child_id>/medical-data/
GET/POST  /api/children/<child_id>/exams/
PATCH     /api/children/<child_id>/exams/<exam_id>/
GET       /api/children/<child_id>/topic-settings/
POST      /api/children/<child_id>/topic-settings/
GET       /api/exam-schedules/<country_code>/
```

---

## 12. Migration Notes

- **Existing `dashboard_visible_items`:** Retained for backward compatibility during phased rollout. Once Phase 5 completes, the field can be deprecated. Existing user preferences don't need migration — the new topic pages start with all cards visible by default.
- **`Child` model already has:** `birth_date`, `birth_time`, `usual_bedtime`. The proposed `ChildMedicalData.birth_weight_g` and `birth_height_cm` are genuinely new fields (no overlap).
- **Existing percentile data:** `WeightPercentile` and `HeightPercentile` models already exist in `core/models.py`. The Child Data gauges read from these.

Each phase produces a working, deployable state.

---

## 13. Typography Scale

Uniform font sizes across the entire app to ensure consistency and readability:

| Token            | Size | Weight         | Usage                                                                        |
| ---------------- | ---- | -------------- | ---------------------------------------------------------------------------- |
| `--font-title`   | 14px | 600 (semibold) | Card titles, section headings, nav labels, page titles                       |
| `--font-body`    | 12px | 400 (regular)  | Body text, subtitles, descriptions, form labels, list items                  |
| `--font-chart`   | 10px | 400 (regular)  | Chart axis labels, dial hour numbers, percentile labels, timestamps, legends |
| `--font-caption` | 14px | 500 (medium)   | Tile captions in quick entry, tab labels                                     |

These are defined as CSS custom properties on `:root` and used consistently via Ant Design's `theme.token` overrides. All components reference these tokens — no hardcoded font sizes in component styles.

**Readability rule:** Body text (12px) is the minimum for general information. Chart text (10px) is reserved for dense data contexts (axes, legends, tooltips) where space is constrained.

---

## 14. Iconography

All navigation items, activity types, and key actions use icons. Icons must work at all sizes: full nav (icon + label), collapsed nav (icon only), mobile bottom bar (icon only).

### Icon Source

Use **Ant Design icons** (`@ant-design/icons`) as the base set. For activity-specific icons not covered by Ant Design, use custom SVG icons that match the Ant Design visual style (1px stroke, rounded joins, 24×24 viewBox).

### Icon Assignments

| Element          | Icon                          | Source     |
| ---------------- | ----------------------------- | ---------- |
| Dashboard        | `HomeOutlined`                | Ant Design |
| Quick Entry      | `PlusCircleOutlined`          | Ant Design |
| Insights         | `BulbOutlined`                | Ant Design |
| Sleep            | Custom moon/stars             | Custom SVG |
| Feeding          | Custom bottle                 | Custom SVG |
| Diaper           | Custom droplet                | Custom SVG |
| Pumping          | Custom pump                   | Custom SVG |
| Child Data       | `LineChartOutlined`           | Ant Design |
| Timeline         | `HistoryOutlined`             | Ant Design |
| Children         | `HeartOutlined`               | Ant Design |
| Settings         | `SettingOutlined`             | Ant Design |
| Logout           | `LogoutOutlined`              | Ant Design |
| More (mobile)    | `EllipsisOutlined`            | Ant Design |
| Expand/collapse  | `DownOutlined` / `UpOutlined` | Ant Design |
| Section settings | `SettingOutlined` (smaller)   | Ant Design |
| Link to topic    | `RightOutlined`               | Ant Design |

### Custom Icon Guidelines

- Match Ant Design's outlined style: 1px stroke, rounded line caps, 24×24 viewBox
- Export as React components (inline SVG) for tree-shaking
- Support `currentColor` for theme-aware coloring
- Activity icons use their section color (§1) in contexts where color is meaningful (dial, cards), but `currentColor` in nav

---

## 15. Data Encryption

Sensitive health data (medical records, exam data, growth measurements) is encrypted at rest in the database.

### Approach

Use **django-encrypted-model-fields** (or `django-fernet-fields`) to encrypt sensitive fields transparently. This provides field-level encryption using Fernet symmetric encryption (AES-128-CBC) with the Django `SECRET_KEY` as the base key.

### Encrypted Fields

```python
from encrypted_model_fields.fields import EncryptedCharField, EncryptedTextField, EncryptedDecimalField

class ChildMedicalData(models.Model):
    child = models.OneToOneField(Child, on_delete=models.CASCADE, related_name="medical_data")
    blood_type = EncryptedCharField(max_length=3, blank=True)
    birth_weight_g = EncryptedDecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    birth_height_cm = EncryptedDecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    allergies = EncryptedTextField(blank=True)
    medical_notes = EncryptedTextField(blank=True)
```

### Scope

| Model                                                   | Encrypted Fields                                            | Reason                                         |
| ------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| `ChildMedicalData`                                      | All fields (blood_type, weights, heights, allergies, notes) | Health data                                    |
| `ChildExam`                                             | `notes` field only                                          | May contain health observations                |
| Existing `Weight`, `Height`, `BMI`, `HeadCircumference` | Not encrypted (Phase 1)                                     | Existing data; can be migrated later if needed |

### Trade-offs

- Encrypted fields cannot be filtered/sorted at the database level (queries happen in Python). This is acceptable because medical data is always fetched per-child, never queried across children.
- Requires `django-encrypted-model-fields` added to `requirements.txt`.
- If the `SECRET_KEY` changes, encrypted data becomes unreadable. Document this risk in deployment docs.

---

## 16. Theming

The app supports three theme modes: **Dark**, **Light**, and **System** (auto-switches based on OS preference). Both themes must work across all components.

### Dark Theme (night/default)

Optimized for low-light use (night feeds, bedtime logging):

- Background: `#020617` (near-black) → `#0f172a` (cards)
- Text: `#f1f5f9` (primary), `#94a3b8` (secondary)
- Borders: `#1e3a5f`
- Activity colors remain consistent (§1)

### Light Theme (daytime)

Optimized for readability in daylight:

- Background: `#ffffff` → `#f8fafc` (cards)
- Text: `#0f172a` (primary), `#64748b` (secondary)
- Borders: `#e2e8f0`
- Activity colors adjusted for contrast on light backgrounds (slightly darker/more saturated variants)

### Theme Tokens

All color values defined as CSS custom properties (`--app-*` prefix, already established in the codebase). Components must use these variables — no hardcoded hex values. Both themes override the same set of tokens:

```css
:root[data-theme="dark"] {
  --app-bg-base: #020617;
  --app-bg-card: #0f172a;
  --app-text-primary: #f1f5f9;
  --app-text-secondary: #94a3b8;
  --app-border: #1e3a5f;
  /* ... activity colors ... */
}

:root[data-theme="light"] {
  --app-bg-base: #ffffff;
  --app-bg-card: #f8fafc;
  --app-text-primary: #0f172a;
  --app-text-secondary: #64748b;
  --app-border: #e2e8f0;
  /* ... activity colors (contrast-adjusted) ... */
}
```

### Activity Dial Theming

The dial atmosphere ring uses the same day/night gradient regardless of app theme (it represents real-world time, not UI preference). The center, labels, and activity ring adapt to the current theme via CSS variables.
