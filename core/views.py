# -*- coding: utf-8 -*-
from django.contrib import messages
from django.contrib.messages.views import SuccessMessageMixin
from django.conf import settings
from django.db.models import Count
from django.db.models.functions import Lower
from django.forms import Form
from django.http import HttpResponseRedirect
from django.middleware.csrf import get_token
from django.templatetags.static import static
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.utils.translation import gettext as _
from django.views.generic.base import RedirectView, TemplateView
from django.views.generic.detail import DetailView
from django.views.generic.edit import CreateView, UpdateView, DeleteView, FormView

from babybuddy.mixins import LoginRequiredMixin, PermissionRequiredMixin
from babybuddy.views import BabyBuddyFilterView, BabyBuddyPaginatedView
from core import filters, forms, models, timeline


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
    return settings.BABY_BUDDY.get("LISTS_ANT_ENABLED", False)


def _display_name(user):
    return user.get_full_name() or user.username


def _nav_urls():
    return {
        "dashboard": reverse("dashboard:dashboard"),
        "timeline": reverse("core:timeline"),
        "settings": reverse("babybuddy:user-settings"),
        "logout": reverse("babybuddy:logout"),
    }


def _list_strings():
    return {
        "dashboard": _("Dashboard"),
        "timeline": _("Timeline"),
        "settings": _("Settings"),
        "logout": _("Logout"),
        "overview": _("Overview"),
        "list": _("List"),
        "actions": _("Actions"),
        "empty": _("No entries found."),
    }


def _child_image_url(request, child):
    if child.picture:
        return request.build_absolute_uri(child.picture.url)
    return request.build_absolute_uri(
        static("babybuddy/img/core/child-placeholder.png")
    )


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


class BMIAdd(CoreAddView):
    model = models.BMI
    permission_required = ("core.add_bmi",)
    form_class = forms.BMIForm
    success_url = reverse_lazy("core:bmi-list")


class BMIUpdate(CoreUpdateView):
    model = models.BMI
    permission_required = ("core.change_bmi",)
    form_class = forms.BMIForm
    success_url = reverse_lazy("core:bmi-list")


class BMIDelete(CoreDeleteView):
    model = models.BMI
    permission_required = ("core.delete_bmi",)
    success_url = reverse_lazy("core:bmi-list")


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
                                "href": reverse("core:child", kwargs={"slug": child.slug}),
                            },
                            "last_name": child.last_name,
                            "birth_date": str(child.birth_datetime),
                            "actions": {
                                "type": "actions",
                                "items": [
                                    {
                                        "label": str(_("Edit")),
                                        "href": reverse(
                                            "core:child-update", kwargs={"slug": child.slug}
                                        ),
                                    }
                                    if self.request.user.has_perm("core.change_child")
                                    else None,
                                    {
                                        "label": str(_("Delete")),
                                        "href": reverse(
                                            "core:child-delete", kwargs={"slug": child.slug}
                                        ),
                                        "danger": True,
                                    }
                                    if self.request.user.has_perm("core.delete_child")
                                    else None,
                                ],
                            },
                        },
                    }
                    for child in context["object_list"]
                ],
                add_actions=[
                    {
                        "label": str(_("Add Child")),
                        "href": reverse("core:child-add"),
                    }
                ]
                if self.request.user.has_perm("core.add_child")
                else [],
                pagination={
                    "page": page_obj.number,
                    "pageSize": page_obj.paginator.per_page,
                    "total": page_obj.paginator.count,
                }
                if page_obj
                else None,
            )
        return context


class ChildAdd(CoreAddView):
    model = models.Child
    permission_required = ("core.add_child",)
    form_class = forms.ChildForm
    success_url = reverse_lazy("core:child-list")
    success_message = _("%(first_name)s %(last_name)s added!")


class ChildDetail(PermissionRequiredMixin, DetailView):
    model = models.Child
    permission_required = ("core.view_child",)

    def get_context_data(self, **kwargs):
        context = super(ChildDetail, self).get_context_data(**kwargs)
        date = self.request.GET.get("date", str(timezone.localdate()))
        _prepare_timeline_context_data(context, date, self.object)
        return context


class ChildUpdate(CoreUpdateView):
    model = models.Child
    permission_required = ("core.change_child",)
    form_class = forms.ChildForm
    success_url = reverse_lazy("core:child-list")


