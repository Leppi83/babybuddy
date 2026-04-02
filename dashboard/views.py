# -*- coding: utf-8 -*-
import datetime
import json as _json

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import (
    Http404,
    HttpResponseRedirect,
    JsonResponse,
    StreamingHttpResponse,
)
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.utils.html import strip_tags
from django.middleware.csrf import get_token
from django.templatetags.static import static
from django.urls import reverse
from django.utils import timezone
from django.utils.translation import gettext as _
from django.views.generic.base import TemplateView, View
from django.views.generic.detail import DetailView
from django.views.decorators.csrf import csrf_exempt

from django.core.cache import cache
from django.db.models import Q

from babybuddy.mixins import LoginRequiredMixin, PermissionRequiredMixin
from babybuddy.push import send_push_notification
from babybuddy.views import _serialize_messages
from core.views import _build_child_switcher
from core.models import Child, DiaperChange, Feeding, Pumping, Sleep, SleepTimer, Timer
from core.insights import build_insights_data, run_rules


def _ant_dashboard_enabled():
    return True


def _child_picture_url(child):
    if child.picture:
        return child.picture.url
    return static("babybuddy/img/core/child-placeholder.png")


def _format_short_date(value):
    return value.strftime("%d.%m.") if value else ""


def _format_full_date(value):
    return value.strftime("%d.%m.%Y") if value else ""


def _format_child_age(birth_date):
    if not birth_date:
        return None
    today = datetime.date.today()
    delta_days = (today - birth_date).days
    months = delta_days / 30.44
    if months < 24:
        months_int = round(months)
        return _("{} months").format(months_int)
    years = round(delta_days / 365.25, 1)
    return _("{} years").format(years)


def _display_name(user):
    return user.get_full_name() or user.username


def _parse_date_param(request):
    """Return a date object from ?date=YYYY-MM-DD, or None."""
    raw = request.GET.get("date")
    if raw:
        try:
            return datetime.date.fromisoformat(raw)
        except (ValueError, AttributeError):
            pass
    return None


def _build_nav_urls(request):
    return {
        "dashboard": reverse("dashboard:dashboard"),
        "timeline": reverse("core:timeline"),
        "childrenList": reverse("core:child-list"),
        "settings": reverse("babybuddy:user-settings"),
        "logout": reverse("babybuddy:logout"),
        "addChild": reverse("core:child-add"),
        "quickEntry": reverse("babybuddy:quick-entry"),
    }


def _build_ant_strings():
    return {
        "dashboard": _("Dashboard"),
        "addChild": _("Add Child"),
        "children": _("Children"),
        "timeline": _("Timeline"),
        "settings": _("Settings"),
        "logout": _("Logout"),
        "insights": _("Insights"),
        "selectChildFirst": _("Select a child first"),
        "childDashboard": _("Child Dashboard"),
        "overview": _("Overview"),
        "born": _("Born"),
        "age": _("Age"),
        "openDashboard": _("Open dashboard"),
        "selectDashboard": _("Select dashboard"),
        "refresh": _("Refresh"),
        "hide": _("Hide"),
        "show": _("Show"),
        "loading": _("Loading..."),
        "quickEntry": _("Quick Entry"),
        "quickFeeding": _("Quick Feeding"),
        "quickBreastfeeding": _("Quick Breastfeeding"),
        "quickPumping": _("Quick Pumping"),
        "date": _("Date"),
        "time": _("Time"),
        "start": _("Start"),
        "end": _("End"),
        "liquid": _("Liquid"),
        "solid": _("Solid"),
        "babyFood": _("Baby food"),
        "breastMilk": _("Breast milk"),
        "left": _("Left"),
        "right": _("Right"),
        "both": _("Both"),
        "side": _("Side"),
        "amount": _("Amount"),
        "sleepType": _("Type"),
        "sleepEntry": _("Sleep entry"),
        "startDate": _("Start date"),
        "startTime": _("Start time"),
        "endDate": _("End date"),
        "endTime": _("End time"),
        "diaperChanges": _("Diaper changes"),
        "quick_entry": _("Quick Entry"),
        "diaper": _("Diaper changes"),
        "feedings": _("Feedings"),
        "pumpings": _("Pumpings"),
        "sleep": _("Sleep"),
        "nap": _("Nap"),
        "tummyTime": _("Tummy Time"),
        "tummytime": _("Tummy Time"),
        "lastNappyChange": _("Last Nappy Change"),
        "nappyChanges": _("Nappy Changes"),
        "lastFeeding": _("Last Feeding"),
        "lastFeedingMethod": _("Last Feeding Method"),
        "recentFeedings": _("Recent Feedings"),
        "breastfeeding": _("Breastfeeding"),
        "breastfeedingShort": _("Breast"),
        "lastBreastfeeding": _("Last Breastfeeding"),
        "lastPumping": _("Last Pumping"),
        "timers": _("Timers"),
        "sleepTimer": _("Sleep Timer"),
        "lastSleep": _("Last Sleep"),
        "sleepRecommendations": _("Sleep Recommendations"),
        "recentSleep": _("Recent Sleep"),
        "todaysNaps": _("Today's Naps"),
        "statistics": _("Statistics"),
        "sleepTimeline": _("Sleep Timeline (24h)"),
        "nightSleepCircle": _("Night Sleep Circle"),
        "todaysTummyTime": _("Today's Tummy Time"),
        "noData": _("No data available yet."),
        "napWindowOver": _("Nap time is over for today"),
        "noSleepData": _("No sleep data yet"),
        "overtiredRisk": _("Overtired risk — put to sleep now"),
        "napWindow": _("Nap window"),
        "bedtimeWindow": _("Bedtime window"),
        "aiRecommendation": _("AI Recommendation"),
        "askingAi": _("Asking AI..."),
        "aiError": _("Could not reach AI — tap to retry"),
        "askAiAgain": _("Ask AI again"),
        "migrationPending": _("Migration pending"),
        "saveFailed": _("Save failed"),
        "saved": _("Saved"),
        "save": _("Save"),
        "ready": _("Ready"),
        "start": _("Start"),
        "stop": _("Stop"),
        "manualEntry": _("Manual entry"),
        "running": _("Running"),
        "now": _("Now"),
        "sleepTimerActive": _("Sleep timer active"),
        "sleepEntrySaved": _("Sleep entry saved."),
        "sleepTimerPending": _("Sleep timer migration pending"),
        "feedingSaved": _("Feeding saved."),
        "breastfeedingSaved": _("Breastfeeding entry saved."),
        "pumpingSaved": _("Pumping entry saved."),
        "sleepList": _("Sleep List"),
        "pause": _("Pause"),
        "resume": _("Resume"),
        "paused": _("Paused"),
        "type": _("Type"),
        "edit": _("Edit"),
        "delete": _("Delete"),
        "cancel": _("Cancel"),
        "confirmDelete": _("Confirm delete"),
        # Card titles
        "todaysSleeps": _("Today's Sleeps"),
        "sleepStatistics": _("Sleep Statistics"),
        "sleepWeekChart": _("Sleep This Week"),
        "lastNight": _("Last Night"),
        "awake": _("Awake"),
        "bedtime": _("Bedtime"),
        "wakeTime": _("Wake Time"),
        "nightFeedings": _("Night Feedings"),
        "nightChanges": _("Night Changes"),
        "selectedDate": _("Selected date"),
        "nightWindowLabel": _("Night window"),
        "quicklyAddBabyActions": _("Quickly add baby actions"),
        # Sleep card internal labels
        "sleepEntriesToday": _("Sleep entries today"),
        "napsToday": _("Naps today"),
        "averageSleep": _("Average sleep"),
        "recentSleepEntries": _("recent sleep entries"),
        # Diaper card labels
        "lastRecorded": _("Last recorded"),
        "wet": _("Wet"),
        "changesToday": _("Changes today"),
        "recentEntries": _("recent entries"),
        # Feeding card labels
        "duration": _("Duration"),
        "dominantMethod": _("Dominant method"),
        "feedingsToday": _("Feedings today"),
        "recentFeedingsLabel": _("recent feedings"),
        "breastfeedingToday": _("Breastfeeding today"),
        # Pumping card labels
        "lastPumpingDuration": _("Last pumping"),
        # Tummy time card labels
        "tummyTimeToday": _("Tummy time today"),
        # Quick entry hint
        "napDurationHint": _("Duration < 90 min is saved as nap, ≥ 90 min as sleep"),
        "saveTimer": _("Save Sleep"),
        "startTimer": _("Start Timer"),
        "cancelTimer": _("Cancel Timer"),
        "cancelTimerTitle": _("Cancel timer?"),
        "cancelTimerConfirm": _("Are you sure? The elapsed time will not be saved."),
        # Hero card
        "overviewFor": _("Overview for"),
        # Quick log tile labels
        "quickLog.tile.diaper": _("Diaper"),
        "quickLog.tile.feeding": _("Feed"),
        "quickLog.tile.sleep": _("Sleep"),
        "quickLog.tile.pumping": _("Pump"),
        "quickLog.tile.temperature": _("Temp"),
        "quickLog.tile.timer": _("Timer"),
        "quickLog.tile.note": _("Note"),
        "quickLog.tile.weight": _("Weight"),
        # Insights page
        "insights.title": _("Insights"),
        "insights.backToDashboard": _("Back to dashboard"),
        "insights.emptyState": _("No issues detected — everything looks on track."),
        "insights.category.sleep": _("Sleep"),
        "insights.category.feeding": _("Feeding"),
        "insights.category.diaper": _("Diaper"),
        "insights.category.growth": _("Growth"),
        "insightsBannerViewAll": _("View all"),
        "insightsBannerSuffix": _("insight(s) detected"),
        "aiSummaryTitle": _("AI Summary"),
        # Examinations
        "examinations": _("Examinations"),
        "examCompleted": _("All examinations completed"),
        "examDue": _("Due"),
        "examOverdue": _("Overdue"),
        "examUpcoming": _("Upcoming"),
        "viewEdit": _("View / Edit"),
        "fillIn": _("Fill in"),
        "saveExamination": _("Save examination"),
        "dateOfExamination": _("Date of examination"),
        "ageWindow": _("Age window"),
        "doctorOnly": _("Assessed by your doctor"),
        "notes": _("Notes"),
    }


