# Timeline & Growth Page — Implementation Plan (2026-03-31)

## Overview
Three parallel workstreams:
1. Profile Timeline SVG fixes + label rename
2. Child detail page (/children/<slug>/) cleanup
3. New "General" growth/percentile page under Insights nav

---

## A. Profile Timeline — SVG fixes + rename

### A1. Rename "Profile Timeline" → "Timeline"
Files:
- `babybuddy/views.py` — `_base_strings()`: `"profileTimeline": _("Timeline")`
- `core/views.py` — `_build_ant_child_detail_bootstrap` strings dict
- `core/views.py` — `ChildProfileTimeline.get_context_data` strings dict
- `frontend/src/components/AppShell.jsx` — nav label reads `s.profileTimeline || s.timeline` (already correct, just rename string)
- German PO file

### A2. Fix empty top space (pad.top dynamic)
In `ProfileTimelinePages.jsx` `TimelineSVG`:
- If `heightMeasurements.length === 0`: `pad.top = 30` (no silhouette area)
- Else: `pad.top = silhouetteMaxH + 40` (space for silhouettes)
- `axisY = pad.top + 10` (was `pad.top + silhouetteMaxH + 10` — silhouetteMaxH is now inside pad.top)

Wait — current layout: `pad.top = 150`, `axisY = pad.top + silhouetteMaxH + 10 = 280`.
Silhouettes are drawn from `axisY - hPx` to `axisY` (bottom-anchored).
So `axisY` is the axis line. `pad.top` is space above the axis for today marker / exam labels / silhouettes.

New logic:
- `silhouetteMaxH = 120` (unchanged)
- `padTopWithSilhouettes = silhouetteMaxH + 50` (50px for exam labels above axis)
- `padTopEmpty = 30`
- `pad.top = heightMeasurements.length > 0 ? padTopWithSilhouettes : padTopEmpty`
- `axisY = pad.top + 10` — NO. Let me re-read the code.

Actually looking again:
```
pad = { top: 150, ... }
axisY = pad.top + silhouetteMaxH + 10  // = 150 + 120 + 10 = 280
```

`pad.top` here is NOT the space above the axis — it's something else. The `axisY` formula adds `silhouetteMaxH` on top of `pad.top`. So the TOTAL canvas height above the axis = `axisY = 280`. 

The fix: make `pad.top` smaller when no measurements. Currently `pad.top = 150` was meant to reserve space for exam code labels (staggered at `examY - 20` and `examY - 33` above `examY`). `examY = axisY - 28`. So exam codes appear at `axisY - 28 - 33 = axisY - 61`.

Without silhouettes: we only need `axisY` high enough for exam labels.
- With measurements: `axisY = silhouetteMaxH + 60` = 180 (60px for exam labels + today text above axis)
- Without measurements: `axisY = 60` (just exam labels)
- `pad.top` can become irrelevant if we derive `axisY` directly

New approach:
```js
const hasHeightData = heightMeasurements.length > 0;
const axisY = hasHeightData ? silhouetteMaxH + 60 : 60;
const pad = { left: 48, right: 32, top: axisY + 10, bottom: 60 };
```

Wait, `pad.top` is used to set the SVG's top offset for the "today" vertical line:
```js
<line x1={todayX} y1={pad.top - 14} ...>
```
This should probably be `y1={0}` or `y1={10}` anyway. Let me just simplify:
- `axisY` = vertical position of timeline axis
- Everything is derived from `axisY`
- `pad.top` is just used to clip the today line at top

Simplified:
```js
const hasHeightData = heightMeasurements.length > 0;
const silhouetteArea = hasHeightData ? silhouetteMaxH + 20 : 0;
const headerArea = 50; // space for exam codes + today label
const axisY = headerArea + silhouetteArea;
```

### A3. Remove future exams (> 2 months ahead)
In `core/views.py` `ChildProfileTimeline.get_context_data`:
```python
from datetime import date as date_type, timedelta
child_age_days = (date_type.today() - child.birth_date).days if child.birth_date else 0
cutoff_days = child_age_days + 60
for et in exam_types:
    if et.age_min_days > cutoff_days:
        continue
    ...
```

### A4. X-axis: today+2mo end, 6-month ticks with actual date
In `ProfileTimelinePages.jsx` `TimelineSVG`:
```js
const maxDate = today.add(2, "month");
const endDate = maxDate;
const totalDays = endDate.diff(birthDate, "day");

// 6-month ticks
const sixMonthTicks = [];
for (let m = 0; m <= ageMonthsTotal + 3; m += 6) {
  const td = birthDate.add(m, "month");
  if (td.isAfter(endDate.add(1, "day"))) break;
  const label = m === 0 ? (strings.born || "Birth") : `${td.format("DD.MM.YY")} (${m}m)`;
  sixMonthTicks.push({ x: dateToX(td), label });
}
```
Remove old `yearTicks` and `quarterTicks`.

---

## B. Child detail page cleanup

### B1. Remove child selector from header
In `_build_ant_child_detail_bootstrap` in `core/views.py`:
```python
"childSwitcher": None,  # remove selector on child detail page
```

### B2. Remove buttons: Dashboard, Timeline, Reports, Profile Timeline
In `ChildDetailPage` in `GeneralPages.jsx`, remove:
- Dashboard button
- Timeline button  
- Reports button
- Profile Timeline button

### B3. Normalize Examinations button
Change Examinations button to match Edit/Delete style:
```jsx
{bootstrap.urls.examinations && (
  <Button href={bootstrap.urls.examinations} icon={<MedicineBoxOutlined />}>
    {bootstrap.strings.examinations}
  </Button>
)}
```