class ChildDelete(CoreUpdateView):
    model = models.Child
    form_class = forms.ChildDeleteForm
    template_name = "core/child_confirm_delete.html"
    permission_required = ("core.delete_child",)
    success_url = reverse_lazy("core:child-list")

    def get_success_message(self, cleaned_data):
        """This class cannot use `CoreDeleteView` because of the confirmation
        step required so the success message must be overridden."""
        success_message = _("%(model)s entry deleted.") % {
            "model": self.model._meta.verbose_name.title()
        }
        return success_message % cleaned_data


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
                            {
                                "label": str(_("Edit")),
                                "href": reverse(
                                    "core:diaperchange-update", kwargs={"pk": change.id}
                                ),
                            }
                            if self.request.user.has_perm("core.change_diaperchange")
                            else None,
                            {
                                "label": str(_("Delete")),
                                "href": reverse(
                                    "core:diaperchange-delete", kwargs={"pk": change.id}
                                ),
                                "danger": True,
                            }
                            if self.request.user.has_perm("core.delete_diaperchange")
                            else None,
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
                add_actions=[
                    {
                        "label": str(_("Add Diaper Change")),
                        "href": reverse("core:diaperchange-add"),
                    }
                ]
                if self.request.user.has_perm("core.add_diaperchange")
                else [],
                pagination={
                    "page": page_obj.number,
                    "pageSize": page_obj.paginator.per_page,
                    "total": page_obj.paginator.count,
                }
                if page_obj
                else None,
            )
            context["ant_page_title"] = _("Diaper Changes")
        return context


class DiaperChangeAdd(CoreAddView):
    model = models.DiaperChange
    permission_required = ("core.add_diaperchange",)
    form_class = forms.DiaperChangeForm
    success_url = reverse_lazy("core:diaperchange-list")


class DiaperChangeUpdate(CoreUpdateView):
    model = models.DiaperChange
    permission_required = ("core.change_diaperchange",)
    form_class = forms.DiaperChangeForm
    success_url = reverse_lazy("core:diaperchange-list")


class DiaperChangeDelete(CoreDeleteView):
    model = models.DiaperChange
    permission_required = ("core.delete_diaperchange",)
    success_url = reverse_lazy("core:diaperchange-list")


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
                            {
                                "label": str(_("Edit")),
                                "href": reverse(
                                    "core:feeding-update", kwargs={"pk": feeding.id}
                                ),
                            }
                            if self.request.user.has_perm("core.change_feeding")
                            else None,
                            {
                                "label": str(_("Delete")),
                                "href": reverse(
                                    "core:feeding-delete", kwargs={"pk": feeding.id}
                                ),
                                "danger": True,
                            }
                            if self.request.user.has_perm("core.delete_feeding")
                            else None,
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
                pagination={
                    "page": page_obj.number,
                    "pageSize": page_obj.paginator.per_page,
                    "total": page_obj.paginator.count,
                }
                if page_obj
                else None,
            )
            context["ant_page_title"] = _("Feedings")
        return context


class FeedingAdd(CoreAddView):
    model = models.Feeding
    permission_required = ("core.add_feeding",)
    form_class = forms.FeedingForm
    success_url = reverse_lazy("core:feeding-list")


class BottleFeedingAdd(CoreAddView):
    model = models.Feeding
    permission_required = ("core.add_feeding",)
    form_class = forms.BottleFeedingForm
    success_url = reverse_lazy("core:feeding-list")


class FeedingUpdate(CoreUpdateView):
    model = models.Feeding
    permission_required = ("core.change_feeding",)
    form_class = forms.FeedingForm
    success_url = reverse_lazy("core:feeding-list")


class FeedingDelete(CoreDeleteView):
    model = models.Feeding
    permission_required = ("core.delete_feeding",)
    success_url = reverse_lazy("core:feeding-list")


class HeadCircumferenceList(
    PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView
):
    model = models.HeadCircumference
    template_name = "core/head_circumference_list.html"
    permission_required = ("core.view_head_circumference",)
    filterset_class = filters.HeadCircumferenceFilter


class HeadCircumferenceAdd(CoreAddView):
    model = models.HeadCircumference
    template_name = "core/head_circumference_form.html"
    permission_required = ("core.add_head_circumference",)
    form_class = forms.HeadCircumferenceForm
    success_url = reverse_lazy("core:head-circumference-list")


