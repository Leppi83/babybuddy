from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("examinations", "0003_seed_german_examinations"),
    ]

    operations = [
        migrations.AlterField(
            model_name="examinationrecord",
            name="date",
            field=models.DateField(
                null=True,
                blank=True,
                verbose_name="Date of examination",
            ),
        ),
    ]
