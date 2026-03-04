import datetime
from statistics import median

from django.utils import timezone

from core.models import Sleep

WAKE_WINDOWS_BY_AGE = (
    (28, 35, 70),
    (60, 45, 90),
    (120, 75, 120),
    (180, 120, 180),
    (270, 150, 210),
    (365, 180, 240),
    (548, 240, 300),
)
WAKE_WINDOW_FALLBACK = (240, 360)
PERSONAL_HISTORY_LIMIT = 14
PERSONAL_HISTORY_MIN_POINTS = 3
SHORT_NAP_THRESHOLD_MIN = 40
SHORT_NAP_REDUCTION = 0.90
BEDTIME_DEFAULT_TARGET = datetime.time(hour=20, minute=0)
NAP_BLOCK_START = datetime.time(hour=17, minute=0)
NAP_BLOCK_END = datetime.time(hour=7, minute=0)


def _now(now=None):
    return timezone.localtime(now) if now else timezone.localtime()


def _minutes_to_delta(minutes):
    return datetime.timedelta(minutes=int(round(minutes)))


def _clamp(dt, min_dt, max_dt):
    return min(max(dt, min_dt), max_dt)


def _median_minutes(values):
    if not values:
        return None
    return int(round(median(values)))


def _age_days(child, now):
    return (now.date() - child.birth_date).days


def _wake_window_for_age(age_days):
    for max_days, wmin, wmax in WAKE_WINDOWS_BY_AGE:
        if age_days <= max_days:
            return wmin, wmax
    return WAKE_WINDOW_FALLBACK


def _latest_sleep(child, now, nap=None):
    qs = Sleep.objects.filter(child=child, end__lte=now).order_by("-end")
    if nap is not None:
        qs = qs.filter(nap=nap)
    return qs.first()


def _sleep_at_index(child, now, limit):
    return list(
        Sleep.objects.filter(child=child, end__lte=now)
        .only("id", "start", "end", "nap", "duration")
        .order_by("end")[:limit]
    )


