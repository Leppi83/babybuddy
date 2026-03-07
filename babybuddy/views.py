# -*- coding: utf-8 -*-
import json

from django.conf import settings
from django.contrib import messages
from django.contrib.messages import get_messages
from django.contrib.auth import get_user_model
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.views import (
    LoginView as LoginViewBase,
    LogoutView as LogoutViewBase,
    PasswordResetCompleteView as PasswordResetCompleteViewBase,
    PasswordResetConfirmView as PasswordResetConfirmViewBase,
    PasswordResetDoneView as PasswordResetDoneViewBase,
    PasswordResetView as PasswordResetViewBase,
)
from django.contrib.messages.views import SuccessMessageMixin
from django.core.exceptions import BadRequest
from django import forms as django_forms
from django.forms import Form
from django.http import HttpResponseForbidden
from django.middleware.csrf import get_token
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
from axes.models import AccessAttempt
from dbsettings import forms as dbsettings_forms
from dbsettings import loading as dbsettings_loading
from django_filters.views import FilterView

from babybuddy import forms
from babybuddy.models import Settings as UserSettingsModel
from babybuddy.mixins import LoginRequiredMixin, PermissionRequiredMixin, StaffOnlyMixin


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


def _settings_ant_enabled():
    return True


def _nav_urls():
    return {
        "dashboard": reverse("dashboard:dashboard"),
        "timeline": reverse("core:timeline"),
        "settings": reverse("babybuddy:user-settings"),
        "logout": reverse("babybuddy:logout"),
    }


def _serialize_messages(request):
    level_map = {
        messages.DEBUG: "info",
        messages.INFO: "info",
        messages.SUCCESS: "success",
        messages.WARNING: "warning",
        messages.ERROR: "error",
    }
    return [
        {"type": level_map.get(message.level, "info"), "message": str(message)}
        for message in get_messages(request)
    ]


def _display_name(user):
    return user.get_full_name() or user.username


def _base_strings():
    return {
        "dashboard": _("Dashboard"),
        "timeline": _("Timeline"),
        "settings": _("Settings"),
        "logout": _("Logout"),
        "overview": _("Overview"),
        "list": _("List"),
        "actions": _("Actions"),
        "empty": _("No entries found."),
        "form": _("Form"),
        "save": _("Save"),
        "cancel": _("Cancel"),
        "delete": _("Delete"),
        "dangerZone": _("Danger Zone"),
        "confirmDelete": _("Confirm Deletion"),
        "required": _("Required"),
        "optional": _("Optional"),
        "yes": _("Yes"),
        "no": _("No"),
        "submit": _("Submit"),
        "backToLogin": _("Back to login"),
        "password": _("Password"),
        "login": _("Login"),
        "welcome": _("Welcome"),
    }


def _serialize_choice_value(field, value):
    prepared = field.prepare_value(value)
    if prepared in (None, "None"):
        return ""
    return str(prepared)


def _serialize_field_choices(field):
    return [
        {"value": _serialize_choice_value(field, value), "label": str(label)}
        for value, label in field.choices
    ]


def _serialize_bound_field(bound_field):
    field = bound_field.field
    widget = field.widget
    input_type = getattr(widget, "input_type", "text")
    value = bound_field.value()
    choices = []

    if hasattr(field, "choices") and getattr(field, "choices", None):
        choices = [
            {
                "value": str(choice_value),
                "label": str(choice_label),
            }
            for choice_value, choice_label in field.choices
            if choice_value not in ("", None)
        ]

    if isinstance(widget, django_forms.Textarea):
        input_type = "textarea"
    elif isinstance(field, django_forms.BooleanField):
        input_type = "checkbox"
        value = bool(value)
    elif isinstance(widget, django_forms.FileInput):
        input_type = "file"
        value = None
    elif choices and input_type == "radio":
        input_type = "radio"
        value = "" if value in (None, "") else str(value)
    elif choices:
        input_type = "select"
        value = "" if value in (None, "") else str(value)
    elif value is not None and input_type not in ("checkbox", "file"):
        value = str(value)

    return {
        "name": bound_field.name,
        "label": str(bound_field.label),
        "type": input_type,
        "value": value,
        "choices": choices,
        "helpText": str(bound_field.help_text or ""),
        "errors": [str(error) for error in bound_field.errors],
        "required": field.required,
        "disabled": field.disabled,
    }


