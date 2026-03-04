from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0009_activityentry"),
    ]

    operations = [
        migrations.AddField(
            model_name="agent",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="agent",
            name="first_name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="agent",
            name="last_name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
    ]
