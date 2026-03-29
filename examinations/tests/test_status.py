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
        # born 2024-01-01, U3 window starts day 21 = 2024-01-22 — today is before that
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
