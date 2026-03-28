import datetime
from django.db import IntegrityError
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
        with self.assertRaises(IntegrityError):
            ExaminationRecord.objects.create(
                child=self.child,
                examination_type=self.exam_type,
                date=datetime.date(2024, 2, 5),
                answers={},
            )
