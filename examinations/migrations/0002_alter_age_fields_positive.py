# Generated migration for PositiveIntegerField update

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('examinations', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='examinationtype',
            name='age_min_days',
            field=models.PositiveIntegerField(verbose_name='Minimum age (days)'),
        ),
        migrations.AlterField(
            model_name='examinationtype',
            name='age_max_days',
            field=models.PositiveIntegerField(verbose_name='Maximum age (days)'),
        ),
    ]
