from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0007_lead_email_lead_phone"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="image",
            field=models.FileField(blank=True, null=True, upload_to="leads/"),
        ),
    ]
