# -*- coding: utf-8 -*-
import json
import re
import time

from django.test import TestCase, override_settings, tag
from django.test import Client as HttpClient
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.management import call_command

from faker import Faker

from babybuddy.views import UserUnlock


def _bootstrap_payload(response):
    match = re.search(
        rb'<script id="ant-app-bootstrap" type="application/json">(.*?)</script>',
        response.content,
        re.DOTALL,
    )
    if not match:
        return None
    return json.loads(match.group(1).decode("utf-8"))


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
            is_superuser=True, email="admin@admin.admin", **cls.credentials
        )

        cls.c.login(**cls.credentials)

    def setUp(self):
        # Ensure every test starts with an existing authenticated user.
        user_model = get_user_model()
        self.user, _ = user_model.objects.get_or_create(
            username=self.credentials["username"],
            defaults={
                "is_superuser": True,
                "email": "admin@admin.admin",
            },
        )
        self.user.set_password(self.credentials["password"])
        self.user.save()
        self.c.force_login(self.user)

    def test_root_router(self):
        page = self.c.get("/")
        self.assertEqual(page.url, "/dashboard/")

    @override_settings(ROLLING_SESSION_REFRESH=1)
    def test_rolling_sessions(self):
        self.c.get("/")
        session1 = str(self.c.cookies["sessionid"])
        # Sleep longer than ROLLING_SESSION_REFRESH.
        time.sleep(2)
        self.c.get("/")
        session2 = str(self.c.cookies["sessionid"])
        self.c.get("/")
        session3 = str(self.c.cookies["sessionid"])
        self.assertNotEqual(session1, session2)
        self.assertEqual(session2, session3)

    def test_user_settings(self):
        page = self.c.get("/user/settings/")
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'id="ant-app-root"')

    def test_user_settings_autosave_dashboard_layout(self):
        page = self.c.post(
            "/user/settings/",
            data={
                "action": "autosave_dashboard_layout",
                "dashboard_section_order": "sleep,diaper",
                "dashboard_hidden_sections": "sleep,invalid",
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )
        self.assertEqual(page.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(
            self.user.settings.dashboard_section_order,
            ["sleep", "diaper", "feedings", "pumpings", "tummytime"],
        )
        self.assertEqual(self.user.settings.dashboard_hidden_sections, ["sleep"])

    def test_add_device_page(self):
        page = self.c.get("/user/add-device/")
        self.assertContains(page, 'id="ant-app-root"')
        self.assertContains(page, "Login QR code")

    def test_user_views(self):
        # Staff setting is required to access user management.
        page = self.c.get("/users/")
        self.assertEqual(page.status_code, 403)
        self.user.is_staff = True
        self.user.save()

        page = self.c.get("/users/")
        self.assertEqual(page.status_code, 200)
        page = self.c.get("/users/add/")
        self.assertEqual(page.status_code, 200)

        entry = get_user_model().objects.first()
        page = self.c.get("/users/{}/edit/".format(entry.id))
        self.assertEqual(page.status_code, 200)
        page = self.c.get("/users/{}/delete/".format(entry.id))
        self.assertEqual(page.status_code, 200)

    def test_user_unlock(self):
        # Staff setting is required to unlock users.
        self.user.is_staff = True
        self.user.save()

        entry = get_user_model().objects.first()
        url = "/users/{}/unlock/".format(entry.id)

        page = self.c.get(url)
        self.assertEqual(page.status_code, 200)
        page = self.c.post(url, follow=True)
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, UserUnlock.success_message)

    def test_welcome(self):
        page = self.c.get("/welcome/")
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'id="ant-app-root"')

    def test_logout_get_fails(self):
        page = self.c.get("/logout/")
        self.assertEqual(page.status_code, 405)

    @tag("isolate")
    def test_password_reset(self):
        """
        Testing this class primarily ensures Baby Buddy's custom templates are correctly
        configured for Django's password reset flow.
        """
        # Use a dedicated client so this test does not affect class-level auth state.
        client = HttpClient()

        page = client.get("/reset/")
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'id="ant-app-root"')

        page = client.post("/reset/", data={"email": self.user.email}, follow=True)
        self.assertEqual(page.status_code, 200)

        self.assertEqual(len(mail.outbox), 1)

        path = re.search(
            "http://testserver(?P<path>[^\\s]+)", mail.outbox[0].body
        ).group("path")
        page = client.get(path, follow=True)
        self.assertEqual(page.status_code, 200)

        new_password = "xZZVN6z4TvhFg6S"
        data = {
            "new_password1": new_password,
            "new_password2": new_password,
        }
        page = client.post(page.request["PATH_INFO"], data=data, follow=True)
        self.assertEqual(page.status_code, 200)

    def test_service_worker_is_served(self):
        response = self.c.get("/sw.js")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/javascript")
        self.assertIn("Service-Worker-Allowed", response)
        self.assertIn(b"CACHE_NAME", response.content)

    def test_service_worker_cache_name_uses_build_hash(self):
        import os
        from unittest.mock import patch

        with patch.dict(os.environ, {"BUILD_HASH": "abc123"}):
            response = self.c.get("/sw.js")
        self.assertIn(b"babybuddy-vabc123", response.content)

    def test_deep_link_diaper(self):
        from core import models as core_models

        core_models.Child.objects.get_or_create(
            first_name="Test",
            last_name="Child",
            defaults={"birth_date": "2023-01-01"},
        )
        response = self.c.get("/log/diaper/")
        self.assertEqual(response.status_code, 200)
        bootstrap = _bootstrap_payload(response)
        self.assertIsNotNone(bootstrap)
        self.assertEqual(bootstrap["pageType"], "form")

    def test_deep_link_unknown_type_returns_404(self):
        response = self.c.get("/log/unknowntype/")
        self.assertEqual(response.status_code, 404)

    def test_deep_link_no_children_redirects(self):
        from core import models as core_models

        core_models.Child.objects.all().delete()
        childless_user = get_user_model().objects.create_user(
            username="childless", password="testpass"
        )
        c2 = HttpClient()
        c2.login(username="childless", password="testpass")
        response = c2.get("/log/diaper/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/children/add/", response["Location"])
        childless_user.delete()
