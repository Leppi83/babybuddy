# U-Examinations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a German pediatric U-examination tracking feature (U1–U9 + J1) to BabyBuddy, with a full questionnaire per exam, status tracking, dashboard card, and Insights integration.

**Architecture:** New `examinations` Django app with 4 models. Seeded German questions via management command. Three Django views (list, form, save) feeding the standard `ant_bootstrap` JSON pattern. Two new React page components in a dedicated `ExaminationPages.jsx` file.

**Tech Stack:** Django (Python), React + Ant Design, existing `ant_app.html` bootstrap pattern, `pipenv` for Python deps, `npm` for JS deps.

**Spec:** `docs/superpowers/specs/2026-03-28-u-examinations-design.md`

---

## File Map

**Create:**
- `examinations/__init__.py`
- `examinations/apps.py`
- `examinations/models.py`
- `examinations/urls.py`
- `examinations/views.py`
- `examinations/admin.py`
- `examinations/migrations/0001_initial.py` (via `makemigrations`)
- `examinations/management/__init__.py`
- `examinations/management/commands/__init__.py`
- `examinations/management/commands/seed_examinations.py`
- `examinations/tests/__init__.py`
- `examinations/tests/test_models.py`
- `examinations/tests/test_views.py`
- `frontend/src/pages/ExaminationPages.jsx`

**Modify:**
- `babybuddy/settings/base.py` — add `examinations` to `INSTALLED_APPS`
- `babybuddy/urls.py` — include `examinations.urls`
- `core/models.py` — add `examination_program` FK to `Child`
- `core/migrations/` — new migration for Child change (via `makemigrations`)
- `babybuddy/models.py` — add `card.examinations.next` to `DASHBOARD_ITEM_CHOICES`
- `dashboard/views.py` — add examination card data to `SECTION_CARD_MAP` / card builder
- `frontend/src/lib/app-utils.jsx` — add `DASHBOARD_CARD_TITLES` entry
- `frontend/src/pages/DashboardPages.jsx` — render next-exam card
- `frontend/src/App.jsx` — add lazy imports + routes for `examination-list` and `examination-form`
- `locale/de/LC_MESSAGES/django.po` — German translations

---

## Task 1: Create `examinations` app skeleton

**Files:**
- Create: `examinations/__init__.py`
- Create: `examinations/apps.py`
- Modify: `babybuddy/settings/base.py`

- [ ] **Step 1: Create app files**

```python
# examinations/__init__.py
# (empty)
```

```python
# examinations/apps.py
from django.apps import AppConfig


class ExaminationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "examinations"
```

- [ ] **Step 2: Add to INSTALLED_APPS**

In `babybuddy/settings/base.py`, add after `"core.apps.CoreConfig"`:
```python
    "examinations.apps.ExaminationsConfig",
```

- [ ] **Step 3: Verify app loads**

```bash
cd /opt/projects/babybuddy
pipenv run python manage.py check examinations
```
Expected: `System check identified no issues`

- [ ] **Step 4: Commit**

```bash
git add examinations/__init__.py examinations/apps.py babybuddy/settings/base.py
git commit -m "feat: add examinations app skeleton"
```

---

## Task 2: Data models + migration

**Files:**
- Create: `examinations/models.py`
- Create: `examinations/migrations/0001_initial.py` (generated)
- Create: `examinations/tests/__init__.py`
- Create: `examinations/tests/test_models.py`

- [ ] **Step 1: Write failing model tests**

```python
# examinations/tests/__init__.py
# (empty)
```

```python
# examinations/tests/test_models.py
import datetime
from django.test import TestCase
from core.models import Child
from examinations.models import (
    ExaminationProgram,
    ExaminationType,
    ExaminationQuestion,
    ExaminationRecord,
)


class ExaminationProgramTest(TestCase):
    def test_create_program(self):
        program = ExaminationProgram.objects.create(
            country_code="de",
            name="Deutschland – Vorsorgeuntersuchungen",
        )
        self.assertEqual(str(program), "Deutschland – Vorsorgeuntersuchungen")


class ExaminationTypeTest(TestCase):
    def setUp(self):
        self.program = ExaminationProgram.objects.create(
            country_code="de", name="Deutschland – Vorsorgeuntersuchungen"
        )

    def test_create_type(self):
        exam_type = ExaminationType.objects.create(
            program=self.program,
            code="U3",
            name="U3 – 4.–5. Lebenswoche",
            age_min_days=21,
            age_max_days=56,
            order=3,
            description="Erste umfassende Vorsorgeuntersuchung nach der Neugeborenenphase.",
        )
        self.assertEqual(exam_type.code, "U3")
        self.assertEqual(exam_type.age_min_days, 21)


class ExaminationQuestionTest(TestCase):
    def setUp(self):
        self.program = ExaminationProgram.objects.create(
            country_code="de", name="Test"
        )
        self.exam_type = ExaminationType.objects.create(
            program=self.program,
            code="U3",
            name="U3",
            age_min_days=21,
            age_max_days=56,
            order=3,
            description="",
        )

    def test_doctor_only_question(self):
        q = ExaminationQuestion.objects.create(
            examination_type=self.exam_type,
            category="Körpermaße",
            text="Körperlänge (cm)",
            doctor_only=True,
            answer_type="number",
            order=1,
        )
        self.assertTrue(q.doctor_only)

    def test_parent_question(self):
        q = ExaminationQuestion.objects.create(
            examination_type=self.exam_type,
            category="Sozialverhalten",
            text="Lächelt Ihr Baby, wenn es angesprochen wird?",
            doctor_only=False,
            answer_type="boolean",
            order=2,
        )
        self.assertFalse(q.doctor_only)


class ExaminationRecordTest(TestCase):
    def setUp(self):
        self.child = Child.objects.create(
            first_name="Test",
            last_name="Child",
            birth_date=datetime.date(2024, 1, 1),
        )
        self.program = ExaminationProgram.objects.create(
            country_code="de", name="Test"
        )
        self.exam_type = ExaminationType.objects.create(
            program=self.program,
            code="U3",
            name="U3",
            age_min_days=21,
            age_max_days=56,
            order=3,
            description="",
        )

    def test_create_record(self):
        record = ExaminationRecord.objects.create(
            child=self.child,
            examination_type=self.exam_type,
            date=datetime.date(2024, 2, 1),
            answers={"1": True, "2": "Gut"},
        )
        self.assertEqual(record.child, self.child)
        self.assertEqual(record.answers["1"], True)

    def test_unique_together(self):
        ExaminationRecord.objects.create(
            child=self.child,
            examination_type=self.exam_type,
            date=datetime.date(2024, 2, 1),
            answers={},
        )
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            ExaminationRecord.objects.create(
                child=self.child,
                examination_type=self.exam_type,
                date=datetime.date(2024, 2, 5),
                answers={},
            )
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pipenv run python manage.py test examinations.tests.test_models -v 2
```
Expected: `ImportError: cannot import name 'ExaminationProgram'`