def _serialize_children(request, children):
    return [
        {
            "id": child.id,
            "slug": child.slug,
            "name": str(child),
            "birthDate": child.birth_date.isoformat() if child.birth_date else None,
            "birthDateLabel": _format_full_date(child.birth_date),
            "ageLabel": _format_child_age(child.birth_date),
            "pictureUrl": request.build_absolute_uri(_child_picture_url(child)),
            "dashboardUrl": reverse(
                "dashboard:dashboard-child", kwargs={"slug": child.slug}
            ),
        }
        for child in children
    ]


def _build_section_payload(section_cards, section_order, hidden_sections):
    return {
        "cardsBySection": section_cards,
        "sectionOrder": section_order,
        "hiddenSections": hidden_sections,
    }


class Dashboard(LoginRequiredMixin, TemplateView):
    # TODO: Use .card-deck in this template once BS4 is finalized.
    template_name = "babybuddy/ant_app.html"

    # Always redirect to a child dashboard; child selection is in the nav sidebar.
    def get(self, request, *args, **kwargs):
        children = Child.objects.count()
        if children == 0:
            return HttpResponseRedirect(reverse("babybuddy:welcome"))
        return HttpResponseRedirect(
            reverse("dashboard:dashboard-child", args={Child.objects.first().slug})
        )

    def get_template_names(self):
        if _ant_dashboard_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super(Dashboard, self).get_context_data(**kwargs)
        children = Child.objects.all().order_by("last_name", "first_name", "id")
        context["objects"] = children
        if _ant_dashboard_enabled():
            context["ant_page_title"] = _("Dashboard")
            context["ant_bootstrap"] = {
                "pageType": "dashboard-home",
                "currentPath": self.request.path,
                "activeNavKey": reverse("dashboard:dashboard"),
                "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
                "csrfToken": get_token(self.request),
                "user": {"displayName": _display_name(self.request.user)},
                "urls": _build_nav_urls(self.request),
                "children": _serialize_children(self.request, children),
                "strings": _build_ant_strings(),
            }
        return context


def _build_quick_status(child):
    """Returns a status dict for the quick-entry status strip."""
    from django.utils import timesince as timesince_module

    def _ago(dt):
        if dt is None:
            return None
        return timesince_module.timesince(dt).split(",")[0] + " ago"

    last_diaper = DiaperChange.objects.filter(child=child).order_by("-time").first()
    last_feeding = Feeding.objects.filter(child=child).order_by("-start").first()
    active_timer = Timer.objects.filter(child=child, name="Sleep", active=True).first()
    last_sleep = Sleep.objects.filter(child=child).order_by("-start").first()

    return {
        "lastDiaper": _ago(last_diaper.time) if last_diaper else None,
        "lastFeeding": _ago(last_feeding.start) if last_feeding else None,
        "activeSleep": _ago(active_timer.start) if active_timer else None,
        "lastSleep": _ago(last_sleep.start) if last_sleep else None,
    }