def _serialize_form_fieldsets(form):
    fields = [_serialize_bound_field(bound_field) for bound_field in form]
    if not fields:
        return []
    return [{"key": "fieldset-0", "layout": "default", "label": "", "fields": fields}]


def _build_ant_form_bootstrap(
    request,
    *,
    title,
    kicker,
    form,
    submit_label,
    cancel_url,
    page_type="form",
    danger_text="",
    layout="app",
    description="",
    hidden_inputs=None,
):
    user_payload = (
        {"displayName": _display_name(request.user)}
        if request.user.is_authenticated
        else None
    )
    urls = {"self": request.path, "cancel": cancel_url}
    if request.user.is_authenticated:
        urls = {**_nav_urls(), **urls}

    return {
        "layout": layout,
        "pageType": page_type,
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": user_payload,
        "urls": urls,
        "strings": _base_strings(),
        "messages": _serialize_messages(request),
        "formPage": {
            "title": title,
            "kicker": kicker,
            "description": description,
            "submitLabel": submit_label,
            "cancelLabel": str(_("Cancel")),
            "method": "post",
            "enctype": (
                "multipart/form-data"
                if form.is_multipart()
                else "application/x-www-form-urlencoded"
            ),
            "fieldsets": _serialize_form_fieldsets(form),
            "dangerText": danger_text,
            "hiddenInputs": hidden_inputs or [],
        },
    }


def _build_ant_list_bootstrap(
    request, *, title, kicker, columns, rows, add_actions, pagination=None
):
    return {
        "layout": "app",
        "pageType": "list",
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {**_nav_urls(), "self": request.path},
        "strings": _base_strings(),
        "messages": _serialize_messages(request),
        "listPage": {
            "title": title,
            "kicker": kicker,
            "columns": columns,
            "rows": rows,
            "addActions": add_actions,
            "pagination": pagination,
        },
    }


def _build_ant_message_bootstrap(
    request,
    *,
    title,
    kicker,
    body,
    actions=None,
    layout="auth",
):
    urls = {"self": request.path}
    user_payload = None
    if request.user.is_authenticated:
        urls = {**_nav_urls(), **urls}
        user_payload = {"displayName": _display_name(request.user)}
    return {
        "layout": layout,
        "pageType": "message",
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": user_payload,
        "urls": urls,
        "strings": _base_strings(),
        "messages": _serialize_messages(request),
        "messagePage": {
            "title": title,
            "kicker": kicker,
            "body": body,
            "actions": actions or [],
        },
    }


def _build_ant_device_access_bootstrap(
    request, *, qr_code_data, qr_markup, message=None
):
    return {
        "layout": "app",
        "pageType": "device-access",
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {
            **_nav_urls(),
            "self": request.path,
            "settings": reverse("babybuddy:user-settings"),
        },
        "messages": _serialize_messages(request),
        "strings": {
            **_base_strings(),
            "addDevice": _("Add a device"),
            "authenticationMethods": _("Authentication Methods"),
            "key": _("Key"),
            "loginQrCode": _("Login QR code"),
            "regenerate": _("Regenerate"),
            "deviceAccessDescription": _(
                "Use the API key or scan the QR code to connect another device."
            ),
            "backToSettings": _("Back to settings"),
        },
        "deviceAccess": {
            "apiKey": str(request.user.settings.api_key()),
            "qrCodeData": qr_code_data,
            "qrMarkup": qr_markup,
            "regenerateLabel": _("Regenerate"),
            "backLabel": _("Back to settings"),
        },
        "messageBanner": message,
    }


