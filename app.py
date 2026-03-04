import os
from datetime import date, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Real_estate.settings")

import django

django.setup()

from dashboard.models import Agent, Estate, Lead, Project, RecentTransaction, ReportEntry, SiteVisit, Task


def seed_tasks():
    rows = [
        {"title": "Call new buyer", "description": "First follow-up", "task_type": "Call", "priority": "High", "due_date": date.today(), "status": "Pending"},
        {"title": "Send brochure", "description": "Email marketing PDF", "task_type": "Email", "priority": "Normal", "due_date": date.today() + timedelta(days=1), "status": "Not Started"},
    ]
    for row in rows:
        exists = Task.objects.filter(
            title=row["title"],
            description=row["description"],
            task_type=row["task_type"],
        ).exists()
        if not exists:
            Task.objects.create(**row)


def seed_leads_and_visits():
    rows = [
        {"name": "Shuja ibn Wahb", "enquiry": "Apartment", "owner": "Robert Fox", "status": Lead.STATUS_FRESH},
        {"name": "Ammar ibn Yasir", "enquiry": "Condominium", "owner": "Annette Black", "status": Lead.STATUS_RETURNING},
        {"name": "Abu Talha", "enquiry": "Villa", "owner": "Kristin Watson", "status": Lead.STATUS_UNTOUCHED},
        {"name": "Zayd ibn Harithah", "enquiry": "Town House", "owner": "Ariene McCoy", "status": Lead.STATUS_UNASSIGNED},
    ]

    for i, row in enumerate(rows):
        lead, _ = Lead.objects.get_or_create(
            name=row["name"],
            defaults={
                "enquiry": row["enquiry"],
                "owner": row["owner"],
                "status": row["status"],
                "created_date": date.today() - timedelta(days=i + 1),
                "next_follow_up": date.today() + timedelta(days=i + 2),
            },
        )
        SiteVisit.objects.get_or_create(
            lead=lead,
            visit_date=date.today() + timedelta(days=i + 1),
            defaults={"notes": "Scheduled site visit", "status": "Scheduled"},
        )


def seed_projects():
    rows = [
        {"project_name": "Skyview Tower", "project_date": date.today(), "file_name": "Site_Plan_v1.pdf", "chat_title": "Construction Q1", "project_status": "Active", "document_type": "PDF", "share_with": "team@crm.com"},
        {"project_name": "Palm Residency", "project_date": date.today() - timedelta(days=10), "file_name": "Palm_Master.pdf", "chat_title": "Sales Sprint", "project_status": "In Progress", "document_type": "PDF", "share_with": "sales@crm.com"},
    ]
    for row in rows:
        exists = Project.objects.filter(
            project_name=row["project_name"],
            file_name=row["file_name"],
            chat_title=row["chat_title"],
        ).exists()
        if not exists:
            Project.objects.create(**row)


def seed_estates():
    rows = [
        {"title": "Seaside Serenity Villa", "estate_type": "Villa", "location": "Dubai Marina", "price": 1250000, "status": "Available"},
        {"title": "Downtown Office Space", "estate_type": "Commercial", "location": "Business Bay", "price": 875000, "status": "Available"},
    ]
    for row in rows:
        Estate.objects.get_or_create(title=row["title"], defaults=row)


def seed_recent_transactions():
    rows = [
        {"property_name": "Luxury Villa Beverly Hills", "transaction_type": RecentTransaction.TYPE_SALE, "client_name": "Sarah Johnson", "amount": 4250000, "status": RecentTransaction.STATUS_COMPLETED},
        {"property_name": "Downtown Office Space", "transaction_type": RecentTransaction.TYPE_LEASE, "client_name": "Tech Corp Inc", "amount": 125000, "status": RecentTransaction.STATUS_PENDING},
    ]
    for row in rows:
        RecentTransaction.objects.get_or_create(
            property_name=row["property_name"],
            client_name=row["client_name"],
            defaults=row,
        )


def seed_agents():
    rows = [
        {"full_name": "Robert Fox", "email": "robert@crm.com", "phone": "+1-202-555-0101", "role": "Senior Agent", "is_active": True},
        {"full_name": "Annette Black", "email": "annette@crm.com", "phone": "+1-202-555-0114", "role": "Agent", "is_active": True},
    ]
    for row in rows:
        Agent.objects.get_or_create(email=row["email"], defaults=row)


def seed_reports():
    rows = [
        {"property_name": "Luxury Villa Beverly Hills", "report_type": "Sale", "client_name": "Sarah Johnson", "amount": 4250000, "status": "Completed", "notes": "Closed successfully"},
        {"property_name": "Downtown Office Space", "report_type": "Lease", "client_name": "Tech Corp Inc", "amount": 125000, "status": "Pending", "notes": "Awaiting signature"},
    ]
    for row in rows:
        ReportEntry.objects.get_or_create(
            property_name=row["property_name"],
            client_name=row["client_name"],
            defaults=row,
        )


def print_summary():
    print("Database seed complete")
    print("Leads:", Lead.objects.count())
    print("Fresh:", Lead.objects.filter(status=Lead.STATUS_FRESH).count())
    print("Returning:", Lead.objects.filter(status=Lead.STATUS_RETURNING).count())
    print("Untouched:", Lead.objects.filter(status=Lead.STATUS_UNTOUCHED).count())
    print("Unassigned:", Lead.objects.filter(status=Lead.STATUS_UNASSIGNED).count())
    print("Tasks:", Task.objects.count())
    print("Site Visits:", SiteVisit.objects.count())
    print("Projects:", Project.objects.count())
    print("Estate:", Estate.objects.count())
    print("Recent Transactions:", RecentTransaction.objects.count())
    print("Agents:", Agent.objects.count())
    print("Reports:", ReportEntry.objects.count())


if __name__ == "__main__":
    seed_tasks()
    seed_leads_and_visits()
    seed_projects()
    seed_estates()
    seed_recent_transactions()
    seed_agents()
    seed_reports()
    print_summary()
