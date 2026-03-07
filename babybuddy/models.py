# -*- coding: utf-8 -*-
import zoneinfo

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.utils.text import format_lazy
from django.utils.translation import gettext_lazy as _
from django.utils.translation import ngettext_lazy

from rest_framework.authtoken.models import Token


class Settings(models.Model):
    DASHBOARD_SECTION_CHOICES = [
        ("diaper", _("Diaper changes")),
        ("feedings", _("Feedings")),
        ("pumpings", _("Pumpings")),
        ("sleep", _("Sleep")),
        ("tummytime", _("Tummy time")),
    ]
    DASHBOARD_ITEM_CHOICES = [
        ("card.diaper.quick_entry", _("diaper changes - Quick Entry")),
        ("card.diaper.last", _("diaper changes - Last nappy change")),
        ("card.diaper.types", _("diaper changes - Nappy changes")),
        ("card.feedings.quick_entry", _("feedings - Quick Entry")),
        ("card.feedings.breast_quick_entry", _("feedings - Breastfeeding Quick Entry")),
        ("card.feedings.last", _("feedings - Last feeding")),
        ("card.feedings.method", _("feedings - Last Feeding Method")),
        ("card.feedings.recent", _("feedings - Recent Feedings")),
        ("card.feedings.breastfeeding", _("feedings - Breastfeeding")),
        ("card.pumpings.quick_entry", _("pumpings - Quick Entry")),
        ("card.pumpings.last", _("pumpings - Last Pumping")),
        ("card.sleep.timers", _("sleep - Timers")),
        ("card.sleep.quick_timer", _("sleep - Sleep Timer")),
        ("card.sleep.last", _("sleep - Last Sleep")),
        ("card.sleep.recommendations", _("sleep - Sleep Recommendations")),
        ("card.sleep.recent", _("sleep - Recent Sleep")),
        ("card.sleep.naps_day", _("sleep - Today's Naps")),
        ("card.sleep.statistics", _("sleep - Statistics")),
        ("card.sleep.timeline_day", _("sleep - Sleep Timeline (24h)")),
        ("card.sleep.week_chart", _("sleep - Sleep This Week")),
        ("card.tummytime.day", _("tummy time - Today's Tummy Time")),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    dashboard_refresh_rate = models.DurationField(
        verbose_name=_("Refresh rate"),
        help_text=_(
            "If supported by browser, the dashboard will only refresh when visible, and also when receiving focus."
        ),
        blank=True,
        null=True,
        default=timezone.timedelta(minutes=1),
        choices=[
            (None, _("disabled")),
            (
                timezone.timedelta(minutes=1),
                ngettext_lazy("%(minutes)d minute", "%(minutes)d minutes", 1)
                % {"minutes": 1},
            ),
            (
                timezone.timedelta(minutes=2),
                ngettext_lazy("%(minutes)d minute", "%(minutes)d minutes", 2)
                % {"minutes": 2},
            ),
            (
                timezone.timedelta(minutes=3),
                ngettext_lazy("%(minutes)d minute", "%(minutes)d minutes", 3)
                % {"minutes": 3},
            ),
            (
                timezone.timedelta(minutes=4),
                ngettext_lazy("%(minutes)d minute", "%(minutes)d minutes", 4)
                % {"minutes": 4},
            ),
            (
                timezone.timedelta(minutes=5),
                ngettext_lazy("%(minutes)d minute", "%(minutes)d minutes", 5)
                % {"minutes": 5},
            ),
            (
                timezone.timedelta(minutes=10),
                ngettext_lazy("%(minutes)d minute", "%(minutes)d minutes", 10)
                % {"minutes": 10},
            ),
            (
                timezone.timedelta(minutes=15),
                ngettext_lazy("%(minutes)d minute", "%(minutes)d minutes", 15)
                % {"minutes": 15},
            ),
            (
                timezone.timedelta(minutes=30),
                ngettext_lazy("%(minutes)d minute", "%(minutes)d minutes", 30)
                % {"minutes": 30},
            ),
        ],
    )
    dashboard_hide_empty = models.BooleanField(
        verbose_name=_("Hide Empty Dashboard Cards"), default=False, editable=True
    )
    dashboard_hide_age = models.DurationField(
        verbose_name=_("Hide data older than"),
        help_text=_(
            "This setting controls which data will be shown " "in the dashboard."
        ),
        blank=True,
        null=True,
        default=None,
        choices=[
            (None, _("show all data")),
            (
                timezone.timedelta(days=1),
                ngettext_lazy("%(days)d day", "%(days)d days", 1) % {"days": 1},
            ),
            (
                timezone.timedelta(days=2),
                ngettext_lazy("%(days)d day", "%(days)d days", 2) % {"days": 2},
            ),
            (
                timezone.timedelta(days=3),
                ngettext_lazy("%(days)d day", "%(days)d days", 3) % {"days": 3},
            ),
            (
                timezone.timedelta(weeks=1),
                ngettext_lazy("%(weeks)d week", "%(weeks)d weeks", 1) % {"weeks": 1},
            ),
            (
                timezone.timedelta(weeks=4),
                ngettext_lazy("%(weeks)d week", "%(weeks)d weeks", 4) % {"weeks": 4},
            ),
        ],
    )
    dashboard_visible_items = models.JSONField(
        verbose_name=_("Dashboard visible items"), default=list, blank=True
    )
    dashboard_section_order = models.JSONField(
        verbose_name=_("Dashboard section order"), default=list, blank=True
    )
    dashboard_hidden_sections = models.JSONField(
        verbose_name=_("Hidden dashboard sections"), default=list, blank=True
    )
    language = models.CharField(
        choices=settings.LANGUAGES,
        default=settings.LANGUAGE_CODE,
        max_length=255,
        verbose_name=_("Language"),
    )
    timezone = models.CharField(
        choices=sorted(
            tuple(zip(zoneinfo.available_timezones(), zoneinfo.available_timezones()))
        ),
        default=timezone.get_default_timezone_name(),
        max_length=100,
        verbose_name=_("Timezone"),
    )
    pagination_count = models.PositiveIntegerField(
        choices=[
            (10, _("%(count)d Per Page") % {"count": 10}),
            (25, _("%(count)d Per Page") % {"count": 25}),
            (50, _("%(count)d Per Page") % {"count": 50}),
            (100, _("%(count)d Per Page") % {"count": 100}),
            (250, _("%(count)d Per Page") % {"count": 250}),
            (0, _("Show All")),
        ],
        default=25,
        verbose_name=_("Items Per Page"),
    )

    def __str__(self):
        return str(format_lazy(_("{user}'s Settings"), user=self.user))

    def api_key(self, reset=False):
        """
        Get or create an API key for the associated user.
        :param reset: If True, delete the existing key and create a new one.
        :return: The user's API key.
        """
        if reset:
            Token.objects.get(user=self.user).delete()
        return Token.objects.get_or_create(user=self.user)[0]

    @property
    def dashboard_refresh_rate_milliseconds(self):
        """
        Convert seconds to milliseconds to be used in a Javascript setInterval
        function call.
        :return: the refresh rate in milliseconds or None.
        """
        if self.dashboard_refresh_rate:
            return self.dashboard_refresh_rate.seconds * 1000
        return None

    @classmethod
    def dashboard_default_visible_items(cls):
        return [item[0] for item in cls.DASHBOARD_ITEM_CHOICES]

    @classmethod
    def dashboard_default_section_order(cls):
        return [section[0] for section in cls.DASHBOARD_SECTION_CHOICES]

    def dashboard_selected_items(self):
        allowed = set(self.dashboard_default_visible_items())
        stored = [
            item for item in (self.dashboard_visible_items or []) if item in allowed
        ]
        # If the user has never configured their dashboard, return all defaults.
        # If they have saved a selection (even a subset), respect it exactly so
        # that cards explicitly removed stay removed.
        if not self.dashboard_visible_items:
            return self.dashboard_default_visible_items()
        return stored

    def dashboard_selected_section_order(self):
        allowed = set(self.dashboard_default_section_order())
        stored = [
            section
            for section in (self.dashboard_section_order or [])
            if section in allowed
        ]
        for section in self.dashboard_default_section_order():
            if section not in stored:
                stored.append(section)
        return stored

    def dashboard_selected_hidden_sections(self):
        allowed = set(self.dashboard_default_section_order())
        return [
            section
            for section in (self.dashboard_hidden_sections or [])
            if section in allowed
        ]


@receiver(post_save, sender=get_user_model())
def create_user_settings(sender, instance, created, **kwargs):
    if created:
        Settings.objects.create(user=instance)


@receiver(post_save, sender=get_user_model())
def save_user_settings(sender, instance, **kwargs):
    instance.settings.save()