def _build_ant_welcome_bootstrap(request):
    return {
        "layout": "app",
        "pageType": "welcome",
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {
            **_nav_urls(),
            "addChild": reverse("core:child-add"),
        },
        "messages": _serialize_messages(request),
        "strings": {
            **_base_strings(),
            "welcomeTitle": _("Welcome to Baby Buddy!"),
            "welcomeIntro": _(
                "Learn about and predict baby's needs with less guesswork."
            ),
            "welcomeBody": _(
                "Track diapers, feedings, sleep, tummy time, and more. As entries grow, dashboards and reports help surface patterns over time."
            ),
            "addChild": _("Add a Child"),
            "diaperChanges": _("Diaper Changes"),
            "feedings": _("Feedings"),
            "sleep": _("Sleep"),
            "tummyTime": _("Tummy Time"),
        },
    }


def _build_ant_auth_form_bootstrap(
    request, *, title, kicker, form, submit_label, description="", hidden_inputs=None
):
    bootstrap = _build_ant_form_bootstrap(
        request,
        title=title,
        kicker=kicker,
        form=form,
        submit_label=submit_label,
        cancel_url=reverse("babybuddy:login"),
        layout="auth",
        description=description,
        hidden_inputs=hidden_inputs,
    )
    bootstrap["pageType"] = "auth-form"
    return bootstrap


def _user_is_locked(user):
    return AccessAttempt.objects.filter(username=user.username).exists()


def _build_site_settings_editor(user, app_label=None):
    if app_label is None:
        available_settings = dbsettings_loading.get_all_settings()
        title = _("Site settings")
    else:
        available_settings = dbsettings_loading.get_app_settings(app_label)
        title = _("%(app)s settings") % {"app": app_label.title()}
    editor = dbsettings_forms.customized_editor(user, available_settings)
    return editor, title, available_settings


