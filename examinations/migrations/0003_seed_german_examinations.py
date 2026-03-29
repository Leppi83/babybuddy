from django.db import migrations


def seed_germany(apps, schema_editor):
    from django.core.management import call_command
    call_command("seed_examinations", "--country", "de", verbosity=0)


def unseed_germany(apps, schema_editor):
    ExaminationProgram = apps.get_model("examinations", "ExaminationProgram")
    ExaminationProgram.objects.filter(country_code="de").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("examinations", "0002_alter_age_fields_positive"),
    ]
    operations = [
        migrations.RunPython(seed_germany, reverse_code=unseed_germany),
    ]