def _personal_wake_median(child, now):
    sleeps = _sleep_at_index(child, now, PERSONAL_HISTORY_LIMIT + 1)
    wake_phases = []
    for idx in range(1, len(sleeps)):
        wake = sleeps[idx].start - sleeps[idx - 1].end
        if wake.total_seconds() > 0:
            wake_phases.append(int(wake.total_seconds() // 60))
    if len(wake_phases) < PERSONAL_HISTORY_MIN_POINTS:
        return None
    return _median_minutes(wake_phases)


def _clock_minutes(dt):
    local = timezone.localtime(dt)
    return local.hour * 60 + local.minute


def _target_today(now, target_time):
    target = datetime.datetime.combine(now.date(), target_time)
    target = timezone.make_aware(target, timezone.get_current_timezone())
    if target < now - datetime.timedelta(hours=1):
        target += datetime.timedelta(days=1)
    return target


def _as_overdue(now, source, reason, last_reference, window_min, window_max):
    return {
        "status": "overtired_risk",
        "source": source,
        "reason": reason,
        "last_reference_end": last_reference,
        "wake_window_min_minutes": window_min,
        "wake_window_max_minutes": window_max,
        "earliest": now,
        "ideal": now,
        "latest": now,
    }


def _is_night_nap_block(now):
    current = timezone.localtime(now).time()
    return current >= NAP_BLOCK_START or current < NAP_BLOCK_END


def _round_to_quarter_hour(dt):
    if not dt:
        return None
    local = timezone.localtime(dt)
    down = datetime.timedelta(
        minutes=local.minute % 15,
        seconds=local.second,
        microseconds=local.microsecond,
    )
    rounded = local - down
    if down >= datetime.timedelta(minutes=8):
        rounded += datetime.timedelta(minutes=15)
    return rounded


def recommend_nap(child, now=None):
    now = _now(now)
    age_days = _age_days(child, now)
    wake_min, wake_max = _wake_window_for_age(age_days)
    last_sleep = _latest_sleep(child, now)

    if not last_sleep:
        return {
            "status": "no_data",
            "source": "fallback",
            "reason": "no_sleep_data",
            "last_reference_end": None,
            "wake_window_min_minutes": wake_min,
            "wake_window_max_minutes": wake_max,
            "earliest": None,
            "ideal": None,
            "latest": None,
        }

    if _is_night_nap_block(now):
        return {
            "status": "nighttime",
            "source": "night_window",
            "reason": "night_sleep_time",
            "last_reference_end": last_sleep.end,
            "wake_window_min_minutes": wake_min,
            "wake_window_max_minutes": wake_max,
            "earliest": None,
            "ideal": None,
            "latest": None,
        }

    if (
        last_sleep.nap
        and last_sleep.duration
        and last_sleep.duration < datetime.timedelta(minutes=SHORT_NAP_THRESHOLD_MIN)
    ):
        wake_min = max(1, int(round(wake_min * SHORT_NAP_REDUCTION)))
        wake_max = max(wake_min + 1, int(round(wake_max * SHORT_NAP_REDUCTION)))

    earliest = last_sleep.end + _minutes_to_delta(wake_min)
    latest = last_sleep.end + _minutes_to_delta(wake_max)

    if now > latest:
        return _as_overdue(
            now=now,
            source="wake_window",
            reason=None,
            last_reference=last_sleep.end,
            window_min=wake_min,
            window_max=wake_max,
        )

    personal_target = _personal_wake_median(child, now)
    if personal_target is not None:
        source = "history_median"
        ideal_minutes = max(wake_min, min(wake_max, personal_target))
    else:
        source = "midpoint"
        ideal_minutes = int(round((wake_min + wake_max) / 2))
    ideal = last_sleep.end + _minutes_to_delta(ideal_minutes)

    return {
        "status": "ok",
        "source": source,
        "reason": None,
        "last_reference_end": last_sleep.end,
        "wake_window_min_minutes": wake_min,
        "wake_window_max_minutes": wake_max,
        "earliest": _round_to_quarter_hour(earliest),
        "ideal": _round_to_quarter_hour(ideal),
        "latest": _round_to_quarter_hour(latest),
    }


def recommend_bedtime(child, now=None):
    now = _now(now)
    age_days = _age_days(child, now)
    wake_min, wake_max = _wake_window_for_age(age_days)

    night_wake_min = max(1, int(round(wake_min * 1.10)))
    night_wake_max = max(night_wake_min + 1, int(round(wake_max * 1.20)))

    last_nap = _latest_sleep(child, now, nap=True)
    reference_sleep = last_nap or _latest_sleep(child, now)
    if not reference_sleep:
        return {
            "status": "no_data",
            "source": "fallback",
            "reason": "no_sleep_data",
            "last_reference_end": None,
            "wake_window_min_minutes": night_wake_min,
            "wake_window_max_minutes": night_wake_max,
            "earliest": None,
            "ideal": None,
            "latest": None,
            "target_bedtime": None,
        }

    earliest = reference_sleep.end + _minutes_to_delta(night_wake_min)
    latest = reference_sleep.end + _minutes_to_delta(night_wake_max)

    if now > latest:
        overdue = _as_overdue(
            now=now,
            source="wake_window",
            reason=None,
            last_reference=reference_sleep.end,
            window_min=night_wake_min,
            window_max=night_wake_max,
        )
        overdue["target_bedtime"] = now
        return overdue

    bedtime_starts = list(
        Sleep.objects.filter(child=child, nap=False, start__lte=now)
        .order_by("-start")
        .values_list("start", flat=True)[:PERSONAL_HISTORY_LIMIT]
    )
    bedtime_minutes = [_clock_minutes(start) for start in bedtime_starts]
    if len(bedtime_minutes) >= PERSONAL_HISTORY_MIN_POINTS:
        source = "history_median"
        bedtime_target_time = (
            datetime.datetime.min + _minutes_to_delta(_median_minutes(bedtime_minutes))
        ).time()
    else:
        source = "default_20_00"
        bedtime_target_time = BEDTIME_DEFAULT_TARGET

    target_bedtime = _target_today(now, bedtime_target_time)
    ideal = _clamp(target_bedtime, earliest, latest)

    reason = None
    if source == "history_median" and earliest > target_bedtime + datetime.timedelta(
        minutes=60
    ):
        reason = "late_last_nap_pushes_bedtime"

    return {
        "status": "ok",
        "source": source,
        "reason": reason,
        "last_reference_end": reference_sleep.end,
        "wake_window_min_minutes": night_wake_min,
        "wake_window_max_minutes": night_wake_max,
        "earliest": _round_to_quarter_hour(earliest),
        "ideal": _round_to_quarter_hour(ideal),
        "latest": _round_to_quarter_hour(latest),
        "target_bedtime": _round_to_quarter_hour(target_bedtime),
    }


def recommend_sleep_bundle(child, now=None):
    now = _now(now)
    return {
        "as_of": now,
        "child": {"id": child.id, "slug": child.slug, "name": child.name()},
        "nap": recommend_nap(child=child, now=now),
        "bedtime": recommend_bedtime(child=child, now=now),
    }