def _fmt_duration(seconds):
    """Format a duration in seconds as 'Xh Ym' or 'Ym'."""
    if seconds is None:
        return None
    h = int(seconds) // 3600
    m = (int(seconds) % 3600) // 60
    if h > 0:
        return f"{h}h {m}m"
    return f"{m}m"


def _build_stat_cards(child):
    """Build stat card data for the dashboard (raw values; React formats display)."""
    # Last Sleep
    last_sleep = Sleep.objects.filter(child=child, end__isnull=False).order_by("-end").first()
    active_sleep = Sleep.objects.filter(child=child, end__isnull=True).order_by("-start").first()
    if active_sleep:
        sleep_card = {
            "active": True,
            "startIso": active_sleep.start.isoformat(),
            "endIso": None,
            "durationSec": None,
        }
    elif last_sleep:
        sleep_card = {
            "active": False,
            "startIso": last_sleep.start.isoformat(),
            "endIso": last_sleep.end.isoformat(),
            "durationSec": (
                int(last_sleep.duration.total_seconds()) if last_sleep.duration else None
            ),
        }
    else:
        sleep_card = None

    # Last Feeding
    last_feeding = Feeding.objects.filter(child=child).order_by("-end").first()
    if last_feeding:
        feeding_card = {
            "amount": float(last_feeding.amount) if last_feeding.amount else None,
            "type": last_feeding.type or "",
            "method": last_feeding.method or "",
            "startIso": last_feeding.start.isoformat(),
            "endIso": last_feeding.end.isoformat() if last_feeding.end else None,
            "durationSec": (
                int(last_feeding.duration.total_seconds()) if last_feeding.duration else None
            ),
        }
    else:
        feeding_card = None

    # Last Diaper
    last_diaper = DiaperChange.objects.filter(child=child).order_by("-time").first()
    if last_diaper:
        diaper_card = {
            "wet": last_diaper.wet,
            "solid": last_diaper.solid,
            "color": last_diaper.color or "",
            "timeIso": last_diaper.time.isoformat(),
        }
    else:
        diaper_card = None

    # Last Pumping
    last_pump = Pumping.objects.filter(child=child).order_by("-end").first()
    if last_pump:
        pump_card = {
            "amount": float(last_pump.amount) if last_pump.amount else None,
            "startIso": last_pump.start.isoformat(),
            "endIso": last_pump.end.isoformat() if last_pump.end else None,
            "durationSec": (
                int(last_pump.duration.total_seconds()) if last_pump.duration else None
            ),
        }
    else:
        pump_card = None

    return {
        "sleep": sleep_card,
        "feeding": feeding_card,
        "diaper": diaper_card,
        "pumping": pump_card,
    }


def _build_recent_activity(child, ref_date=None):
    """Build recent activity items for the dashboard timeline, filtered to ref_date."""
    if ref_date is None:
        ref_date = datetime.date.today()

    day_start = timezone.make_aware(
        datetime.datetime.combine(ref_date, datetime.time.min)
    )
    day_end = day_start + datetime.timedelta(days=1)

    events = []

    for s in Sleep.objects.filter(
        child=child, start__gte=day_start, start__lt=day_end
    ).order_by("-start")[:5]:
        events.append(
            {
                "type": "sleep",
                "title": str(_("Sleep")),
                "timeIso": s.start.isoformat(),
                "detail": str(_("Nap")) if s.nap else str(_("Night sleep")),
            }
        )

    for f in Feeding.objects.filter(
        child=child, start__gte=day_start, start__lt=day_end
    ).order_by("-start")[:5]:
        events.append(
            {
                "type": "feed",
                "title": str(_("Feeding")),
                "timeIso": f.start.isoformat(),
                "detail": f.method or f.type or "",
            }
        )

    for d in DiaperChange.objects.filter(
        child=child, time__gte=day_start, time__lt=day_end
    ).order_by("-time")[:5]:
        types = []
        if d.wet:
            types.append(str(_("Wet")))
        if d.solid:
            types.append(str(_("Solid")))
        events.append(
            {
                "type": "diaper",
                "title": str(_("Diaper")),
                "timeIso": d.time.isoformat(),
                "detail": " + ".join(types),
            }
        )

    for p in Pumping.objects.filter(
        child=child, start__gte=day_start, start__lt=day_end
    ).order_by("-start")[:3]:
        events.append(
            {
                "type": "pump",
                "title": str(_("Pumping")),
                "timeIso": p.start.isoformat(),
                "detail": f"{float(p.amount):.1f}" if p.amount else "",
            }
        )

    events.sort(key=lambda e: e["timeIso"], reverse=True)
    return events[:8]


