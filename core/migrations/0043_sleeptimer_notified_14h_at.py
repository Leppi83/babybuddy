from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0042_child_examination_program"),
    ]

    operations = [
        migrations.AddField(
            model_name="sleeptimer",
            name="notified_14h_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="14h notification sent at",
            ),
        ),
    ]
