# -*- coding: utf-8 -*-
from django.contrib import messages
from django.contrib.messages.views import SuccessMessageMixin
from django.conf import settings
from django.db.models import Count
from django.db.models.functions import Lower
from django import forms as django_forms
from django.forms import Form
from django.http import HttpResponseRedirect
from django.middleware.csrf import get_token
from django.templatetags.static import static
from django.urls import reverse, reverse_lazy
from django.utils import formats, timezone, timesince
from django.utils.translation import gettext as _
from django.views.generic.base import RedirectView, TemplateView
from django.views.generic.detail import DetailView
from django.views.generic.edit import CreateView, UpdateView, DeleteView, FormView

from babybuddy.mixins import LoginRequiredMixin, PermissionRequiredMixin
from babybuddy.views import BabyBuddyFilterView, BabyBuddyPaginatedView
from core import filters, forms, models, timeline
from core.templatetags.duration import child_age_string


def _prepare_timeline_context_data(context, date, child=None):
    date = timezone.datetime.strptime(date, "%Y-%m-%d")
    date = timezone.localtime(timezone.make_aware(date))
    context["timeline_objects"] = timeline.get_objects(date, child)
    context["date"] = date
    context["date_previous"] = date - timezone.timedelta(days=1)
    if date.date() < timezone.localdate():
        context["date_next"] = date + timezone.timedelta(days=1)
    pass


def _lists_ant_enabled():
    return True


def _forms_ant_enabled():
    return True


def _details_ant_enabled():
    return True


def _display_name(user):
    return user.get_full_name() or user.username


def _nav_urls():
    return {
        "dashboard": reverse("dashboard:dashboard"),
        "timeline": reverse("core:timeline"),
        "settings": reverse("babybuddy:user-settings"),
        "logout": reverse("babybuddy:logout"),
        "addChild": reverse("core:child-add"),
    }


def _list_strings():
    return {
        "dashboard": _("Dashboard"),
        "timeline": _("Timeline"),
        "settings": _("Settings"),
        "logout": _("Logout"),
        "addChild": _("Add Child"),
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
    }


def _child_image_url(request, child):
    if child.picture:
        return request.build_absolute_uri(child.picture.url)
    return request.build_absolute_uri(
        static("babybuddy/img/core/child-placeholder.png")
    )


def _with_current_querystring(request, url):
    querystring = request.GET.urlencode()
    if not querystring:
        return url
    return "{}?{}".format(url, querystring)


def _build_child_switcher(request, *, current_child):
    if models.Child.objects.count() <= 1:
        return None
    match = request.resolver_match
    if not match or "slug" not in (match.kwargs or {}):
        return None

    options = []
    for child in models.Child.objects.order_by(Lower("first_name"), Lower("last_name")):
        kwargs = {**match.kwargs, "slug": child.slug}
        options.append(
            {
                "value": child.slug,
                "label": str(child),
                "href": _with_current_querystring(
                    request, reverse(match.view_name, kwargs=kwargs)
                ),
            }
        )

    return {
        "label": str(_("Child")),
        "value": current_child.slug,
        "options": options,
    }


def _timeline_entry_payload(entry):
    event_time = timezone.localtime(entry["time"])
    return {
        "key": "{}-{}-{}".format(
            entry.get("model_name", "event"),
            entry.get("type", "entry"),
            event_time.isoformat(),
        ),
        "type": entry.get("type", "event"),
        "icon": entry.get("model_name", "event"),
        "event": str(entry.get("event", "")),
        "details": [str(detail) for detail in entry.get("details", [])],
        "tags": [
            {"name": str(tag.name), "color": str(tag.color or "")}
            for tag in entry.get("tags", [])
        ],
        "timeLabel": formats.time_format(event_time, "TIME_FORMAT"),
        "sinceLabel": str(_("{} ago").format(timesince.timesince(event_time))),
        "duration": str(entry.get("duration", "")),
        "timeSincePrev": str(entry.get("time_since_prev", "")),
        "editLink": entry.get("edit_link", ""),
    }


def _build_ant_child_detail_bootstrap(
    request, *, child, date, date_previous, date_next, timeline_objects
):
    return {
        "pageType": "child-detail",
        "currentPath": request.path,
        "activeNavKey": reverse("core:timeline"),
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {**_nav_urls(), "self": request.get_full_path()},
        "childSwitcher": _build_child_switcher(request, current_child=child),
        "strings": {
            **_list_strings(),
            "child": _("Child"),
            "born": _("Born"),
            "age": _("Age"),
            "reports": _("Reports"),
            "previous": _("Previous"),
            "next": _("Next"),
            "noEvents": _("No events"),
            "edit": _("Edit"),
            "delete": _("Delete"),
            "duration": _("Duration"),
            "sincePrevious": _("since previous"),
            "childActions": _("Child actions"),
        },
        "childDetail": {
            "name": str(child),
            "photoUrl": _child_image_url(request, child),
            "birthDateTime": str(child.birth_datetime()),
            "birthLabel": (
                formats.date_format(child.birth_datetime(), "DATETIME_FORMAT")
                if hasattr(child.birth_datetime(), "hour")
                else str(child.birth_datetime())
            ),
            "ageLabel": child_age_string(child.birth_datetime()),
            "dateLabel": formats.date_format(date, "DATE_FORMAT"),
            "previousUrl": (
                "{}?date={}".format(request.path, date_previous.strftime("%Y-%m-%d"))
                if date_previous
                else ""
            ),
            "nextUrl": (
                "{}?date={}".format(request.path, date_next.strftime("%Y-%m-%d"))
                if date_next
                else ""
            ),
            "actions": {
                "dashboard": reverse(
                    "dashboard:dashboard-child", kwargs={"slug": child.slug}
                ),
                "timeline": reverse("core:child", kwargs={"slug": child.slug}),
                "reports": reverse("reports:report-list", kwargs={"slug": child.slug}),
                "edit": reverse("core:child-update", kwargs={"slug": child.slug}),
                "delete": reverse("core:child-delete", kwargs={"slug": child.slug}),
            },
            "timeline": [_timeline_entry_payload(entry) for entry in timeline_objects],
        },
    }


def _build_ant_timeline_bootstrap(
    request, *, title, kicker, date, date_previous, date_next, timeline_objects
):
    return {
        "pageType": "timeline",
        "activeNavKey": reverse("core:timeline"),
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {**_nav_urls(), "self": request.get_full_path()},
        "strings": {
            **_list_strings(),
            "child": _("Child"),
            "previous": _("Previous"),
            "next": _("Next"),
            "noEvents": _("No events"),
            "edit": _("Edit"),
            "duration": _("Duration"),
            "sincePrevious": _("since previous"),
        },
        "timelinePage": {
            "title": title,
            "kicker": kicker,
            "dateLabel": formats.date_format(date, "DATE_FORMAT"),
            "previousUrl": (
                "{}?date={}".format(request.path, date_previous.strftime("%Y-%m-%d"))
                if date_previous
                else ""
            ),
            "nextUrl": (
                "{}?date={}".format(request.path, date_next.strftime("%Y-%m-%d"))
                if date_next
                else ""
            ),
            "items": [_timeline_entry_payload(entry) for entry in timeline_objects],
        },
    }


