# Phase 2: Topic Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 activity topic pages (Sleep, Feeding, Diaper, Pumping) with tabbed sub-sections (Overview, History, Charts), accessible from the sidebar nav under an "Insights" submenu.

**Architecture:** Each topic page is a single Django view (`ChildTopicView`) that bootstraps a React `TopicPage` component with `pageType: "topic-detail"`. The Overview tab shows summary stats computed in the Django bootstrap. The History tab renders a filterable list using client-side API fetches. The Charts tab embeds existing Plotly report graphs via the established `html + js` pattern. Navigation is updated with a collapsible "Insights" submenu containing all 4 topic links.

**Tech Stack:** React 18, Ant Design 5 (Tabs, Table, Card, Statistic), Django 5, existing REST API endpoints, existing Plotly graph functions from `reports/graphs/`.

**Spec:** `docs/superpowers/specs/2026-03-19-dashboard-redesign-design.md` §5, §7, §11

**Scope note:** Child Data (spec §5.5) is deferred to Phase 4 per the spec's migration strategy (§10), as it requires new models (`ChildExam`, `ChildMedicalData`) and encryption infrastructure.

---

## File Structure

### New Files

| File                                | Responsibility                                                         |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `frontend/src/pages/TopicPages.jsx` | React component: tabbed topic page with Overview, History, Charts tabs |
| `frontend/src/pages/TopicPages.css` | Topic page styles                                                      |

### Modified Files

| File                                   | Change                                         |
| -------------------------------------- | ---------------------------------------------- |
| `dashboard/urls.py`                    | Add topic page URL pattern                     |
| `dashboard/views.py`                   | Add `ChildTopicView` class + bootstrap builder |
| `frontend/src/App.jsx`                 | Add `topic-detail` route to `RoutedPage`       |
| `frontend/src/components/AppShell.jsx` | Add Insights submenu with 4 topic links to nav |
| `locale/de/LC_MESSAGES/django.po`      | German translations for topic page strings     |

---

## Task 1: Django URL + View for Topic Pages

**Files:**

- Modify: `dashboard/urls.py`
- Modify: `dashboard/views.py`

- [ ] **Step 1: Add URL pattern**

In `dashboard/urls.py`, add the topic page route:

```python
path(
    "children/<str:slug>/topics/<str:topic>/",
    views.ChildTopicView.as_view(),
    name="child-topic",
),
```

- [ ] **Step 2: Add topic view bootstrap builder**

In `dashboard/views.py`, add a function `_build_topic_overview(child, topic)` that computes overview stats for each topic. Add it after the existing `_build_dial_activities` function (~line 400).

```python
VALID_TOPICS = {"sleep", "feeding", "diaper", "pumping"}


def _build_topic_overview(child, topic):
    """Compute overview statistics for a topic page."""
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)

    if topic == "sleep":
        sleeps_today = models.Sleep.objects.filter(
            child=child, start__gte=today_start
        )
        total_minutes = sum(
            (s.duration.total_seconds() / 60 if s.duration else 0)
            for s in sleeps_today
        )
        nap_count = sleeps_today.filter(nap=True).count()
        last_sleep = (
            models.Sleep.objects.filter(child=child).order_by("-end").first()
        )
        return {
            "totalMinutesToday": round(total_minutes),
            "napCountToday": nap_count,
            "nightSleepCountToday": sleeps_today.filter(nap=False).count(),
            "lastSleep": {
                "start": last_sleep.start.isoformat(),
                "end": last_sleep.end.isoformat() if last_sleep.end else None,
                "nap": last_sleep.nap,
                "duration": last_sleep.duration.total_seconds() if last_sleep.duration else None,
            }
            if last_sleep
            else None,
        }

    if topic == "feeding":
        feedings_today = models.Feeding.objects.filter(
            child=child, start__gte=today_start
        )
        total_count = feedings_today.count()
        methods = {}
        for f in feedings_today:
            m = f.method or "unknown"
            methods[m] = methods.get(m, 0) + 1
        last_feeding = (
            models.Feeding.objects.filter(child=child).order_by("-end").first()
        )
        return {
            "countToday": total_count,
            "methodBreakdown": methods,
            "lastFeeding": {
                "start": last_feeding.start.isoformat(),
                "end": last_feeding.end.isoformat() if last_feeding.end else None,
                "method": last_feeding.method,
                "amount": float(last_feeding.amount) if last_feeding.amount else None,
                "duration": last_feeding.duration.total_seconds() if last_feeding.duration else None,
            }
            if last_feeding
            else None,
        }

    if topic == "diaper":
        changes_today = models.DiaperChange.objects.filter(
            child=child, time__gte=today_start
        )
        wet_count = changes_today.filter(wet=True).count()
        solid_count = changes_today.filter(solid=True).count()
        last_change = (
            models.DiaperChange.objects.filter(child=child)
            .order_by("-time")
            .first()
        )
        return {
            "countToday": changes_today.count(),
            "wetToday": wet_count,
            "solidToday": solid_count,
            "lastChange": {
                "time": last_change.time.isoformat(),
                "wet": last_change.wet,
                "solid": last_change.solid,
                "color": last_change.color or "",
            }
            if last_change
            else None,
        }

    if topic == "pumping":
        pumpings_today = models.Pumping.objects.filter(
            child=child, start__gte=today_start
        )
        total_amount = sum(
            float(p.amount) for p in pumpings_today if p.amount
        )
        last_pump = (
            models.Pumping.objects.filter(child=child).order_by("-end").first()
        )
        return {
            "countToday": pumpings_today.count(),
            "totalAmountToday": round(total_amount, 1),
            "lastPump": {
                "start": last_pump.start.isoformat(),
                "end": last_pump.end.isoformat() if last_pump.end else None,
                "amount": float(last_pump.amount) if last_pump.amount else None,
                "duration": last_pump.duration.total_seconds() if last_pump.duration else None,
            }
            if last_pump
            else None,
        }

    return {}
```

