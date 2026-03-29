import datetime
import json

from django.contrib import messages
from django.http import HttpResponseRedirect
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils.translation import gettext as _
from django.views.generic.base import TemplateView, View

from babybuddy.mixins import LoginRequiredMixin
from core.models import Child
from core.views import _nav_urls, _list_strings, _build_child_switcher, _display_name
from examinations.models import (
    ExaminationProgram,
    ExaminationType,
    ExaminationRecord,
)
from examinations.status import calculate_examination_statuses

DEFAULT_COUNTRY = "de"


def _get_program_for_child(child):
    if child.examination_program_id:
        return child.examination_program
    return ExaminationProgram.objects.filter(country_code=DEFAULT_COUNTRY).first()


def _exam_strings():
    return {
        "examinations": _("Examinations"),
        "doctorOnly": _("Assessed by your doctor"),
        "fillIn": _("Fill in"),
        "viewEdit": _("View / Edit"),
        "examDue": _("Due"),
        "examOverdue": _("Overdue"),
        "examUpcoming": _("Upcoming"),
        "examCompleted": _("Completed"),
        "dateOfExamination": _("Date of examination"),
        "notes": _("Notes"),
        "ageWindow": _("Age window"),
        "saveExamination": _("Save examination"),
        "examSaved": _("Examination saved."),
        "dateRequired": _("Please enter the date of the examination."),
        "yes": _("Yes"),
        "no": _("No"),
    }


def _fmt_date(d):
    return d.strftime("%Y-%m-%d") if d else None


class ExaminationListView(LoginRequiredMixin, TemplateView):
    template_name = "babybuddy/ant_app.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        child = get_object_or_404(Child, slug=self.kwargs["slug"])
        program = _get_program_for_child(child)

        exam_types = []
        records = []
        statuses = {}

        if program:
            exam_types = list(
                ExaminationType.objects.filter(program=program).order_by("order")
            )
            records = list(
                ExaminationRecord.objects.filter(
                    child=child, examination_type__in=exam_types
                )
            )
            statuses = calculate_examination_statuses(child, exam_types, records)

        examinations = []
        for et in exam_types:
            st = statuses.get(et.pk, {})
            examinations.append({
                "code": et.code,
                "name": et.name,
                "description": et.description,
                "due_from": _fmt_date(st.get("due_from")),
                "due_to": _fmt_date(st.get("due_to")),
                "status": st.get("status", "upcoming"),
                "completed_date": _fmt_date(st.get("completed_date")),
                "url": reverse(
                    "examinations:form",
                    kwargs={"slug": child.slug, "code": et.code},
                ),
            })

        context["ant_bootstrap"] = {
            "pageType": "examination-list",
            "currentPath": self.request.path,
            "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
            "csrfToken": get_token(self.request),
            "user": {"displayName": _display_name(self.request.user)},
            "urls": {**_nav_urls(), "addChild": reverse("core:child-add")},
            "strings": {**_list_strings(), **_exam_strings()},
            "childSwitcher": _build_child_switcher(
                self.request, current_child=child
            ),
            "childDetail": {"name": str(child), "slug": child.slug},
            "examinations": examinations,
            "messages": [],
        }
        return context


class ExaminationFormView(LoginRequiredMixin, TemplateView):
    template_name = "babybuddy/ant_app.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        child = get_object_or_404(Child, slug=self.kwargs["slug"])
        program = _get_program_for_child(child)
        if program is None:
            from django.http import Http404
            raise Http404("No examination program found for this child.")
        exam_type = get_object_or_404(
            ExaminationType, program=program, code=self.kwargs["code"]
        )

        records = list(ExaminationRecord.objects.filter(child=child))
        statuses = calculate_examination_statuses(child, [exam_type], records)
        st = statuses.get(exam_type.pk, {})

        existing_record = ExaminationRecord.objects.filter(
            child=child, examination_type=exam_type
        ).first()

        existing_answers = existing_record.answers if existing_record else {}

        categories_map = {}
        for q in exam_type.questions.order_by("category", "order"):
            if q.category not in categories_map:
                categories_map[q.category] = []
            categories_map[q.category].append({
                "id": q.pk,
                "text": q.text,
                "doctor_only": q.doctor_only,
                "answer_type": q.answer_type,
                "choices": q.choices,
                "value": existing_answers.get(str(q.pk)),
            })

        categories = [
            {"name": cat, "questions": qs}
            for cat, qs in categories_map.items()
        ]

        context["ant_bootstrap"] = {
            "pageType": "examination-form",
            "currentPath": self.request.path,
            "locale": getattr(self.request, "LANGUAGE_CODE", "en"),
            "csrfToken": get_token(self.request),
            "user": {"displayName": _display_name(self.request.user)},
            "urls": {
                **_nav_urls(),
                "addChild": reverse("core:child-add"),
                "saveUrl": reverse(
                    "examinations:save",
                    kwargs={"slug": child.slug, "code": exam_type.code},
                ),
                "listUrl": reverse(
                    "examinations:list", kwargs={"slug": child.slug}
                ),
            },
            "strings": {**_list_strings(), **_exam_strings()},
            "childSwitcher": _build_child_switcher(
                self.request, current_child=child
            ),
            "childDetail": {"name": str(child), "slug": child.slug},
            "examinationType": {
                "code": exam_type.code,
                "name": exam_type.name,
                "description": exam_type.description,
                "status": st.get("status", "upcoming"),
                "due_from": _fmt_date(st.get("due_from")),
                "due_to": _fmt_date(st.get("due_to")),
            },
            "categories": categories,
            "record": {
                "date": _fmt_date(existing_record.date),
                "notes": existing_record.notes,
            } if existing_record else None,
            "messages": [],
        }
        return context


class ExaminationSaveView(LoginRequiredMixin, View):
    def post(self, request, slug, code):
        child = get_object_or_404(Child, slug=slug)
        program = _get_program_for_child(child)
        if program is None:
            return HttpResponseRedirect(
                reverse("core:child", kwargs={"slug": slug})
            )
        exam_type = get_object_or_404(
            ExaminationType, program=program, code=code
        )
        list_url = reverse("examinations:list", kwargs={"slug": slug})
        form_url = reverse(
            "examinations:form", kwargs={"slug": slug, "code": code}
        )

        date_str = request.POST.get("date", "").strip()
        if not date_str:
            messages.error(request, _("Please enter the date of the examination."))
            return HttpResponseRedirect(form_url)

        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            messages.error(request, _("Invalid date format."))
            return HttpResponseRedirect(form_url)

        try:
            answers = json.loads(request.POST.get("answers", "{}"))
        except (json.JSONDecodeError, TypeError):
            answers = {}

        notes = request.POST.get("notes", "").strip()

        allowed_ids = set(
            str(q.pk)
            for q in exam_type.questions.filter(doctor_only=False)
        )
        answers = {k: v for k, v in answers.items() if k in allowed_ids}

        ExaminationRecord.objects.update_or_create(
            child=child,
            examination_type=exam_type,
            defaults={"date": date, "answers": answers, "notes": notes},
        )
        messages.success(request, _("Examination saved."))
        return HttpResponseRedirect(list_url)
