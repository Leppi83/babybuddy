# -*- coding: utf-8 -*-
import json

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.views import LogoutView as LogoutViewBase
from django.contrib.messages.views import SuccessMessageMixin
from django.core.exceptions import BadRequest
from django.forms import Form
from django.http import HttpResponseForbidden
from django.middleware.csrf import REASON_BAD_ORIGIN
from django.shortcuts import redirect, render
from django.template import loader
from django.http import JsonResponse
from django.urls import reverse, reverse_lazy
from django.utils import translation
from django.utils.decorators import method_decorator
from django.utils.text import format_lazy
from django.utils.translation import gettext as _, gettext_lazy
from django.views import csrf
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST
from django.views.generic import View
from django.views.generic.base import TemplateView, RedirectView
from django.views.generic.detail import BaseDetailView
from django.views.generic.edit import (
    CreateView,
    DeleteView,
    FormMixin,
    SingleObjectTemplateResponseMixin,
    UpdateView,
)
from django.views.i18n import set_language

from axes.utils import reset
from django_filters.views import FilterView

from babybuddy import forms
from babybuddy.mixins import LoginRequiredMixin, PermissionRequiredMixin, StaffOnlyMixin
from core.models import Child


def csrf_failure(request, reason=""):
    """
    Overrides the 403 CSRF failure template for bad origins in order to provide more
    userful information about how to resolve the issue.
    """

    if (
        "HTTP_ORIGIN" in request.META
        and reason == REASON_BAD_ORIGIN % request.META["HTTP_ORIGIN"]
    ):
        context = {
            "title": _("Forbidden"),
            "main": _("CSRF verification failed. Request aborted."),
            "reason": reason,
            "origin": request.META["HTTP_ORIGIN"],
        }
        template = loader.get_template("error/403_csrf_bad_origin.html")
        return HttpResponseForbidden(template.render(context), content_type="text/html")

    return csrf.csrf_failure(request, reason, "403_csrf.html")


class RootRouter(LoginRequiredMixin, RedirectView):
    """
    Redirects to the site dashboard.
    """

    def get_redirect_url(self, *args, **kwargs):
        self.url = reverse("dashboard:dashboard")
        return super(RootRouter, self).get_redirect_url(self, *args, **kwargs)


class BabyBuddyFilterView(FilterView):
    """
    Disables "strictness" for django-filter. It is unclear from the
    documentation exactly what this does...
    """

    # TODO Figure out the correct way to use this.
    strict = False

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        children = {o.child for o in context["object_list"] if hasattr(o, "child")}
        if len(children) == 1:
            context["unique_child"] = True
        return context


class BabyBuddyPaginatedView(View):
    def get_paginate_by(self, queryset):
        return self.request.user.settings.pagination_count


@method_decorator(csrf_protect, name="dispatch")
@method_decorator(never_cache, name="dispatch")
@method_decorator(require_POST, name="dispatch")
class LogoutView(LogoutViewBase):
    pass


class UserList(StaffOnlyMixin, BabyBuddyFilterView):
    model = get_user_model()
    template_name = "babybuddy/user_list.html"
    ordering = "username"
    paginate_by = 10
    filterset_fields = ("username", "first_name", "last_name", "email")


class UserAdd(StaffOnlyMixin, PermissionRequiredMixin, SuccessMessageMixin, CreateView):
    model = get_user_model()
    template_name = "babybuddy/user_form.html"
    permission_required = ("admin.add_user",)
    form_class = forms.UserAddForm
    success_url = reverse_lazy("babybuddy:user-list")
    success_message = gettext_lazy("User %(username)s added!")


class UserUpdate(
    StaffOnlyMixin, PermissionRequiredMixin, SuccessMessageMixin, UpdateView
):
    model = get_user_model()
    template_name = "babybuddy/user_form.html"
    permission_required = ("admin.change_user",)
    form_class = forms.UserUpdateForm
    success_url = reverse_lazy("babybuddy:user-list")
    success_message = gettext_lazy("User %(username)s updated.")


class UserUnlock(
    StaffOnlyMixin,
    PermissionRequiredMixin,
    SuccessMessageMixin,
    FormMixin,
    SingleObjectTemplateResponseMixin,
    BaseDetailView,
):
    model = get_user_model()
    template_name = "babybuddy/user_confirm_unlock.html"
    permission_required = ("admin.change_user",)
    form_class = Form
    success_message = gettext_lazy("User unlocked.")

    def post(self, request, *args, **kwargs):
        user = self.get_object()
        form = self.get_form()
        if form.is_valid():
            reset(username=user.username)
            return self.form_valid(form)
        else:
            return self.form_invalid(form)

    def get_success_url(self):
        return reverse("babybuddy:user-update", kwargs={"pk": self.kwargs["pk"]})