def _build_settings_bootstrap(request, form_user, form_settings):
    user_settings = request.user.settings
    language_field = form_settings.fields["language"]
    timezone_field = form_settings.fields["timezone"]
    pagination_field = form_settings.fields["pagination_count"]
    refresh_field = form_settings.fields["dashboard_refresh_rate"]
    age_field = form_settings.fields["dashboard_hide_age"]

    links = {
        "apiBrowser": reverse("api:api-root"),
        "sourceCode": "https://github.com/babybuddy/babybuddy",
        "chatSupport": "https://gitter.im/babybuddy/Lobby",
    }
    if request.user.is_staff:
        links["siteSettings"] = reverse("babybuddy:site_settings")
        links["tags"] = reverse("core:tag-list")
        links["users"] = reverse("babybuddy:user-list")
        links["databaseAdmin"] = reverse("admin:index")

    return {
        "pageType": "settings",
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {
            "dashboard": reverse("dashboard:dashboard"),
            "timeline": reverse("core:timeline"),
            "settings": reverse("babybuddy:user-settings"),
            "logout": reverse("babybuddy:logout"),
            "self": reverse("babybuddy:user-settings"),
        },
        "messages": _serialize_messages(request),
        "settings": {
            "profile": {
                "firstName": form_user.initial.get("first_name", ""),
                "lastName": form_user.initial.get("last_name", ""),
                "email": form_user.initial.get("email", ""),
            },
            "preferences": {
                "language": _serialize_choice_value(
                    language_field, user_settings.language
                ),
                "timezone": _serialize_choice_value(
                    timezone_field, user_settings.timezone
                ),
                "paginationCount": _serialize_choice_value(
                    pagination_field, user_settings.pagination_count
                ),
            },
            "dashboard": {
                "refreshRate": _serialize_choice_value(
                    refresh_field, user_settings.dashboard_refresh_rate
                ),
                "hideEmpty": bool(user_settings.dashboard_hide_empty),
                "hideAge": _serialize_choice_value(
                    age_field, user_settings.dashboard_hide_age
                ),
                "visibleItems": user_settings.dashboard_selected_items(),
                "availableItems": [
                    {"value": key, "label": str(label)}
                    for key, label in UserSettingsModel.DASHBOARD_ITEM_CHOICES
                ],
            },
            "apiKey": str(user_settings.api_key()),
            "choices": {
                "language": _serialize_field_choices(language_field),
                "timezone": _serialize_field_choices(timezone_field),
                "paginationCount": _serialize_field_choices(pagination_field),
                "refreshRate": _serialize_field_choices(refresh_field),
                "hideAge": _serialize_field_choices(age_field),
            },
            "links": links,
        },
        "strings": {
            "dashboard": _("Dashboard"),
            "timeline": _("Timeline"),
            "settings": _("Settings"),
            "logout": _("Logout"),
            "userSettings": _("User Settings"),
            "profile": _("User Profile"),
            "preferences": _("Preferences"),
            "dashboardPreferences": _("Dashboard"),
            "dashboardCards": _("Dashboard Sections & Cards"),
            "api": _("API"),
            "siteSupport": _("Site & Support"),
            "site": _("Site"),
            "support": _("Support"),
            "firstName": _("First name"),
            "lastName": _("Last name"),
            "email": _("Email"),
            "language": _("Language"),
            "timezone": _("Timezone"),
            "pagination": _("Items Per Page"),
            "refreshRate": _("Refresh rate"),
            "hideEmpty": _("Hide Empty Dashboard Cards"),
            "hideAge": _("Hide data older than"),
            "available": _("Available"),
            "selected": _("Selected"),
            "add": _("Add"),
            "addAll": _("Add all"),
            "remove": _("Remove"),
            "removeAll": _("Remove all"),
            "moveUp": _("Up"),
            "moveDown": _("Down"),
            "regenerate": _("Regenerate"),
            "submit": _("Submit"),
            "saving": _("Saving..."),
            "saved": _("Saved"),
            "saveFailed": _("Save failed"),
            "apiBrowser": _("API Browser"),
            "sourceCode": _("Source Code"),
            "chatSupport": _("Chat / Support"),
            "databaseAdmin": _("Database Admin"),
            "tags": _("Tags"),
            "users": _("Users"),
            "siteSettings": _("Settings"),
            "noItemsAvailable": _("No items available"),
            "noItemsSelected": _("No items selected"),
            "settingsSaved": _("Settings saved!"),
            "apiKeyRegenerated": _("User API key regenerated."),
        },
    }


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

    def get_template_names(self):
        return ["babybuddy/ant_app.html"]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        rows = []
        for user in context["object_list"]:
            rows.append(
                {
                    "key": str(user.pk),
                    "cells": {
                        "username": user.username,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "email": user.email,
                        "read_only": {
                            "type": "status",
                            "label": (
                                str(_("Yes"))
                                if user.groups.filter(
                                    name=settings.BABY_BUDDY["READ_ONLY_GROUP_NAME"]
                                ).exists()
                                else str(_("No"))
                            ),
                            "status": (
                                "success"
                                if user.groups.filter(
                                    name=settings.BABY_BUDDY["READ_ONLY_GROUP_NAME"]
                                ).exists()
                                else "default"
                            ),
                        },
                        "staff": {
                            "type": "status",
                            "label": str(_("Yes")) if user.is_staff else str(_("No")),
                            "status": "processing" if user.is_staff else "default",
                        },
                        "active": {
                            "type": "status",
                            "label": str(_("Yes")) if user.is_active else str(_("No")),
                            "status": "success" if user.is_active else "error",
                        },
                        "locked": {
                            "type": "status",
                            "label": (
                                str(_("Yes")) if _user_is_locked(user) else str(_("No"))
                            ),
                            "status": "warning" if _user_is_locked(user) else "success",
                        },
                        "actions": {
                            "type": "actions",
                            "items": [
                                (
                                    {
                                        "label": str(_("Edit")),
                                        "href": reverse(
                                            "babybuddy:user-update",
                                            kwargs={"pk": user.pk},
                                        ),
                                    }
                                    if self.request.user.has_perm("admin.change_user")
                                    else None
                                ),
                                (
                                    {
                                        "label": str(_("Delete")),
                                        "href": reverse(
                                            "babybuddy:user-delete",
                                            kwargs={"pk": user.pk},
                                        ),
                                        "danger": True,
                                    }
                                    if self.request.user.has_perm("admin.delete_user")
                                    else None
                                ),
                            ],
                        },
                    },
                }
            )
        page_obj = context.get("page_obj")
        context["ant_page_title"] = _("Users")
        context["ant_bootstrap"] = _build_ant_list_bootstrap(
            self.request,
            title=str(_("Users")),
            kicker=str(_("Overview")),
            columns=[
                {"key": "username", "title": str(_("User"))},
                {"key": "first_name", "title": str(_("First Name"))},
                {"key": "last_name", "title": str(_("Last Name"))},
                {"key": "email", "title": str(_("Email"))},
                {"key": "read_only", "title": str(_("Read only"))},
                {"key": "staff", "title": str(_("Staff"))},
                {"key": "active", "title": str(_("Active"))},
                {"key": "locked", "title": str(_("Locked"))},
                {"key": "actions", "title": str(_("Actions"))},
            ],
            rows=rows,
            add_actions=(
                [
                    {
                        "label": str(_("Create User")),
                        "href": reverse("babybuddy:user-add"),
                    }
                ]
                if self.request.user.has_perm("admin.add_user")
                else []
            ),
            pagination=(
                {
                    "page": page_obj.number,
                    "pageSize": page_obj.paginator.per_page,
                    "total": page_obj.paginator.count,
                }
                if page_obj
                else None
            ),
        )
        return context