- [ ] **Step 3: Write the models**

```python
# examinations/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _


class ExaminationProgram(models.Model):
    country_code = models.CharField(max_length=10, verbose_name=_("Country code"))
    name = models.CharField(max_length=200, verbose_name=_("Name"))

    class Meta:
        ordering = ["country_code"]
        verbose_name = _("Examination Program")
        verbose_name_plural = _("Examination Programs")

    def __str__(self):
        return self.name


class ExaminationType(models.Model):
    program = models.ForeignKey(
        ExaminationProgram,
        on_delete=models.CASCADE,
        related_name="examination_types",
    )
    code = models.CharField(max_length=10, verbose_name=_("Code"))
    name = models.CharField(max_length=200, verbose_name=_("Name"))
    age_min_days = models.IntegerField(verbose_name=_("Minimum age (days)"))
    age_max_days = models.IntegerField(verbose_name=_("Maximum age (days)"))
    order = models.IntegerField(default=0, verbose_name=_("Order"))
    description = models.TextField(blank=True, verbose_name=_("Description"))

    class Meta:
        ordering = ["order"]
        unique_together = [["program", "code"]]
        verbose_name = _("Examination Type")
        verbose_name_plural = _("Examination Types")

    def __str__(self):
        return self.name


class ExaminationQuestion(models.Model):
    ANSWER_TYPE_BOOLEAN = "boolean"
    ANSWER_TYPE_TEXT = "text"
    ANSWER_TYPE_NUMBER = "number"
    ANSWER_TYPE_CHOICE = "choice"
    ANSWER_TYPE_CHOICES = [
        (ANSWER_TYPE_BOOLEAN, _("Yes / No")),
        (ANSWER_TYPE_TEXT, _("Text")),
        (ANSWER_TYPE_NUMBER, _("Number")),
        (ANSWER_TYPE_CHOICE, _("Choice")),
    ]

    examination_type = models.ForeignKey(
        ExaminationType,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    category = models.CharField(max_length=100, verbose_name=_("Category"))
    text = models.TextField(verbose_name=_("Question text"))
    doctor_only = models.BooleanField(
        default=False, verbose_name=_("Doctor only")
    )
    answer_type = models.CharField(
        max_length=20,
        choices=ANSWER_TYPE_CHOICES,
        default=ANSWER_TYPE_BOOLEAN,
        verbose_name=_("Answer type"),
    )
    choices = models.JSONField(
        null=True, blank=True, verbose_name=_("Choices")
    )
    order = models.IntegerField(default=0, verbose_name=_("Order"))

    class Meta:
        ordering = ["order"]
        verbose_name = _("Examination Question")
        verbose_name_plural = _("Examination Questions")

    def __str__(self):
        return self.text[:80]


class ExaminationRecord(models.Model):
    child = models.ForeignKey(
        "core.Child",
        on_delete=models.CASCADE,
        related_name="examination_records",
    )
    examination_type = models.ForeignKey(
        ExaminationType,
        on_delete=models.CASCADE,
        related_name="records",
    )
    date = models.DateField(verbose_name=_("Date of examination"))
    answers = models.JSONField(default=dict, verbose_name=_("Answers"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["child", "examination_type"]]
        ordering = ["examination_type__order"]
        verbose_name = _("Examination Record")
        verbose_name_plural = _("Examination Records")

    def __str__(self):
        return f"{self.child} – {self.examination_type.code} ({self.date})"
```

- [ ] **Step 4: Generate and run migration**

```bash
pipenv run python manage.py makemigrations examinations
pipenv run python manage.py migrate
```
Expected: `Applying examinations.0001_initial... OK`

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pipenv run python manage.py test examinations.tests.test_models -v 2
```
Expected: `Ran 6 tests in ...s OK`

- [ ] **Step 6: Register models in admin**

```python
# examinations/admin.py
from django.contrib import admin
from . import models

admin.site.register(models.ExaminationProgram)
admin.site.register(models.ExaminationType)
admin.site.register(models.ExaminationQuestion)
admin.site.register(models.ExaminationRecord)
```

- [ ] **Step 7: Commit**

```bash
git add examinations/ core/migrations/
git commit -m "feat: add examination models and migration"
```

---

## Task 3: Add `examination_program` FK to `Child`

**Files:**
- Modify: `core/models.py`
- Create: `core/migrations/XXXX_child_examination_program.py` (generated)

- [ ] **Step 1: Add FK to Child model**

In `core/models.py`, after the `picture` field inside `class Child` (around line 212), add:

```python
    examination_program = models.ForeignKey(
        "examinations.ExaminationProgram",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
        verbose_name=_("Examination program"),
    )
```

- [ ] **Step 2: Generate migration**

```bash
pipenv run python manage.py makemigrations core --name child_examination_program
pipenv run python manage.py migrate
```
Expected: `Applying core.XXXX_child_examination_program... OK`

- [ ] **Step 3: Verify**

```bash
pipenv run python manage.py shell -c "from core.models import Child; print(Child._meta.get_field('examination_program'))"
```
Expected: `<django.db.models.fields.related.ForeignKey: examination_program>`

- [ ] **Step 4: Commit**

```bash
git add core/models.py core/migrations/
git commit -m "feat: add examination_program FK to Child"
```

---

## Task 4: Status calculation utility

**Files:**
- Create: `examinations/status.py`
- Create: `examinations/tests/test_status.py`

- [ ] **Step 1: Write failing tests**

```python
# examinations/tests/test_status.py
import datetime
from django.test import TestCase
from examinations.status import calculate_examination_statuses
from examinations.models import ExaminationProgram, ExaminationType, ExaminationRecord
from core.models import Child