- [ ] **Step 3: Add topic chart data builder**

Below `_build_topic_overview`, add a function that generates Plotly charts for the Charts tab. This reuses the existing graph functions from `reports/graphs/`.

```python
def _build_topic_charts(child, topic, request):
    """Generate Plotly chart HTML+JS for the Charts tab."""
    from reports import graphs as report_graphs

    charts = []
    plotly_locale = (
        "de"
        if str(getattr(request, "LANGUAGE_CODE", "en")).startswith("de")
        else "en-US"
    )

    if topic == "sleep":
        sleeps = models.Sleep.objects.filter(child=child).order_by("-start")[:200]
        if sleeps:
            html, js = report_graphs.sleep_totals.sleep_totals(sleeps)
            charts.append({"key": "sleep-totals", "title": str(_("Sleep Totals")), "html": html, "js": js})
            html, js = report_graphs.sleep_pattern.sleep_pattern(sleeps)
            charts.append({"key": "sleep-pattern", "title": str(_("Sleep Pattern")), "html": html, "js": js})

    elif topic == "feeding":
        feedings = models.Feeding.objects.filter(child=child).order_by("-start")[:200]
        if feedings:
            html, js = report_graphs.feeding_duration.feeding_duration(feedings)
            charts.append({"key": "feeding-duration", "title": str(_("Feeding Duration")), "html": html, "js": js})
            html, js = report_graphs.feeding_amounts.feeding_amounts(feedings)
            charts.append({"key": "feeding-amounts", "title": str(_("Feeding Amounts")), "html": html, "js": js})

    elif topic == "diaper":
        changes = models.DiaperChange.objects.filter(child=child).order_by("-time")[:200]
        if changes:
            html, js = report_graphs.diaperchange_types.diaperchange_types(changes)
            charts.append({"key": "diaper-types", "title": str(_("Diaper Types")), "html": html, "js": js})
            html, js = report_graphs.diaperchange_amounts.diaperchange_amounts(changes)
            charts.append({"key": "diaper-amounts", "title": str(_("Diaper Amounts")), "html": html, "js": js})

    elif topic == "pumping":
        pumpings = models.Pumping.objects.filter(child=child).order_by("-start")[:200]
        if pumpings:
            html, js = report_graphs.pumping_amounts.pumping_amounts(pumpings)
            charts.append({"key": "pumping-amounts", "title": str(_("Pumping Amounts")), "html": html, "js": js})

    return {"charts": charts, "plotlyLocale": plotly_locale}
```

- [ ] **Step 4: Add the ChildTopicView class**

