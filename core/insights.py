# core/insights.py
"""
Age-aware insights rule engine.

Importable without Django setup — only build_insights_data touches the ORM.
"""

import datetime
from dataclasses import dataclass
from typing import Optional

from django.utils.translation import gettext_lazy as _


@dataclass
class Insight:
    id: str
    severity: str  # "info" | "warning" | "alert"
    category: str  # "sleep" | "feeding" | "diaper" | "growth"
    title: str
    body: str
    action_label: Optional[str]
    action_url: Optional[str]


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


def _rule_no_diaper_8h(child, data: dict) -> list:
    """All stages: no diaper change in 8+ hours."""
    from django.utils import timezone

    last = data.get("last_diaper")
    if last is None:
        return [
            Insight(
                id=_make_id(child, "no_diaper_ever"),
                severity="warning",
                category="diaper",
                title=_("No diaper changes recorded"),
                body=_("No diaper change has been logged yet. Track changes to spot patterns."),
                action_label=None,
                action_url=None,
            )
        ]
    age = timezone.now() - last.time
    if age >= datetime.timedelta(hours=8):
        hours = int(age.total_seconds() // 3600)
        return [
            Insight(
                id=_make_id(child, "no_diaper_8h"),
                severity="warning",
                category="diaper",
                title=_(f"No diaper change in {hours}h"),
                body=_(f"It's been {hours} hours since the last diaper change. Consider checking soon."),
                action_label=_("Log diaper"),
                action_url="/log/diaper/",
            )
        ]
    return []


def _rule_newborn_feeding_interval(child, data: dict) -> list:
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
        return [
            Insight(
                id=_make_id(child, "newborn_feeding_interval"),
                severity="alert",
                category="feeding",
                title=_(f"No feeding in {hours}h"),
                body=_(
                    f"Newborns typically need feeding every 2–3 hours. "
                    f"It's been {hours}h since the last feed."
                ),
                action_label=_("Log feeding"),
                action_url="/log/feeding/",
            )
        ]
    return []


def _rule_newborn_low_feeding_count(child, data: dict) -> list:
    """Newborn: fewer than 8 feedings in last 24h."""
    count = len(list(data.get("feedings_24h", [])))
    if count == 0:
        return []
    if count < 8:
        return [
            Insight(
                id=_make_id(child, "newborn_low_feeding_count"),
                severity="warning",
                category="feeding",
                title=_(f"Only {count} feedings in 24h"),
                body=_(
                    f"Newborns typically need 8–12 feedings per day. "
                    f"Only {count} have been logged in the last 24 hours."
                ),
                action_label=None,
                action_url=None,
            )
        ]
    return []


def _rule_all_low_sleep(child, data: dict) -> list:
    """All stages: total sleep more than 3h below age recommendation."""
    total = data.get("total_sleep_24h")
    if total is None:
        return []
    stage = get_age_stage(child.birth_date)
    recommended = {
        "newborn": datetime.timedelta(hours=16),
        "infant": datetime.timedelta(hours=14),
        "toddler": datetime.timedelta(hours=12),
        "child": datetime.timedelta(hours=10),
    }
    rec = recommended.get(stage)
    if rec is None:
        return []
    deficit = rec - total
    if deficit >= datetime.timedelta(hours=3):
        total_h = total.total_seconds() / 3600
        rec_h = rec.total_seconds() / 3600
        return [
            Insight(
                id=_make_id(child, "low_total_sleep"),
                severity="warning",
                category="sleep",
                title=_(f"Low sleep: {total_h:.1f}h vs {rec_h:.0f}h recommended"),
                body=_(
                    f"Total sleep in the last 24h ({total_h:.1f}h) is more than 3h below "
                    f"the recommended {rec_h:.0f}h for {stage}s."
                ),
                action_label=None,
                action_url=None,
            )
        ]
    return []


def _rule_infant_nap_duration_drop(child, data: dict) -> list:
    """Infant: nap duration down 25%+ vs previous 7-day average."""
    current = data.get("avg_sleep_duration_7d")
    prev = data.get("avg_nap_duration_prev_7d")
    if current is None or prev is None or prev.total_seconds() == 0:
        return []
    drop = (prev - current) / prev
    if drop >= 0.25:
        pct = int(drop * 100)
        return [
            Insight(
                id=_make_id(child, "infant_nap_duration_drop"),
                severity="warning",
                category="sleep",
                title=_(f"Nap duration down {pct}% this week"),
                body=_(
                    f"Average nap duration has dropped {pct}% compared to the prior week. "
                    "This can signal a sleep regression or developmental leap."
                ),
                action_label=None,
                action_url=None,
            )
        ]
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


def run_rules(child, data: dict) -> list:
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
    sleeps_prev_7d = list(
        Sleep.objects.filter(child=child, start__gte=cutoff_14d, start__lt=cutoff_7d)
    )
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
        data["total_sleep_24h"].total_seconds() / 3600 if data["total_sleep_24h"] else 0
    )
    avg_nap = (
        data["avg_sleep_duration_7d"].total_seconds() / 3600
        if data["avg_sleep_duration_7d"]
        else 0
    )

    sleep_guidelines = {"newborn": 16, "infant": 14, "toddler": 12, "child": 10}
    feeding_guidelines = {
        "newborn": "8–12/day",
        "infant": "4–6/day",
        "toddler": "3 meals",
        "child": "3 meals",
    }

    insight_lines = (
        "\n".join(f"- [{i.severity.upper()}] {i.title}: {i.body}" for i in insights)
        or "- None detected"
    )

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
