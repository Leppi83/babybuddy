from django.db import migrations


def cleanup_dashboard_visible_items(apps, schema_editor):
    Settings = apps.get_model("babybuddy", "Settings")
    valid_keys = {
        "card.diaper.last",
        "card.diaper.types",
        "card.feedings.last",
        "card.feedings.method",
        "card.feedings.recent",
        "card.feedings.breastfeeding",
        "card.pumpings.last",
        "card.sleep.timers",
        "card.sleep.last",
        "card.sleep.recommendations",
        "card.sleep.recent",
        "card.sleep.naps_day",
        "card.sleep.statistics",
        "card.sleep.timeline_day",
        "card.tummytime.day",
    }
    for settings in Settings.objects.all():
        current = settings.dashboard_visible_items or []
        cleaned = [item for item in current if item in valid_keys]
        settings.dashboard_visible_items = cleaned
        settings.save(update_fields=["dashboard_visible_items"])


class Migration(migrations.Migration):

    dependencies = [
        ("babybuddy", "0037_dashboard_item_visibility"),
    ]

    operations = [
        migrations.RunPython(
            cleanup_dashboard_visible_items, reverse_code=migrations.RunPython.noop
        ),
    ]
