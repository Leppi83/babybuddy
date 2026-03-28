# U-Examinations (Vorsorgeuntersuchungen) — Design Spec

**Created:** 2026-03-28
**Status:** Awaiting implementation plan

---

## Overview

Add structured pediatric examination tracking to BabyBuddy, starting with the German U1–U9 + J1 schedule (Gelbes Heft). Parents can view the full official questionnaire per exam, fill in the parent-facing questions, and track completion status across the child's timeline. The system is designed from the start to support other countries' examination programs.

---

## Data Model

### New Django app: `examinations`

**`ExaminationProgram`**
```
country_code  CharField(10)        e.g. "de", "at", "ch"
name          CharField(200)       e.g. "Deutschland – Vorsorgeuntersuchungen"
```

**`ExaminationType`** (FK → ExaminationProgram)
```
code          CharField(10)        "U1", "U2", … "U9", "J1"
name          CharField(200)       "U1 – Erstuntersuchung"
age_min_days  IntegerField         earliest day of the recommended window
age_max_days  IntegerField         latest day of the recommended window
order         IntegerField         display order in timeline
description   TextField            brief summary of what this exam covers
```

Age windows (Germany):
| Code | Name | Window |
|------|------|--------|
| U1 | Erstuntersuchung | 0–3 days |
| U2 | 3–10 days | 3–10 days |
| U3 | 4–5 weeks | 21–56 days |
| U4 | 3–4 months | 70–120 days |
| U5 | 6–7 months | 155–210 days |
| U6 | 10–12 months | 280–365 days |
| U7 | 21–24 months | 575–730 days |
| U7a | 34–36 months | 1005–1095 days |
| U8 | 46–48 months | 1370–1460 days |
| U9 | 60–64 months | 1800–1950 days |
| J1 | 12–14 years | 4380–5110 days |

**`ExaminationQuestion`** (FK → ExaminationType)
```
category      CharField(100)       e.g. "Körpermaße", "Motorik", "Sozialverhalten"
text          TextField            the actual question text
doctor_only   BooleanField         if True: shown as read-only reference, no input
answer_type   CharField(20)        "boolean" | "text" | "number" | "choice"
choices       JSONField(null=True) list of strings, only for "choice" type
order         IntegerField         display order within category
```

**`ExaminationRecord`** (FK → Child, FK → ExaminationType)
```
date          DateField            actual examination date entered by parent
answers       JSONField            {question_id: value} — parent answers only
notes         TextField(blank)     optional free-text observations
created_at    DateTimeField(auto)
updated_at    DateTimeField(auto)

unique_together: [child, examination_type]
```

### Child model change
Add nullable FK to `ExaminationProgram` on the `Child` model:
```python
examination_program = models.ForeignKey(
    "examinations.ExaminationProgram",
    null=True, blank=True,
    on_delete=models.SET_NULL,
    related_name="children",
)
```
Defaults to Germany's program if null (resolved at runtime, not stored as default).

---

## Status Calculation

For each `ExaminationType`, given a child's `birth_date`:

```
due_from = birth_date + age_min_days
due_to   = birth_date + age_max_days

status:
  "completed" → ExaminationRecord exists for this child + type
  "due"       → today is within [due_from, due_to] and no record
  "overdue"   → today > due_to and no record
  "upcoming"  → today < due_from and no record
```

The status and dates are computed in Python (not stored), passed in the bootstrap.

---

## URL Structure

```
/children/<slug>/examinations/               → list of all exams with status
/children/<slug>/examinations/<code>/        → questionnaire form (create or edit)
/children/<slug>/examinations/<code>/save/   → POST endpoint, saves record, redirects to list
```

Both are Django views that return the `ant_app.html` bootstrap shell.

---

## Django Views

### `ExaminationListView`
- Resolves the child's program (FK or default Germany)
- Computes status for each `ExaminationType`
- Bootstrap:
```python
{
  "pageType": "examination-list",
  "childDetail": { "name": ..., "slug": ... },
  "examinations": [
    {
      "code": "U3",
      "name": "U3 – 4.–5. Lebenswoche",
      "description": "...",
      "due_from": "2024-03-01",
      "due_to": "2024-03-15",
      "status": "due",           # completed | due | overdue | upcoming
      "completed_date": null,    # ISO date string if completed
      "url": "/children/baby/examinations/U3/",
    },
    ...
  ],
  "urls": { ...nav_urls(), "addChild": ... },
  "strings": { ...base_strings() },
}
```