class StatusCalculationTest(TestCase):
    def setUp(self):
        self.program = ExaminationProgram.objects.create(
            country_code="de", name="Test"
        )
        self.u3 = ExaminationType.objects.create(
            program=self.program, code="U3", name="U3",
            age_min_days=21, age_max_days=56, order=3, description="",
        )
        self.u4 = ExaminationType.objects.create(
            program=self.program, code="U4", name="U4",
            age_min_days=70, age_max_days=120, order=4, description="",
        )
        self.child = Child.objects.create(
            first_name="Baby", birth_date=datetime.date(2024, 1, 1)
        )

    def _statuses(self, today):
        types = [self.u3, self.u4]
        records = list(ExaminationRecord.objects.filter(child=self.child))
        return calculate_examination_statuses(self.child, types, records, today)

    def test_upcoming(self):
        # born 2024-01-01, U3 window starts 2024-01-22 — today is before that
        today = datetime.date(2024, 1, 10)
        statuses = self._statuses(today)
        self.assertEqual(statuses[self.u3.pk]["status"], "upcoming")

    def test_due(self):
        # today is within the U3 window (day 21–56)
        today = datetime.date(2024, 1, 1) + datetime.timedelta(days=30)
        statuses = self._statuses(today)
        self.assertEqual(statuses[self.u3.pk]["status"], "due")

    def test_overdue(self):
        today = datetime.date(2024, 1, 1) + datetime.timedelta(days=60)
        statuses = self._statuses(today)
        self.assertEqual(statuses[self.u3.pk]["status"], "overdue")

    def test_completed(self):
        ExaminationRecord.objects.create(
            child=self.child,
            examination_type=self.u3,
            date=datetime.date(2024, 2, 1),
            answers={},
        )
        today = datetime.date(2024, 3, 1)
        statuses = self._statuses(today)
        self.assertEqual(statuses[self.u3.pk]["status"], "completed")
        self.assertEqual(statuses[self.u3.pk]["completed_date"], datetime.date(2024, 2, 1))
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pipenv run python manage.py test examinations.tests.test_status -v 2
```
Expected: `ImportError: cannot import name 'calculate_examination_statuses'`

- [ ] **Step 3: Write the utility**

```python
# examinations/status.py
import datetime


def calculate_examination_statuses(child, examination_types, records, today=None):
    """
    Return a dict mapping examination_type.pk → status dict.

    Status dict shape:
      {
        "status": "completed" | "due" | "overdue" | "upcoming",
        "due_from": datetime.date,
        "due_to": datetime.date,
        "completed_date": datetime.date | None,
      }
    """
    if today is None:
        today = datetime.date.today()

    completed_map = {r.examination_type_id: r.date for r in records}
    result = {}

    for exam_type in examination_types:
        due_from = child.birth_date + datetime.timedelta(days=exam_type.age_min_days)
        due_to = child.birth_date + datetime.timedelta(days=exam_type.age_max_days)

        if exam_type.pk in completed_map:
            status = "completed"
            completed_date = completed_map[exam_type.pk]
        elif today < due_from:
            status = "upcoming"
            completed_date = None
        elif today <= due_to:
            status = "due"
            completed_date = None
        else:
            status = "overdue"
            completed_date = None

        result[exam_type.pk] = {
            "status": status,
            "due_from": due_from,
            "due_to": due_to,
            "completed_date": completed_date,
        }

    return result
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pipenv run python manage.py test examinations.tests.test_status -v 2
```
Expected: `Ran 4 tests in ...s OK`

- [ ] **Step 5: Commit**

```bash
git add examinations/status.py examinations/tests/test_status.py
git commit -m "feat: add examination status calculation"
```

---

## Task 5: German seed data management command

**Files:**
- Create: `examinations/management/__init__.py`
- Create: `examinations/management/commands/__init__.py`
- Create: `examinations/management/commands/seed_examinations.py`

- [ ] **Step 1: Create management command structure**

```python
# examinations/management/__init__.py
# (empty)
```

```python
# examinations/management/commands/__init__.py
# (empty)
```

- [ ] **Step 2: Write the seed command**

```python
# examinations/management/commands/seed_examinations.py
from django.core.management.base import BaseCommand
from examinations.models import ExaminationProgram, ExaminationType, ExaminationQuestion