def _build_ant_list_bootstrap(
    request, *, title, kicker, columns, rows, add_actions, pagination=None
):
    return {
        "pageType": "list",
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {**_nav_urls(), "self": request.path},
        "strings": _list_strings(),
        "listPage": {
            "title": title,
            "kicker": kicker,
            "columns": columns,
            "rows": rows,
            "addActions": add_actions,
            "pagination": pagination,
        },
    }


def _build_actions(items):
    return {
        "type": "actions",
        "items": [item for item in items if item],
    }


def _page_info(context):
    page_obj = context.get("page_obj")
    if not page_obj:
        return None
    return {
        "page": page_obj.number,
        "pageSize": page_obj.paginator.per_page,
        "total": page_obj.paginator.count,
    }


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

    if widget.__class__.__name__ == "TagsEditor":
        input_type = "tags"
        value = (
            ", ".join(tag.name for tag in bound_field.form.instance.tags.all())
            if getattr(bound_field.form.instance, "pk", None)
            else (value or "")
        )
    elif isinstance(widget, django_forms.Textarea):
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
    elif input_type == "time":
        # TimeInput widgets should keep their type as "time"
        # and not be converted to string
        pass
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
    if hasattr(form, "hydrated_fielsets"):
        fieldsets = form.hydrated_fielsets
    else:
        fieldsets = [{"fields": list(form), "layout": "default", "layout_attrs": {}}]

    serialized = []
    for index, fieldset in enumerate(fieldsets):
        fields = [
            _serialize_bound_field(bound_field) for bound_field in fieldset["fields"]
        ]
        if not fields:
            continue
        serialized.append(
            {
                "key": f"fieldset-{index}",
                "layout": fieldset.get("layout", "default"),
                "label": fieldset.get("layout_attrs", {}).get("label", ""),
                "fields": fields,
            }
        )
    return serialized


def _build_ant_form_bootstrap(
    request,
    *,
    title,
    kicker,
    form,
    submit_label,
    cancel_url,
    delete_mode=False,
    danger_text="",
):
    return {
        "pageType": "confirm-delete" if delete_mode else "form",
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {**_nav_urls(), "self": request.path, "cancel": cancel_url},
        "strings": _list_strings(),
        "formPage": {
            "title": title,
            "kicker": kicker,
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
        },
    }


class AntFormMixin:
    ant_title = ""
    ant_kicker = _("Form")

    def ant_enabled(self):
        return _forms_ant_enabled()

    def get_template_names(self):
        if self.ant_enabled():
            return ["babybuddy/ant_app.html"]
        return super().get_template_names()

    def get_ant_title(self):
        return str(self.ant_title)

    def get_ant_kicker(self):
        return str(self.ant_kicker)

    def get_ant_cancel_url(self):
        success_url = getattr(self, "success_url", None)
        if success_url:
            return str(success_url)
        return str(self.get_success_url())

    def get_ant_submit_label(self):
        return str(_("Save"))

    def get_ant_bootstrap(self, form):
        return _build_ant_form_bootstrap(
            self.request,
            title=self.get_ant_title(),
            kicker=self.get_ant_kicker(),
            form=form,
            submit_label=self.get_ant_submit_label(),
            cancel_url=self.get_ant_cancel_url(),
        )

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.ant_enabled():
            context["ant_page_title"] = self.get_ant_title()
            context["ant_bootstrap"] = self.get_ant_bootstrap(context["form"])
        return context


class AntDeleteMixin(AntFormMixin):
    ant_kicker = _("Danger Zone")

    def get_ant_submit_label(self):
        return str(_("Delete"))

    def get_ant_danger_text(self):
        return str(_("This action cannot be undone."))

    def get_ant_bootstrap(self, form):
        return _build_ant_form_bootstrap(
            self.request,
            title=self.get_ant_title(),
            kicker=self.get_ant_kicker(),
            form=form,
            submit_label=self.get_ant_submit_label(),
            cancel_url=self.get_ant_cancel_url(),
            delete_mode=True,
            danger_text=self.get_ant_danger_text(),
        )


class CoreAddView(PermissionRequiredMixin, SuccessMessageMixin, CreateView):
    def get_success_message(self, cleaned_data):
        cleaned_data["model"] = self.model._meta.verbose_name.title()
        if "child" in cleaned_data:
            self.success_message = _("%(model)s entry for %(child)s added!")
        else:
            self.success_message = _("%(model)s entry added!")
        return self.success_message % cleaned_data

    def get_form_kwargs(self):
        """
        Check for and add "child" and "timer" from request query parameters.
          - "child" may provide a slug for a Child instance.
          - "timer" may provided an ID for a Timer instance.

        These arguments are used in some add views to pre-fill initial data in
        the form fields.

        :return: Updated keyword arguments.
        """
        kwargs = super(CoreAddView, self).get_form_kwargs()
        for parameter in ["child", "timer"]:
            value = self.request.GET.get(parameter, None)
            if value:
                kwargs.update({parameter: value})
        return kwargs


class CoreUpdateView(PermissionRequiredMixin, SuccessMessageMixin, UpdateView):
    def get_success_message(self, cleaned_data):
        cleaned_data["model"] = self.model._meta.verbose_name.title()
        if "child" in cleaned_data:
            self.success_message = _("%(model)s entry for %(child)s updated.")
        else:
            self.success_message = _("%(model)s entry updated.")
        return self.success_message % cleaned_data


class CoreDeleteView(PermissionRequiredMixin, SuccessMessageMixin, DeleteView):
    def get_success_message(self, cleaned_data):
        return _("%(model)s entry deleted.") % {
            "model": self.model._meta.verbose_name.title()
        }