class HeadCircumferenceUpdate(CoreUpdateView):
    model = models.HeadCircumference
    template_name = "core/head_circumference_form.html"
    permission_required = ("core.change_head_circumference",)
    form_class = forms.HeadCircumferenceForm
    success_url = reverse_lazy("core:head-circumference-list")


class HeadCircumferenceDelete(CoreDeleteView):
    model = models.HeadCircumference
    template_name = "core/head_circumference_confirm_delete.html"
    permission_required = ("core.delete_head_circumference",)
    success_url = reverse_lazy("core:head-circumference-list")


class HeightList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Height
    template_name = "core/height_list.html"
    permission_required = ("core.view_height",)
    filterset_class = filters.HeightFilter


class HeightAdd(CoreAddView):
    model = models.Height
    permission_required = ("core.add_height",)
    form_class = forms.HeightForm
    success_url = reverse_lazy("core:height-list")


class HeightUpdate(CoreUpdateView):
    model = models.Height
    permission_required = ("core.change_height",)
    form_class = forms.HeightForm
    success_url = reverse_lazy("core:height-list")


class HeightDelete(CoreDeleteView):
    model = models.Height
    permission_required = ("core.delete_height",)
    success_url = reverse_lazy("core:height-list")


class NoteList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Note
    template_name = "core/note_list.html"
    permission_required = ("core.view_note",)
    filterset_class = filters.NoteFilter


class NoteAdd(CoreAddView):
    model = models.Note
    permission_required = ("core.add_note",)
    form_class = forms.NoteForm
    success_url = reverse_lazy("core:note-list")


class NoteUpdate(CoreUpdateView):
    model = models.Note
    permission_required = ("core.change_note",)
    form_class = forms.NoteForm
    success_url = reverse_lazy("core:note-list")


class NoteDelete(CoreDeleteView):
    model = models.Note
    permission_required = ("core.delete_note",)
    success_url = reverse_lazy("core:note-list")


class PumpingList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Pumping
    template_name = "core/pumping_list.html"
    permission_required = ("core.view_pumping",)
    filterset_class = filters.PumpingFilter


class PumpingAdd(CoreAddView):
    model = models.Pumping
    permission_required = ("core.add_pumping",)
    form_class = forms.PumpingForm
    success_url = reverse_lazy("core:pumping-list")
    success_message = _("%(model)s entry added!")


class PumpingUpdate(CoreUpdateView):
    model = models.Pumping
    permission_required = ("core.change_pumping",)
    form_class = forms.PumpingForm
    success_url = reverse_lazy("core:pumping-list")
    success_message = _("%(model)s entry for %(child)s updated.")


class PumpingDelete(CoreDeleteView):
    model = models.Pumping
    permission_required = ("core.delete_pumping",)
    success_url = reverse_lazy("core:pumping-list")


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
                            {
                                "label": str(_("Edit")),
                                "href": reverse("core:sleep-update", kwargs={"pk": sleep.id}),
                            }
                            if self.request.user.has_perm("core.change_sleep")
                            else None,
                            {
                                "label": str(_("Delete")),
                                "href": reverse("core:sleep-delete", kwargs={"pk": sleep.id}),
                                "danger": True,
                            }
                            if self.request.user.has_perm("core.delete_sleep")
                            else None,
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
                add_actions=[
                    {"label": str(_("Add Sleep")), "href": reverse("core:sleep-add")}
                ]
                if self.request.user.has_perm("core.add_sleep")
                else [],
                pagination={
                    "page": page_obj.number,
                    "pageSize": page_obj.paginator.per_page,
                    "total": page_obj.paginator.count,
                }
                if page_obj
                else None,
            )
            context["ant_page_title"] = _("Sleep")
        return context


class SleepAdd(CoreAddView):
    model = models.Sleep
    permission_required = ("core.add_sleep",)
    form_class = forms.SleepForm
    success_url = reverse_lazy("core:sleep-list")


class SleepUpdate(CoreUpdateView):
    model = models.Sleep
    permission_required = ("core.change_sleep",)
    form_class = forms.SleepForm
    success_url = reverse_lazy("core:sleep-list")