GERMANY_DATA = {
    "country_code": "de",
    "name": "Deutschland – Vorsorgeuntersuchungen",
    "types": [
        {
            "code": "U1",
            "name": "U1 – Erstuntersuchung",
            "age_min_days": 0,
            "age_max_days": 3,
            "order": 1,
            "description": "Unmittelbar nach der Geburt. Beurteilung der Vitalfunktionen und des Allgemeinzustandes des Neugeborenen.",
            "questions": [
                # Doctor-only clinical assessments
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Vitalzeichen", "text": "APGAR-Score nach 1 Minute", "doctor_only": True, "answer_type": "number", "order": 4},
                {"category": "Vitalzeichen", "text": "APGAR-Score nach 5 Minuten", "doctor_only": True, "answer_type": "number", "order": 5},
                {"category": "Vitalzeichen", "text": "APGAR-Score nach 10 Minuten", "doctor_only": True, "answer_type": "number", "order": 6},
                {"category": "Körperliche Untersuchung", "text": "Herz und Kreislauf unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 7},
                {"category": "Körperliche Untersuchung", "text": "Lunge und Atmung unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 8},
                {"category": "Körperliche Untersuchung", "text": "Abdomen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 9},
                {"category": "Körperliche Untersuchung", "text": "Genitale unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 10},
                {"category": "Körperliche Untersuchung", "text": "Wirbelsäule und Extremitäten unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 11},
                {"category": "Reflexe", "text": "Moro-Reflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 12},
                {"category": "Reflexe", "text": "Saugreflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 13},
                {"category": "Reflexe", "text": "Greifreflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 14},
            ],
        },
        {
            "code": "U2",
            "name": "U2 – 3.–10. Lebenstag",
            "age_min_days": 3,
            "age_max_days": 10,
            "order": 2,
            "description": "Erkennung von Erkrankungen, die einer sofortigen Behandlung bedürfen. Erweitertes Neugeborenenscreening.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Screening", "text": "Neugeborenen-Hörscreening durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Screening", "text": "Erweitertes Neugeborenenscreening (Stoffwechsel) durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Nabelschnur unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Körperliche Untersuchung", "text": "Ikterus (Gelbsucht) bewertet", "doctor_only": True, "answer_type": "boolean", "order": 7},
                {"category": "Körperliche Untersuchung", "text": "Hüftgelenke klinisch unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Wird Ihr Kind gestillt?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Trinkt Ihr Kind ausreichend?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 11},
            ],
        },
        {
            "code": "U3",
            "name": "U3 – 4.–5. Lebenswoche",
            "age_min_days": 21,
            "age_max_days": 56,
            "order": 3,
            "description": "Erste umfassende Vorsorgeuntersuchung nach der Neugeborenenphase. Beurteilung der körperlichen und geistigen Entwicklung.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Hüftsonografie unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen: Fixieren und Folgen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Herz und Kreislauf unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Lächelt Ihr Baby, wenn es angesprochen wird?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Folgt Ihr Baby mit den Augen einem Gegenstand?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Reagiert Ihr Baby auf Geräusche (Erschrecken, Innehalten)?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Schläft Ihr Baby überwiegend in Rückenlage?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 11},
            ],
        },
        {
            "code": "U4",
            "name": "U4 – 3.–4. Lebensmonat",
            "age_min_days": 70,
            "age_max_days": 120,
            "order": 4,
            "description": "Beurteilung der Haltungs- und Bewegungsentwicklung sowie der Sinneswahrnehmung.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Hüftgelenke unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen: Lichtreaktion und Pupillen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Hebt Ihr Baby in Bauchlage den Kopf an?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Lacht Ihr Baby laut?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Greift Ihr Baby nach Gegenständen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Dreht Ihr Baby den Kopf in Richtung von Geräuschen?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
            ],
        },
        {
            "code": "U5",
            "name": "U5 – 6.–7. Lebensmonat",
            "age_min_days": 155,
            "age_max_days": 210,
            "order": 5,
            "description": "Überprüfung der motorischen Entwicklung und der Sinneswahrnehmung.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Hörprüfung unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augenstellung unauffällig (kein Schielen)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Sitzt Ihr Baby mit Unterstützung?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Plappert Ihr Baby (z. B. ba-ba, da-da)?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Erkennt Ihr Baby vertraute Personen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Dreht sich Ihr Baby von der Rücken- in die Bauchlage?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
            ],
        },
        {
            "code": "U6",
            "name": "U6 – 10.–12. Lebensmonat",
            "age_min_days": 280,
            "age_max_days": 365,
            "order": 6,
            "description": "Beurteilung der Entwicklung zur Selbstständigkeit und der Sprachentwicklung.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Stand und erste Schritte bewertet", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Zieht sich Ihr Kind an Möbeln hoch?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Sagt Ihr Kind einfache Silben wie 'Mama' oder 'Papa'?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Reagiert Ihr Kind, wenn sein Name gerufen wird?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Zeigt Ihr Kind mit dem Finger auf Dinge?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
            ],
        },
        {
            "code": "U7",
            "name": "U7 – 21.–24. Lebensmonat",
            "age_min_days": 575,
            "age_max_days": 730,
            "order": 7,
            "description": "Sprachentwicklung im Mittelpunkt. Beurteilung der Motorik und sozialen Entwicklung.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Sprache", "text": "Sprachbeurteilung durch den Arzt durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Gang und Gleichgewicht unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Spricht Ihr Kind mindestens 20 Wörter?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Läuft Ihr Kind selbstständig?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Zeigt Ihr Kind Interesse an anderen Kindern?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Versteht Ihr Kind einfache Aufforderungen (z. B. 'Bring mir den Ball')?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
            ],
        },
        {
            "code": "U7a",
            "name": "U7a – 34.–36. Lebensmonat",
            "age_min_days": 1005,
            "age_max_days": 1095,
            "order": 8,
            "description": "Beurteilung von Sprache, Verhalten und sozialer Entwicklung vor dem Kindergarteneintritt.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Sprache", "text": "Sprachentwicklung bewertet (mind. 2-Wort-Sätze erwartet)", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Verhalten", "text": "Verhaltensauffälligkeiten bewertet", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Elternfragebogen", "text": "Spricht Ihr Kind in vollständigen Sätzen?", "doctor_only": False, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Kann sich Ihr Kind teilweise selbst an- und ausziehen?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Spielt Ihr Kind kooperativ mit anderen Kindern?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Ist Ihr Kind tagsüber trocken?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 9},
            ],
        },
        {
            "code": "U8",
            "name": "U8 – 46.–48. Lebensmonat",
            "age_min_days": 1370,
            "age_max_days": 1460,
            "order": 9,
            "description": "Schwerpunkt: Sehen, Hören, Sprache und Verhalten vor der Einschulung.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Sinne", "text": "Sehtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Sinne", "text": "Hörtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Motorik", "text": "Grobmotorik unauffällig (Einbeinstand, Hüpfen)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind auf einem Bein hüpfen?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Kennt Ihr Kind Farben?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind einen Stift oder Pinsel halten?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Spielt Ihr Kind mit anderen Kindern ohne größere Konflikte?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
            ],
        },
        {
            "code": "U9",
            "name": "U9 – 60.–64. Lebensmonat",
            "age_min_days": 1800,
            "age_max_days": 1950,
            "order": 10,
            "description": "Letzte Vorsorgeuntersuchung vor der Einschulung. Schulreife und Gesamtentwicklung.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Sinne", "text": "Sehtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Sinne", "text": "Hörtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Koordination", "text": "Koordinations- und Geschicklichkeitstests durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind eine Person mit mindestens 4 Körperteilen zeichnen?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Kennt Ihr Kind seinen vollständigen Namen und seine Adresse?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind bis 10 zählen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind selbstständig auf die Toilette gehen?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
            ],
        },
        {
            "code": "J1",
            "name": "J1 – 12.–14. Lebensjahr",
            "age_min_days": 4380,
            "age_max_days": 5110,
            "order": 11,
            "description": "Jugendgesundheitsuntersuchung in der Pubertät. Körperliche und psychische Entwicklung.",
            "questions": [
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "BMI berechnet", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Blutdruck gemessen", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Wirbelsäule untersucht (Skoliose)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Pubertätsstadium (Tanner) bewertet", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Jugendliche/r – Selbsteinschätzung", "text": "Ich fühle mich insgesamt gesund.", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Jugendliche/r – Selbsteinschätzung", "text": "Ich habe Probleme mit dem Schlafen.", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Jugendliche/r – Selbsteinschätzung", "text": "Ich habe Stress in der Schule oder mit Freunden.", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Bedenken bezüglich der körperlichen Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
                {"category": "Elternfragebogen", "text": "Haben Sie Bedenken bezüglich der psychischen Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 11},
            ],
        },
    ],
}


class Command(BaseCommand):
    help = "Seed examination programs and questions. Use --country de to seed Germany."

    def add_arguments(self, parser):
        parser.add_argument(
            "--country",
            default="de",
            choices=["de"],
            help="Country code to seed (default: de)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing data for this country before seeding",
        )

    def handle(self, *args, **options):
        country = options["country"]
        data = GERMANY_DATA if country == "de" else None

        if options["clear"]:
            deleted, _ = ExaminationProgram.objects.filter(
                country_code=country
            ).delete()
            self.stdout.write(f"Deleted existing program for country '{country}'")

        program, created = ExaminationProgram.objects.get_or_create(
            country_code=data["country_code"],
            defaults={"name": data["name"]},
        )
        if created:
            self.stdout.write(f"Created program: {program.name}")
        else:
            self.stdout.write(f"Program already exists: {program.name}")

        for type_data in data["types"]:
            questions = type_data.pop("questions")
            exam_type, _ = ExaminationType.objects.update_or_create(
                program=program,
                code=type_data["code"],
                defaults=type_data,
            )
            # Only seed questions if none exist yet
            if not exam_type.questions.exists():
                for q_data in questions:
                    ExaminationQuestion.objects.create(
                        examination_type=exam_type, **q_data
                    )
                self.stdout.write(f"  Seeded {len(questions)} questions for {exam_type.code}")
            else:
                self.stdout.write(f"  Questions already exist for {exam_type.code}, skipping")

        self.stdout.write(self.style.SUCCESS(f"Done seeding '{country}' examinations."))
