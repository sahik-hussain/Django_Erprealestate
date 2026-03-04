from django.contrib import admin

from .models import (
    Agent,
    Estate,
    Lead,
    Project,
    RecentTransaction,
    ReportEntry,
    SiteVisit,
    Task,
)

admin.site.register(Task)
admin.site.register(Project)
admin.site.register(Lead)
admin.site.register(SiteVisit)
admin.site.register(Estate)
admin.site.register(RecentTransaction)
admin.site.register(ReportEntry)


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "phone", "date_of_birth", "role", "is_active", "created_at")
    list_filter = ("is_active", "role", "created_at")
    search_fields = ("full_name", "email", "phone", "role")
    ordering = ("-created_at",)
    list_per_page = 25
    fieldsets = (
        ("Agent Details", {"fields": ("first_name", "last_name", "full_name", "email", "phone", "date_of_birth", "role", "is_active")}),
        ("Metadata", {"fields": ("created_at",)}),
    )
    readonly_fields = ("created_at",)