class SleepDelete(CoreDeleteView):
    model = models.Sleep
    permission_required = ("core.delete_sleep",)
    success_url = reverse_lazy("core:sleep-list")


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


class TagAdminAdd(CoreAddView):
    model = models.Tag
    permission_required = ("core.add_tag",)
    form_class = forms.TagAdminForm
    success_url = reverse_lazy("core:tag-list")


class TagAdminUpdate(CoreUpdateView):
    model = models.Tag
    permission_required = ("core.change_tag",)
    form_class = forms.TagAdminForm
    success_url = reverse_lazy("core:tag-list")


class TagAdminDelete(CoreDeleteView):
    model = models.Tag
    permission_required = ("core.delete_tag",)
    success_url = reverse_lazy("core:tag-list")

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


class TemperatureAdd(CoreAddView):
    model = models.Temperature
    permission_required = ("core.add_temperature",)
    form_class = forms.TemperatureForm
    success_url = reverse_lazy("core:temperature-list")
    success_message = _("%(model)s reading added!")


class TemperatureUpdate(CoreUpdateView):
    model = models.Temperature
    permission_required = ("core.change_temperature",)
    form_class = forms.TemperatureForm
    success_url = reverse_lazy("core:temperature-list")
    success_message = _("%(model)s reading for %(child)s updated.")


class TemperatureDelete(CoreDeleteView):
    model = models.Temperature
    permission_required = ("core.delete_temperature",)
    success_url = reverse_lazy("core:temperature-list")


class Timeline(LoginRequiredMixin, TemplateView):
    template_name = "timeline/timeline.html"

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
        return context


class TimerList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Timer
    template_name = "core/timer_list.html"
    permission_required = ("core.view_timer",)
    filterset_fields = ("user",)


class TimerDetail(PermissionRequiredMixin, DetailView):
    model = models.Timer
    permission_required = ("core.view_timer",)


class TimerAdd(PermissionRequiredMixin, CreateView):
    model = models.Timer
    permission_required = ("core.add_timer",)
    form_class = forms.TimerForm

    def get_form_kwargs(self):
        kwargs = super(TimerAdd, self).get_form_kwargs()
        kwargs.update({"user": self.request.user})
        return kwargs

    def get_success_url(self):
        return reverse("core:timer-detail", kwargs={"pk": self.object.pk})


class TimerUpdate(CoreUpdateView):
    model = models.Timer
    permission_required = ("core.change_timer",)
    form_class = forms.TimerForm
    success_url = reverse_lazy("core:timer-list")

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


class TimerDelete(CoreDeleteView):
    model = models.Timer
    permission_required = ("core.delete_timer",)
    success_url = reverse_lazy("core:timer-list")


class TummyTimeList(
    PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView
):
    model = models.TummyTime
    template_name = "core/tummytime_list.html"
    permission_required = ("core.view_tummytime",)
    filterset_class = filters.TummyTimeFilter


class TummyTimeAdd(CoreAddView):
    model = models.TummyTime
    permission_required = ("core.add_tummytime",)
    form_class = forms.TummyTimeForm
    success_url = reverse_lazy("core:tummytime-list")


class TummyTimeUpdate(CoreUpdateView):
    model = models.TummyTime
    permission_required = ("core.change_tummytime",)
    form_class = forms.TummyTimeForm
    success_url = reverse_lazy("core:tummytime-list")


class TummyTimeDelete(CoreDeleteView):
    model = models.TummyTime
    permission_required = ("core.delete_tummytime",)
    success_url = reverse_lazy("core:tummytime-list")


class WeightList(PermissionRequiredMixin, BabyBuddyPaginatedView, BabyBuddyFilterView):
    model = models.Weight
    template_name = "core/weight_list.html"
    permission_required = ("core.view_weight",)
    filterset_class = filters.WeightFilter


class WeightAdd(CoreAddView):
    model = models.Weight
    permission_required = ("core.add_weight",)
    form_class = forms.WeightForm
    success_url = reverse_lazy("core:weight-list")


class WeightUpdate(CoreUpdateView):
    model = models.Weight
    permission_required = ("core.change_weight",)
    form_class = forms.WeightForm
    success_url = reverse_lazy("core:weight-list")


class WeightDelete(CoreDeleteView):
    model = models.Weight
    permission_required = ("core.delete_weight",)
    success_url = reverse_lazy("core:weight-list")