class UserAdd(StaffOnlyMixin, PermissionRequiredMixin, SuccessMessageMixin, CreateView):
    model = get_user_model()
    template_name = "babybuddy/user_form.html"
    permission_required = ("admin.add_user",)
    form_class = forms.UserAddForm
    success_url = reverse_lazy("babybuddy:user-list")
    success_message = gettext_lazy("User %(username)s added!")

    def get_template_names(self):
        return ["babybuddy/ant_app.html"]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["ant_page_title"] = _("Create User")
        context["ant_bootstrap"] = _build_ant_form_bootstrap(
            self.request,
            title=str(_("Create User")),
            kicker=str(_("User")),
            form=context["form"],
            submit_label=str(_("Save")),
            cancel_url=reverse("babybuddy:user-list"),
        )
        return context


class UserUpdate(
    StaffOnlyMixin, PermissionRequiredMixin, SuccessMessageMixin, UpdateView
):
    model = get_user_model()
    template_name = "babybuddy/user_form.html"
    permission_required = ("admin.change_user",)
    form_class = forms.UserUpdateForm
    success_url = reverse_lazy("babybuddy:user-list")
    success_message = gettext_lazy("User %(username)s updated.")

    def get_template_names(self):
        return ["babybuddy/ant_app.html"]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.get_object()
        context["ant_page_title"] = str(user)
        bootstrap = _build_ant_form_bootstrap(
            self.request,
            title=str(user),
            kicker=str(_("User")),
            form=context["form"],
            submit_label=str(_("Save")),
            cancel_url=reverse("babybuddy:user-list"),
        )
        if _user_is_locked(user):
            bootstrap["messageBanner"] = {
                "type": "warning",
                "message": str(_("User locked.")),
                "action": {
                    "label": str(_("Unlock")),
                    "href": reverse("babybuddy:user-unlock", kwargs={"pk": user.pk}),
                },
            }
        context["ant_bootstrap"] = bootstrap
        return context


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

    def get_template_names(self):
        return ["babybuddy/ant_app.html"]

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

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        form = self.get_form()
        user = self.get_object()
        context["ant_page_title"] = _("Unlock User")
        context["ant_bootstrap"] = _build_ant_form_bootstrap(
            self.request,
            title=str(_("Unlock User")),
            kicker=str(_("User")),
            form=form,
            submit_label=str(_("Unlock")),
            cancel_url=reverse("babybuddy:user-update", kwargs={"pk": user.pk}),
            description=str(
                _("Are you sure you want to unlock %(name)s?") % {"name": user}
            ),
        )
        return context


