from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0044_milestone"),
    ]

    operations = [
        migrations.AddField(
            model_name="child",
            name="sex",
            field=models.CharField(
                choices=[
                    ("male", "Male"),
                    ("female", "Female"),
                    ("unknown", "Unknown"),
                ],
                default="unknown",
                max_length=10,
                verbose_name="Sex",
            ),
        ),
    ]
