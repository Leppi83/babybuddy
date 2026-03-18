# -*- coding: utf-8 -*-
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from babybuddy.models import Settings


class SettingsTestCase(TestCase):
    def setUp(self):
        call_command("migrate", verbosity=0)

    def test_settings(self):
        credentials = {"username": "Test", "password": "User"}
        user = get_user_model().objects.create_user(is_superuser=True, **credentials)
        self.assertIsInstance(user.settings, Settings)
        self.assertEqual(user.settings.dashboard_refresh_rate_milliseconds, 60000)

        user.settings.dashboard_refresh_rate = None
        user.save()
        self.assertIsNone(user.settings.dashboard_refresh_rate_milliseconds)

        user.settings.language = "fr"
        user.save()
        self.assertEqual(user.settings.language, "fr")

    def test_dashboard_layout_helpers(self):
        user = get_user_model().objects.create_user(
            username="layout", password="User", is_superuser=True
        )
        user.settings.dashboard_section_order = ["sleep", "diaper"]
        user.settings.dashboard_hidden_sections = ["sleep", "invalid", "feedings"]
        user.settings.save()

        self.assertEqual(
            user.settings.dashboard_selected_section_order(),
            ["sleep", "diaper", "feedings", "pumpings", "tummytime"],
        )
        self.assertEqual(
            user.settings.dashboard_selected_hidden_sections(),
            ["sleep", "feedings"],
        )


class SettingsLastUsedDefaultsTest(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="testdefaults", password="pass"
        )

    def test_last_used_defaults_default_is_empty_dict(self):
        settings = self.user.settings
        self.assertEqual(settings.last_used_defaults, {})

    def test_last_used_defaults_stores_and_retrieves(self):
        settings = self.user.settings
        settings.last_used_defaults = {"1.feeding": {"method": "bottle", "amount": 120}}
        settings.save(update_fields=["last_used_defaults"])
        settings.refresh_from_db()
        self.assertEqual(settings.last_used_defaults["1.feeding"]["method"], "bottle")