class UserDelete(
    StaffOnlyMixin, PermissionRequiredMixin, DeleteView, SuccessMessageMixin
):
    model = get_user_model()
    template_name = "babybuddy/user_confirm_delete.html"
    permission_required = ("admin.delete_user",)
    success_url = reverse_lazy("babybuddy:user-list")

    def get_template_names(self):
        return ["babybuddy/ant_app.html"]

    def get_success_message(self, cleaned_data):
        return format_lazy(gettext_lazy("User {user} deleted."), user=self.get_object())

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.get_object()
        context["ant_page_title"] = _("Delete User")
        context["ant_bootstrap"] = _build_ant_form_bootstrap(
            self.request,
            title=str(_("Delete User")),
            kicker=str(_("Danger Zone")),
            form=Form(),
            submit_label=str(_("Delete")),
            cancel_url=reverse("babybuddy:user-list"),
            page_type="confirm-delete",
            danger_text=str(
                _("Are you sure you want to delete %(name)s?") % {"name": user}
            ),
        )
        return context


class UserPassword(LoginRequiredMixin, View):
    """
    Handles user password changes.
    """

    form_class = forms.UserPasswordForm
    template_name = "babybuddy/user_password_form.html"

    def _render_ant(self, request, form):
        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Change Password"),
                "ant_bootstrap": _build_ant_form_bootstrap(
                    request,
                    title=str(_("Change Password")),
                    kicker=str(_("User")),
                    form=form,
                    submit_label=str(_("Save")),
                    cancel_url=reverse("babybuddy:user-settings"),
                ),
            },
        )

    def get(self, request):
        return self._render_ant(request, self.form_class(request.user))

    def post(self, request):
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            messages.success(request, _("Password updated."))
        return self._render_ant(request, form)


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
        user_settings = request.user.settings
        form_user = self.form_user_class(instance=request.user)
        form_settings = self.form_settings_class(instance=user_settings)

        if _settings_ant_enabled():
            return render(
                request,
                "babybuddy/ant_app.html",
                {
                    "ant_page_title": _("User Settings"),
                    "ant_bootstrap": _build_settings_bootstrap(
                        request, form_user, form_settings
                    ),
                },
            )

        return render(
            request,
            self.template_name,
            {
                "form_user": form_user,
                "form_settings": form_settings,
            },
        )

    def post(self, request):
        if handle_api_regenerate_request(request):
            if _settings_ant_enabled():
                return JsonResponse(
                    {
                        "saved": True,
                        "api_key": str(request.user.settings.api_key()),
                        "message": str(_("User API key regenerated.")),
                    }
                )
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
                item.strip() for item in raw_items.split(",") if item.strip() in allowed
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
            if _settings_ant_enabled():
                return JsonResponse(
                    {"saved": True, "redirect": reverse("babybuddy:user-settings")}
                )
            return set_language(request)
        if _settings_ant_enabled():
            errors = {}
            errors.update(form_user.errors.get_json_data())
            errors.update(form_settings.errors.get_json_data())
            return JsonResponse({"saved": False, "errors": errors}, status=400)
        return render(
            request,
            self.template_name,
            {"form_user": form_user, "form_settings": form_settings},
        )


class UserAddDevice(LoginRequiredMixin, View):
    form_user_class = forms.UserForm
    template_name = "babybuddy/user_add_device.html"
    qr_code_template = "babybuddy/login_qr_code.txt"
    qr_code_markup_template = "babybuddy/device_qr_code_svg.html"

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
        qr_markup = loader.render_to_string(
            self.qr_code_markup_template,
            {"qr_code_data": qr_code_data},
            request=request,
        )

        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Add a device"),
                "ant_bootstrap": _build_ant_device_access_bootstrap(
                    request, qr_code_data=qr_code_data, qr_markup=qr_markup
                ),
            },
        )

    def post(self, request):
        if handle_api_regenerate_request(request):
            session_cookies = {}
            if request.is_homeassistant_ingress_request:
                session_cookies["ingress_session"] = request.COOKIES.get(
                    "ingress_session"
                )

            qr_code_response = render(
                request,
                self.qr_code_template,
                {"session_cookies": json.dumps(session_cookies)},
            )
            qr_code_data = qr_code_response.content.decode().strip()
            qr_markup = loader.render_to_string(
                self.qr_code_markup_template,
                {"qr_code_data": qr_code_data},
                request=request,
            )
            return render(
                request,
                "babybuddy/ant_app.html",
                {
                    "ant_page_title": _("Add a device"),
                    "ant_bootstrap": _build_ant_device_access_bootstrap(
                        request,
                        qr_code_data=qr_code_data,
                        qr_markup=qr_markup,
                        message={
                            "type": "success",
                            "message": str(_("User API key regenerated.")),
                        },
                    ),
                },
            )
        else:
            raise BadRequest()