```python
class ChildTopicView(LoginRequiredMixin, DetailView):
    model = models.Child
    slug_field = "slug"

    def get(self, request, *args, **kwargs):
        topic = kwargs.get("topic", "")
        if topic not in VALID_TOPICS:
            raise Http404

        child = self.get_object()
        overview = _build_topic_overview(child, topic)
        chart_data = _build_topic_charts(child, topic, request)

        topic_urls = {}
        for t in VALID_TOPICS:
            topic_urls[t] = reverse(
                "dashboard:child-topic", kwargs={"slug": child.slug, "topic": t}
            )

        context = {
            "ant_page_title": f"{child} — {topic.title()}",
            "ant_bootstrap": {
                "pageType": "topic-detail",
                "currentPath": request.path,
                "locale": getattr(request, "LANGUAGE_CODE", "en"),
                "csrfToken": get_token(request),
                "user": {"displayName": _display_name(request.user)},
                "urls": {
                    **_build_nav_urls(request),
                    "addChild": reverse("core:child-add"),
                    "childDashboard": reverse(
                        "dashboard:dashboard-child",
                        kwargs={"slug": child.slug},
                    ),
                    "graphJs": "/static/babybuddy/js/graph.js",
                    "topicPages": topic_urls,
                },
                "currentChild": {
                    "id": child.id,
                    "slug": child.slug,
                    "name": str(child),
                    "birthDateLabel": _format_full_date(child.birth_date),
                    "pictureUrl": request.build_absolute_uri(
                        _child_picture_url(child)
                    ),
                },
                "childSwitcher": _build_child_switcher(
                    request, current_child=child
                ),
                "strings": {
                    **_build_ant_strings(),
                    "overview": str(_("Overview")),
                    "history": str(_("History")),
                    "charts": str(_("Charts")),
                    "today": str(_("Today")),
                    "last": str(_("Last")),
                    "total": str(_("Total")),
                    "count": str(_("Count")),
                    "naps": str(_("Naps")),
                    "nightSleep": str(_("Night sleep")),
                    "wet": str(_("Wet")),
                    "solid": str(_("Solid")),
                    "amount": str(_("Amount")),
                    "method": str(_("Method")),
                    "duration": str(_("Duration")),
                    "start": str(_("Start")),
                    "end": str(_("End")),
                    "type": str(_("Type")),
                    "noData": str(_("No data yet")),
                    "loadMore": str(_("Load more")),
                },
                "messages": _serialize_messages(request),
                "topicPage": {
                    "topic": topic,
                    "childId": child.id,
                    "childSlug": child.slug,
                    "overview": overview,
                    **chart_data,
                },
            },
        }
        return render(request, "babybuddy/ant_app.html", context)
```

- [ ] **Step 5: Add necessary imports to dashboard/views.py**

At the top of `dashboard/views.py`, add these imports (near the existing `from babybuddy.views import _serialize_messages` at line 22):

```python
from django.http import Http404
from core.views import _build_child_switcher
```

Note: `_format_full_date` and `_child_picture_url` already exist in `dashboard/views.py` (lines 31 and 41).

- [ ] **Step 6: Commit**

```bash
git add dashboard/urls.py dashboard/views.py
git commit -m "feat: add Django topic page view with overview stats and chart data"
```

---

## Task 2: React Router + TopicPage Component

**Files:**

- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/pages/TopicPages.jsx`
- Create: `frontend/src/pages/TopicPages.css`

- [ ] **Step 1: Add lazy import and route in App.jsx**

```javascript
// After the InsightsPage import (~line 83):
const TopicPage = lazy(() =>
  import("./pages/TopicPages").then((module) => ({
    default: module.TopicPage,
  })),
);

// In RoutedPage, before the default return (~line 150):
if (bootstrap.pageType === "topic-detail") {
  return <TopicPage bootstrap={bootstrap} />;
}
```

- [ ] **Step 2: Create TopicPages.css**

```css
/* ── Topic Pages ─────────────────────────────────────────────── */

.topic-page {
  max-width: 960px;
  margin: 0 auto;
}

.topic-page__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.topic-page__icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
}

.topic-page__overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.topic-page__chart-card {
  margin-bottom: 16px;
}

