import json
from django.contrib.auth import get_user_model
from django.test import TestCase, Client as HttpClient
from django.utils import timezone
from faker import Faker
from core import models


class QuickLogViewTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from django.core.management import call_command

        call_command("migrate", verbosity=0)
        fake = Faker()
        fake_profile = fake.simple_profile()
        cls.credentials = {
            "username": fake_profile["username"],
            "password": fake.password(),
        }
        cls.user = get_user_model().objects.create_user(
            is_superuser=True, **cls.credentials
        )
        cls.child = models.Child.objects.create(
            first_name="Test",
            last_name="Child",
            birth_date=timezone.localdate() - timezone.timedelta(days=90),
        )
        cls.c = HttpClient(enforce_csrf_checks=False)
        cls.c.login(**cls.credentials)

    def _post(self, entry_type, data):
        return self.c.post(
            f"/api/quick-log/{entry_type}/",
            data=json.dumps(data),
            content_type="application/json",
        )

    def test_diaper_quick_log_creates_record(self):
        count_before = models.DiaperChange.objects.count()
        response = self._post(
            "diaper", {"child": self.child.id, "wet": True, "solid": False}
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data["status"], "ok")
        self.assertIn("entry_id", data)
        self.assertEqual(models.DiaperChange.objects.count(), count_before + 1)

    def test_feeding_quick_log_updates_last_used_defaults(self):
        response = self._post(
            "feeding",
            {
                "child": self.child.id,
                "type": "breast milk",
                "method": "bottle",
                "start": timezone.now().isoformat(),
                "end": (timezone.now() + timezone.timedelta(minutes=10)).isoformat(),
            },
        )
        self.assertEqual(response.status_code, 200)
        self.user.settings.refresh_from_db()
        key = f"{self.child.id}.feeding"
        self.assertIn(key, self.user.settings.last_used_defaults)
        self.assertEqual(self.user.settings.last_used_defaults[key]["method"], "bottle")

    def test_sleep_timer_creates_timer(self):
        count_before = models.Timer.objects.count()
        response = self._post("sleep", {"child": self.child.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Timer.objects.count(), count_before + 1)
        timer = models.Timer.objects.filter(
            child=self.child, name="Sleep", active=True
        ).first()
        self.assertIsNotNone(timer)
        # Clean up to avoid conflict with test_sleep_timer_conflict_returns_409
        models.Timer.objects.filter(
            child=self.child, name="Sleep", active=True
        ).delete()

    def test_sleep_timer_conflict_returns_409(self):
        # Create existing active sleep timer
        models.Timer.objects.create(
            child=self.child, user=self.user, name="Sleep", start=timezone.now()
        )
        response = self._post("sleep", {"child": self.child.id})
        self.assertEqual(response.status_code, 409)
        data = json.loads(response.content)
        self.assertEqual(data["status"], "error")

    def test_unknown_type_returns_404(self):
        response = self._post("unicorn", {"child": self.child.id})
        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_returns_302(self):
        anon = HttpClient()
        response = anon.post(
            "/api/quick-log/diaper/",
            content_type="application/json",
            data=json.dumps({}),
        )
        self.assertEqual(response.status_code, 302)

    def test_timer_quick_log_creates_timer(self):
        count_before = models.Timer.objects.count()
        response = self._post("timer", {"child": self.child.id, "name": "Custom"})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data["status"], "ok")
        self.assertEqual(models.Timer.objects.count(), count_before + 1)

    def test_pumping_quick_log_creates_record(self):
        count_before = models.Pumping.objects.count()
        response = self._post("pumping", {"child": self.child.id, "amount": 60})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data["status"], "ok")
        self.assertIn("entry_id", data)
        self.assertEqual(models.Pumping.objects.count(), count_before + 1)
