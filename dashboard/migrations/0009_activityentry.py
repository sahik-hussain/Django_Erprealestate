from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0008_lead_image"),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("activity_type", models.CharField(choices=[("Meeting", "Meeting"), ("Call", "Call"), ("Mail", "Mail"), ("Other", "Other")], default="Other", max_length=20)),
                ("activity_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-activity_date", "-id"],
            },
        ),
    ]
