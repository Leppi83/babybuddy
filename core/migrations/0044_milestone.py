import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0043_sleeptimer_notified_14h_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="Milestone",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "child",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="milestones",
                        to="core.child",
                        verbose_name="Child",
                    ),
                ),
                (
                    "date",
                    models.DateField(
                        default=django.utils.timezone.localdate,
                        verbose_name="Date",
                    ),
                ),
                (
                    "milestone_type",
                    models.CharField(
                        choices=[
                            ("first_word", "First word"),
                            ("first_turn", "First turn"),
                            ("first_walk", "First walk"),
                            ("first_smile", "First smile"),
                            ("first_tooth", "First tooth"),
                            ("custom", "Custom"),
                        ],
                        default="custom",
                        max_length=20,
                        verbose_name="Type",
                    ),
                ),
                (
                    "title",
                    models.CharField(blank=True, max_length=255, verbose_name="Title"),
                ),
                (
                    "notes",
                    models.TextField(blank=True, null=True, verbose_name="Notes"),
                ),
            ],
            options={
                "verbose_name": "Milestone",
                "verbose_name_plural": "Milestones",
                "ordering": ["date"],
                "default_permissions": ("view", "add", "change", "delete"),
            },
        ),
    ]
