# core/tests/test_insights.py
import datetime
from unittest.mock import MagicMock
from django.test import TestCase
from django.utils import timezone


class InsightDataclassTest(TestCase):
    def test_insight_fields(self):
        from core.insights import Insight

        ins = Insight(
            id="3.sleep_short_naps.2026-03-18",
            severity="warning",
            category="sleep",
            title="Short naps",
            body="Naps are shorter than last week.",
            action_label=None,
            action_url=None,
        )
        self.assertEqual(ins.severity, "warning")
        self.assertEqual(ins.category, "sleep")


class AgeStageTest(TestCase):
    def test_newborn_stage(self):
        from core.insights import get_age_stage

        birth = datetime.date.today() - datetime.timedelta(weeks=4)
        self.assertEqual(get_age_stage(birth), "newborn")

    def test_infant_stage(self):
        from core.insights import get_age_stage

        birth = datetime.date.today() - datetime.timedelta(days=180)
        self.assertEqual(get_age_stage(birth), "infant")

    def test_toddler_stage(self):
        from core.insights import get_age_stage

        birth = datetime.date.today() - datetime.timedelta(days=500)
        self.assertEqual(get_age_stage(birth), "toddler")

    def test_child_stage(self):
        from core.insights import get_age_stage

        birth = datetime.date.today() - datetime.timedelta(days=1200)
        self.assertEqual(get_age_stage(birth), "child")


class RuleEngineTest(TestCase):
    def _make_data(self, **overrides):
        """Return a minimal data dict with sensible defaults."""
        base = {
            "feedings_24h": [],
            "feedings_7d": [],
            "sleeps_24h": [],
            "sleeps_7d": [],
            "diapers_24h": [],
            "last_feeding": None,
            "last_sleep": None,
            "last_diaper": None,
            "avg_feeding_interval_7d": None,
            "avg_sleep_duration_7d": None,
            "avg_nap_count_7d": None,
            "avg_nap_duration_prev_7d": None,
            "total_sleep_24h": None,
        }
        base.update(overrides)
        return base

    def test_no_diaper_8h_triggers_warning(self):
        from core.insights import run_rules

        child = MagicMock()
        child.id = 1
        child.birth_date = datetime.date.today() - datetime.timedelta(days=90)
        data = self._make_data(last_diaper=None)
        insights = run_rules(child, data)
        ids = [i.id for i in insights]
        self.assertTrue(any("no_diaper" in iid for iid in ids))

    def test_newborn_no_feeding_3h_triggers_alert(self):
        from core.insights import run_rules
        from unittest.mock import patch

        child = MagicMock()
        child.id = 1
        child.birth_date = datetime.date.today() - datetime.timedelta(weeks=2)

        # Use a fixed daytime hour (10am) so the rule always fires regardless of when tests run
        fake_now = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
        mock_feeding = MagicMock()
        mock_feeding.start = fake_now - datetime.timedelta(hours=4)
        data = self._make_data(last_feeding=mock_feeding, feedings_24h=[mock_feeding])

        with patch("django.utils.timezone.now", return_value=fake_now), patch(
            "django.utils.timezone.localtime", return_value=fake_now
        ):
            insights = run_rules(child, data)

        self.assertTrue(any(i.severity == "alert" for i in insights))

    def test_no_insights_when_data_is_healthy(self):
        from core.insights import run_rules

        child = MagicMock()
        child.id = 1
        child.birth_date = datetime.date.today() - datetime.timedelta(days=90)
        now = timezone.now()
        mock_diaper = MagicMock()
        mock_diaper.time = now - datetime.timedelta(hours=1)
        mock_feeding = MagicMock()
        mock_feeding.start = now - datetime.timedelta(hours=1)
        data = self._make_data(
            last_diaper=mock_diaper,
            last_feeding=mock_feeding,
            diapers_24h=[mock_diaper] * 8,
            feedings_24h=[mock_feeding] * 8,
        )
        insights = run_rules(child, data)
        self.assertEqual(len(insights), 0)


class LLMClientTest(TestCase):
    def test_llm_error_raised_for_none_provider(self):
        from core.llm import generate_summary, LLMError

        with self.assertRaises(LLMError):
            list(generate_summary("none", "", "", "", "context"))

    def test_llm_error_raised_for_unknown_provider(self):
        from core.llm import generate_summary, LLMError

        with self.assertRaises(LLMError):
            list(generate_summary("unknown", "", "", "", "context"))
