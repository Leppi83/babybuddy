# -*- coding: utf-8 -*-
import datetime

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.utils.html import strip_tags
from django.middleware.csrf import get_token
from django.templatetags.static import static
from django.urls import reverse
from django.utils import timezone
from django.utils.translation import gettext as _
from django.views.generic.base import TemplateView
from django.views.generic.detail import DetailView

from babybuddy.mixins import LoginRequiredMixin, PermissionRequiredMixin
from core.models import Child, DiaperChange, Feeding, Pumping, Sleep


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


def _build_nav_urls(request):
    return {
        "dashboard": reverse("dashboard:dashboard"),
        "timeline": reverse("core:timeline"),
        "childrenList": reverse("core:child-list"),
        "settings": reverse("babybuddy:user-settings"),
        "logout": reverse("babybuddy:logout"),
        "addChild": reverse("core:child-add"),
    }


def _build_ant_strings():
    return {
        "dashboard": _("Dashboard"),
        "addChild": _("Add Child"),
        "children": _("Children"),
        "timeline": _("Timeline"),
        "settings": _("Settings"),
        "logout": _("Logout"),
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
        "lastPumping": _("Last Pumping"),
        "timers": _("Timers"),
        "sleepTimer": _("Sleep Timer"),
        "lastSleep": _("Last Sleep"),
        "sleepRecommendations": _("Sleep Recommendations"),
        "recentSleep": _("Recent Sleep"),
        "todaysNaps": _("Today's Naps"),
        "statistics": _("Statistics"),
        "sleepTimeline": _("Sleep Timeline (24h)"),
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

    # Show the overall dashboard or a child dashboard if one Child instance.
    def get(self, request, *args, **kwargs):
        children = Child.objects.count()
        if children == 0:
            return HttpResponseRedirect(reverse("babybuddy:welcome"))
        elif children == 1:
            return HttpResponseRedirect(
                reverse("dashboard:dashboard-child", args={Child.objects.first().slug})
            )
        return super(Dashboard, self).get(request, *args, **kwargs)

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
                "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
                "csrfToken": get_token(self.request),
                "user": {"displayName": _display_name(self.request.user)},
                "urls": _build_nav_urls(self.request),
                "children": _serialize_children(self.request, children),
                "strings": _build_ant_strings(),
            }
        return context


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
            "card.feedings.breast_quick_entry",
            "card.feedings.last",
            "card.feedings.method",
            "card.feedings.recent",
            "card.feedings.breastfeeding",
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
            "card.sleep.week_chart",
            "card.sleep.list",
        ],
        "tummytime": [
            "card.tummytime.day",
        ],
    }
    SECTION_ORDER = [
        "quick_entry",
        "diaper",
        "feedings",
        "pumpings",
        "sleep",
        "tummytime",
    ]

    @staticmethod
    def _timer_session_key(child_id):
        return f"sleep_timer_start_{child_id}"

    @staticmethod
    def _parse_local_datetime(date_value, time_value):
        entry_date = datetime.date.fromisoformat(date_value)
        entry_time = datetime.time.fromisoformat(time_value)
        naive_dt = datetime.datetime.combine(entry_date, entry_time)
        return timezone.make_aware(naive_dt, timezone.get_current_timezone())

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
        key = self._timer_session_key(self.object.id)
        breaks_key = f"{key}_breaks"

        if action == "start":
            request.session[key] = timezone.now().isoformat()
            request.session[breaks_key] = []
            request.session.modified = True
        elif action == "pause":
            request.session.setdefault(breaks_key, [])
            request.session[f"{breaks_key}_pause_start"] = timezone.now().isoformat()
            request.session.modified = True
        elif action == "resume":
            pause_start_raw = request.session.get(f"{breaks_key}_pause_start")
            if pause_start_raw:
                try:
                    pause_start = timezone.datetime.fromisoformat(pause_start_raw)
                    pause_end = timezone.now()
                    breaks_list = request.session.setdefault(breaks_key, [])
                    breaks_list.append(
                        {
                            "start": pause_start.isoformat(),
                            "end": pause_end.isoformat(),
                        }
                    )
                    del request.session[f"{breaks_key}_pause_start"]
                    request.session.modified = True
                except (TypeError, ValueError) as exc:
                    return JsonResponse(
                        {"ok": False, "error": f"Unable to record break: {exc}"}
                    )
        elif action in ("stop", "save"):
            start_raw = request.session.get(key)
            if start_raw:
                try:
                    start_dt = timezone.datetime.fromisoformat(start_raw)
                    end_dt = timezone.now()
                    breaks_list = request.session.get(breaks_key, [])

                    # Use sleep_timer_type if provided (from frontend), otherwise calculate
                    sleep_type = request.POST.get("sleep_timer_type")
                    if sleep_type == "nap":
                        nap = True
                    elif sleep_type == "sleep":
                        nap = False
                    else:
                        # Fallback: < 90 min is nap, >= 90 min is sleep
                        nap = (end_dt - start_dt) < timezone.timedelta(minutes=90)

                    sleep = Sleep(
                        child=self.object,
                        start=start_dt,
                        end=end_dt,
                        nap=nap,
                        breaks=breaks_list,
                    )
                    sleep.full_clean()
                    sleep.save()
                    del request.session[key]
                    if breaks_key in request.session:
                        del request.session[breaks_key]
                    if f"{breaks_key}_pause_start" in request.session:
                        del request.session[f"{breaks_key}_pause_start"]
                    request.session.modified = True
                except (TypeError, ValueError, ValidationError) as exc:
                    return JsonResponse(
                        {
                            "ok": False,
                            "error": f"Unable to create sleep entry: {self._validation_error_text(exc) if isinstance(exc, ValidationError) else exc}",
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
        key = self._timer_session_key(self.object.id)
        breaks_key = f"{key}_breaks"
        pause_key = f"{breaks_key}_pause_start"
        start_raw = self.request.session.get(key)
        timer_payload = {
            "running": False,
            "startIso": None,
            "elapsedSeconds": 0,
            "paused": False,
            "pauseStartIso": None,
            "frozenSeconds": 0,
        }
        if start_raw:
            try:
                start_dt = timezone.datetime.fromisoformat(start_raw)
                now = timezone.now()
                breaks_list = self.request.session.get(breaks_key, [])
                break_seconds = sum(
                    int(
                        (
                            timezone.datetime.fromisoformat(b["end"])
                            - timezone.datetime.fromisoformat(b["start"])
                        ).total_seconds()
                    )
                    for b in breaks_list
                    if "start" in b and "end" in b
                )
                pause_raw = self.request.session.get(pause_key)
                if pause_raw:
                    pause_start_dt = timezone.datetime.fromisoformat(pause_raw)
                    frozen = max(
                        0,
                        int((pause_start_dt - start_dt).total_seconds())
                        - break_seconds,
                    )
                    timer_payload = {
                        "running": True,
                        "startIso": start_dt.isoformat(),
                        "elapsedSeconds": frozen,
                        "paused": True,
                        "pauseStartIso": pause_start_dt.isoformat(),
                        "frozenSeconds": frozen,
                    }
                else:
                    elapsed = max(
                        0,
                        int((now - start_dt).total_seconds()) - break_seconds,
                    )
                    timer_payload = {
                        "running": True,
                        "startIso": start_dt.isoformat(),
                        "elapsedSeconds": elapsed,
                        "paused": False,
                        "pauseStartIso": None,
                        "frozenSeconds": 0,
                    }
            except (TypeError, ValueError):
                del self.request.session[key]
                self.request.session.modified = True
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
                    "childDashboardTemplate": reverse(
                        "dashboard:dashboard-child", kwargs={"slug": "__CHILD_SLUG__"}
                    ),
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
            }
        return context
