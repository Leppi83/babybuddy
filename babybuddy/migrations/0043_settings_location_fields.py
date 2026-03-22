from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("babybuddy", "0042_settings_llm_api_key_settings_llm_base_url_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="settings",
            name="latitude",
            field=models.FloatField(blank=True, null=True, verbose_name="Latitude"),
        ),
        migrations.AddField(
            model_name="settings",
            name="longitude",
            field=models.FloatField(blank=True, null=True, verbose_name="Longitude"),
        ),
        migrations.AddField(
            model_name="settings",
            name="location_updated_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="Location last updated"
            ),
        ),
    ]