class Welcome(LoginRequiredMixin, TemplateView):
    """
    Basic introduction to Baby Buddy (meant to be shown when no data is in the
    database).
    """

    template_name = "babybuddy/welcome.html"

    def get(self, request, *args, **kwargs):
        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Welcome!"),
                "ant_bootstrap": _build_ant_welcome_bootstrap(request),
            },
        )


class LoginView(LoginViewBase):
    template_name = "registration/login.html"

    def get(self, request, *args, **kwargs):
        form = self.get_form()
        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Login"),
                "ant_bootstrap": _build_ant_auth_form_bootstrap(
                    request,
                    title=str(_("Login")),
                    kicker=str(_("Welcome")),
                    form=form,
                    submit_label=str(_("Login")),
                    description=str(_("Sign in to continue to Baby Buddy.")),
                    hidden_inputs=[
                        {
                            "name": "next",
                            "value": request.GET.get(
                                "next", request.POST.get("next", "")
                            ),
                        }
                    ],
                ),
            },
        )

    def form_invalid(self, form):
        return render(
            self.request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Login"),
                "ant_bootstrap": _build_ant_auth_form_bootstrap(
                    self.request,
                    title=str(_("Login")),
                    kicker=str(_("Welcome")),
                    form=form,
                    submit_label=str(_("Login")),
                    description=str(_("Sign in to continue to Baby Buddy.")),
                    hidden_inputs=[
                        {
                            "name": "next",
                            "value": self.request.GET.get(
                                "next", self.request.POST.get("next", "")
                            ),
                        }
                    ],
                ),
            },
            status=200,
        )


class PasswordResetView(PasswordResetViewBase):
    template_name = "registration/password_reset_form.html"

    def get(self, request, *args, **kwargs):
        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Forgot Password"),
                "ant_bootstrap": _build_ant_auth_form_bootstrap(
                    request,
                    title=str(_("Forgot Password")),
                    kicker=str(_("Password")),
                    form=self.get_form(),
                    submit_label=str(_("Reset Password")),
                    description=str(
                        _(
                            "Enter your account email address. If it is valid, you will receive instructions for resetting your password."
                        )
                    ),
                ),
            },
        )

    def form_invalid(self, form):
        return render(
            self.request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Forgot Password"),
                "ant_bootstrap": _build_ant_auth_form_bootstrap(
                    self.request,
                    title=str(_("Forgot Password")),
                    kicker=str(_("Password")),
                    form=form,
                    submit_label=str(_("Reset Password")),
                    description=str(
                        _(
                            "Enter your account email address. If it is valid, you will receive instructions for resetting your password."
                        )
                    ),
                ),
            },
        )


class PasswordResetDoneView(PasswordResetDoneViewBase):
    template_name = "registration/password_reset_done.html"

    def get(self, request, *args, **kwargs):
        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Reset Email Sent"),
                "ant_bootstrap": _build_ant_message_bootstrap(
                    request,
                    title=str(_("Reset Email Sent")),
                    kicker=str(_("Password")),
                    body=[
                        str(
                            _(
                                "We've emailed you instructions for setting your password, if an account exists with the email you entered. You should receive them shortly."
                            )
                        ),
                        str(
                            _(
                                "If you don't receive an email, make sure you've entered the address you registered with and check your spam folder."
                            )
                        ),
                    ],
                    actions=[
                        {
                            "label": str(_("Back to login")),
                            "href": reverse("babybuddy:login"),
                        }
                    ],
                ),
            },
        )