.topic-page__chart-card .ant-report-graph {
  min-height: 300px;
}
```

- [ ] **Step 3: Create TopicPages.jsx — Overview tab**

```jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  Empty,
  Grid,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  createApiClient,
  asItems,
  formatAppDateTime,
  formatAppTime,
  formatDurationCompact,
  durationMinutesFromValue,
  SECTION_META,
} from "../lib/app-utils";
import "./TopicPages.css";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const TOPIC_CONFIG = {
  sleep: {
    label: "Sleep",
    color: "#fbbf24",
    apiPath: "/api/sleep/",
    timeField: "start",
    columns: (s) => [
      {
        title: s.start,
        dataIndex: "start",
        render: (v) => formatAppDateTime(v),
      },
      {
        title: s.end,
        dataIndex: "end",
        render: (v) => (v ? formatAppDateTime(v) : "—"),
      },
      {
        title: s.duration,
        dataIndex: "duration",
        render: (v) => {
          const mins = durationMinutesFromValue(v);
          return mins ? formatDurationCompact(mins * 60) : "—";
        },
      },
      {
        title: s.type,
        dataIndex: "nap",
        render: (v) =>
          v ? (
            <Tag color="blue">{s.naps}</Tag>
          ) : (
            <Tag color="purple">{s.nightSleep}</Tag>
          ),
      },
    ],
  },
  feeding: {
    label: "Feeding",
    color: "#38bdf8",
    apiPath: "/api/feedings/",
    timeField: "start",
    columns: (s) => [
      {
        title: s.start,
        dataIndex: "start",
        render: (v) => formatAppDateTime(v),
      },
      {
        title: s.end,
        dataIndex: "end",
        render: (v) => (v ? formatAppDateTime(v) : "—"),
      },
      {
        title: s.method,
        dataIndex: "method",
        render: (v) => v || "—",
      },
      {
        title: s.amount,
        dataIndex: "amount",
        render: (v) => (v ? `${v} ml` : "—"),
      },
      {
        title: s.duration,
        dataIndex: "duration",
        render: (v) => {
          const mins = durationMinutesFromValue(v);
          return mins ? formatDurationCompact(mins * 60) : "—";
        },
      },
    ],
  },
  diaper: {
    label: "Diaper",
    color: "#ff6b8b",
    apiPath: "/api/changes/",
    timeField: "time",
    columns: (s) => [
      {
        title: s.start,
        dataIndex: "time",
        render: (v) => formatAppDateTime(v),
      },
      {
        title: s.type,
        key: "type",
        render: (_, rec) => {
          const parts = [];
          if (rec.wet) parts.push(s.wet);
          if (rec.solid) parts.push(s.solid);
          return parts.join(" + ") || "—";
        },
      },
      {
        title: s.amount,
        dataIndex: "amount",
        render: (v) => (v ? `${v}` : "—"),
      },
    ],
  },
  pumping: {
    label: "Pumping",
    color: "#c084fc",
    apiPath: "/api/pumping/",
    timeField: "start",
    columns: (s) => [
      {
        title: s.start,
        dataIndex: "start",
        render: (v) => formatAppDateTime(v),
      },
      {
        title: s.end,
        dataIndex: "end",
        render: (v) => (v ? formatAppDateTime(v) : "—"),
      },
      {
        title: s.amount,
        dataIndex: "amount",
        render: (v) => (v ? `${v} ml` : "—"),
      },
      {
        title: s.duration,
        dataIndex: "duration",
        render: (v) => {
          const mins = durationMinutesFromValue(v);
          return mins ? formatDurationCompact(mins * 60) : "—";
        },
      },
    ],
  },
};

/* ── Overview Tab ─────────────────────────────────────────────── */