```

- [ ] **Step 3: Run seed command**

```bash
pipenv run python manage.py seed_examinations --country de
```
Expected:
```
Created program: Deutschland – Vorsorgeuntersuchungen
  Seeded 14 questions for U1
  Seeded 11 questions for U2
  ...
Done seeding 'de' examinations.
```

- [ ] **Step 4: Verify**

```bash
pipenv run python manage.py shell -c "
from examinations.models import ExaminationType
for t in ExaminationType.objects.all():
    print(t.code, t.questions.count(), 'questions')
"
```
Expected: 11 rows printed (U1–J1) with question counts.

- [ ] **Step 5: Commit**

```bash
git add examinations/management/ examinations/tests/test_status.py examinations/status.py
git commit -m "feat: add German examination seed data and management command"
```

---

## Task 6: Django views

**Files:**
- Create: `examinations/views.py`
- Create: `examinations/urls.py`
- Create: `examinations/tests/test_views.py`
- Modify: `babybuddy/urls.py`

- [ ] **Step 1: Write failing view tests**

```python
# examinations/tests/test_views.py
import datetime
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from core.models import Child
from examinations.models import (
    ExaminationProgram, ExaminationType, ExaminationRecord
)

User = get_user_model()


class ExaminationViewsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="pass")
        self.client = Client()
        self.client.login(username="testuser", password="pass")

        self.child = Child.objects.create(
            first_name="Baby", birth_date=datetime.date(2024, 1, 1)
        )
        self.program = ExaminationProgram.objects.create(
            country_code="de", name="Deutschland – Vorsorgeuntersuchungen"
        )
        self.u3 = ExaminationType.objects.create(
            program=self.program, code="U3", name="U3 – Test",
            age_min_days=21, age_max_days=56, order=3, description="",
        )

    def test_examination_list_view(self):
        url = reverse("examinations:list", kwargs={"slug": self.child.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"ant_bootstrap", response.content)

    def test_examination_form_view(self):
        url = reverse("examinations:form", kwargs={
            "slug": self.child.slug, "code": "U3"
        })
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_examination_save_view(self):
        url = reverse("examinations:save", kwargs={
            "slug": self.child.slug, "code": "U3"
        })
        response = self.client.post(url, {
            "date": "2024-02-01",
            "answers": "{}",
            "notes": "",
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            ExaminationRecord.objects.filter(
                child=self.child, examination_type=self.u3
            ).exists()
        )

    def test_save_view_requires_date(self):
        url = reverse("examinations:save", kwargs={
            "slug": self.child.slug, "code": "U3"
        })
        response = self.client.post(url, {"answers": "{}", "notes": ""})
        self.assertEqual(response.status_code, 302)
        # Should redirect back to form, not create record
        self.assertFalse(
            ExaminationRecord.objects.filter(child=self.child).exists()
        )
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pipenv run python manage.py test examinations.tests.test_views -v 2
```
Expected: `NoReverseMatch` errors

- [ ] **Step 3: Write views**

```python
# examinations/views.py
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
    ExaminationQuestion,
    ExaminationRecord,
)
from examinations.status import calculate_examination_statuses

DEFAULT_COUNTRY = "de"


def _get_program_for_child(child):
    if child.examination_program_id:
        return child.examination_program
    return ExaminationProgram.objects.filter(
        country_code=DEFAULT_COUNTRY
    ).first()


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
    }


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

        def _fmt_date(d):
            return d.strftime("%Y-%m-%d") if d else None

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

        questions_qs = exam_type.questions.order_by("category", "order")
        categories_map = {}
        for q in questions_qs:
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

        def _fmt_date(d):
            return d.strftime("%Y-%m-%d") if d else None

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

        # Only keep answers for non-doctor-only questions
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
```

- [ ] **Step 4: Write URL patterns**

```python
# examinations/urls.py
from django.urls import path
from . import views

app_name = "examinations"

urlpatterns = [
    path(
        "children/<str:slug>/examinations/",
        views.ExaminationListView.as_view(),
        name="list",
    ),
    path(
        "children/<str:slug>/examinations/<str:code>/",
        views.ExaminationFormView.as_view(),
        name="form",
    ),
    path(
        "children/<str:slug>/examinations/<str:code>/save/",
        views.ExaminationSaveView.as_view(),
        name="save",
    ),
]
```

- [ ] **Step 5: Register URLs in `babybuddy/urls.py`**

Add after the `reports` include (around line 77):
```python
    path("", include("examinations.urls", namespace="examinations")),
```

- [ ] **Step 6: Run view tests**

```bash
pipenv run python manage.py test examinations.tests.test_views -v 2
```
Expected: `Ran 4 tests in ...s OK`

- [ ] **Step 7: Commit**

```bash
git add examinations/views.py examinations/urls.py examinations/tests/test_views.py babybuddy/urls.py
git commit -m "feat: add examination views and URL patterns"
```

---

## Task 7: Dashboard card

**Files:**
- Modify: `babybuddy/models.py`
- Modify: `dashboard/views.py`
- Modify: `frontend/src/lib/app-utils.jsx`
- Modify: `frontend/src/pages/DashboardPages.jsx`

- [ ] **Step 1: Add card choice to `babybuddy/models.py`**

In `babybuddy/models.py`, at the end of `DASHBOARD_ITEM_CHOICES` list (before the closing `]`):
```python
        ("card.examinations.next", _("Examinations - Next U-Exam")),
```

Also add `"examinations"` to `DASHBOARD_SECTION_CHOICES`:
```python
        ("examinations", _("Examinations")),
```

- [ ] **Step 2: Add card data builder to `dashboard/views.py`**

Add this import at the top of `dashboard/views.py` (with other imports):
```python
import datetime
from examinations.models import ExaminationProgram, ExaminationType, ExaminationRecord
from examinations.status import calculate_examination_statuses
```

Add this helper function after `_format_full_date`:
```python
def _build_next_exam_card(child):
    """Return data for the 'next U-exam' dashboard card or None if no program."""
    from core.views import _nav_urls as _core_nav_urls
    try:
        from examinations.views import _get_program_for_child
    except ImportError:
        return None

    program = _get_program_for_child(child)
    if not program:
        return None

    exam_types = list(
        ExaminationType.objects.filter(program=program).order_by("order")
    )
    records = list(ExaminationRecord.objects.filter(child=child))
    statuses = calculate_examination_statuses(child, exam_types, records)

    # Find the next incomplete exam (due or upcoming), prioritising due/overdue
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
```

Find where the dashboard card data is assembled in `dashboard/views.py` (look for `SECTION_CARD_MAP` or the section that builds per-card data). Add the next-exam card:

In the `SECTION_CARD_MAP` dict, add under the `"babybuddy"` key (or wherever general cards are listed):
```python
"card.examinations.next": lambda child: _build_next_exam_card(child),
```

- [ ] **Step 3: Add title to `frontend/src/lib/app-utils.jsx`**

Find `DASHBOARD_CARD_TITLES` in `frontend/src/lib/app-utils.jsx` and add:
```js
  "card.examinations.next": "Next U-Exam",