class UserDelete(
    StaffOnlyMixin, PermissionRequiredMixin, DeleteView, SuccessMessageMixin
):
    model = get_user_model()
    template_name = "babybuddy/user_confirm_delete.html"
    permission_required = ("admin.delete_user",)
    success_url = reverse_lazy("babybuddy:user-list")

    def get_success_message(self, cleaned_data):
        return format_lazy(gettext_lazy("User {user} deleted."), user=self.get_object())


class UserPassword(LoginRequiredMixin, View):
    """
    Handles user password changes.
    """

    form_class = forms.UserPasswordForm
    template_name = "babybuddy/user_password_form.html"

    def get(self, request):
        return render(
            request, self.template_name, {"form": self.form_class(request.user)}
        )

    def post(self, request):
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            messages.success(request, _("Password updated."))
        return render(request, self.template_name, {"form": form})


def handle_api_regenerate_request(request) -> bool:
    """
    Checks if the current request contains a request to update the API key
    and if it does, updeates the API key.

    Returns True, if the API-key regenerate request was detected and handled.
    """

    if request.POST.get("api_key_regenerate"):
        request.user.settings.api_key(reset=True)
        messages.success(request, _("User API key regenerated."))
        return True
    return False


class UserSettings(LoginRequiredMixin, View):
    """
    Handles both the User and Settings models.
    Based on this SO answer: https://stackoverflow.com/a/45056835.
    """

    form_user_class = forms.UserForm
    form_settings_class = forms.UserSettingsForm
    template_name = "babybuddy/user_settings_form.html"

    def _save_forms(self, request):
        form_user = self.form_user_class(instance=request.user, data=request.POST)
        form_settings = self.form_settings_class(
            instance=request.user.settings, data=request.POST
        )
        if form_user.is_valid() and form_settings.is_valid():
            user = form_user.save(commit=False)
            user_settings = form_settings.save(commit=False)
            user.settings = user_settings
            user.save()
            return True, form_user, form_settings
        return False, form_user, form_settings

    def get(self, request):
        settings = request.user.settings

        return render(
            request,
            self.template_name,
            {
                "form_user": self.form_user_class(instance=request.user),
                "form_settings": self.form_settings_class(instance=settings),
            },
        )

    def post(self, request):
        if handle_api_regenerate_request(request):
            return redirect("babybuddy:user-settings")
        if request.POST.get("action") == "autosave_all_settings":
            ok, form_user, form_settings = self._save_forms(request)
            if ok:
                language = request.user.settings.language
                response = JsonResponse({"saved": True})
                response.set_cookie(
                    settings.LANGUAGE_COOKIE_NAME,
                    language,
                    max_age=settings.LANGUAGE_COOKIE_AGE,
                    path=settings.LANGUAGE_COOKIE_PATH,
                    domain=settings.LANGUAGE_COOKIE_DOMAIN,
                    secure=settings.LANGUAGE_COOKIE_SECURE or None,
                    httponly=settings.LANGUAGE_COOKIE_HTTPONLY or None,
                    samesite=settings.LANGUAGE_COOKIE_SAMESITE,
                )
                return response
            errors = {}
            errors.update(form_user.errors.get_json_data())
            errors.update(form_settings.errors.get_json_data())
            return JsonResponse({"saved": False, "errors": errors}, status=400)
        if request.POST.get("action") == "autosave_dashboard_visible_items":
            allowed = {
                key for key, _label in self.form_settings_class().dashboard_item_choices
            }
            raw_items = request.POST.get("dashboard_visible_items", "")
            selected_items = [
                item.strip()
                for item in raw_items.split(",")
                if item.strip() in allowed
            ]
            user_settings = request.user.settings
            user_settings.dashboard_visible_items = selected_items
            user_settings.save(update_fields=["dashboard_visible_items"])
            return JsonResponse({"saved": True, "count": len(selected_items)})
        if request.POST.get("action") == "autosave_dashboard_layout":
            allowed_sections = set(
                request.user.settings.dashboard_default_section_order()
            )
            raw_order = request.POST.get("dashboard_section_order", "")
            raw_hidden = request.POST.get("dashboard_hidden_sections", "")
            section_order = [
                item.strip()
                for item in raw_order.split(",")
                if item.strip() in allowed_sections
            ]
            hidden_sections = [
                item.strip()
                for item in raw_hidden.split(",")
                if item.strip() in allowed_sections
            ]
            for section in request.user.settings.dashboard_default_section_order():
                if section not in section_order:
                    section_order.append(section)

            user_settings = request.user.settings
            user_settings.dashboard_section_order = section_order
            user_settings.dashboard_hidden_sections = hidden_sections
            user_settings.save(
                update_fields=["dashboard_section_order", "dashboard_hidden_sections"]
            )
            return JsonResponse(
                {
                    "saved": True,
                    "section_order": section_order,
                    "hidden_sections": hidden_sections,
                }
            )

        ok, form_user, form_settings = self._save_forms(request)
        if ok:
            translation.activate(request.user.settings.language)
            messages.success(request, _("Settings saved!"))
            translation.deactivate()
            return set_language(request)
        return render(
            request,
            self.template_name,
            {"form_user": form_user, "form_settings": form_settings},
        )


