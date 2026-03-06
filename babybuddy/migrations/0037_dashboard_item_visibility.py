from django.db import migrations, models


def migrate_section_visibility_to_dashboard_items(apps, schema_editor):
    Settings = apps.get_model("babybuddy", "Settings")

    section_cards = {
        "diaper": ["card.diaper.last", "card.diaper.types"],
        "feedings": [
            "card.feedings.last",
            "card.feedings.method",
            "card.feedings.recent",
            "card.feedings.breastfeeding",
        ],
        "pumpings": ["card.pumpings.last"],
        "sleep": [
            "card.sleep.timers",
            "card.sleep.last",
            "card.sleep.recommendations",
            "card.sleep.recent",
            "card.sleep.naps_day",
            "card.sleep.statistics",
        ],
        "tummytime": ["card.tummytime.day"],
    }

    all_items = [
        "section.diaper",
        "card.diaper.last",
        "card.diaper.types",
        "section.feedings",
        "card.feedings.last",
        "card.feedings.method",
        "card.feedings.recent",
        "card.feedings.breastfeeding",
        "section.pumpings",
        "card.pumpings.last",
        "section.sleep",
        "card.sleep.timers",
        "card.sleep.last",
        "card.sleep.recommendations",
        "card.sleep.recent",
        "card.sleep.naps_day",
        "card.sleep.statistics",
        "section.tummytime",
        "card.tummytime.day",
    ]

    for settings in Settings.objects.all():
        selected = []
        for section, cards in section_cards.items():
            field_name = f"dashboard_show_{section}_section"
            if getattr(settings, field_name, True):
                selected.append(f"section.{section}")
                selected.extend(cards)

        settings.dashboard_visible_items = selected or all_items
        settings.save(update_fields=["dashboard_visible_items"])


class Migration(migrations.Migration):

    dependencies = [
        ("babybuddy", "0036_settings_dashboard_sections"),
    ]

    operations = [
        migrations.AddField(
            model_name="settings",
            name="dashboard_visible_items",
            field=models.JSONField(
                blank=True, default=list, verbose_name="Dashboard visible items"
            ),
        ),
        migrations.RunPython(
            migrate_section_visibility_to_dashboard_items,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="settings",
            name="dashboard_show_diaper_section",
        ),
        migrations.RemoveField(
            model_name="settings",
            name="dashboard_show_feeding_section",
        ),
        migrations.RemoveField(
            model_name="settings",
            name="dashboard_show_pumping_section",
        ),
        migrations.RemoveField(
            model_name="settings",
            name="dashboard_show_sleep_section",
        ),
        migrations.RemoveField(
            model_name="settings",
            name="dashboard_show_tummytime_section",
        ),
    ]