```

- [ ] **Step 4: Add card renderer to `DashboardPages.jsx`**

In `frontend/src/pages/DashboardPages.jsx`, find where dashboard cards are rendered by key (look for `card.sleep.last` or similar render cases). Add a case for the next-exam card:

```jsx
// In the card renderer function, add:
if (cardKey === "card.examinations.next") {
  const data = cardData;
  if (!data) return null;
  if (data.allCompleted) {
    return (
      <Card size="small" style={{ borderColor: "#52c41a" }}>
        <Typography.Text type="success">
          {strings.examCompleted || "All examinations completed"}
        </Typography.Text>
      </Card>
    );
  }
  const statusColor =
    data.status === "due" ? "#4db6ff"
    : data.status === "overdue" ? "#ff4d4f"
    : "#888";
  return (
    <Card
      size="small"
      title={strings.examinations || "Examinations"}
      extra={
        <a href={data.url} style={{ color: "#4db6ff", fontSize: 13 }}>
          {strings.viewEdit || "View"}
        </a>
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Tag color={statusColor}>{strings["exam" + data.status.charAt(0).toUpperCase() + data.status.slice(1)] || data.status}</Tag>
        <Typography.Text strong>{data.code}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {data.name}
        </Typography.Text>
      </div>
      {data.status === "upcoming" && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
          {`${strings.examDue || "Due"}: ${data.due_from}`}
        </Typography.Text>
      )}
    </Card>
  );
}
```

- [ ] **Step 5: Build frontend and verify**

```bash
cd /opt/projects/babybuddy/frontend && npm run build
```
Expected: Build completes without errors.

- [ ] **Step 6: Commit**

```bash
git add babybuddy/models.py dashboard/views.py frontend/src/lib/app-utils.jsx frontend/src/pages/DashboardPages.jsx frontend/src/
git commit -m "feat: add next U-exam dashboard card"
```

---

## Task 8: React ExaminationPages.jsx

**Files:**
- Create: `frontend/src/pages/ExaminationPages.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create the page file**

```jsx
// frontend/src/pages/ExaminationPages.jsx
import React, { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLOR = {
  completed: "#52c41a",
  due: "#4db6ff",
  overdue: "#ff4d4f",
  upcoming: "#888888",
};

const STATUS_ICON = {
  completed: <CheckCircleOutlined style={{ color: STATUS_COLOR.completed }} />,
  due: <ClockCircleOutlined style={{ color: STATUS_COLOR.due }} />,
  overdue: <ExclamationCircleOutlined style={{ color: STATUS_COLOR.overdue }} />,
  upcoming: <ClockCircleOutlined style={{ color: STATUS_COLOR.upcoming }} />,
};

// ─── ExaminationListPage ──────────────────────────────────────────────────────

export function ExaminationListPage({ bootstrap }) {
  const { examinations = [], strings = {}, childDetail = {} } = bootstrap;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 12px 80px" }}>
      <Title level={3} style={{ marginBottom: 4 }}>
        {strings.examinations || "Examinations"}
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 20 }}>
        {childDetail.name}
      </Text>

      <Timeline
        items={examinations.map((exam) => ({
          color: STATUS_COLOR[exam.status] || "#888",
          dot: STATUS_ICON[exam.status],
          children: (
            <ExaminationRow exam={exam} strings={strings} key={exam.code} />
          ),
        }))}
      />
    </div>
  );
}

function ExaminationRow({ exam, strings }) {
  const statusLabel = {
    completed: strings.examCompleted || "Completed",
    due: strings.examDue || "Due",
    overdue: strings.examOverdue || "Overdue",
    upcoming: strings.examUpcoming || "Upcoming",
  }[exam.status] || exam.status;

  const actionLabel =
    exam.status === "completed"
      ? strings.viewEdit || "View / Edit"
      : exam.status === "upcoming"
      ? strings.examUpcoming || "Upcoming"
      : strings.fillIn || "Fill in";

  const isDisabled = exam.status === "upcoming";

  return (
    <Card
      size="small"
      style={{ marginBottom: 4, borderColor: STATUS_COLOR[exam.status] + "55" }}
    >
      <Row align="middle" gutter={8} wrap={false}>
        <Col flex="auto">
          <Space direction="vertical" size={2}>
            <Space size={6}>
              <Text strong>{exam.code}</Text>
              <Tag color={STATUS_COLOR[exam.status]} style={{ margin: 0, fontSize: 11 }}>
                {statusLabel}
              </Tag>
            </Space>
            <Text style={{ fontSize: 13 }}>{exam.name}</Text>
            {exam.completed_date ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {exam.completed_date}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {exam.due_from} – {exam.due_to}
              </Text>
            )}
          </Space>
        </Col>
        <Col>
          <Button
            size="small"
            type={exam.status === "due" || exam.status === "overdue" ? "primary" : "default"}
            disabled={isDisabled}
            href={isDisabled ? undefined : exam.url}
          >
            {actionLabel}
          </Button>
        </Col>
      </Row>
    </Card>
  );
}

// ─── ExaminationFormPage ──────────────────────────────────────────────────────

export function ExaminationFormPage({ bootstrap }) {
  const {
    examinationType = {},
    categories = [],
    record = null,
    strings = {},
    urls = {},
    csrfToken = "",
  } = bootstrap;

  const [date, setDate] = useState(
    record?.date ? dayjs(record.date, "YYYY-MM-DD", true) : null
  );
  const [answers, setAnswers] = useState(() => {
    const initial = {};
    categories.forEach((cat) =>
      cat.questions.forEach((q) => {
        if (!q.doctor_only && q.value != null) {
          initial[String(q.id)] = q.value;
        }
      })
    );
    return initial;
  });
  const [notes, setNotes] = useState(record?.notes || "");

  function setAnswer(id, value) {
    setAnswers((prev) => ({ ...prev, [String(id)]: value }));
  }

  const statusColor = STATUS_COLOR[examinationType.status] || "#888";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 12px 80px" }}>
      {/* Header */}
      <Space direction="vertical" size={4} style={{ marginBottom: 20, width: "100%" }}>
        <Space>
          <Tag color={statusColor} style={{ fontSize: 13 }}>
            {examinationType.code}
          </Tag>
          <Title level={4} style={{ margin: 0 }}>
            {examinationType.name}
          </Title>
        </Space>
        {examinationType.description && (
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            {examinationType.description}
          </Paragraph>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {strings.ageWindow || "Age window"}: {examinationType.due_from} – {examinationType.due_to}
        </Text>
      </Space>

      {/* Form */}
      <form method="POST" action={urls.saveUrl}>
        <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
        <input type="hidden" name="answers" value={JSON.stringify(answers)} />

        {/* Date */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Text strong>{strings.dateOfExamination || "Date of examination"} *</Text>
            <DatePicker
              value={date}
              onChange={setDate}
              format="YYYY-MM-DD"
              style={{ width: "100%" }}
            />
            {date && (
              <input type="hidden" name="date" value={date.format("YYYY-MM-DD")} />
            )}
          </Space>
        </Card>

        {/* Question categories */}
        {categories.map((cat) => (
          <Card
            key={cat.name}
            size="small"
            title={cat.name}
            style={{ marginBottom: 12 }}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {cat.questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  value={answers[String(q.id)]}
                  onChange={(v) => setAnswer(q.id, v)}
                  strings={strings}
                />
              ))}
            </Space>
          </Card>
        ))}

        {/* Notes */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Text strong>{strings.notes || "Notes"}</Text>
            <Input.TextArea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={strings.optional || "Optional"}
            />
          </Space>
        </Card>

        <Button type="primary" htmlType="submit" block size="large">
          {strings.saveExamination || "Save examination"}
        </Button>
      </form>

      <div style={{ marginTop: 12 }}>
        <Button type="link" href={urls.listUrl} style={{ padding: 0 }}>
          ← {strings.examinations || "Back to examinations"}
        </Button>
      </div>
    </div>
  );
}

function QuestionRow({ question, value, onChange, strings }) {
  if (question.doctor_only) {
    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          padding: "8px 10px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <MedicineBoxOutlined style={{ color: "#888", marginTop: 2, flexShrink: 0 }} />
        <div>
          <Text style={{ fontSize: 13, color: "#aaa" }}>{question.text}</Text>
          <Text
            type="secondary"
            style={{ display: "block", fontSize: 11, marginTop: 2 }}
          >
            {strings.doctorOnly || "Assessed by your doctor"}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Text style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
        {question.text}
      </Text>
      <QuestionInput
        question={question}
        value={value}
        onChange={onChange}
        strings={strings}
      />
    </div>
  );
}

function QuestionInput({ question, value, onChange, strings }) {
  if (question.answer_type === "boolean") {
    return (
      <Radio.Group
        value={value}
        onChange={(e) => onChange(e.target.value)}
        buttonStyle="solid"
        size="small"
      >
        <Radio.Button value={true}>{strings.yes || "Yes"}</Radio.Button>
        <Radio.Button value={false}>{strings.no || "No"}</Radio.Button>
      </Radio.Group>
    );
  }
  if (question.answer_type === "number") {
    return (
      <InputNumber
        value={value}
        onChange={onChange}
        style={{ width: 140 }}
        size="small"
      />
    );
  }
  if (question.answer_type === "choice" && question.choices) {
    return (
      <Select
        value={value}
        onChange={onChange}
        style={{ width: "100%", maxWidth: 300 }}
        size="small"
        options={question.choices.map((c) => ({ label: c, value: c }))}
      />
    );
  }
  // text
  return (
    <Input.TextArea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      size="small"
    />
  );
}
```

