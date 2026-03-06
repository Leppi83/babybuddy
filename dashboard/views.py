# -*- coding: utf-8 -*-
import datetime

from django.contrib import messages
from django.core.exceptions import ValidationError
from django.http import HttpResponseRedirect
from django.middleware.csrf import get_token
from django.templatetags.static import static
from django.urls import reverse
from django.utils import timezone
from django.utils.translation import gettext as _
from django.views.generic.base import TemplateView
from django.views.generic.detail import DetailView

from babybuddy.mixins import LoginRequiredMixin, PermissionRequiredMixin
from core.models import Child, DiaperChange, Sleep


def _ant_dashboard_enabled():
    return True


def _child_picture_url(child):
    if child.picture:
        return child.picture.url
    return static("babybuddy/img/core/child-placeholder.png")


def _display_name(user):
    return user.get_full_name() or user.username


def _build_nav_urls(request):
    return {
        "dashboard": reverse("dashboard:dashboard"),
        "timeline": reverse("core:timeline"),
        "settings": reverse("babybuddy:user-settings"),
        "logout": reverse("babybuddy:logout"),
    }


def _build_ant_strings():
    return {
        "dashboard": _("Dashboard"),
        "children": _("Children"),
        "timeline": _("Timeline"),
        "settings": _("Settings"),
        "logout": _("Logout"),
        "childDashboard": _("Child Dashboard"),
        "overview": _("Overview"),
        "born": _("Born"),
        "age": _("Age"),
        "openDashboard": _("Open dashboard"),
        "refresh": _("Refresh"),
        "hide": _("Hide"),
        "show": _("Show"),
        "loading": _("Loading..."),
        "quickEntry": _("Quick Entry"),
        "date": _("Date"),
        "time": _("Time"),
        "liquid": _("Liquid"),
        "solid": _("Solid"),
        "diaperChanges": _("Diaper changes"),
        "diaper": _("Diaper changes"),
        "feedings": _("Feedings"),
        "pumpings": _("Pumpings"),
        "sleep": _("Sleep"),
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
        "migrationPending": _("Migration pending"),
        "saveFailed": _("Save failed"),
        "saved": _("Saved"),
        "sleepTimerPending": _("Sleep timer migration pending"),
    }


def _serialize_children(request, children):
    return [
        {
            "id": child.id,
            "slug": child.slug,
            "name": str(child),
            "birthDate": child.birth_date.isoformat() if child.birth_date else None,
            "birthDateLabel": str(child.birth_date) if child.birth_date else "",
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
    template_name = "dashboard/dashboard.html"

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
    template_name = "dashboard/child.html"

    SECTION_CARD_MAP = {
        "diaper": [
            "card.diaper.quick_entry",
            "card.diaper.last",
            "card.diaper.types",
        ],
        "feedings": [
            "card.feedings.last",
            "card.feedings.method",
            "card.feedings.recent",
            "card.feedings.breastfeeding",
        ],
        "pumpings": [
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
        ],
        "tummytime": [
            "card.tummytime.day",
        ],
    }
    SECTION_ORDER = ["diaper", "feedings", "pumpings", "sleep", "tummytime"]

    @staticmethod
    def _timer_session_key(child_id):
        return f"sleep_timer_start_{child_id}"

    @staticmethod
    def _parse_local_datetime(date_value, time_value):
        entry_date = datetime.date.fromisoformat(date_value)
        entry_time = datetime.time.fromisoformat(time_value)
        naive_dt = datetime.datetime.combine(entry_date, entry_time)
        return timezone.make_aware(naive_dt, timezone.get_current_timezone())

    def _handle_diaper_quick_entry(self, request):
        entry_date = (request.POST.get("diaper_entry_date") or "").strip()
        entry_time = (request.POST.get("diaper_entry_time") or "").strip()
        consistency = (request.POST.get("diaper_entry_consistency") or "").strip()

        if not entry_date or not entry_time or consistency not in {"liquid", "solid"}:
            messages.error(
                request,
                _(
                    "Unable to create diaper entry: date, time, and consistency are required."
                ),
            )
            return

        try:
            entry_dt = self._parse_local_datetime(entry_date, entry_time)
        except ValueError as exc:
            messages.error(
                request, _("Unable to create diaper entry: %(error)s") % {"error": exc}
            )
            return

        change = DiaperChange(
            child=self.object,
            time=entry_dt,
            wet=consistency == "liquid",
            solid=consistency == "solid",
        )
        try:
            change.full_clean()
            change.save()
            messages.success(request, _("Nappy change saved."))
        except ValidationError as exc:
            messages.error(
                request, _("Unable to create diaper entry: %(error)s") % {"error": exc}
            )

    def get_template_names(self):
        if _ant_dashboard_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        if request.POST.get("diaper_quick_entry_action") == "create":
            self._handle_diaper_quick_entry(request)
            return HttpResponseRedirect(request.get_full_path())

        action = request.POST.get("sleep_timer_action")
        key = self._timer_session_key(self.object.id)

        if action == "start":
            request.session[key] = timezone.now().isoformat()
            request.session.modified = True
        elif action == "stop":
            start_raw = request.session.get(key)
            if start_raw:
                try:
                    start_dt = timezone.datetime.fromisoformat(start_raw)
                    end_dt = timezone.now()
                    duration = end_dt - start_dt
                    sleep = Sleep(
                        child=self.object,
                        start=start_dt,
                        end=end_dt,
                        nap=duration < timezone.timedelta(hours=2),
                    )
                    sleep.full_clean()
                    sleep.save()
                    del request.session[key]
                    request.session.modified = True
                except (TypeError, ValueError, ValidationError) as exc:
                    messages.error(request, f"Unable to create sleep entry: {exc}")

        return HttpResponseRedirect(request.get_full_path())

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
        if _ant_dashboard_enabled():
            context["ant_page_title"] = _("Dashboard")
            context["ant_bootstrap"] = {
                "pageType": "dashboard-child",
                "currentPath": self.request.path,
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
                    "pictureUrl": self.request.build_absolute_uri(
                        _child_picture_url(self.object)
                    ),
                },
                "dashboard": _build_section_payload(
                    preview_cards_by_section, visible_sections, hidden_sections
                ),
                "strings": _build_ant_strings(),
            }
        return context