def _build_insights_for_bootstrap(child):
    cache_key = f"insights_{child.id}"
    insights = cache.get(cache_key)
    if insights is None:
        data = build_insights_data(child)
        insights = run_rules(child, data)
        cache.set(cache_key, insights, 300)

    result = [
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

    exam_insight = _build_exam_insight(child)
    if exam_insight:
        result.append(
            {
                "id": f"exam_{child.id}",
                "severity": exam_insight["priority"],
                "category": "examinations",
                "title": exam_insight["title"],
                "body": exam_insight["body"],
                "actionLabel": _("View"),
                "actionUrl": exam_insight["url"],
            }
        )

    return result


def _load_exam_statuses(child):
    """Return (exam_types, statuses) for a child, or ([], {}) if no program."""
    from examinations.views import _get_program_for_child
    from examinations.models import ExaminationType, ExaminationRecord
    from examinations.status import calculate_examination_statuses

    program = _get_program_for_child(child)
    if not program:
        return [], {}
    exam_types = list(
        ExaminationType.objects.filter(program=program).order_by("order")
    )
    records = list(ExaminationRecord.objects.filter(child=child))
    statuses = calculate_examination_statuses(child, exam_types, records)
    return exam_types, statuses


def _build_exam_insight(child):
    """Return an insight dict if a U-exam is due within 14 days, or None."""
    exam_types, statuses = _load_exam_statuses(child)
    if not exam_types:
        return None
    today = datetime.date.today()

    for et in exam_types:
        st = statuses.get(et.pk, {})
        status = st.get("status")
        if status == "overdue":
            return {
                "type": "exam_due",
                "priority": "high",
                "title": f"{et.code} {_('is overdue')}",
                "body": f"{et.name} · {st['due_from'].strftime('%Y-%m-%d')} – {st['due_to'].strftime('%Y-%m-%d')}",
                "url": reverse(
                    "examinations:form",
                    kwargs={"slug": child.slug, "code": et.code},
                ),
            }
        if status == "due":
            days_left = (st["due_to"] - today).days
            return {
                "type": "exam_due",
                "priority": "medium",
                "title": f"{et.code} {_('is due')} · {days_left} {_('days left')}",
                "body": f"{et.name} · {st['due_from'].strftime('%Y-%m-%d')} – {st['due_to'].strftime('%Y-%m-%d')}",
                "url": reverse(
                    "examinations:form",
                    kwargs={"slug": child.slug, "code": et.code},
                ),
            }
        if status == "upcoming":
            days_until = (st["due_from"] - today).days
            if days_until <= 14:
                return {
                    "type": "exam_upcoming",
                    "priority": "low",
                    "title": f"{et.code} {_('in')} {days_until} {_('days')}",
                    "body": f"{et.name} · {_('window opens')} {st['due_from'].strftime('%Y-%m-%d')}",
                    "url": reverse(
                        "examinations:form",
                        kwargs={"slug": child.slug, "code": et.code},
                    ),
                }
    return None


def _build_celestial_data(user):
    """Build celestial + weather data for the dashboard dial."""
    from babybuddy.weather import get_celestial_data

    try:
        user_settings = user.settings
    except Exception:
        user_settings = None
    return get_celestial_data(user_settings)


def _local_iso(dt):
    """Serialize an aware datetime as a LOCAL naive ISO string (no TZ suffix).

    Browsers parse "YYYY-MM-DDTHH:mm:ss" (no timezone) as local time, so
    ``new Date(str).getHours()`` always returns the correct local hour for
    dial positioning regardless of the browser's timezone setting.
    """
    return timezone.localtime(dt).strftime("%Y-%m-%dT%H:%M:%S")


def _build_dial_activities(child, ref_date=None):
    """Serialize activities for the activity dial for a given calendar day.

    Activities that span midnight are clipped to the day boundary so each
    day's dial only shows the portion that falls within that calendar day.
    Serialized as local-time naive strings so the browser always positions
    arcs at the correct clock hour.
    """
    tz = timezone.get_current_timezone()
    if ref_date is None:
        ref_date = datetime.date.today()

    day_start = datetime.datetime.combine(ref_date, datetime.time.min).replace(tzinfo=tz)
    day_end = datetime.datetime.combine(ref_date, datetime.time.max).replace(tzinfo=tz)
    is_today = (ref_date == datetime.date.today())

    activities = []

    # Overlap query: activity overlaps the calendar day window.
    # start < day_end AND (end > day_start OR end IS NULL)
    for s in Sleep.objects.filter(
        child=child,
        start__lt=day_end,
    ).filter(
        Q(end__gt=day_start) | Q(end__isnull=True)
    ).order_by("start"):
        clipped_start = max(s.start, day_start)
        if s.end:
            clipped_end = min(s.end, day_end)
            end_str = _local_iso(clipped_end)
            end_display = timezone.localtime(clipped_end).strftime("%H:%M")
        elif is_today:
            end_str = None  # ongoing — frontend will use current time
            end_display = "ongoing"
        else:
            end_str = _local_iso(day_end)
            end_display = "00:00"
        start_display = timezone.localtime(clipped_start).strftime("%H:%M")
        activities.append({
            "type": "sleep",
            "start": _local_iso(clipped_start),
            "end": end_str,
            "tooltip": f"Sleep: {start_display}\u2013{end_display}",
        })

    for f in Feeding.objects.filter(
        child=child,
        start__lt=day_end,
    ).filter(
        Q(end__gt=day_start) | Q(end__isnull=True)
    ).order_by("start"):
        method = f.method or ""
        clipped_start = max(f.start, day_start)
        if f.end:
            clipped_end = min(f.end, day_end)
            end_str = _local_iso(clipped_end)
            end_display = timezone.localtime(clipped_end).strftime("%H:%M")
        else:
            end_str = None
            end_display = "?"
        is_breast = "breast" in method.lower()
        activity_type = "breastfeeding" if is_breast else "feeding"
        label = "Breast" if is_breast else "Feed"
        start_display = timezone.localtime(clipped_start).strftime("%H:%M")
        activities.append({
            "type": activity_type,
            "start": _local_iso(clipped_start),
            "end": end_str,
            "details": method,
            "tooltip": f"{label}: {start_display}\u2013{end_display} ({method})",
        })

    for p in Pumping.objects.filter(
        child=child,
        start__lt=day_end,
    ).filter(
        Q(end__gt=day_start) | Q(end__isnull=True)
    ).order_by("start"):
        amt = f"{p.amount}ml" if p.amount else ""
        clipped_start = max(p.start, day_start)
        if p.end:
            clipped_end = min(p.end, day_end)
            end_str = _local_iso(clipped_end)
            end_display = timezone.localtime(clipped_end).strftime("%H:%M")
        else:
            end_str = None
            end_display = "?"
        start_display = timezone.localtime(clipped_start).strftime("%H:%M")
        activities.append({
            "type": "pumping",
            "start": _local_iso(clipped_start),
            "end": end_str,
            "details": amt,
            "tooltip": f"Pump: {start_display}\u2013{end_display} {amt}".strip(),
        })

    for d in DiaperChange.objects.filter(
        child=child,
        time__gte=day_start,
        time__lte=day_end,
    ).order_by("time"):
        types = []
        if d.wet:
            types.append("wet")
        if d.solid:
            types.append("solid")
        local_time = timezone.localtime(d.time)
        activities.append({
            "type": "diaper",
            "time": _local_iso(d.time),
            "details": " + ".join(types) if types else "",
            "tooltip": (
                f"Diaper: {local_time.strftime('%H:%M')} ({', '.join(types)})"
                if types
                else f"Diaper: {local_time.strftime('%H:%M')}"
            ),
        })

    return activities


def _build_next_exam_card(child):
    """Return data for the 'next U-exam' dashboard card or None if no program."""
    exam_types, statuses = _load_exam_statuses(child)
    if not exam_types:
        return None

    next_exam = None
    for et in exam_types:
        st = statuses.get(et.pk, {})
        if st.get("status") in ("due", "overdue", "upcoming"):
            next_exam = (et, st)
            break

    if not next_exam:
        return {"allCompleted": True}

    et, st = next_exam
    today = datetime.date.today()
    due_from = st["due_from"]
    due_to = st["due_to"]

    if st["status"] == "upcoming":
        days_label = str((due_from - today).days)
    elif st["status"] == "due":
        days_label = str((due_to - today).days)
    else:
        days_label = "0"

    return {
        "allCompleted": False,
        "code": et.code,
        "name": et.name,
        "status": st["status"],
        "due_from": due_from.strftime("%Y-%m-%d"),
        "due_to": due_to.strftime("%Y-%m-%d"),
        "days_remaining": days_label,
        "url": reverse(
            "examinations:list",
            kwargs={"slug": child.slug},
        ),
    }


VALID_TOPICS = {"sleep", "feeding", "diaper", "pumping"}


def _build_topic_overview(child, topic):
    """Compute overview statistics for a topic page."""
    now = timezone.now()
    today_start = timezone.localtime(now).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    if topic == "sleep":
        sleeps_today = Sleep.objects.filter(child=child, start__gte=today_start)
        total_minutes = sum(
            (s.duration.total_seconds() / 60 if s.duration else 0) for s in sleeps_today
        )
        nap_count = sleeps_today.filter(nap=True).count()
        last_sleep = Sleep.objects.filter(child=child).order_by("-end").first()
        return {
            "totalMinutesToday": round(total_minutes),
            "napCountToday": nap_count,
            "nightSleepCountToday": sleeps_today.filter(nap=False).count(),
            "lastSleep": (
                {
                    "start": last_sleep.start.isoformat(),
                    "end": last_sleep.end.isoformat() if last_sleep.end else None,
                    "nap": last_sleep.nap,
                    "duration": (
                        last_sleep.duration.total_seconds()
                        if last_sleep.duration
                        else None
                    ),
                }
                if last_sleep
                else None
            ),
        }

    if topic == "feeding":
        feedings_today = Feeding.objects.filter(child=child, start__gte=today_start)
        total_count = feedings_today.count()
        methods = {}
        for f in feedings_today:
            m = f.method or "unknown"
            methods[m] = methods.get(m, 0) + 1
        last_feeding = Feeding.objects.filter(child=child).order_by("-end").first()
        return {
            "countToday": total_count,
            "methodBreakdown": methods,
            "lastFeeding": (
                {
                    "start": last_feeding.start.isoformat(),
                    "end": (last_feeding.end.isoformat() if last_feeding.end else None),
                    "method": last_feeding.method,
                    "amount": (
                        float(last_feeding.amount) if last_feeding.amount else None
                    ),
                    "duration": (
                        last_feeding.duration.total_seconds()
                        if last_feeding.duration
                        else None
                    ),
                }
                if last_feeding
                else None
            ),
        }

    if topic == "diaper":
        changes_today = DiaperChange.objects.filter(child=child, time__gte=today_start)
        wet_count = changes_today.filter(wet=True).count()
        solid_count = changes_today.filter(solid=True).count()
        last_change = DiaperChange.objects.filter(child=child).order_by("-time").first()
        return {
            "countToday": changes_today.count(),
            "wetToday": wet_count,
            "solidToday": solid_count,
            "lastChange": (
                {
                    "time": last_change.time.isoformat(),
                    "wet": last_change.wet,
                    "solid": last_change.solid,
                    "color": last_change.color or "",
                }
                if last_change
                else None
            ),
        }

    if topic == "pumping":
        pumpings_today = Pumping.objects.filter(child=child, start__gte=today_start)
        total_amount = sum(float(p.amount) for p in pumpings_today if p.amount)
        last_pump = Pumping.objects.filter(child=child).order_by("-end").first()
        return {
            "countToday": pumpings_today.count(),
            "totalAmountToday": round(total_amount, 1),
            "lastPump": (
                {
                    "start": last_pump.start.isoformat(),
                    "end": last_pump.end.isoformat() if last_pump.end else None,
                    "amount": (float(last_pump.amount) if last_pump.amount else None),
                    "duration": (
                        last_pump.duration.total_seconds()
                        if last_pump.duration
                        else None
                    ),
                }
                if last_pump
                else None
            ),
        }

    return {}


def _build_topic_charts(child, topic, request):
    """Generate Plotly chart HTML+JS for the Charts tab."""
    from reports import graphs as report_graphs

    charts = []
    plotly_locale = (
        "de"
        if str(getattr(request, "LANGUAGE_CODE", "en")).startswith("de")
        else "en-US"
    )

    def _safe_chart(key, title, graph_fn, queryset):
        try:
            html, js = graph_fn(queryset)
            return {"key": key, "title": str(title), "html": html, "js": js}
        except Exception:
            return None

    if topic == "sleep":
        sleeps = Sleep.objects.filter(child=child, end__isnull=False).order_by(
            "-start"
        )[:200]
        if sleeps:
            c = _safe_chart(
                "sleep-totals",
                _("Sleep Totals"),
                report_graphs.sleep_totals,
                sleeps,
            )
            if c:
                charts.append(c)
            c = _safe_chart(
                "sleep-pattern",
                _("Sleep Pattern"),
                report_graphs.sleep_pattern,
                sleeps,
            )
            if c:
                charts.append(c)

    elif topic == "feeding":
        feedings = Feeding.objects.filter(child=child, end__isnull=False).order_by(
            "-start"
        )[:200]
        if feedings:
            c = _safe_chart(
                "feeding-duration",
                _("Feeding Duration"),
                report_graphs.feeding_duration,
                feedings,
            )
            if c:
                charts.append(c)
            c = _safe_chart(
                "feeding-amounts",
                _("Feeding Amounts"),
                report_graphs.feeding_amounts,
                feedings,
            )
            if c:
                charts.append(c)

    elif topic == "diaper":
        changes = DiaperChange.objects.filter(child=child).order_by("-time")[:200]
        if changes:
            c = _safe_chart(
                "diaper-types",
                _("Diaper Types"),
                report_graphs.diaperchange_types,
                changes,
            )
            if c:
                charts.append(c)
            c = _safe_chart(
                "diaper-amounts",
                _("Diaper Amounts"),
                report_graphs.diaperchange_amounts,
                changes,
            )
            if c:
                charts.append(c)

    elif topic == "pumping":
        pumpings = Pumping.objects.filter(child=child, end__isnull=False).order_by(
            "-start"
        )[:200]
        if pumpings:
            c = _safe_chart(
                "pumping-amounts",
                _("Pumping Amounts"),
                report_graphs.pumping_amounts,
                pumpings,
            )
            if c:
                charts.append(c)

    return {"charts": charts, "plotlyLocale": plotly_locale}


class ChildTopicView(LoginRequiredMixin, DetailView):
    model = Child
    slug_field = "slug"

    def get(self, request, *args, **kwargs):
        import logging
        import traceback

        logger = logging.getLogger(__name__)

        topic = kwargs.get("topic", "")
        if topic not in VALID_TOPICS:
            raise Http404

        try:
            child = self.get_object()
        except Exception:
            logger.error(
                "ChildTopicView get_object failed:\n%s", traceback.format_exc()
            )
            raise

        try:
            overview = _build_topic_overview(child, topic)
        except Exception:
            logger.error("_build_topic_overview failed:\n%s", traceback.format_exc())
            overview = {}

        try:
            chart_data = _build_topic_charts(child, topic, request)
        except Exception:
            logger.error("_build_topic_charts failed:\n%s", traceback.format_exc())
            chart_data = {"charts": [], "plotlyLocale": "en-US"}

        try:
            return self._render_topic(request, child, topic, overview, chart_data)
        except Exception:
            logger.error("ChildTopicView render failed:\n%s", traceback.format_exc())
            raise

    def _render_topic(self, request, child, topic, overview, chart_data):
        topic_urls = {}
        for t in VALID_TOPICS:
            topic_urls[t] = reverse(
                "dashboard:child-topic",
                kwargs={"slug": child.slug, "topic": t},
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
                    "topicTemplate": reverse(
                        "dashboard:child-topic",
                        kwargs={"slug": "__CHILD_SLUG__", "topic": "__TOPIC__"},
                    ),
                },
                "currentChild": {
                    "id": child.id,
                    "slug": child.slug,
                    "name": str(child),
                    "birthDateLabel": _format_full_date(child.birth_date),
                    "pictureUrl": request.build_absolute_uri(_child_picture_url(child)),
                },
                "children": _serialize_children(request, Child.objects.all()),
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


class ChildDashboard(PermissionRequiredMixin, DetailView):
    model = Child
    permission_required = ("core.view_child",)
    template_name = "babybuddy/ant_app.html"

    SECTION_CARD_MAP = {
        "quick_entry": [
            "card.quick_entry.consolidated",
        ],
        "diaper": [
            "card.diaper.quick_entry",
            "card.diaper.last",
            "card.diaper.types",
        ],
        "feedings": [
            "card.feedings.quick_entry",
            "card.feedings.last",
            "card.feedings.method",
            "card.feedings.recent",
        ],
        "breastfeeding": [
            "card.feedings.breast_quick_entry",
            "card.breastfeeding.today",
            "card.breastfeeding.last",
        ],
        "pumpings": [
            "card.pumpings.quick_entry",
            "card.pumpings.last",
        ],
        "sleep": [
            "card.sleep.timers",
            "card.sleep.quick_timer",
            "card.sleep.last",
            "card.sleep.recommendations",
            "card.sleep.recent",
            "card.sleep.naps_day",
            "card.sleep.statistics",
            "card.sleep.timeline_day",
            "card.sleep.night_circle",
            "card.sleep.week_chart",
            "card.sleep.list",
        ],
        "tummytime": [
            "card.tummytime.day",
        ],
        "examinations": [
            "card.examinations.next",
        ],
    }
    SECTION_ORDER = [
        "quick_entry",
        "diaper",
        "feedings",
        "breastfeeding",
        "pumpings",
        "sleep",
        "tummytime",
        "examinations",
    ]

    @staticmethod
    def _parse_local_datetime(date_value, time_value):
        entry_date = datetime.date.fromisoformat(date_value)
        entry_time = datetime.time.fromisoformat(time_value)
        naive_dt = datetime.datetime.combine(entry_date, entry_time)
        return timezone.make_aware(naive_dt, timezone.get_current_timezone())

    def _maybe_send_14h_notification(self, timer):
        """Send a push notification if the sleep timer has been running for > 14 hours
        and no notification has been sent yet for this timer session."""
        threshold = 14 * 3600  # 14 hours in seconds
        if timer.paused_at is not None:
            return  # paused — no alert
        if timer.notified_14h_at is not None:
            return  # already notified
        if timer.elapsed_seconds() < threshold:
            return  # not yet at 14h

        child = self.object
        title = str(child)
        body = _("Sleep timer has been running for over 14 hours.")
        try:
            send_push_notification(self.request.user, title, body)
        except Exception:
            pass  # never let a notification error break the page load

        timer.notified_14h_at = timezone.now()
        timer.save(update_fields=["notified_14h_at"])

    @staticmethod
    def _classify_sleep_nap(start_dt, net_duration_secs):
        """Return True (nap) or False (sleep). Night = 17:00–07:00 → always sleep."""
        local_start = timezone.localtime(start_dt)
        hour = local_start.hour
        is_night = hour >= 17 or hour < 7
        return not is_night and net_duration_secs < 90 * 60

    @staticmethod
    def _validation_error_text(exc):
        """Extract the first plain-text message from a ValidationError."""
        if hasattr(exc, "message_dict"):
            for msgs in exc.message_dict.values():
                if msgs:
                    return strip_tags(str(msgs[0]))
        if hasattr(exc, "messages") and exc.messages:
            return strip_tags(str(exc.messages[0]))
        return strip_tags(str(exc))

    def _handle_diaper_quick_entry(self, request):
        entry_date = (request.POST.get("diaper_entry_date") or "").strip()
        entry_time = (request.POST.get("diaper_entry_time") or "").strip()
        consistency = (request.POST.get("diaper_entry_consistency") or "").strip()

        if not entry_date or not entry_time or consistency not in {"liquid", "solid"}:
            return False, _(
                "Unable to create diaper entry: date, time, and consistency are required."
            )

        try:
            entry_dt = self._parse_local_datetime(entry_date, entry_time)
        except ValueError as exc:
            return False, _("Unable to create diaper entry: %(error)s") % {"error": exc}

        change = DiaperChange(
            child=self.object,
            time=entry_dt,
            wet=consistency == "liquid",
            solid=consistency == "solid",
        )
        try:
            change.full_clean()
            change.save()
            return True, None
        except ValidationError as exc:
            return False, _("Unable to create diaper entry: %(error)s") % {
                "error": self._validation_error_text(exc)
            }

    def _handle_sleep_manual_entry(self, request):
        start_date = (request.POST.get("sleep_entry_start_date") or "").strip()
        start_time = (request.POST.get("sleep_entry_start_time") or "").strip()
        end_date = (request.POST.get("sleep_entry_end_date") or "").strip()
        end_time = (request.POST.get("sleep_entry_end_time") or "").strip()
        sleep_type = (request.POST.get("sleep_entry_type") or "").strip()

        if not start_date or not start_time or not end_date or not end_time:
            return False, _(
                "Unable to create sleep entry: start and end date/time are required."
            )

        if sleep_type not in {"sleep", "nap"}:
            return False, _("Unable to create sleep entry: type is required.")

        try:
            start_dt = self._parse_local_datetime(start_date, start_time)
            end_dt = self._parse_local_datetime(end_date, end_time)
        except ValueError as exc:
            return False, _("Unable to create sleep entry: %(error)s") % {"error": exc}

        sleep = Sleep(
            child=self.object,
            start=start_dt,
            end=end_dt,
            nap=sleep_type == "nap",
        )
        try:
            sleep.full_clean()
            sleep.save()
            return True, None
        except ValidationError as exc:
            return False, _("Unable to create sleep entry: %(error)s") % {
                "error": self._validation_error_text(exc)
            }

    def _handle_feeding_quick_entry(self, request):
        start_date = (request.POST.get("feeding_entry_start_date") or "").strip()
        start_time = (request.POST.get("feeding_entry_start_time") or "").strip()
        end_date = (request.POST.get("feeding_entry_end_date") or "").strip()
        end_time = (request.POST.get("feeding_entry_end_time") or "").strip()
        feeding_type = (request.POST.get("feeding_entry_type") or "").strip()

        type_map = {
            "solid": ("solid food", "parent fed"),
            "baby_food": ("formula", "bottle"),
            "breast_milk": ("breast milk", "bottle"),
        }

        if (
            not start_date
            or not start_time
            or not end_date
            or not end_time
            or feeding_type not in type_map
        ):
            return False, _(
                "Unable to create feeding entry: start, end, and type are required."
            )

        try:
            start_dt = self._parse_local_datetime(start_date, start_time)
            end_dt = self._parse_local_datetime(end_date, end_time)
        except ValueError as exc:
            return False, _("Unable to create feeding entry: %(error)s") % {
                "error": exc
            }

        mapped_type, mapped_method = type_map[feeding_type]
        feeding = Feeding(
            child=self.object,
            start=start_dt,
            end=end_dt,
            type=mapped_type,
            method=mapped_method,
        )
        try:
            feeding.full_clean()
            feeding.save()
            return True, None
        except ValidationError as exc:
            return False, _("Unable to create feeding entry: %(error)s") % {
                "error": self._validation_error_text(exc)
            }

    def _handle_breastfeeding_quick_entry(self, request):
        start_date = (request.POST.get("breastfeeding_entry_start_date") or "").strip()
        start_time = (request.POST.get("breastfeeding_entry_start_time") or "").strip()
        end_date = (request.POST.get("breastfeeding_entry_end_date") or "").strip()
        end_time = (request.POST.get("breastfeeding_entry_end_time") or "").strip()
        side = (request.POST.get("breastfeeding_entry_side") or "").strip()

        side_map = {
            "left": "left breast",
            "right": "right breast",
        }

        if (
            not start_date
            or not start_time
            or not end_date
            or not end_time
            or side not in side_map
        ):
            return False, _(
                "Unable to create breastfeeding entry: start, end, and side are required."
            )

        try:
            start_dt = self._parse_local_datetime(start_date, start_time)
            end_dt = self._parse_local_datetime(end_date, end_time)
        except ValueError as exc:
            return False, _("Unable to create breastfeeding entry: %(error)s") % {
                "error": exc
            }

        feeding = Feeding(
            child=self.object,
            start=start_dt,
            end=end_dt,
            type="breast milk",
            method=side_map[side],
        )
        try:
            feeding.full_clean()
            feeding.save()
            return True, None
        except ValidationError as exc:
            return False, _("Unable to create breastfeeding entry: %(error)s") % {
                "error": self._validation_error_text(exc)
            }

    def _handle_pumping_quick_entry(self, request):
        start_date = (request.POST.get("pumping_entry_start_date") or "").strip()
        start_time = (request.POST.get("pumping_entry_start_time") or "").strip()
        end_date = (request.POST.get("pumping_entry_end_date") or "").strip()
        end_time = (request.POST.get("pumping_entry_end_time") or "").strip()
        amount_raw = (request.POST.get("pumping_entry_amount") or "").strip()
        side = (request.POST.get("pumping_entry_side") or "").strip()

        if (
            not start_date
            or not start_time
            or not end_date
            or not end_time
            or not amount_raw
            or side not in {"left", "right", "both"}
        ):
            return False, _(
                "Unable to create pumping entry: start, end, amount, and side are required."
            )

        try:
            start_dt = self._parse_local_datetime(start_date, start_time)
            end_dt = self._parse_local_datetime(end_date, end_time)
            amount = float(amount_raw)
        except (TypeError, ValueError) as exc:
            return False, _("Unable to create pumping entry: %(error)s") % {
                "error": exc
            }

        pumping = Pumping(
            child=self.object,
            start=start_dt,
            end=end_dt,
            amount=amount,
            side=side,
        )
        try:
            pumping.full_clean()
            pumping.save()
            return True, None
        except ValidationError as exc:
            return False, _("Unable to create pumping entry: %(error)s") % {
                "error": self._validation_error_text(exc)
            }

    def get_template_names(self):
        if _ant_dashboard_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        if request.POST.get("diaper_quick_entry_action") == "create":
            ok, error = self._handle_diaper_quick_entry(request)
            return JsonResponse({"ok": ok, "error": error})
        if request.POST.get("sleep_manual_entry_action") == "create":
            ok, error = self._handle_sleep_manual_entry(request)
            return JsonResponse({"ok": ok, "error": error})
        if request.POST.get("feeding_quick_entry_action") == "create":
            ok, error = self._handle_feeding_quick_entry(request)
            return JsonResponse({"ok": ok, "error": error})
        if request.POST.get("breastfeeding_quick_entry_action") == "create":
            ok, error = self._handle_breastfeeding_quick_entry(request)
            return JsonResponse({"ok": ok, "error": error})
        if request.POST.get("pumping_quick_entry_action") == "create":
            ok, error = self._handle_pumping_quick_entry(request)
            return JsonResponse({"ok": ok, "error": error})

        action = request.POST.get("sleep_timer_action")
        child = self.object

        if action == "start":
            SleepTimer.objects.filter(child=child).delete()
            SleepTimer.objects.create(
                child=child, start=timezone.now(), breaks=[], notified_14h_at=None
            )

        elif action == "pause":
            SleepTimer.objects.filter(child=child, paused_at__isnull=True).update(
                paused_at=timezone.now()
            )

        elif action == "resume":
            try:
                timer = SleepTimer.objects.get(child=child, paused_at__isnull=False)
                pause_end = timezone.now()
                timer.breaks.append(
                    {"start": timer.paused_at.isoformat(), "end": pause_end.isoformat()}
                )
                timer.paused_at = None
                timer.save(update_fields=["breaks", "paused_at"])
            except SleepTimer.DoesNotExist:
                pass

        elif action == "cancel":
            SleepTimer.objects.filter(child=child).delete()

        elif action in ("stop", "save"):
            try:
                timer = SleepTimer.objects.get(child=child)
                end_dt = timezone.now()
                net_secs = timer.elapsed_seconds()
                nap = self._classify_sleep_nap(timer.start, net_secs)
                sleep = Sleep(
                    child=child,
                    start=timer.start,
                    end=end_dt,
                    nap=nap,
                    net_duration=datetime.timedelta(seconds=net_secs),
                    breaks=timer.breaks,
                )
                sleep.full_clean()
                sleep.save()
                timer.delete()
            except SleepTimer.DoesNotExist:
                pass
            except (TypeError, ValueError, ValidationError) as exc:
                return JsonResponse(
                    {
                        "ok": False,
                        "error": f"Unable to save sleep entry: {self._validation_error_text(exc) if isinstance(exc, ValidationError) else exc}",
                    }
                )

        return JsonResponse({"ok": True})

    def get_context_data(self, **kwargs):
        context = super(ChildDashboard, self).get_context_data(**kwargs)
        selected_items = self.request.user.settings.dashboard_selected_items()
        ordered_sections = self.request.user.settings.dashboard_selected_section_order()
        hidden_sections = (
            self.request.user.settings.dashboard_selected_hidden_sections()
        )
        allowed_items = {
            card
            for section_cards in self.SECTION_CARD_MAP.values()
            for card in section_cards
        }
        ordered_visible_items = [
            item for item in selected_items if item in allowed_items
        ]
        if (
            "card.sleep.night_circle" in allowed_items
            and "card.sleep.night_circle" not in ordered_visible_items
        ):
            try:
                insert_at = ordered_visible_items.index("card.sleep.week_chart")
            except ValueError:
                insert_at = len(ordered_visible_items)
            ordered_visible_items.insert(insert_at, "card.sleep.night_circle")
        visible_items = set(ordered_visible_items)

        preview_cards_by_section = {
            section: [item for item in ordered_visible_items if item in cards]
            for section, cards in self.SECTION_CARD_MAP.items()
        }
        visible_sections = [
            section
            for section in ordered_sections
            if preview_cards_by_section.get(section)
        ]

        context["visible_dashboard_items"] = visible_items
        context["visible_dashboard_sections"] = set(visible_sections)
        context["dashboard_section_order"] = visible_sections
        context["dashboard_hidden_sections"] = hidden_sections
        children = Child.objects.all().order_by("last_name", "first_name", "id")
        _not_running = {
            "running": False,
            "startIso": None,
            "elapsedSeconds": 0,
            "paused": False,
            "pauseStartIso": None,
            "frozenSeconds": 0,
        }
        try:
            sleep_timer_obj = self.object.sleep_timer
            timer_payload = sleep_timer_obj.to_bootstrap_payload()
            self._maybe_send_14h_notification(sleep_timer_obj)
        except SleepTimer.DoesNotExist:
            sleep_timer_obj = None
            timer_payload = _not_running
        if _ant_dashboard_enabled():
            context["ant_page_title"] = _("Dashboard")
            context["ant_bootstrap"] = {
                "pageType": "dashboard-child",
                "currentPath": self.request.path,
                "activeNavKey": reverse("dashboard:dashboard"),
                "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
                "csrfToken": get_token(self.request),
                "user": {"displayName": _display_name(self.request.user)},
                "urls": {
                    **_build_nav_urls(self.request),
                    "layout": reverse("babybuddy:user-settings"),
                    "current": self.request.get_full_path(),
                    "profileTimeline": reverse(
                        "core:child-profile-timeline",
                        kwargs={"slug": self.object.slug},
                    ),
                    "childGeneral": reverse(
                        "core:child-general",
                        kwargs={"slug": self.object.slug},
                    ),
                    "topicTemplate": reverse(
                        "dashboard:child-topic",
                        kwargs={"slug": "__CHILD_SLUG__", "topic": "__TOPIC__"},
                    ),
                    "childDashboardTemplate": reverse(
                        "dashboard:dashboard-child", kwargs={"slug": "__CHILD_SLUG__"}
                    ),
                    "childInsights": reverse(
                        "dashboard:child-insights", kwargs={"pk": self.object.pk}
                    ),
                    "topicPages": {
                        t: reverse(
                            "dashboard:child-topic",
                            kwargs={"slug": self.object.slug, "topic": t},
                        )
                        for t in VALID_TOPICS
                    },
                },
                "children": _serialize_children(self.request, children),
                "currentChild": {
                    "id": self.object.id,
                    "slug": self.object.slug,
                    "name": str(self.object),
                    "birthDateLabel": _format_full_date(self.object.birth_date),
                    "pictureUrl": self.request.build_absolute_uri(
                        _child_picture_url(self.object)
                    ),
                },
                "sleepTimer": timer_payload,
                "dashboard": _build_section_payload(
                    preview_cards_by_section, visible_sections, hidden_sections
                ),
                "strings": _build_ant_strings(),
                "quickStatus": _build_quick_status(self.object),
                "statCards": _build_stat_cards(self.object),
                "recentActivity": _build_recent_activity(
                    self.object,
                    ref_date=_parse_date_param(self.request),
                ),
                "insights": _build_insights_for_bootstrap(self.object),
                "dialActivities": _build_dial_activities(
                    self.object,
                    ref_date=_parse_date_param(self.request),
                ),
                "bedtime": (
                    self.object.usual_bedtime.strftime("%H:%M")
                    if self.object.usual_bedtime
                    else None
                ),
                "celestial": _build_celestial_data(self.request.user),
                "examinationCardData": (
                    _build_next_exam_card(self.object)
                    if "card.examinations.next" in visible_items
                    else None
                ),
            }
        return context


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

        context["ant_page_title"] = _("Insights")
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
                "addChild": reverse("core:child-add"),
                "insightsTemplate": reverse(
                    "dashboard:child-insights",
                    kwargs={"pk": 0},
                ).replace("0", "__CHILD_ID__"),
            },
            "messages": _serialize_messages(self.request),
            "children": _serialize_children(self.request, Child.objects.all()),
            "currentChild": {
                "id": child.id,
                "slug": child.slug,
                "name": str(child),
            },
            "child": {
                "id": child.id,
                "name": str(child),
                "ageWeeks": (
                    (datetime.date.today() - child.birth_date).days // 7
                    if child.birth_date
                    else None
                ),
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
            "settings": {
                "ai": {
                    "provider": self.request.user.settings.llm_provider,
                }
            },
            "strings": _build_ant_strings(),
        }
        return context


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

        if not request.user.has_perm("core.view_child"):
            return StreamingHttpResponse(
                iter([f'event: error\ndata: {_json.dumps("Permission denied")}\n\n']),
                content_type="text/event-stream",
            )

        user_settings = request.user.settings

        def stream():
            from core.insights import build_llm_context
            from core.llm import generate_summary, LLMError

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
            except LLMError as e:
                yield f"event: error\ndata: {_json.dumps(str(e))}\n\n"

        response = StreamingHttpResponse(stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