function OverviewTab({ topic, overview, strings }) {
  if (!overview) return <Empty description={strings.noData} />;

  if (topic === "sleep") {
    const totalHours = overview.totalMinutesToday
      ? formatDurationCompact(overview.totalMinutesToday * 60)
      : "0m";
    return (
      <div className="topic-page__overview-grid">
        <Card size="small">
          <Statistic
            title={`${strings.total} ${strings.today}`}
            value={totalHours}
          />
        </Card>
        <Card size="small">
          <Statistic title={strings.naps} value={overview.napCountToday} />
        </Card>
        <Card size="small">
          <Statistic
            title={strings.nightSleep}
            value={overview.nightSleepCountToday}
          />
        </Card>
        {overview.lastSleep && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastSleep.start)}
              suffix={
                overview.lastSleep.duration
                  ? `(${formatDurationCompact(overview.lastSleep.duration)})`
                  : ""
              }
            />
          </Card>
        )}
      </div>
    );
  }

  if (topic === "feeding") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small">
          <Statistic
            title={`${strings.count} ${strings.today}`}
            value={overview.countToday}
          />
        </Card>
        {overview.methodBreakdown &&
          Object.entries(overview.methodBreakdown).map(([method, count]) => (
            <Card size="small" key={method}>
              <Statistic title={method} value={count} />
            </Card>
          ))}
        {overview.lastFeeding && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastFeeding.start)}
              suffix={overview.lastFeeding.method || ""}
            />
          </Card>
        )}
      </div>
    );
  }

  if (topic === "diaper") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small">
          <Statistic
            title={`${strings.count} ${strings.today}`}
            value={overview.countToday}
          />
        </Card>
        <Card size="small">
          <Statistic title={strings.wet} value={overview.wetToday} />
        </Card>
        <Card size="small">
          <Statistic title={strings.solid} value={overview.solidToday} />
        </Card>
        {overview.lastChange && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastChange.time)}
            />
          </Card>
        )}
      </div>
    );
  }

  if (topic === "pumping") {
    return (
      <div className="topic-page__overview-grid">
        <Card size="small">
          <Statistic
            title={`${strings.count} ${strings.today}`}
            value={overview.countToday}
          />
        </Card>
        <Card size="small">
          <Statistic
            title={`${strings.total} ${strings.amount}`}
            value={overview.totalAmountToday}
            suffix="ml"
          />
        </Card>
        {overview.lastPump && (
          <Card size="small">
            <Statistic
              title={strings.last}
              value={formatAppTime(overview.lastPump.start)}
              suffix={
                overview.lastPump.amount ? `${overview.lastPump.amount} ml` : ""
              }
            />
          </Card>
        )}
      </div>
    );
  }

  return null;
}

/* ── History Tab ──────────────────────────────────────────────── */

function HistoryTab({ topic, childId, csrfToken, strings }) {
  const api = useRef(createApiClient(csrfToken));
  const config = TOPIC_CONFIG[topic];
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(
    async (pageNum) => {
      setLoading(true);
      const offset = (pageNum - 1) * pageSize;
      const orderField = config.timeField === "time" ? "-time" : "-start";
      const url = `${config.apiPath}?child=${childId}&ordering=${orderField}&limit=${pageSize}&offset=${offset}`;
      try {
        const res = await api.current.get(url);
        setData(asItems(res));
        setTotal(res?.count ?? 0);
      } catch {
        setData([]);
      }
      setLoading(false);
    },
    [childId, config, pageSize],
  );

  useEffect(() => {
    fetchData(page);
  }, [fetchData, page]);

  return (
    <Table
      dataSource={data}
      columns={config.columns(strings)}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={{
        current: page,
        pageSize,
        total,
        onChange: setPage,
        showSizeChanger: false,
      }}
      scroll={{ x: true }}
    />
  );
}

/* ── Charts Tab ───────────────────────────────────────────────── */

