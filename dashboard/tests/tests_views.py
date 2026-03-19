# -*- coding: utf-8 -*-
from django.test import TestCase
from django.test import Client as HttpClient
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone

from faker import Faker

from core.models import Child, DiaperChange, Feeding, Pumping, Sleep


class ViewsTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        super(ViewsTestCase, cls).setUpClass()
        fake = Faker()
        call_command("migrate", verbosity=0)

        cls.c = HttpClient()

        fake_user = fake.simple_profile()
        cls.credentials = {
            "username": fake_user["username"],
            "password": fake.password(),
        }
        cls.user = get_user_model().objects.create_user(
            is_superuser=True, **cls.credentials
        )

        cls.c.login(**cls.credentials)

    def test_dashboard_views(self):
        page = self.c.get("/dashboard/")
        self.assertEqual(page.url, "/welcome/")

        call_command("fake", verbosity=0, children=1, days=1)
        child = Child.objects.first()
        page = self.c.get("/dashboard/")
        self.assertEqual(page.url, "/children/{}/dashboard/".format(child.slug))

        page = self.c.get("/dashboard/")
        self.assertEqual(page.url, "/children/{}/dashboard/".format(child.slug))
        # Test the actual child dashboard (including cards).
        # TODO: Test cards more granularly.
        page = self.c.get("/children/{}/dashboard/".format(child.slug))
        self.assertEqual(page.status_code, 200)

        Child.objects.create(
            first_name="Second", last_name="Child", birth_date="2000-01-01"
        )
        page = self.c.get("/dashboard/")
        self.assertEqual(page.status_code, 200)

    def test_dashboard_diaper_quick_entry(self):
        call_command("fake", verbosity=0, children=1, days=1)
        child = Child.objects.first()

        response = self.c.post(
            f"/children/{child.slug}/dashboard/",
            data={
                "diaper_quick_entry_action": "create",
                "diaper_entry_date": "2025-03-06",
                "diaper_entry_time": "08:15",
                "diaper_entry_consistency": "solid",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        change = DiaperChange.objects.order_by("-id").first()
        self.assertIsNotNone(change)
        self.assertEqual(change.child, child)
        self.assertFalse(change.wet)
        self.assertTrue(change.solid)
        self.assertEqual(
            timezone.localtime(change.time).strftime("%Y-%m-%d %H:%M"),
            "2025-03-06 08:15",
        )

    def test_dashboard_sleep_timer_start_stop(self):
        call_command("fake", verbosity=0, children=1, days=1)
        child = Child.objects.first()

        start_response = self.c.post(
            f"/children/{child.slug}/dashboard/",
            data={"sleep_timer_action": "start"},
            follow=True,
        )
        self.assertEqual(start_response.status_code, 200)

        session = self.c.session
        self.assertIn(f"sleep_timer_start_{child.id}", session)

        stop_response = self.c.post(
            f"/children/{child.slug}/dashboard/",
            data={"sleep_timer_action": "stop"},
            follow=True,
        )
        self.assertEqual(stop_response.status_code, 200)

        sleep = Sleep.objects.order_by("-id").first()
        self.assertIsNotNone(sleep)
        self.assertEqual(sleep.child, child)

    def test_dashboard_manual_sleep_entry(self):
        child = Child.objects.create(
            first_name="Sleep",
            last_name="Test",
            birth_date="2025-01-01",
        )
        previous_max_id = (
            Sleep.objects.order_by("-id").values_list("id", flat=True).first() or 0
        )

        response = self.c.post(
            f"/children/{child.slug}/dashboard/",
            data={
                "sleep_manual_entry_action": "create",
                "sleep_entry_start_date": "2026-03-06",
                "sleep_entry_start_time": "08:00",
                "sleep_entry_end_date": "2026-03-06",
                "sleep_entry_end_time": "09:30",
                "sleep_entry_type": "nap",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        sleep = Sleep.objects.filter(child=child, id__gt=previous_max_id).latest("id")
        self.assertTrue(sleep.nap)
        self.assertEqual(sleep.start.date().isoformat(), "2026-03-06")
        self.assertEqual(sleep.end.date().isoformat(), "2026-03-06")

    def test_dashboard_feeding_quick_entry(self):
        child = Child.objects.create(
            first_name="Feed",
            last_name="Test",
            birth_date="2025-01-01",
        )

        response = self.c.post(
            f"/children/{child.slug}/dashboard/",
            data={
                "feeding_quick_entry_action": "create",
                "feeding_entry_start_date": "2026-03-06",
                "feeding_entry_start_time": "10:00",
                "feeding_entry_end_date": "2026-03-06",
                "feeding_entry_end_time": "10:20",
                "feeding_entry_type": "breast_milk",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        feeding = Feeding.objects.filter(child=child).latest("id")
        self.assertEqual(feeding.type, "breast milk")
        self.assertEqual(feeding.method, "bottle")

    def test_dashboard_breastfeeding_quick_entry(self):
        child = Child.objects.create(
            first_name="Breast",
            last_name="Test",
            birth_date="2025-01-01",
        )

        response = self.c.post(
            f"/children/{child.slug}/dashboard/",
            data={
                "breastfeeding_quick_entry_action": "create",
                "breastfeeding_entry_start_date": "2026-03-06",
                "breastfeeding_entry_start_time": "11:00",
                "breastfeeding_entry_end_date": "2026-03-06",
                "breastfeeding_entry_end_time": "11:15",
                "breastfeeding_entry_side": "left",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        feeding = Feeding.objects.filter(child=child).latest("id")
        self.assertEqual(feeding.type, "breast milk")
        self.assertEqual(feeding.method, "left breast")

    def test_dashboard_pumping_quick_entry(self):
        child = Child.objects.create(
            first_name="Pump",
            last_name="Test",
            birth_date="2025-01-01",
        )

        response = self.c.post(
            f"/children/{child.slug}/dashboard/",
            data={
                "pumping_quick_entry_action": "create",
                "pumping_entry_start_date": "2026-03-06",
                "pumping_entry_start_time": "12:00",
                "pumping_entry_end_date": "2026-03-06",
                "pumping_entry_end_time": "12:12",
                "pumping_entry_amount": "90",
                "pumping_entry_side": "both",
            },
            follow=True,
        )

        self.assertEqual(response.status_code, 200)
        pumping = Pumping.objects.filter(child=child).latest("id")
        self.assertEqual(pumping.amount, 90)
        self.assertEqual(pumping.side, "both")

    def test_child_dashboard_bootstrap_has_insights(self):
        from core.models import Child

        child = Child.objects.first()
        if child is None:
            child = Child.objects.create(
                first_name="Test",
                last_name="Child",
                birth_date=timezone.localdate() - timezone.timedelta(days=90),
            )
        response = self.c.get(f"/children/{child.slug}/dashboard/")
        self.assertEqual(response.status_code, 200)
        from babybuddy.tests.tests_views import _bootstrap_payload

        bootstrap = _bootstrap_payload(response)
        self.assertIsNotNone(bootstrap)
        self.assertIn("insights", bootstrap)
        self.assertIsInstance(bootstrap["insights"], list)

    def test_insights_page(self):
        from core.models import Child

        child = Child.objects.first()
        if child is None:
            child = Child.objects.create(
                first_name="Test",
                last_name="Child",
                birth_date=timezone.localdate() - timezone.timedelta(days=90),
            )
        response = self.c.get(f"/children/{child.pk}/insights/")
        self.assertEqual(response.status_code, 200)
        from babybuddy.tests.tests_views import _bootstrap_payload

        bootstrap = _bootstrap_payload(response)
        self.assertIsNotNone(bootstrap)
        self.assertEqual(bootstrap["pageType"], "insights")
        self.assertIn("insights", bootstrap)
        self.assertIsInstance(bootstrap["insights"], list)
