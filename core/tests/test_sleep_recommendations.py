import datetime

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from core import models
from core.recommendations import (
    recommend_bedtime,
    recommend_nap,
    recommend_sleep_bundle,
)


class SleepRecommendationsTestCase(TestCase):
    def setUp(self):
        call_command("migrate", verbosity=0)
        self.child = models.Child.objects.create(
            first_name="Sleepy", last_name="Kid", birth_date=timezone.localdate()
        )

    @staticmethod
    def aware(year, month, day, hour, minute=0):
        naive = datetime.datetime(year, month, day, hour, minute)
        return timezone.make_aware(naive, timezone.get_current_timezone())

    def add_sleep(self, start, end, nap):
        return models.Sleep.objects.create(
            child=self.child,
            start=start,
            end=end,
            nap=nap,
        )

    def test_no_data(self):
        now = self.aware(2026, 3, 4, 12, 0)

        nap = recommend_nap(self.child, now=now)
        bedtime = recommend_bedtime(self.child, now=now)
        bundle = recommend_sleep_bundle(self.child, now=now)

        self.assertEqual(nap["status"], "no_data")
        self.assertEqual(nap["earliest"], None)
        self.assertEqual(bedtime["status"], "no_data")
        self.assertEqual(bedtime["target_bedtime"], None)
        self.assertEqual(bundle["child"]["id"], self.child.id)
        self.assertEqual(bundle["as_of"], now)
        self.assertEqual(bundle["nap"]["status"], "no_data")
        self.assertEqual(bundle["bedtime"]["status"], "no_data")

    def test_overtired_risk(self):
        now = self.aware(2026, 3, 4, 12, 0)
        self.add_sleep(
            start=self.aware(2026, 3, 4, 7, 0),
            end=self.aware(2026, 3, 4, 8, 0),
            nap=True,
        )

        nap = recommend_nap(self.child, now=now)

        self.assertEqual(nap["status"], "overtired_risk")
        self.assertEqual(nap["earliest"], now)
        self.assertEqual(nap["ideal"], now)
        self.assertEqual(nap["latest"], now)

    def test_bedtime_history_median(self):
        now = self.aware(2026, 3, 4, 19, 30)

        self.add_sleep(
            start=self.aware(2026, 3, 4, 18, 30),
            end=self.aware(2026, 3, 4, 19, 0),
            nap=True,
        )

        self.add_sleep(
            start=self.aware(2026, 3, 1, 19, 0),
            end=self.aware(2026, 3, 2, 6, 0),
            nap=False,
        )
        self.add_sleep(
            start=self.aware(2026, 2, 28, 20, 0),
            end=self.aware(2026, 3, 1, 6, 0),
            nap=False,
        )
        self.add_sleep(
            start=self.aware(2026, 2, 27, 21, 0),
            end=self.aware(2026, 2, 28, 6, 0),
            nap=False,
        )

        bedtime = recommend_bedtime(self.child, now=now)

        self.assertEqual(bedtime["source"], "history_median")
        self.assertEqual(bedtime["target_bedtime"].hour, 20)
        self.assertEqual(bedtime["target_bedtime"].minute, 0)
        self.assertEqual(bedtime["ideal"].hour, 20)
        self.assertEqual(bedtime["ideal"].minute, 0)
        self.assertEqual(bedtime["status"], "ok")

    def test_clamp_in_window(self):
        now = self.aware(2026, 3, 4, 17, 30)

        self.add_sleep(
            start=self.aware(2026, 3, 4, 16, 40),
            end=self.aware(2026, 3, 4, 17, 0),
            nap=True,
        )

        self.add_sleep(
            start=self.aware(2026, 3, 2, 16, 30),
            end=self.aware(2026, 3, 3, 6, 0),
            nap=False,
        )
        self.add_sleep(
            start=self.aware(2026, 3, 1, 17, 0),
            end=self.aware(2026, 3, 2, 6, 0),
            nap=False,
        )
        self.add_sleep(
            start=self.aware(2026, 2, 28, 17, 0),
            end=self.aware(2026, 3, 1, 6, 0),
            nap=False,
        )

        bedtime = recommend_bedtime(self.child, now=now)

        self.assertEqual(bedtime["source"], "history_median")
        self.assertEqual(bedtime["ideal"], bedtime["earliest"])

    def test_nap_personalization_clamped(self):
        now = self.aware(2026, 3, 4, 14, 30)

        # Create three long wake-phases so median > age-based wake_max.
        self.add_sleep(
            start=self.aware(2026, 3, 1, 8, 0),
            end=self.aware(2026, 3, 1, 9, 0),
            nap=True,
        )
        self.add_sleep(
            start=self.aware(2026, 3, 1, 14, 30),  # 330 min wake
            end=self.aware(2026, 3, 1, 15, 30),
            nap=True,
        )
        self.add_sleep(
            start=self.aware(2026, 3, 2, 8, 0),  # 990 min wake
            end=self.aware(2026, 3, 2, 9, 0),
            nap=True,
        )
        self.add_sleep(
            start=self.aware(2026, 3, 2, 14, 30),  # 330 min wake
            end=self.aware(2026, 3, 2, 15, 30),
            nap=True,
        )
        self.add_sleep(
            start=self.aware(2026, 3, 4, 13, 0),
            end=self.aware(2026, 3, 4, 14, 0),
            nap=True,
        )

        nap = recommend_nap(self.child, now=now)

        self.assertEqual(nap["source"], "history_median")
        self.assertEqual(nap["ideal"], nap["latest"])