- [ ] **Step 2: Add lazy imports and routes in `App.jsx`**

Add these two lazy imports after the `QuickEntryPage` lazy import (around line 93):
```jsx
const ExaminationListPage = lazy(() =>
  import("./pages/ExaminationPages").then((module) => ({
    default: module.ExaminationListPage,
  })),
);
const ExaminationFormPage = lazy(() =>
  import("./pages/ExaminationPages").then((module) => ({
    default: module.ExaminationFormPage,
  })),
);
```

In the `RoutedPage` function, add these two conditions before the final `return <ChildDashboardPage ...>`:
```jsx
  if (bootstrap.pageType === "examination-list") {
    return <ExaminationListPage bootstrap={bootstrap} />;
  }
  if (bootstrap.pageType === "examination-form") {
    return <ExaminationFormPage bootstrap={bootstrap} />;
  }
```

- [ ] **Step 3: Build frontend**

```bash
cd /opt/projects/babybuddy/frontend && npm run build
```
Expected: Build completes without errors.

- [ ] **Step 4: Run all examination tests**

```bash
cd /opt/projects/babybuddy
pipenv run python manage.py test examinations -v 2
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ExaminationPages.jsx frontend/src/App.jsx frontend/src/
git commit -m "feat: add React examination list and form pages"
```

---

## Task 9: Insights integration

**Files:**
- Modify: `dashboard/views.py` (Insights summary view)

- [ ] **Step 1: Find the Insights summary view**

In `dashboard/views.py`, find `InsightsSummaryView` or the function that builds insights data returned to the React Insights page.

- [ ] **Step 2: Add U-exam insight card**

In the function that assembles insight cards/rules, add the following after the existing insight logic:

```python
# In InsightsSummaryView or the insights builder function, add:
from examinations.models import ExaminationProgram, ExaminationType, ExaminationRecord
from examinations.status import calculate_examination_statuses
from examinations.views import _get_program_for_child

def _build_exam_insight(child):
    """Return an insight dict if a U-exam is due within 14 days, or None."""
    program = _get_program_for_child(child)
    if not program:
        return None

    exam_types = list(
        ExaminationType.objects.filter(program=program).order_by("order")
    )
    records = list(ExaminationRecord.objects.filter(child=child))
    statuses = calculate_examination_statuses(child, exam_types, records)
    today = datetime.date.today()

    for et in exam_types:
        st = statuses.get(et.pk, {})
        status = st.get("status")
        if status == "overdue":
            return {
                "type": "exam_due",
                "priority": "high",
                "title": f"{et.code} {_('is overdue')}",
                "body": f"{et.name} · {st['due_from']} – {st['due_to']}",
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
                "body": f"{et.name} · {st['due_from']} – {st['due_to']}",
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
                    "body": f"{et.name} · {_('window opens')} {st['due_from']}",
                    "url": reverse(
                        "examinations:list",
                        kwargs={"slug": child.slug},
                    ),
                }
    return None
```

Then call `_build_exam_insight(child)` in the insights data assembly and include its result in the insights list if not None.

- [ ] **Step 3: Add a link to examinations from child detail page**

