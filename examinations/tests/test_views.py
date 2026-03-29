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