### `ExaminationFormView`
- Fetches all questions for the type, grouped by category
- Loads existing `ExaminationRecord` if it exists (edit mode)
- Bootstrap:
```python
{
  "pageType": "examination-form",
  "examinationType": { "code": "U3", "name": "...", "description": "...", "status": "due", "due_from": "...", "due_to": "..." },
  "categories": [
    {
      "name": "Körpermaße",
      "questions": [
        {
          "id": 42,
          "text": "Körperlänge (cm)",
          "doctor_only": true,
          "answer_type": "number",
          "choices": null,
          "value": null   # existing answer or null
        },
        ...
      ]
    }
  ],
  "record": { "date": "2024-03-05", "notes": "..." } | null,
  "urls": { ...nav_urls(), "saveUrl": "/children/baby/examinations/U3/save/" },
  "strings": { ...base_strings(), "doctorOnly": "Assessed by your doctor", ... },
}
```

### `ExaminationSaveView` (POST only)
- Validates date is set
- Creates or updates `ExaminationRecord`
- Saves only answers for non-doctor-only questions
- Redirects to examination list with success message

---

## React UI

### `ExaminationListPage` (`pageType: "examination-list"`)

Renders a vertical timeline of all U-exams:
- Each row: status icon + code + name + age window + status badge + action button
- Status badge colours:
  - `completed` → green (section accent)
  - `due` → primary blue (attention)
  - `overdue` → red warning
  - `upcoming` → muted grey
- Action button: "Fill in" (due/overdue), "View / Edit" (completed), "Upcoming" disabled (upcoming)
- Linked from child detail page via a new "Examinations" nav item

### `ExaminationFormPage` (`pageType: "examination-form"`)

Structure:
1. Header: exam name + description + due window
2. Date picker: "Date of examination" (required)
3. Questions grouped by category accordion/sections:
   - **Doctor-only questions**: shown in a muted box with stethoscope icon + label "Assessed by your doctor" — no input rendered, just the question text for reference
   - **Parent questions**: rendered by `answer_type`:
     - `boolean` → Ant `<Switch>` or `<Radio>` Yes/No
     - `text` → Ant `<Input.TextArea>`
     - `number` → Ant `<InputNumber>`
     - `choice` → Ant `<Select>` or `<Radio.Group>`
4. Notes field (free text, optional)
5. Save button → POST to `saveUrl`

---

## Dashboard Integration

### New dashboard card: `card.examinations.next`
Added to `DASHBOARD_ITEM_CHOICES` and `SECTION_CARD_MAP` under the existing `babybuddy` section (general overview cards).

Shows:
- Next upcoming or due exam code + name
- Days until window opens (if upcoming) or days remaining in window (if due)
- "Overdue" warning if past window
- Taps through to examination list

### Insights integration
If the next due/overdue exam window starts within 14 days or is currently open:
- Show a card in Insights: "U3 is due in 5 days · 4th–5th week"
- Taps to examination form

---

## Notification Integration (Feature 2)

When Feature 2 (push notifications) is implemented, wire two triggers:
- **Window opens**: send push when `today == due_from` for any incomplete exam
- **Reminder**: send push 7 days before `due_to` if still incomplete

---

## Seeded Data

Questions are seeded via a management command or fixture: `python manage.py seed_examinations --country de`.

The seed file (`examinations/fixtures/de_questions.json`) contains the real official German Vorsorgeheft questions per exam type, in German. Parent-facing questions are derived from the "Elternfragebogen" sections of the official forms. Doctor-only questions cover clinical assessments (reflexes, organ palpation, auscultation, anthropometry done by the doctor) and are shown as reference text only.

---

## i18n

- All question text seeded in German (primary language for this feature)
- UI strings passed via `bootstrap.strings`: `doctorOnly`, `fillIn`, `viewEdit`, `examDue`, `examOverdue`, `examUpcoming`, `examCompleted`, `dateOfExamination`, `notes`
- German `.po` entries added for all new string keys
- Multi-country support: each country's seed file contains questions in the appropriate language; `ExaminationProgram.name` is already a translatable label

---

## Out of Scope (this spec)

- PDF export of completed examinations (planned as Feature G)
- Full child timeline view (planned separately)
- Admin UI for editing questions without code changes
- Vaccination tracking (part of Health Journal, Feature B)