class PasswordResetConfirmView(PasswordResetConfirmViewBase):
    template_name = "registration/password_reset_confirm.html"

    def get(self, request, *args, **kwargs):
        self.object = self.get_user(kwargs.get("uidb64"))
        form = self.get_form()
        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Password Reset"),
                "ant_bootstrap": _build_ant_auth_form_bootstrap(
                    request,
                    title=str(_("Password Reset")),
                    kicker=str(_("Password")),
                    form=form,
                    submit_label=str(_("Reset Password")),
                    description=str(_("Enter your new password in each field below.")),
                ),
            },
        )

    def form_invalid(self, form):
        return render(
            self.request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Password Reset"),
                "ant_bootstrap": _build_ant_auth_form_bootstrap(
                    self.request,
                    title=str(_("Password Reset")),
                    kicker=str(_("Password")),
                    form=form,
                    submit_label=str(_("Reset Password")),
                    description=str(_("Enter your new password in each field below.")),
                ),
            },
        )


class PasswordResetCompleteView(PasswordResetCompleteViewBase):
    template_name = "registration/password_reset_complete.html"

    def get(self, request, *args, **kwargs):
        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": _("Password Reset Successfully!"),
                "ant_bootstrap": _build_ant_message_bootstrap(
                    request,
                    title=str(_("Password Reset Successfully!")),
                    kicker=str(_("Password")),
                    body=[
                        str(
                            _(
                                "Your password has been set. You may go ahead and log in now."
                            )
                        )
                    ],
                    actions=[
                        {
                            "label": str(_("Login")),
                            "href": reverse("babybuddy:login"),
                        }
                    ],
                ),
            },
        )


class SiteSettings(StaffOnlyMixin, View):
    template_name = "dbsettings/site_settings.html"

    def _render_form(self, request, form, *, title, success_message=""):
        bootstrap = _build_ant_form_bootstrap(
            request,
            title=title,
            kicker=_("Site"),
            form=form,
            submit_label=_("Save"),
            cancel_url=reverse("babybuddy:user-settings"),
            description=_("Manage instance-wide defaults for Baby Buddy."),
        )
        if success_message:
            bootstrap["messageBanner"] = {"type": "success", "message": success_message}
        return render(
            request,
            "babybuddy/ant_app.html",
            {
                "ant_page_title": title,
                "ant_bootstrap": bootstrap,
            },
        )

    def get(self, request):
        editor, title, _available_settings = _build_site_settings_editor(request.user)
        form = editor()
        return self._render_form(request, form, title=title)

    def post(self, request):
        editor, title, _available_settings = _build_site_settings_editor(request.user)
        form = editor(request.POST.copy(), request.FILES)
        if form.is_valid():
            form.full_clean()
            for name, value in form.cleaned_data.items():
                key = dbsettings_forms.RE_FIELD_NAME.match(name).groups()
                setting = dbsettings_loading.get_setting(*key)
                try:
                    storage = dbsettings_loading.get_setting_storage(*key)
                    current_value = setting.to_python(storage.value)
                except Exception:
                    current_value = None

                if current_value != setting.to_python(value):
                    dbsettings_loading.set_setting_value(*(key + (value,)))
            form = editor()
            return self._render_form(
                request, form, title=title, success_message=str(_("Settings saved!"))
            )
        return self._render_form(request, form, title=title)


class AppSettings(SiteSettings):
    def get(self, request, app_label):
        editor, title, _available_settings = _build_site_settings_editor(
            request.user, app_label=app_label
        )
        form = editor()
        return self._render_form(request, form, title=title)

    def post(self, request, app_label):
        editor, title, _available_settings = _build_site_settings_editor(
            request.user, app_label=app_label
        )
        form = editor(request.POST.copy(), request.FILES)
        if form.is_valid():
            form.full_clean()
            for name, value in form.cleaned_data.items():
                key = dbsettings_forms.RE_FIELD_NAME.match(name).groups()
                setting = dbsettings_loading.get_setting(*key)
                try:
                    storage = dbsettings_loading.get_setting_storage(*key)
                    current_value = setting.to_python(storage.value)
                except Exception:
                    current_value = None

                if current_value != setting.to_python(value):
                    dbsettings_loading.set_setting_value(*(key + (value,)))
            form = editor()
            return self._render_form(
                request, form, title=title, success_message=str(_("Settings saved!"))
            )
        return self._render_form(request, form, title=title)
