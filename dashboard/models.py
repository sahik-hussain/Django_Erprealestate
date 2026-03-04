from django.conf import settings
from django.db import models


class Task(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    task_type = models.CharField(max_length=100, blank=True, default="")
    priority = models.CharField(max_length=50, default="Normal")
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, default="Pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.title


class Project(models.Model):
    project_name = models.CharField(max_length=255)
    project_date = models.DateField(null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True, default="")
    chat_title = models.CharField(max_length=255, blank=True, default="")
    project_status = models.CharField(max_length=50, default="Active")
    document_type = models.CharField(max_length=100, blank=True, default="")
    share_with = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.project_name

class Lead(models.Model):
    STATUS_FRESH = "Fresh Lead"
    STATUS_RETURNING = "Returning"
    STATUS_UNTOUCHED = "Untouched"
    STATUS_UNASSIGNED = "Unassigned"
    STATUS_ASSIGNED = "Assigned"

    STATUS_CHOICES = [
        (STATUS_FRESH, "Fresh Lead"),
        (STATUS_RETURNING, "Returning"),
        (STATUS_UNTOUCHED, "Untouched"),
        (STATUS_UNASSIGNED, "Unassigned"),
        (STATUS_ASSIGNED, "Assigned"),
    ]

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=15, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    enquiry = models.CharField(max_length=100, blank=True, default="")
    created_date = models.DateField(null=True, blank=True)
    next_follow_up = models.DateField(null=True, blank=True)
    owner = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default=STATUS_FRESH)
    image = models.FileField(upload_to="leads/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.name} ({self.status})"

class SiteVisit(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="site_visits")
    visit_date = models.DateField()
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=50, default="Scheduled")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-visit_date", "-id"]

    def __str__(self):
        return f"{self.lead.name} - {self.visit_date}"


class Estate(models.Model):
    title = models.CharField(max_length=255)
    estate_type = models.CharField(max_length=100, blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=100, blank=True, default="Available")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_estates",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.title


class RecentTransaction(models.Model):
    TYPE_SALE = "Sale"
    TYPE_LEASE = "Lease"
    TYPE_OTHER = "Other"
    TXN_TYPE_CHOICES = [
        (TYPE_SALE, "Sale"),
        (TYPE_LEASE, "Lease"),
        (TYPE_OTHER, "Other"),
    ]

    STATUS_COMPLETED = "Completed"
    STATUS_PENDING = "Pending"
    STATUS_CANCELLED = "Cancelled"
    STATUS_CHOICES = [
        (STATUS_COMPLETED, "Completed"),
        (STATUS_PENDING, "Pending"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    property_name = models.CharField(max_length=255)
    transaction_type = models.CharField(max_length=20, choices=TXN_TYPE_CHOICES, default=TYPE_SALE)
    client_name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.property_name} - {self.client_name}"


class Agent(models.Model):
    first_name = models.CharField(max_length=120, blank=True, default="")
    last_name = models.CharField(max_length=120, blank=True, default="")
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    license_number = models.CharField(max_length=120, blank=True, default="")
    license_state = models.CharField(max_length=120, blank=True, default="")
    license_expiry_date = models.DateField(null=True, blank=True)
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)
    specialization = models.CharField(max_length=255, blank=True, default="")
    languages_spoken = models.CharField(max_length=255, blank=True, default="")
    certifications = models.CharField(max_length=255, blank=True, default="")
    role = models.CharField(max_length=100, blank=True, default="Agent")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.full_name


class ReportEntry(models.Model):
    property_name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=100, blank=True, default="")
    client_name = models.CharField(max_length=255, blank=True, default="")
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=50, default="Pending")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.property_name} ({self.status})"


class ActivityEntry(models.Model):
    TYPE_MEETING = "Meeting"
    TYPE_CALL = "Call"
    TYPE_MAIL = "Mail"
    TYPE_OTHER = "Other"
    TYPE_CHOICES = [
        (TYPE_MEETING, "Meeting"),
        (TYPE_CALL, "Call"),
        (TYPE_MAIL, "Mail"),
        (TYPE_OTHER, "Other"),
    ]

    title = models.CharField(max_length=255)
    activity_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_OTHER)
    activity_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-activity_date", "-id"]

    def __str__(self):
        return f"{self.activity_type}: {self.title}"