class BMIList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.BMI
    template_name = "core/bmi_list.html"
    permission_required = ("core.view_bmi",)
    filterset_class = filters.BMIFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            columns = [{"key": "date", "title": str(_("Date"))}]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "value", "title": str(_("BMI"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for item in context["object_list"]:
                cells = {
                    "date": str(item.date),
                    "value": str(item.bmi),
                    "actions": _build_actions(
                        [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:bmi-update", kwargs={"pk": item.id}
                                    ),
                                }
                                if self.request.user.has_perm("core.change_bmi")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:bmi-delete", kwargs={"pk": item.id}
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_bmi")
                                else None
                            ),
                        ]
                    ),
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(item.child),
                        "href": reverse("core:child", kwargs={"slug": item.child.slug}),
                    }
                rows.append({"key": str(item.id), "cells": cells})
            context["ant_page_title"] = _("BMI")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("BMI")),
                kicker=str(_("Measurements")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [{"label": str(_("Add BMI")), "href": reverse("core:bmi-add")}]
                    if self.request.user.has_perm("core.add_bmi")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class BMIAdd(AntFormMixin, CoreAddView):
    model = models.BMI
    permission_required = ("core.add_bmi",)
    form_class = forms.BMIForm
    success_url = reverse_lazy("core:bmi-list")
    ant_title = _("Add BMI")
    ant_kicker = _("Entry Form")


class BMIUpdate(AntFormMixin, CoreUpdateView):
    model = models.BMI
    permission_required = ("core.change_bmi",)
    form_class = forms.BMIForm
    success_url = reverse_lazy("core:bmi-list")
    ant_title = _("Update BMI")
    ant_kicker = _("Entry Form")


class BMIDelete(AntDeleteMixin, CoreDeleteView):
    model = models.BMI
    permission_required = ("core.delete_bmi",)
    success_url = reverse_lazy("core:bmi-list")
    ant_title = _("Delete BMI")


class ChildList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Child
    template_name = "core/child_list.html"
    permission_required = ("core.view_child",)
    filterset_fields = ("first_name", "last_name")

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super(ChildList, self).get_context_data(**kwargs)
        if _lists_ant_enabled():
            page_obj = context.get("page_obj")
            context["ant_page_title"] = _("Children")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Children")),
                kicker=str(_("Overview")),
                columns=[
                    {"key": "photo", "title": ""},
                    {"key": "first_name", "title": str(_("First Name"))},
                    {"key": "last_name", "title": str(_("Last Name"))},
                    {"key": "birth_date", "title": str(_("Birth Date"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ],
                rows=[
                    {
                        "key": child.slug,
                        "cells": {
                            "photo": {
                                "type": "image",
                                "src": _child_image_url(self.request, child),
                            },
                            "first_name": {
                                "type": "link",
                                "label": child.first_name,
                                "href": reverse(
                                    "core:child", kwargs={"slug": child.slug}
                                ),
                            },
                            "last_name": child.last_name,
                            "birth_date": str(child.birth_datetime),
                            "actions": {
                                "type": "actions",
                                "items": [
                                    (
                                        {
                                            "label": str(_("Edit")),
                                            "href": reverse(
                                                "core:child-update",
                                                kwargs={"slug": child.slug},
                                            ),
                                        }
                                        if self.request.user.has_perm(
                                            "core.change_child"
                                        )
                                        else None
                                    ),
                                    (
                                        {
                                            "label": str(_("Delete")),
                                            "href": reverse(
                                                "core:child-delete",
                                                kwargs={"slug": child.slug},
                                            ),
                                            "danger": True,
                                        }
                                        if self.request.user.has_perm(
                                            "core.delete_child"
                                        )
                                        else None
                                    ),
                                ],
                            },
                        },
                    }
                    for child in context["object_list"]
                ],
                add_actions=(
                    [
                        {
                            "label": str(_("Add Child")),
                            "href": reverse("core:child-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_child")
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


class ChildAdd(AntFormMixin, CoreAddView):
    model = models.Child
    permission_required = ("core.add_child",)
    form_class = forms.ChildForm
    success_url = reverse_lazy("core:child-list")
    success_message = _("%(first_name)s %(last_name)s added!")
    ant_title = _("Add a Child")
    ant_kicker = _("Entry Form")


class ChildDetail(PermissionRequiredMixin, DetailView):
    model = models.Child
    permission_required = ("core.view_child",)

    def get_template_names(self):
        if _details_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return super().get_template_names()

    def get_context_data(self, **kwargs):
        context = super(ChildDetail, self).get_context_data(**kwargs)
        date = self.request.GET.get("date", str(timezone.localdate()))
        _prepare_timeline_context_data(context, date, self.object)
        if _details_ant_enabled():
            context["ant_page_title"] = str(self.object)
            context["ant_bootstrap"] = _build_ant_child_detail_bootstrap(
                self.request,
                child=self.object,
                date=context["date"],
                date_previous=context.get("date_previous"),
                date_next=context.get("date_next"),
                timeline_objects=context.get("timeline_objects", []),
            )
        return context


class ChildUpdate(AntFormMixin, CoreUpdateView):
    model = models.Child
    permission_required = ("core.change_child",)
    form_class = forms.ChildForm
    success_url = reverse_lazy("core:child-list")
    ant_title = _("Update Child")
    ant_kicker = _("Entry Form")


class ChildDelete(AntDeleteMixin, CoreUpdateView):
    model = models.Child
    form_class = forms.ChildDeleteForm
    template_name = "core/child_confirm_delete.html"
    permission_required = ("core.delete_child",)
    success_url = reverse_lazy("core:child-list")
    ant_title = _("Delete a Child")

    def get_success_message(self, cleaned_data):
        """This class cannot use `CoreDeleteView` because of the confirmation
        step required so the success message must be overridden."""
        success_message = _("%(model)s entry deleted.") % {
            "model": self.model._meta.verbose_name.title()
        }
        return success_message % cleaned_data

    def get_ant_cancel_url(self):
        return reverse("core:child", kwargs={"slug": self.object.slug})

    def get_ant_danger_text(self):
        return str(_("To confirm this action, type the full name of the child below."))


class DiaperChangeList(
    PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView
):
    model = models.DiaperChange
    template_name = "core/diaperchange_list.html"
    permission_required = ("core.view_diaperchange",)
    filterset_class = filters.DiaperChangeFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super(DiaperChangeList, self).get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            page_obj = context.get("page_obj")
            columns = [
                {"key": "time", "title": str(_("Time"))},
            ]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "contents", "title": str(_("Contents"))},
                    {"key": "color", "title": str(_("Color"))},
                    {"key": "amount", "title": str(_("Amount"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for change in context["object_list"]:
                cells = {
                    "time": str(change.time),
                    "contents": ", ".join(
                        [
                            label
                            for enabled, label in [
                                (change.wet, str(_("Wet"))),
                                (change.solid, str(_("Solid"))),
                            ]
                            if enabled
                        ]
                    )
                    or "-",
                    "color": str(change.get_color_display() or ""),
                    "amount": str(change.amount or ""),
                    "actions": {
                        "type": "actions",
                        "items": [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:diaperchange-update",
                                        kwargs={"pk": change.id},
                                    ),
                                }
                                if self.request.user.has_perm(
                                    "core.change_diaperchange"
                                )
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:diaperchange-delete",
                                        kwargs={"pk": change.id},
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm(
                                    "core.delete_diaperchange"
                                )
                                else None
                            ),
                        ],
                    },
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(change.child),
                        "href": reverse(
                            "core:child", kwargs={"slug": change.child.slug}
                        ),
                    }
                rows.append({"key": str(change.id), "cells": cells})

            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Diaper Changes")),
                kicker=str(_("Activity")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [
                        {
                            "label": str(_("Add Diaper Change")),
                            "href": reverse("core:diaperchange-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_diaperchange")
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
            context["ant_page_title"] = _("Diaper Changes")
        return context


class DiaperChangeAdd(AntFormMixin, CoreAddView):
    model = models.DiaperChange
    permission_required = ("core.add_diaperchange",)
    form_class = forms.DiaperChangeForm
    success_url = reverse_lazy("core:diaperchange-list")
    ant_title = _("Add a Diaper Change")
    ant_kicker = _("Entry Form")


class DiaperChangeUpdate(AntFormMixin, CoreUpdateView):
    model = models.DiaperChange
    permission_required = ("core.change_diaperchange",)
    form_class = forms.DiaperChangeForm
    success_url = reverse_lazy("core:diaperchange-list")
    ant_title = _("Update Diaper Change")
    ant_kicker = _("Entry Form")


class DiaperChangeDelete(AntDeleteMixin, CoreDeleteView):
    model = models.DiaperChange
    permission_required = ("core.delete_diaperchange",)
    success_url = reverse_lazy("core:diaperchange-list")
    ant_title = _("Delete a Diaper Change")


class FeedingList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Feeding
    template_name = "core/feeding_list.html"
    permission_required = ("core.view_feeding",)
    filterset_class = filters.FeedingFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super(FeedingList, self).get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            page_obj = context.get("page_obj")
            columns = [
                {"key": "date", "title": str(_("Date"))},
            ]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "method", "title": str(_("Method"))},
                    {"key": "type", "title": str(_("Type"))},
                    {"key": "amount", "title": str(_("Amt."))},
                    {"key": "duration", "title": str(_("Duration"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for feeding in context["object_list"]:
                cells = {
                    "date": str(feeding.start),
                    "method": str(feeding.get_method_display()),
                    "type": str(feeding.get_type_display()),
                    "amount": str(feeding.amount or ""),
                    "duration": str(feeding.duration or ""),
                    "actions": {
                        "type": "actions",
                        "items": [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:feeding-update", kwargs={"pk": feeding.id}
                                    ),
                                }
                                if self.request.user.has_perm("core.change_feeding")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:feeding-delete", kwargs={"pk": feeding.id}
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_feeding")
                                else None
                            ),
                        ],
                    },
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(feeding.child),
                        "href": reverse(
                            "core:child", kwargs={"slug": feeding.child.slug}
                        ),
                    }
                rows.append({"key": str(feeding.id), "cells": cells})

            add_actions = []
            if self.request.user.has_perm("core.add_feeding"):
                add_actions.append(
                    {
                        "label": str(_("Add Feeding")),
                        "href": reverse("core:feeding-add"),
                    }
                )
                add_actions.append(
                    {
                        "label": str(_("Add Bottle Feeding")),
                        "href": reverse("core:bottle-feeding-add"),
                    }
                )

            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Feedings")),
                kicker=str(_("Activity")),
                columns=columns,
                rows=rows,
                add_actions=add_actions,
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
            context["ant_page_title"] = _("Feedings")
        return context


class FeedingAdd(AntFormMixin, CoreAddView):
    model = models.Feeding
    permission_required = ("core.add_feeding",)
    form_class = forms.FeedingForm
    success_url = reverse_lazy("core:feeding-list")
    ant_title = _("Add a Feeding")
    ant_kicker = _("Entry Form")


class BottleFeedingAdd(AntFormMixin, CoreAddView):
    model = models.Feeding
    permission_required = ("core.add_feeding",)
    form_class = forms.BottleFeedingForm
    success_url = reverse_lazy("core:feeding-list")
    ant_title = _("Add a Bottle Feeding")
    ant_kicker = _("Entry Form")


class FeedingUpdate(AntFormMixin, CoreUpdateView):
    model = models.Feeding
    permission_required = ("core.change_feeding",)
    form_class = forms.FeedingForm
    success_url = reverse_lazy("core:feeding-list")
    ant_title = _("Update Feeding")
    ant_kicker = _("Entry Form")


class FeedingDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Feeding
    permission_required = ("core.delete_feeding",)
    success_url = reverse_lazy("core:feeding-list")
    ant_title = _("Delete a Feeding")


class HeadCircumferenceList(
    PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView
):
    model = models.HeadCircumference
    template_name = "core/head_circumference_list.html"
    permission_required = ("core.view_head_circumference",)
    filterset_class = filters.HeadCircumferenceFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            columns = [{"key": "date", "title": str(_("Date"))}]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "value", "title": str(_("Head Circumference"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for item in context["object_list"]:
                cells = {
                    "date": str(item.date),
                    "value": str(item.head_circumference),
                    "actions": _build_actions(
                        [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:head-circumference-update",
                                        kwargs={"pk": item.id},
                                    ),
                                }
                                if self.request.user.has_perm(
                                    "core.change_head_circumference"
                                )
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:head-circumference-delete",
                                        kwargs={"pk": item.id},
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm(
                                    "core.delete_head_circumference"
                                )
                                else None
                            ),
                        ]
                    ),
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(item.child),
                        "href": reverse("core:child", kwargs={"slug": item.child.slug}),
                    }
                rows.append({"key": str(item.id), "cells": cells})
            context["ant_page_title"] = _("Head Circumference")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Head Circumference")),
                kicker=str(_("Measurements")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [
                        {
                            "label": str(_("Add Head Circumference")),
                            "href": reverse("core:head-circumference-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_head_circumference")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class HeadCircumferenceAdd(AntFormMixin, CoreAddView):
    model = models.HeadCircumference
    template_name = "core/head_circumference_form.html"
    permission_required = ("core.add_head_circumference",)
    form_class = forms.HeadCircumferenceForm
    success_url = reverse_lazy("core:head-circumference-list")
    ant_title = _("Add Head Circumference")
    ant_kicker = _("Entry Form")


class HeadCircumferenceUpdate(AntFormMixin, CoreUpdateView):
    model = models.HeadCircumference
    template_name = "core/head_circumference_form.html"
    permission_required = ("core.change_head_circumference",)
    form_class = forms.HeadCircumferenceForm
    success_url = reverse_lazy("core:head-circumference-list")
    ant_title = _("Update Head Circumference")
    ant_kicker = _("Entry Form")


class HeadCircumferenceDelete(AntDeleteMixin, CoreDeleteView):
    model = models.HeadCircumference
    template_name = "core/head_circumference_confirm_delete.html"
    permission_required = ("core.delete_head_circumference",)
    success_url = reverse_lazy("core:head-circumference-list")
    ant_title = _("Delete Head Circumference")


class HeightList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Height
    template_name = "core/height_list.html"
    permission_required = ("core.view_height",)
    filterset_class = filters.HeightFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            columns = [{"key": "date", "title": str(_("Date"))}]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "value", "title": str(_("Height"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for item in context["object_list"]:
                cells = {
                    "date": str(item.date),
                    "value": str(item.height),
                    "actions": _build_actions(
                        [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:height-update", kwargs={"pk": item.id}
                                    ),
                                }
                                if self.request.user.has_perm("core.change_height")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:height-delete", kwargs={"pk": item.id}
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_height")
                                else None
                            ),
                        ]
                    ),
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(item.child),
                        "href": reverse("core:child", kwargs={"slug": item.child.slug}),
                    }
                rows.append({"key": str(item.id), "cells": cells})
            context["ant_page_title"] = _("Height")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Height")),
                kicker=str(_("Measurements")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [
                        {
                            "label": str(_("Add Height")),
                            "href": reverse("core:height-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_height")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class HeightAdd(AntFormMixin, CoreAddView):
    model = models.Height
    permission_required = ("core.add_height",)
    form_class = forms.HeightForm
    success_url = reverse_lazy("core:height-list")
    ant_title = _("Add Height")
    ant_kicker = _("Entry Form")


class HeightUpdate(AntFormMixin, CoreUpdateView):
    model = models.Height
    permission_required = ("core.change_height",)
    form_class = forms.HeightForm
    success_url = reverse_lazy("core:height-list")
    ant_title = _("Update Height")
    ant_kicker = _("Entry Form")


class HeightDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Height
    permission_required = ("core.delete_height",)
    success_url = reverse_lazy("core:height-list")
    ant_title = _("Delete Height")


class NoteList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Note
    template_name = "core/note_list.html"
    permission_required = ("core.view_note",)
    filterset_class = filters.NoteFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            columns = [{"key": "time", "title": str(_("Time"))}]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "note", "title": str(_("Note"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for item in context["object_list"]:
                cells = {
                    "time": str(item.time),
                    "note": str(item.note),
                    "actions": _build_actions(
                        [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:note-update", kwargs={"pk": item.id}
                                    ),
                                }
                                if self.request.user.has_perm("core.change_note")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:note-delete", kwargs={"pk": item.id}
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_note")
                                else None
                            ),
                        ]
                    ),
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(item.child),
                        "href": reverse("core:child", kwargs={"slug": item.child.slug}),
                    }
                rows.append({"key": str(item.id), "cells": cells})
            context["ant_page_title"] = _("Notes")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Notes")),
                kicker=str(_("Activity")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [{"label": str(_("Add Note")), "href": reverse("core:note-add")}]
                    if self.request.user.has_perm("core.add_note")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class NoteAdd(AntFormMixin, CoreAddView):
    model = models.Note
    permission_required = ("core.add_note",)
    form_class = forms.NoteForm
    success_url = reverse_lazy("core:note-list")
    ant_title = _("Add Note")
    ant_kicker = _("Entry Form")


class NoteUpdate(AntFormMixin, CoreUpdateView):
    model = models.Note
    permission_required = ("core.change_note",)
    form_class = forms.NoteForm
    success_url = reverse_lazy("core:note-list")
    ant_title = _("Update Note")
    ant_kicker = _("Entry Form")


class NoteDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Note
    permission_required = ("core.delete_note",)
    success_url = reverse_lazy("core:note-list")
    ant_title = _("Delete Note")


class PumpingList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Pumping
    template_name = "core/pumping_list.html"
    permission_required = ("core.view_pumping",)
    filterset_class = filters.PumpingFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            columns = [
                {"key": "start", "title": str(_("Start"))},
                {"key": "end", "title": str(_("End"))},
            ]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "amount", "title": str(_("Amount"))},
                    {"key": "duration", "title": str(_("Duration"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for item in context["object_list"]:
                cells = {
                    "start": str(item.start),
                    "end": str(item.end),
                    "amount": str(item.amount or ""),
                    "duration": str(item.duration or ""),
                    "actions": _build_actions(
                        [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:pumping-update", kwargs={"pk": item.id}
                                    ),
                                }
                                if self.request.user.has_perm("core.change_pumping")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:pumping-delete", kwargs={"pk": item.id}
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_pumping")
                                else None
                            ),
                        ]
                    ),
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(item.child),
                        "href": reverse("core:child", kwargs={"slug": item.child.slug}),
                    }
                rows.append({"key": str(item.id), "cells": cells})
            context["ant_page_title"] = _("Pumping")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Pumping")),
                kicker=str(_("Activity")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [
                        {
                            "label": str(_("Add Pumping")),
                            "href": reverse("core:pumping-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_pumping")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class PumpingAdd(AntFormMixin, CoreAddView):
    model = models.Pumping
    permission_required = ("core.add_pumping",)
    form_class = forms.PumpingForm
    success_url = reverse_lazy("core:pumping-list")
    success_message = _("%(model)s entry added!")
    ant_title = _("Add Pumping")
    ant_kicker = _("Entry Form")


class PumpingUpdate(AntFormMixin, CoreUpdateView):
    model = models.Pumping
    permission_required = ("core.change_pumping",)
    form_class = forms.PumpingForm
    success_url = reverse_lazy("core:pumping-list")
    success_message = _("%(model)s entry for %(child)s updated.")
    ant_title = _("Update Pumping")
    ant_kicker = _("Entry Form")


class PumpingDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Pumping
    permission_required = ("core.delete_pumping",)
    success_url = reverse_lazy("core:pumping-list")
    ant_title = _("Delete Pumping")


class SleepList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Sleep
    template_name = "core/sleep_list.html"
    permission_required = ("core.view_sleep",)
    filterset_class = filters.SleepFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super(SleepList, self).get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            page_obj = context.get("page_obj")
            columns = [
                {"key": "start", "title": str(_("Start"))},
                {"key": "end", "title": str(_("End"))},
            ]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "duration", "title": str(_("Duration"))},
                    {"key": "nap", "title": str(_("Nap"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for sleep in context["object_list"]:
                cells = {
                    "start": str(sleep.start),
                    "end": str(sleep.end),
                    "duration": str(sleep.duration or ""),
                    "nap": str(_("Yes")) if sleep.nap else str(_("No")),
                    "actions": {
                        "type": "actions",
                        "items": [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:sleep-update", kwargs={"pk": sleep.id}
                                    ),
                                }
                                if self.request.user.has_perm("core.change_sleep")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:sleep-delete", kwargs={"pk": sleep.id}
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_sleep")
                                else None
                            ),
                        ],
                    },
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(sleep.child),
                        "href": reverse(
                            "core:child", kwargs={"slug": sleep.child.slug}
                        ),
                    }
                rows.append({"key": str(sleep.id), "cells": cells})

            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Sleep")),
                kicker=str(_("Activity")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [{"label": str(_("Add Sleep")), "href": reverse("core:sleep-add")}]
                    if self.request.user.has_perm("core.add_sleep")
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
            context["ant_page_title"] = _("Sleep")
        return context


class SleepAdd(AntFormMixin, CoreAddView):
    model = models.Sleep
    permission_required = ("core.add_sleep",)
    form_class = forms.SleepForm
    success_url = reverse_lazy("core:sleep-list")
    ant_title = _("Add a Sleep Entry")
    ant_kicker = _("Entry Form")


class SleepUpdate(AntFormMixin, CoreUpdateView):
    model = models.Sleep
    permission_required = ("core.change_sleep",)
    form_class = forms.SleepForm
    success_url = reverse_lazy("core:sleep-list")
    ant_title = _("Update Sleep Entry")
    ant_kicker = _("Entry Form")


class SleepDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Sleep
    permission_required = ("core.delete_sleep",)
    success_url = reverse_lazy("core:sleep-list")
    ant_title = _("Delete a Sleep Entry")


class TagAdminList(
    PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView
):
    model = models.Tag
    template_name = "core/tag_list.html"
    permission_required = ("core.view_tags",)
    filterset_class = filters.TagFilter

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .annotate(Count("core_tagged_items"))
            .order_by(Lower("name"))
        )

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            rows = []
            for item in context["object_list"]:
                rows.append(
                    {
                        "key": item.slug,
                        "cells": {
                            "name": {
                                "type": "link",
                                "label": str(item.name),
                                "href": reverse(
                                    "core:tag-detail", kwargs={"slug": item.slug}
                                ),
                            },
                            "usage": str(getattr(item, "core_tagged_items__count", 0)),
                            "actions": _build_actions(
                                [
                                    (
                                        {
                                            "label": str(_("Edit")),
                                            "href": reverse(
                                                "core:tag-update",
                                                kwargs={"slug": item.slug},
                                            ),
                                        }
                                        if self.request.user.has_perm("core.change_tag")
                                        else None
                                    ),
                                    (
                                        {
                                            "label": str(_("Delete")),
                                            "href": reverse(
                                                "core:tag-delete",
                                                kwargs={"slug": item.slug},
                                            ),
                                            "danger": True,
                                        }
                                        if self.request.user.has_perm("core.delete_tag")
                                        else None
                                    ),
                                ]
                            ),
                        },
                    }
                )
            context["ant_page_title"] = _("Tags")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Tags")),
                kicker=str(_("Overview")),
                columns=[
                    {"key": "name", "title": str(_("Name"))},
                    {"key": "usage", "title": str(_("Usage"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ],
                rows=rows,
                add_actions=(
                    [{"label": str(_("Add a Tag")), "href": reverse("core:tag-add")}]
                    if self.request.user.has_perm("core.add_tag")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class TagAdminDetail(PermissionRequiredMixin, DetailView):
    model = models.Tag
    permission_required = ("core.view_tags",)

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.annotate(
            Count("feeding"),
            Count("diaperchange"),
            Count("pumping"),
            Count("sleep"),
            Count("tummytime"),
            Count("bmi"),
            Count("headcircumference"),
            Count("height"),
            Count("temperature"),
            Count("weight"),
        )
        return qs

    def get_template_names(self):
        if _details_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return super().get_template_names()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _details_ant_enabled():
            tag = context["object"]
            sections = [
                {
                    "title": str(_("Tagged Measurements")),
                    "items": [
                        {
                            "label": str(_("BMI Measurements")),
                            "count": getattr(tag, "bmi__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:bmi-list"), tag.id
                            ),
                        },
                        {
                            "label": str(_("Head Circumference Measurements")),
                            "count": getattr(tag, "headcircumference__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:head-circumference-list"), tag.id
                            ),
                        },
                        {
                            "label": str(_("Height Measurements")),
                            "count": getattr(tag, "height__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:height-list"), tag.id
                            ),
                        },
                        {
                            "label": str(_("Temperature Measurements")),
                            "count": getattr(tag, "temperature__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:temperature-list"), tag.id
                            ),
                        },
                        {
                            "label": str(_("Weight Measurements")),
                            "count": getattr(tag, "weight__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:weight-list"), tag.id
                            ),
                        },
                    ],
                },
                {
                    "title": str(_("Tagged Activities")),
                    "items": [
                        {
                            "label": str(_("Diaper Changes")),
                            "count": getattr(tag, "diaperchange__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:diaperchange-list"), tag.id
                            ),
                        },
                        {
                            "label": str(_("Feedings")),
                            "count": getattr(tag, "feeding__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:feeding-list"), tag.id
                            ),
                        },
                        {
                            "label": str(_("Pumpings")),
                            "count": getattr(tag, "pumping__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:pumping-list"), tag.id
                            ),
                        },
                        {
                            "label": str(_("Sleeps")),
                            "count": getattr(tag, "sleep__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:sleep-list"), tag.id
                            ),
                        },
                        {
                            "label": str(_("Tummy Times")),
                            "count": getattr(tag, "tummytime__count", 0),
                            "href": "{}?tag={}&filtered=1".format(
                                reverse("core:tummytime-list"), tag.id
                            ),
                        },
                    ],
                },
            ]
            context["ant_page_title"] = str(tag)
            context["ant_bootstrap"] = {
                "pageType": "tag-detail",
                "activeNavKey": reverse("babybuddy:user-settings"),
                "currentPath": self.request.path,
                "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
                "csrfToken": get_token(self.request),
                "user": {"displayName": _display_name(self.request.user)},
                "urls": {**_nav_urls(), "self": self.request.path},
                "strings": {
                    **_list_strings(),
                    "edit": _("Edit"),
                    "delete": _("Delete"),
                },
                "tagDetail": {
                    "name": str(tag),
                    "color": str(tag.color),
                    "sections": sections,
                    "actions": {
                        "edit": reverse("core:tag-update", kwargs={"slug": tag.slug}),
                        "delete": reverse("core:tag-delete", kwargs={"slug": tag.slug}),
                    },
                },
            }
        return context


class TagAdminAdd(AntFormMixin, CoreAddView):
    model = models.Tag
    permission_required = ("core.add_tag",)
    form_class = forms.TagAdminForm
    success_url = reverse_lazy("core:tag-list")
    ant_title = _("Add a Tag")
    ant_kicker = _("Entry Form")


class TagAdminUpdate(AntFormMixin, CoreUpdateView):
    model = models.Tag
    permission_required = ("core.change_tag",)
    form_class = forms.TagAdminForm
    success_url = reverse_lazy("core:tag-list")
    ant_title = _("Update a Tag")
    ant_kicker = _("Entry Form")


class TagAdminDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Tag
    permission_required = ("core.delete_tag",)
    success_url = reverse_lazy("core:tag-list")
    ant_title = _("Delete Tag")

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.annotate(Count("core_tagged_items"))


class TemperatureList(
    PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView
):
    model = models.Temperature
    template_name = "core/temperature_list.html"
    permission_required = ("core.view_temperature",)
    filterset_class = filters.TemperatureFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            columns = [{"key": "time", "title": str(_("Time"))}]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "temperature", "title": str(_("Temperature"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for item in context["object_list"]:
                cells = {
                    "time": str(item.time),
                    "temperature": str(item.temperature),
                    "actions": _build_actions(
                        [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:temperature-update",
                                        kwargs={"pk": item.id},
                                    ),
                                }
                                if self.request.user.has_perm("core.change_temperature")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:temperature-delete",
                                        kwargs={"pk": item.id},
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_temperature")
                                else None
                            ),
                        ]
                    ),
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(item.child),
                        "href": reverse("core:child", kwargs={"slug": item.child.slug}),
                    }
                rows.append({"key": str(item.id), "cells": cells})
            context["ant_page_title"] = _("Temperature")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Temperature")),
                kicker=str(_("Measurements")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [
                        {
                            "label": str(_("Add Temperature")),
                            "href": reverse("core:temperature-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_temperature")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class TemperatureAdd(AntFormMixin, CoreAddView):
    model = models.Temperature
    permission_required = ("core.add_temperature",)
    form_class = forms.TemperatureForm
    success_url = reverse_lazy("core:temperature-list")
    success_message = _("%(model)s reading added!")
    ant_title = _("Add Temperature")
    ant_kicker = _("Entry Form")


class TemperatureUpdate(AntFormMixin, CoreUpdateView):
    model = models.Temperature
    permission_required = ("core.change_temperature",)
    form_class = forms.TemperatureForm
    success_url = reverse_lazy("core:temperature-list")
    success_message = _("%(model)s reading for %(child)s updated.")
    ant_title = _("Update Temperature")
    ant_kicker = _("Entry Form")


class TemperatureDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Temperature
    permission_required = ("core.delete_temperature",)
    success_url = reverse_lazy("core:temperature-list")
    ant_title = _("Delete Temperature")


class Timeline(LoginRequiredMixin, TemplateView):
    template_name = "babybuddy/ant_app.html"

    # Show the overall timeline or a child timeline if one Child instance.
    def get(self, request, *args, **kwargs):
        children = models.Child.objects.count()
        if children == 1:
            return HttpResponseRedirect(
                reverse("core:child", args={models.Child.objects.first().slug})
            )
        return super(Timeline, self).get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(Timeline, self).get_context_data(**kwargs)
        date = self.request.GET.get("date", str(timezone.localdate()))
        _prepare_timeline_context_data(context, date)
        if _details_ant_enabled():
            context["ant_page_title"] = _("Timeline")
            context["ant_bootstrap"] = _build_ant_timeline_bootstrap(
                self.request,
                title=str(_("Timeline")),
                kicker=str(_("Activity Stream")),
                date=context["date"],
                date_previous=context.get("date_previous"),
                date_next=context.get("date_next"),
                timeline_objects=context.get("timeline_objects", []),
            )
        return context

    def get_template_names(self):
        if _details_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]


class TimerList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Timer
    template_name = "core/timer_list.html"
    permission_required = ("core.view_timer",)
    filterset_fields = ("user",)

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            rows = []
            for item in context["object_list"]:
                rows.append(
                    {
                        "key": str(item.id),
                        "cells": {
                            "name": {
                                "type": "link",
                                "label": str(item),
                                "href": reverse(
                                    "core:timer-detail", kwargs={"pk": item.id}
                                ),
                            },
                            "child": str(item.child or ""),
                            "start": str(item.start),
                            "user": str(item.user_username),
                            "actions": _build_actions(
                                [
                                    (
                                        {
                                            "label": str(_("Edit")),
                                            "href": reverse(
                                                "core:timer-update",
                                                kwargs={"pk": item.id},
                                            ),
                                        }
                                        if self.request.user.has_perm(
                                            "core.change_timer"
                                        )
                                        else None
                                    ),
                                    (
                                        {
                                            "label": str(_("Delete")),
                                            "href": reverse(
                                                "core:timer-delete",
                                                kwargs={"pk": item.id},
                                            ),
                                            "danger": True,
                                        }
                                        if self.request.user.has_perm(
                                            "core.delete_timer"
                                        )
                                        else None
                                    ),
                                ]
                            ),
                        },
                    }
                )
            context["ant_page_title"] = _("Timers")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Timers")),
                kicker=str(_("Activity")),
                columns=[
                    {"key": "name", "title": str(_("Name"))},
                    {"key": "child", "title": str(_("Child"))},
                    {"key": "start", "title": str(_("Start"))},
                    {"key": "user", "title": str(_("User"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ],
                rows=rows,
                add_actions=(
                    [
                        {
                            "label": str(_("Start Timer")),
                            "href": reverse("core:timer-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_timer")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class TimerDetail(PermissionRequiredMixin, DetailView):
    model = models.Timer
    permission_required = ("core.view_timer",)

    def get_template_names(self):
        if _details_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return super().get_template_names()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _details_ant_enabled():
            timer = context["object"]
            quick_actions = []
            if self.request.user.has_perm("core.add_feeding"):
                href = "{}?timer={}".format(reverse("core:feeding-add"), timer.id)
                if timer.child:
                    href += "&child={}".format(timer.child.slug)
                quick_actions.append({"label": str(_("Feeding")), "href": href})
            if self.request.user.has_perm("core.add_pumping"):
                href = "{}?timer={}".format(reverse("core:pumping-add"), timer.id)
                if timer.child:
                    href += "&child={}".format(timer.child.slug)
                quick_actions.append({"label": str(_("Pumping")), "href": href})
            if self.request.user.has_perm("core.add_sleep"):
                href = "{}?timer={}".format(reverse("core:sleep-add"), timer.id)
                if timer.child:
                    href += "&child={}".format(timer.child.slug)
                quick_actions.append({"label": str(_("Sleep")), "href": href})
            if self.request.user.has_perm("core.add_tummytime"):
                href = "{}?timer={}".format(reverse("core:tummytime-add"), timer.id)
                if timer.child:
                    href += "&child={}".format(timer.child.slug)
                quick_actions.append({"label": str(_("Tummy Time")), "href": href})

            context["ant_page_title"] = str(timer)
            context["ant_bootstrap"] = {
                "pageType": "timer-detail",
                "activeNavKey": reverse("core:timeline"),
                "currentPath": self.request.path,
                "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
                "csrfToken": get_token(self.request),
                "user": {"displayName": _display_name(self.request.user)},
                "urls": {**_nav_urls(), "self": self.request.path},
                "strings": {
                    **_list_strings(),
                    "started": _("Started"),
                    "createdBy": _("created by"),
                    "restartTimer": _("Restart timer"),
                    "timerActions": _("Timer actions"),
                },
                "timerDetail": {
                    "id": timer.id,
                    "name": str(timer),
                    "child": str(timer.child or ""),
                    "start": str(timer.start),
                    "createdBy": str(timer.user_username),
                    "quickActions": quick_actions,
                    "actions": {
                        "edit": reverse("core:timer-update", kwargs={"pk": timer.id}),
                        "delete": reverse("core:timer-delete", kwargs={"pk": timer.id}),
                        "restart": reverse(
                            "core:timer-restart", kwargs={"pk": timer.id}
                        ),
                    },
                },
            }
        return context


class TimerAdd(AntFormMixin, PermissionRequiredMixin, CreateView):
    model = models.Timer
    permission_required = ("core.add_timer",)
    form_class = forms.TimerForm
    ant_title = _("Start Timer")
    ant_kicker = _("Entry Form")

    def get_form_kwargs(self):
        kwargs = super(TimerAdd, self).get_form_kwargs()
        kwargs.update({"user": self.request.user})
        return kwargs

    def get_ant_cancel_url(self):
        return str(reverse("core:timer-list"))

    def get_success_url(self):
        return reverse("core:timer-detail", kwargs={"pk": self.object.pk})


class TimerUpdate(AntFormMixin, CoreUpdateView):
    model = models.Timer
    permission_required = ("core.change_timer",)
    form_class = forms.TimerForm
    success_url = reverse_lazy("core:timer-list")
    ant_title = _("Update Timer")
    ant_kicker = _("Entry Form")

    def get_form_kwargs(self):
        kwargs = super(TimerUpdate, self).get_form_kwargs()
        kwargs.update({"user": self.request.user})
        return kwargs

    def get_success_url(self):
        instance = self.get_object()
        return reverse("core:timer-detail", kwargs={"pk": instance.pk})


class TimerAddQuick(PermissionRequiredMixin, RedirectView):
    http_method_names = ["post"]
    permission_required = ("core.add_timer",)

    def post(self, request, *args, **kwargs):
        instance = models.Timer.objects.create(user=request.user)
        # Find child from child pk in POST
        child_id = request.POST.get("child", False)
        child = models.Child.objects.get(pk=child_id) if child_id else None
        if child:
            instance.child = child
        # Add child relationship if there is only Child instance.
        elif models.Child.count() == 1:
            instance.child = models.Child.objects.first()
        instance.save()
        self.url = request.GET.get(
            "next", reverse("core:timer-detail", args={instance.id})
        )
        return super(TimerAddQuick, self).get(request, *args, **kwargs)


class TimerRestart(PermissionRequiredMixin, RedirectView):
    http_method_names = ["post"]
    permission_required = ("core.change_timer",)

    def post(self, request, *args, **kwargs):
        instance = models.Timer.objects.get(id=kwargs["pk"])
        instance.restart()
        messages.success(request, "{} restarted.".format(instance))
        return super(TimerRestart, self).get(request, *args, **kwargs)

    def get_redirect_url(self, *args, **kwargs):
        return reverse("core:timer-detail", kwargs={"pk": kwargs["pk"]})


class TimerDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Timer
    permission_required = ("core.delete_timer",)
    success_url = reverse_lazy("core:timer-list")
    ant_title = _("Delete Timer")


class TummyTimeList(
    PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView
):
    model = models.TummyTime
    template_name = "core/tummytime_list.html"
    permission_required = ("core.view_tummytime",)
    filterset_class = filters.TummyTimeFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            columns = [
                {"key": "start", "title": str(_("Start"))},
                {"key": "end", "title": str(_("End"))},
            ]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "milestone", "title": str(_("Milestone"))},
                    {"key": "duration", "title": str(_("Duration"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for item in context["object_list"]:
                cells = {
                    "start": str(item.start),
                    "end": str(item.end),
                    "milestone": str(item.milestone or ""),
                    "duration": str(item.duration or ""),
                    "actions": _build_actions(
                        [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:tummytime-update", kwargs={"pk": item.id}
                                    ),
                                }
                                if self.request.user.has_perm("core.change_tummytime")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:tummytime-delete", kwargs={"pk": item.id}
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_tummytime")
                                else None
                            ),
                        ]
                    ),
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(item.child),
                        "href": reverse("core:child", kwargs={"slug": item.child.slug}),
                    }
                rows.append({"key": str(item.id), "cells": cells})
            context["ant_page_title"] = _("Tummy Time")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Tummy Time")),
                kicker=str(_("Activity")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [
                        {
                            "label": str(_("Add Tummy Time")),
                            "href": reverse("core:tummytime-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_tummytime")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class TummyTimeAdd(AntFormMixin, CoreAddView):
    model = models.TummyTime
    permission_required = ("core.add_tummytime",)
    form_class = forms.TummyTimeForm
    success_url = reverse_lazy("core:tummytime-list")
    ant_title = _("Add Tummy Time")
    ant_kicker = _("Entry Form")


class TummyTimeUpdate(AntFormMixin, CoreUpdateView):
    model = models.TummyTime
    permission_required = ("core.change_tummytime",)
    form_class = forms.TummyTimeForm
    success_url = reverse_lazy("core:tummytime-list")
    ant_title = _("Update Tummy Time")
    ant_kicker = _("Entry Form")


class TummyTimeDelete(AntDeleteMixin, CoreDeleteView):
    model = models.TummyTime
    permission_required = ("core.delete_tummytime",)
    success_url = reverse_lazy("core:tummytime-list")
    ant_title = _("Delete Tummy Time")


class WeightList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Weight
    template_name = "core/weight_list.html"
    permission_required = ("core.view_weight",)
    filterset_class = filters.WeightFilter

    def get_template_names(self):
        if _lists_ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if _lists_ant_enabled():
            unique_child = context.get("unique_child", False)
            columns = [{"key": "date", "title": str(_("Date"))}]
            if not unique_child:
                columns.append({"key": "child", "title": str(_("Child"))})
            columns.extend(
                [
                    {"key": "value", "title": str(_("Weight"))},
                    {"key": "actions", "title": str(_("Actions"))},
                ]
            )
            rows = []
            for item in context["object_list"]:
                cells = {
                    "date": str(item.date),
                    "value": str(item.weight),
                    "actions": _build_actions(
                        [
                            (
                                {
                                    "label": str(_("Edit")),
                                    "href": reverse(
                                        "core:weight-update", kwargs={"pk": item.id}
                                    ),
                                }
                                if self.request.user.has_perm("core.change_weight")
                                else None
                            ),
                            (
                                {
                                    "label": str(_("Delete")),
                                    "href": reverse(
                                        "core:weight-delete", kwargs={"pk": item.id}
                                    ),
                                    "danger": True,
                                }
                                if self.request.user.has_perm("core.delete_weight")
                                else None
                            ),
                        ]
                    ),
                }
                if not unique_child:
                    cells["child"] = {
                        "type": "link",
                        "label": str(item.child),
                        "href": reverse("core:child", kwargs={"slug": item.child.slug}),
                    }
                rows.append({"key": str(item.id), "cells": cells})
            context["ant_page_title"] = _("Weight")
            context["ant_bootstrap"] = _build_ant_list_bootstrap(
                self.request,
                title=str(_("Weight")),
                kicker=str(_("Measurements")),
                columns=columns,
                rows=rows,
                add_actions=(
                    [
                        {
                            "label": str(_("Add Weight")),
                            "href": reverse("core:weight-add"),
                        }
                    ]
                    if self.request.user.has_perm("core.add_weight")
                    else []
                ),
                pagination=_page_info(context),
            )
        return context


class WeightAdd(AntFormMixin, CoreAddView):
    model = models.Weight
    permission_required = ("core.add_weight",)
    form_class = forms.WeightForm
    success_url = reverse_lazy("core:weight-list")
    ant_title = _("Add Weight")
    ant_kicker = _("Entry Form")


class WeightUpdate(AntFormMixin, CoreUpdateView):
    model = models.Weight
    permission_required = ("core.change_weight",)
    form_class = forms.WeightForm
    success_url = reverse_lazy("core:weight-list")
    ant_title = _("Update Weight")
    ant_kicker = _("Entry Form")


class WeightDelete(AntDeleteMixin, CoreDeleteView):
    model = models.Weight
    permission_required = ("core.delete_weight",)
    success_url = reverse_lazy("core:weight-list")
    ant_title = _("Delete Weight")
