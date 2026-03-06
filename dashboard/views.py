# -*- coding: utf-8 -*-
from django.conf import settings
from django.contrib import messages
from django.core.exceptions import ValidationError
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils import timezone
from django.views.generic.base import TemplateView
from django.views.generic.detail import DetailView

from babybuddy.mixins import LoginRequiredMixin, PermissionRequiredMixin
from core.models import Child, Sleep


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

    def get_context_data(self, **kwargs):
        context = super(Dashboard, self).get_context_data(**kwargs)
        context["objects"] = Child.objects.all().order_by(
            "last_name", "first_name", "id"
        )
        return context


class ChildDashboard(PermissionRequiredMixin, DetailView):
    model = Child
    permission_required = ("core.view_child",)
    template_name = "dashboard/child.html"

    SECTION_CARD_MAP = {
        "diaper": [
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

    def get_template_names(self):
        if settings.BABY_BUDDY.get("DASHBOARD_SHADCN_CHILD_ENABLED", False):
            return ["babybuddy/shadcn_preview.html"]
        return [self.template_name]

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
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
        hidden_sections = self.request.user.settings.dashboard_selected_hidden_sections()
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
        context["preview_visible_items"] = visible_items
        context["preview_visible_sections"] = visible_sections
        context["preview_hidden_sections"] = hidden_sections
        context["preview_cards_by_section"] = preview_cards_by_section
        context["preview_mode"] = False
        context["preview_fixed_child"] = self.object
        context["preview_children"] = Child.objects.all().order_by(
            "last_name", "first_name", "id"
        )
        return context