---

## C. New "General" growth page

### C1. Django view `ChildGeneralPage` in `core/views.py`
```python
class ChildGeneralPage(LoginRequiredMixin, DetailView):
    model = models.Child
    template_name = "babybuddy/ant_app.html"

    def get_object(self):
        return models.Child.objects.get(slug=self.kwargs["slug"])

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        child = self.object
        sex = "girl" if child.gender == "female" else "boy"
        birth_date = child.birth_date
        today = date.today()
        child_age_days = (today - birth_date).days if birth_date else 0
        max_days = child_age_days + 90  # buffer for chart

        # Height measurements
        heights = [{"date": h.date.isoformat(), "cm": h.height}
                   for h in child.height.order_by("date")]
        # Weight measurements
        weights = [{"date": w.date.isoformat(), "kg": float(w.weight)}
                   for w in child.weight.order_by("date")]

        # BMI entries: pair each weight entry with nearest height
        height_list = [(h.date, h.height) for h in child.height.order_by("date")]
        bmi_entries = []
        for w in child.weight.order_by("date"):
            if not height_list:
                break
            closest_h = min(height_list, key=lambda x: abs((x[0] - w.date).days))
            h_cm = closest_h[1]
            if h_cm > 0:
                bmi = float(w.weight) / (h_cm / 100) ** 2
                bmi_entries.append({"date": w.date.isoformat(), "bmi": round(bmi, 1)})

        # Percentile curves
        from core.models import HeightPercentile, WeightPercentile
        h_perc = list(
            HeightPercentile.objects.filter(sex=sex)
            .filter(age_in_days__lte=timedelta(days=max_days))
            .order_by("age_in_days")
            .values("age_in_days", "p3", "p15", "p50", "p85", "p97")
        )
        w_perc = list(
            WeightPercentile.objects.filter(sex=sex)
            .filter(age_in_days__lte=timedelta(days=max_days))
            .order_by("age_in_days")
            .values("age_in_days", "p3", "p15", "p50", "p85", "p97")
        )
        def serialize_perc(row):
            days = row["age_in_days"].days if hasattr(row["age_in_days"], "days") else int(row["age_in_days"])
            return {"days": days, "p3": row["p3"], "p15": row["p15"], "p50": row["p50"], "p85": row["p85"], "p97": row["p97"]}

        context["ant_bootstrap"] = {
            "pageType": "child-general",
            "currentPath": self.request.path,
            "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
            "csrfToken": get_token(self.request),
            "user": {"displayName": _display_name(self.request.user)},
            "urls": {
                **_nav_urls(),
                "childDetail": reverse("core:child", kwargs={"slug": child.slug}),
            },
            "childSwitcher": _build_child_switcher(self.request, current_child=child),
            "strings": {
                **_list_strings(),
                "general": _("General"),
                "height": _("Height"),
                "weight": _("Weight"),
                "bmi": _("BMI"),
                "date": _("Date"),
                "noData": _("No data recorded yet"),
                "back": _("Back"),
                "percentile": _("Percentile"),
            },
            "childDetail": {
                "name": str(child),
                "slug": child.slug,
                "birthDate": birth_date.isoformat() if birth_date else None,
                "gender": child.gender,
            },
            "heights": heights,
            "weights": weights,
            "bmiEntries": bmi_entries,
            "heightPercentiles": [serialize_perc(r) for r in h_perc],
            "weightPercentiles": [serialize_perc(r) for r in w_perc],
        }
        return context
```

### C2. URL in `core/urls.py`
```python
path("children/<str:slug>/general/", views.ChildGeneralPage.as_view(), name="child-general"),
```

### C3. React component `ChildGeneralPage` in `ProfileTimelinePages.jsx`
SVG percentile chart for each metric (height, weight, BMI):
- X-axis: age in months (0 to max child age + 3)
- Y-axis: measurement value
- P3/P15/P50/P85/P97 curves (semi-transparent filled bands between p15/p85, dashed line for p3/p97, solid for p50)
- Child's actual dots overlaid

### C4. App.jsx route
```jsx
if (bootstrap.pageType === "child-general") {
  return <ChildGeneralPage bootstrap={bootstrap} />;
}
```

### C5. AppShell — add General to Insights submenu
In `topicPages` fallback construction (when no bootstrap.urls.topicPages):
```js
general: `/children/${selectedSlug}/general/`,
```
In `insightsMenuItem.children`:
```js
{ key: topicPages.general, label: s.generalLabel || "General" },
```
Also add to mobile bottom nav Insights popover.

---

## Key data notes
- `HeightPercentile.age_in_days` is a Django `DurationField` (Python `timedelta`)
  - In Python: `.days` attribute
  - Serialized as: `timedelta(days=N)` — must call `.days` to get int
- Gender mapping: `child.gender == "female"` → `sex = "girl"`, else `sex = "boy"`
- Height unit: cm (`h.height`)
- Weight unit: kg (`w.weight`, Decimal field)
- BMI formula: `weight_kg / (height_m)^2`

---

## Implementation order
1. core/views.py — exam filter + ChildGeneralPage
2. core/urls.py — add general URL
3. GeneralPages.jsx — ChildDetailPage cleanup
4. ProfileTimelinePages.jsx — SVG fixes + ChildGeneralPage component
5. AppShell.jsx — rename label + General in menu
6. App.jsx — add route
7. Build + commit + push