In `core/views.py`, find `_build_ant_child_detail_bootstrap` and add to the `urls` dict:
```python
"examinations": reverse("examinations:list", kwargs={"slug": child.slug}),
```

And add to `strings`:
```python
"examinations": _("Examinations"),
```

In `frontend/src/pages/GeneralPages.jsx` (or wherever `ChildDetailPage` renders), find where child action links are shown and add a link to examinations:
```jsx
{bootstrap.urls.examinations && (
  <Button href={bootstrap.urls.examinations} type="default" size="small">
    {bootstrap.strings.examinations || "Examinations"}
  </Button>
)}
```

- [ ] **Step 4: Build and test**

```bash
cd /opt/projects/babybuddy/frontend && npm run build
pipenv run python manage.py test examinations -v 2
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/views.py core/views.py frontend/src/pages/GeneralPages.jsx frontend/src/
git commit -m "feat: add examination insight card and child detail link"
```

---

## Task 10: German translations

**Files:**
- Modify: `locale/de/LC_MESSAGES/django.po`

- [ ] **Step 1: Add translation entries**

In `locale/de/LC_MESSAGES/django.po`, add the following entries (append before the final empty line):

```po
msgid "Examination Program"
msgstr "Untersuchungsprogramm"

msgid "Examination Programs"
msgstr "Untersuchungsprogramme"

msgid "Examination Type"
msgstr "Untersuchungstyp"

msgid "Examination Types"
msgstr "Untersuchungstypen"

msgid "Examination Question"
msgstr "Untersuchungsfrage"

msgid "Examination Questions"
msgstr "Untersuchungsfragen"

msgid "Examination Record"
msgstr "Untersuchungsprotokoll"

msgid "Examination Records"
msgstr "Untersuchungsprotokolle"

msgid "Country code"
msgstr "Ländercode"

msgid "Minimum age (days)"
msgstr "Mindestalter (Tage)"

msgid "Maximum age (days)"
msgstr "Höchstalter (Tage)"

msgid "Doctor only"
msgstr "Nur für Arzt"

msgid "Answer type"
msgstr "Antworttyp"

msgid "Date of examination"
msgstr "Datum der Untersuchung"

msgid "Examinations"
msgstr "Vorsorgeuntersuchungen"

msgid "Assessed by your doctor"
msgstr "Vom Arzt bewertet"

msgid "Fill in"
msgstr "Ausfüllen"

msgid "View / Edit"
msgstr "Ansehen / Bearbeiten"

msgid "Due"
msgstr "Fällig"

msgid "Overdue"
msgstr "Überfällig"

msgid "Upcoming"
msgstr "Bevorstehend"

msgid "Completed"
msgstr "Abgeschlossen"

msgid "Age window"
msgstr "Altersfenster"

msgid "Save examination"
msgstr "Untersuchung speichern"

msgid "Examination saved."
msgstr "Untersuchung gespeichert."

msgid "Please enter the date of the examination."
msgstr "Bitte geben Sie das Datum der Untersuchung ein."

msgid "Invalid date format."
msgstr "Ungültiges Datumsformat."

msgid "Next U-Exam"
msgstr "Nächste Vorsorge"

msgid "Examinations - Next U-Exam"
msgstr "Vorsorge - Nächste Untersuchung"

msgid "All examinations completed"
msgstr "Alle Vorsorgeuntersuchungen abgeschlossen"

msgid "is overdue"
msgstr "ist überfällig"

msgid "is due"
msgstr "ist fällig"

msgid "days left"
msgstr "Tage verbleibend"

msgid "in"
msgstr "in"

msgid "days"
msgstr "Tagen"

msgid "window opens"
msgstr "Fenster öffnet sich am"

msgid "Examination program"
msgstr "Untersuchungsprogramm"

msgid "Yes / No"
msgstr "Ja / Nein"
```

- [ ] **Step 2: Compile messages**

```bash
pipenv run python manage.py compilemessages
```
Expected: `.mo` file compiled without errors.

- [ ] **Step 3: Commit**

```bash
git add locale/
git commit -m "feat: add German translations for examinations"
```

---

## Task 11: Seed on first run + final integration test

**Files:**
- Modify: `babybuddy/apps.py` (or use a migration data migration)

- [ ] **Step 1: Create a data migration to auto-seed Germany on first deploy**

```bash
pipenv run python manage.py makemigrations examinations --empty --name seed_german_examinations
```

Edit the generated file (e.g. `examinations/migrations/0002_seed_german_examinations.py`):

```python
from django.db import migrations


def seed_germany(apps, schema_editor):
    from django.core.management import call_command
    call_command("seed_examinations", "--country", "de", verbosity=0)


def unseed_germany(apps, schema_editor):
    ExaminationProgram = apps.get_model("examinations", "ExaminationProgram")
    ExaminationProgram.objects.filter(country_code="de").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("examinations", "0001_initial"),
    ]
    operations = [
        migrations.RunPython(seed_germany, reverse_code=unseed_germany),
    ]
```

- [ ] **Step 2: Apply migration**

```bash
pipenv run python manage.py migrate examinations
```
Expected: German program seeded automatically.

- [ ] **Step 3: Run full test suite**

```bash
pipenv run python manage.py test examinations -v 2
```
Expected: All tests pass.

- [ ] **Step 4: Manual smoke test**

```bash
pipenv run python manage.py runserver 0.0.0.0:8000
```
- Navigate to `/children/<slug>/examinations/` — list of U1–J1 appears
- Click "Fill in" on a due exam — form renders with doctor-only and parent questions
- Fill in date and a few answers — save redirects to list with "Examination saved." message

- [ ] **Step 5: Final commit**

```bash
git add examinations/migrations/
git commit -m "feat: auto-seed German examination data via migration"
```

---

## Self-Review Checklist

- [x] Spec section "Data Model" → covered by Tasks 2, 3
- [x] Spec section "Status Calculation" → covered by Task 4
- [x] Spec section "URL Structure" → covered by Task 6
- [x] Spec section "Django Views" → covered by Task 6
- [x] Spec section "React UI - ExaminationListPage" → covered by Task 8
- [x] Spec section "React UI - ExaminationFormPage" → covered by Task 8
- [x] Spec section "Dashboard Integration" → covered by Task 7
- [x] Spec section "Insights integration" → covered by Task 9
- [x] Spec section "Seeded Data" → covered by Tasks 5, 11
- [x] Spec section "i18n" → covered by Task 10
- [x] Child detail link to examinations → covered by Task 9
- [x] `_get_program_for_child` defined in `examinations/views.py` and imported in `dashboard/views.py` Task 7
- [x] `calculate_examination_statuses` signature consistent across Tasks 4, 6, 7, 9
- [x] `ExaminationRecord.answers` is JSON keyed by string question IDs — consistently handled in views and React