class UserAddDevice(LoginRequiredMixin, View):
    form_user_class = forms.UserForm
    template_name = "babybuddy/user_add_device.html"
    qr_code_template = "babybuddy/login_qr_code.txt"

    def get(self, request):
        # Assemble qr_code json-data. For Home Assistant ingress support, we
        # also need to extract the ingress_session token to allow an external
        # app to authenticate with home assistant so it can reach baby buddy
        session_cookies = {}
        if request.is_homeassistant_ingress_request:
            session_cookies["ingress_session"] = request.COOKIES.get("ingress_session")

        qr_code_response = render(
            request,
            self.qr_code_template,
            {"session_cookies": json.dumps(session_cookies)},
        )
        qr_code_data = qr_code_response.content.decode().strip()

        # Now that the qr_code json-data is assembled, we can pass the json
        # structure as data to the user_add_device - template where it will
        # be converted into a qr-code.
        return render(
            request,
            self.template_name,
            {
                "form_user": self.form_user_class(instance=request.user),
                "qr_code_data": qr_code_data,
            },
        )

    def post(self, request):
        if handle_api_regenerate_request(request):
            return redirect("babybuddy:user-add-device")
        else:
            raise BadRequest()


class Welcome(LoginRequiredMixin, TemplateView):
    """
    Basic introduction to Baby Buddy (meant to be shown when no data is in the
    database).
    """

    template_name = "babybuddy/welcome.html"


class ShadcnPreview(LoginRequiredMixin, TemplateView):
    """
    Isolated preview route for the React/shadcn migration.
    """

    template_name = "babybuddy/shadcn_preview.html"

    SECTION_CARD_KEYS = {
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
        "pumpings": ["card.pumpings.last"],
        "sleep": [
            "card.sleep.timers",
            "card.sleep.quick_timer",
            "card.sleep.last",
            "card.sleep.recent",
            "card.sleep.naps_day",
            "card.sleep.statistics",
            "card.sleep.timeline_day",
            "card.sleep.recommendations",
        ],
        "tummytime": ["card.tummytime.day"],
    }
    SECTION_ORDER = ["diaper", "feedings", "pumpings", "sleep", "tummytime"]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        selected_items = self.request.user.settings.dashboard_selected_items()
        ordered_sections = self.request.user.settings.dashboard_selected_section_order()
        hidden_sections = self.request.user.settings.dashboard_selected_hidden_sections()
        allowed_items = {
            key for keys in self.SECTION_CARD_KEYS.values() for key in keys
        }
        ordered_visible_items = [
            item for item in selected_items if item in allowed_items
        ]
        selected = set(ordered_visible_items)
        preview_cards_by_section = {
            section: [item for item in ordered_visible_items if item in keys]
            for section, keys in self.SECTION_CARD_KEYS.items()
        }
        visible_sections = [
            section
            for section in ordered_sections
            if preview_cards_by_section.get(section)
        ]
        context["preview_visible_items"] = selected
        context["preview_visible_sections"] = visible_sections
        context["preview_hidden_sections"] = hidden_sections
        context["preview_cards_by_section"] = preview_cards_by_section
        context["preview_mode"] = True
        context["preview_fixed_child"] = None
        context["preview_children"] = Child.objects.all().order_by(
            "last_name", "first_name", "id"
        )
        return context