function ChartsTab({ charts, plotlyLocale, graphJsUrl, strings }) {
  const [loaded, setLoaded] = useState(false);
  const chartRefs = useRef({});

  useEffect(() => {
    if (!charts || charts.length === 0) return;

    // Load Plotly JS if not already loaded
    if (window.Plotly) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = graphJsUrl;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [graphJsUrl, charts]);

  useEffect(() => {
    if (!loaded || !charts) return;

    if (window.Plotly && plotlyLocale) {
      window.Plotly.setPlotConfig({ locale: plotlyLocale });
    }

    for (const chart of charts) {
      const ref = chartRefs.current[chart.key];
      if (!ref) continue;
      ref.innerHTML = chart.html;
      if (chart.js) {
        try {
          const scriptContent = chart.js
            .replace(/<script[^>]*>/gi, "")
            .replace(/<\/script>/gi, "");
          new Function(scriptContent)();
        } catch (e) {
          console.warn("Chart render error:", e);
        }
      }
    }
  }, [loaded, charts, plotlyLocale]);

  if (!charts || charts.length === 0) {
    return <Empty description={strings.noData} />;
  }

  if (!loaded) {
    return (
      <Spin size="large" style={{ display: "block", margin: "40px auto" }} />
    );
  }

  return (
    <>
      {charts.map((chart) => (
        <Card
          key={chart.key}
          title={chart.title}
          className="topic-page__chart-card ant-section-card"
          size="small"
        >
          <div
            className="ant-report-graph"
            ref={(el) => {
              chartRefs.current[chart.key] = el;
            }}
          />
        </Card>
      ))}
    </>
  );
}

/* ── Main TopicPage ───────────────────────────────────────────── */

export function TopicPage({ bootstrap }) {
  const { topicPage, strings } = bootstrap;
  const { topic, overview, charts, plotlyLocale, childId } = topicPage;
  const config = TOPIC_CONFIG[topic];
  const s = strings || {};

  const tabItems = [
    {
      key: "overview",
      label: s.overview || "Overview",
      children: <OverviewTab topic={topic} overview={overview} strings={s} />,
    },
    {
      key: "history",
      label: s.history || "History",
      children: (
        <HistoryTab
          topic={topic}
          childId={childId}
          csrfToken={bootstrap.csrfToken}
          strings={s}
        />
      ),
    },
    {
      key: "charts",
      label: s.charts || "Charts",
      children: (
        <ChartsTab
          charts={charts}
          plotlyLocale={plotlyLocale}
          graphJsUrl={bootstrap.urls.graphJs}
          strings={s}
        />
      ),
    },
  ];

  return (
    <div className="topic-page">
      <div className="topic-page__header">
        <div className="topic-page__icon" style={{ background: config.color }}>
          {topic === "sleep" && "☽"}
          {topic === "feeding" && "🍼"}
          {topic === "diaper" && "💧"}
          {topic === "pumping" && "⊛"}
        </div>
        <Title level={4} style={{ margin: 0 }}>
          {s[`${topic}Label`] || config.label}
        </Title>
      </div>
      <Tabs items={tabItems} size="large" />
    </div>
  );
}
```

- [ ] **Step 4: Format and build**

```bash
cd frontend && npx prettier --write src/pages/TopicPages.jsx src/pages/TopicPages.css src/App.jsx && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/TopicPages.jsx frontend/src/pages/TopicPages.css frontend/src/App.jsx
git commit -m "feat: add TopicPage component with Overview, History, Charts tabs"
```

---

## Task 3: Navigation — Add Insights Submenu

**Files:**

- Modify: `frontend/src/components/AppShell.jsx`
- Modify: `dashboard/views.py` (add topic URLs to all dashboard bootstraps)

- [ ] **Step 1: Add topic page URLs to the child dashboard bootstrap**

In `dashboard/views.py`, in the `ChildDashboard.get_context_data` method, add topic URLs to the `urls` dict:

```python
# Inside the bootstrap dict, in the "urls" section, add:
"topicPages": {
    t: reverse("dashboard:child-topic", kwargs={"slug": self.object.slug, "topic": t})
    for t in VALID_TOPICS
},
```

- [ ] **Step 2: Update AppShell navItems to include Insights submenu**

In `AppShell.jsx`, modify the `navItems` array to include an "Insights" submenu when `bootstrap.urls.topicPages` exists:

```javascript
// Build the insights submenu from bootstrap.urls.topicPages
const topicPages = bootstrap.urls.topicPages;
const insightsMenuItem = topicPages
  ? {
      key: "insights-menu",
      icon: <BulbOutlined />,
      label: bootstrap.strings.insights || "Insights",
      children: [
        {
          key: topicPages.sleep,
          label: bootstrap.strings.sleepLabel || "Sleep",
        },
        {
          key: topicPages.feeding,
          label: bootstrap.strings.feedingLabel || "Feeding",
        },
        {
          key: topicPages.diaper,
          label: bootstrap.strings.diaperLabel || "Diaper",
        },
        {
          key: topicPages.pumping,
          label: bootstrap.strings.pumpingLabel || "Pumping",
        },
      ],
    }
  : null;
```

Then splice it into `navItems` **before** Timeline (per spec §7 nav order: Dashboard → Insights → Timeline):

```javascript
const navItems = [
  {
    key: bootstrap.urls.dashboard,
    icon: <HomeOutlined />,
    label: bootstrap.strings.dashboard,
  },
  ...(insightsMenuItem ? [insightsMenuItem] : []),
  {
    key: bootstrap.urls.timeline,
    icon: <HistoryOutlined />,
    label: bootstrap.strings.timeline,
  },
  ...(childrenMenuItem ? [{ type: "divider" }, childrenMenuItem] : []),
  // ... rest stays the same (divider, Settings, Logout)
];
```

- [ ] **Step 3: Add BulbOutlined import**

At the top of `AppShell.jsx`, add `BulbOutlined` to the antd icons import:

```javascript
import { BulbOutlined, PlusOutlined, HomeOutlined, ... } from "@ant-design/icons";
```

- [ ] **Step 4: Add insights string to \_build_ant_strings()**

In `dashboard/views.py`, add to the `_build_ant_strings()` dict:

```python
"insights": _("Insights"),
```

- [ ] **Step 5: Add mobile bottom nav Insights entry**

In the mobile bottom nav section of `AppShell.jsx`, replace or add the Insights entry. When tapped on mobile, it should navigate to the sleep topic page (default):

```javascript
// In the mobile bottom nav items array, add between Timeline and Settings:
{
  key: topicPages?.sleep || bootstrap.urls.dashboard,
  icon: <BulbOutlined />,
  label: bootstrap.strings.insights || "Insights",
},
```

- [ ] **Step 6: Format, build, commit**

```bash
npx prettier --write frontend/src/components/AppShell.jsx
cd frontend && npm run build
git add frontend/src/components/AppShell.jsx dashboard/views.py
git commit -m "feat: add Insights submenu to nav with links to topic pages"
```

---

## Task 4: Wire AppShell pageMeta for topic-detail

**Files:**

- Modify: `frontend/src/components/AppShell.jsx`

- [ ] **Step 1: Add pageMeta entry for topic-detail**

In the `pageMeta` object in `AppShell.jsx`, add:

```javascript
"topic-detail": {
  eyebrow: bootstrap.strings.insights || "Insights",
  title: bootstrap.currentChild?.name || "",
},
```

- [ ] **Step 2: Format, build, commit**

```bash
npx prettier --write frontend/src/components/AppShell.jsx
cd frontend && npm run build
git add frontend/src/components/AppShell.jsx
git commit -m "feat: add topic-detail page header metadata"
```

---

## Task 5: German Translations

**Files:**

- Modify: `locale/de/LC_MESSAGES/django.po`

- [ ] **Step 1: Add German translations for topic page strings**

Add the following entries to the `.po` file:

```po
msgid "Overview"
msgstr "Übersicht"

msgid "History"
msgstr "Verlauf"

msgid "Charts"
msgstr "Diagramme"

msgid "Today"
msgstr "Heute"

msgid "Last"
msgstr "Zuletzt"

msgid "Total"
msgstr "Gesamt"

msgid "Count"
msgstr "Anzahl"

msgid "Naps"
msgstr "Schläfchen"

msgid "Night sleep"
msgstr "Nachtschlaf"

msgid "Wet"
msgstr "Nass"

msgid "Solid"
msgstr "Stuhl"

msgid "Amount"
msgstr "Menge"

msgid "Method"
msgstr "Methode"

msgid "Duration"
msgstr "Dauer"

msgid "Start"
msgstr "Start"

msgid "End"
msgstr "Ende"

msgid "Type"
msgstr "Art"

msgid "No data yet"
msgstr "Noch keine Daten"

msgid "Load more"
msgstr "Mehr laden"

msgid "Insights"
msgstr "Einblicke"
```

- [ ] **Step 2: Compile messages**

```bash
pipenv run python manage.py compilemessages
```

- [ ] **Step 3: Commit**

```bash
git add locale/de/LC_MESSAGES/django.po locale/de/LC_MESSAGES/django.mo
git commit -m "feat: add German translations for topic pages"
```

---

## Task 6: Integration Test + Push

- [ ] **Step 1: Run Django tests to verify no regressions**

```bash
pipenv run python manage.py test dashboard.tests --verbosity 2
```

- [ ] **Step 2: Run frontend build to verify clean compilation**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Push all changes**

```bash
git push
```

- [ ] **Step 4: Deploy**

```bash
# On server:
cd /etc/komodo/stacks/baby_buddy
git pull
docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d
```

---

## Summary

| Task | Description                                           | Key Files                                     |
| ---- | ----------------------------------------------------- | --------------------------------------------- |
| 1    | Django URL + View + data builders                     | `dashboard/urls.py`, `dashboard/views.py`     |
| 2    | React TopicPage component (Overview, History, Charts) | `TopicPages.jsx`, `TopicPages.css`, `App.jsx` |
| 3    | Insights submenu in sidebar + mobile nav              | `AppShell.jsx`, `dashboard/views.py`          |
| 4    | AppShell pageMeta for topic-detail header             | `AppShell.jsx`                                |
| 5    | German translations                                   | `django.po`                                   |
| 6    | Integration test + deploy                             | —                                             |
