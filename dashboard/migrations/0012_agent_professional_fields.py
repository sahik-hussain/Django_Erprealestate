from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0011_estate_created_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="agent",
            name="certifications",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="agent",
            name="languages_spoken",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="agent",
            name="license_expiry_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="agent",
            name="license_number",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="agent",
            name="license_state",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="agent",
            name="specialization",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="agent",
            name="years_of_experience",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
