from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic.base import RedirectView

from core import views as core_views
from properties import views as properties_views


urlpatterns = [
    path(
        "favicon.ico",
        RedirectView.as_view(url="/static/images/crimson1.jpg.png", permanent=True),
        name="favicon",
    ),
    path("admin/", admin.site.urls),
    path("", core_views.login, name="login-root"),
    path("index/", core_views.index, name="index-root"),
    path("index.html", core_views.index, name="index-html"),
    path("dashboard", core_views.index, name="dashboard-root-no-slash"),
    path("dashboard/", core_views.index, name="dashboard-root"),
    path("login/", core_views.login, name="login-page"),
    path("logout/", core_views.logout_view, name="logout-page"),
    path("register/", core_views.register, name="register-page"),
    path("crmhome/", properties_views.crm_home, name="crmhome"),
    path("crmhome.html", properties_views.crm_home, name="crmhome-html"),
    path("services/", core_views.services_page, name="services-page"),
    path("services.html", core_views.services_page, name="services-html"),
    path("user-contact/", core_views.user_contact, name="user-contact"),
    path("user-contact.html", core_views.user_contact, name="user-contact-html"),
    path("marketing/", core_views.marketing, name="marketing"),
    path("marketing.html", core_views.marketing, name="marketing-html"),
    path("lead/", core_views.lead, name="lead"),
    path("lead.html", core_views.lead, name="lead-html"),
    path("lead/create/", core_views.lead_create, name="lead-create"),
    path("listings/", core_views.listings, name="listings"),
    path("listings.html", core_views.listings, name="listings-html"),
    path("library/", core_views.library, name="library"),
    path("library.html", core_views.library, name="library-html"),
    path("contact/", core_views.contact, name="contact"),
    path("contact.html", core_views.contact, name="contact-html"),
    path("deals/", core_views.deals, name="deals"),
    path("deals.html", core_views.deals, name="deals-html"),
    path("estate/", core_views.estate, name="estate"),
    path("add-task/", core_views.add_task, name="add-task"),
    path("complete-task/", core_views.complete_task, name="complete-task"),
    path("task-list/", core_views.task_list, name="task-list"),
    path("task/create/", core_views.task_create, name="task-create"),
    path("tasklist/", core_views.task_list, name="task-list-flat"),
    path("TaskList.html", core_views.task_list, name="task-list-html"),
    path("Tasklist.html", core_views.task_list, name="task-list-html-lower"),
    path("add-project/", core_views.add_project, name="add-project"),
    path("project/", core_views.project, name="project"),
    path("agent/", core_views.agent, name="agent"),
    path("agent/create/", core_views.agent_create, name="agent-create"),
    path("Agent.html", core_views.agent, name="agent-html"),
    path("AgentRegister.html", core_views.agent, name="agent-register-html"),
    path("professional/", core_views.professional, name="professional"),
    path("professional.html", core_views.professional, name="professional-html"),
    path("company/", core_views.company, name="company"),
    path("Company.html", core_views.company, name="company-html"),
    path("report/", core_views.report, name="report"),
    path("report.html", core_views.report, name="report-html"),
    path("Report.html", core_views.report, name="Report-html"),
    path("api/tasks", core_views.tasks_api, name="api-tasks"),
    path("api/tasks/<int:task_id>", core_views.task_detail_api, name="api-task-detail"),
    path("api/property-requests", core_views.property_requests_api, name="api-property-requests"),
    path("api/projects", core_views.projects_api, name="api-projects"),
    path("api/projects/<int:project_id>", core_views.project_detail_api, name="api-project-detail"),
    path("api/leads", core_views.leads_api, name="api-leads"),
    path("api/leads/<int:lead_id>", core_views.lead_detail_api, name="api-lead-detail"),
    path("api/site-visits", core_views.site_visits_api, name="api-site-visits"),
    path("api/estates", properties_views.estates_api, name="api-estates"),
    path("api/staff-users", core_views.staff_users_api, name="api-staff-users"),
    path("api/recent-transactions", core_views.transactions_api, name="api-recent-transactions"),
    path("api/agents", core_views.agents_api, name="api-agents"),
    path("api/reports", core_views.reports_api, name="api-reports"),
    path("api/activities", core_views.activities_api, name="api-activities"),
    path("api/activities/<int:activity_id>", core_views.activity_detail_api, name="api-activity-detail"),
    path("api/crm-summary", core_views.crm_summary_api, name="api-crm-summary"),
    path("apps/crm/", include("crm_app.urls")),
    path("apps/tasklist/", include("tasklist_app.urls")),
    path("apps/project/", include("project_app.urls")),
    path("apps/estate-management/", include("estate_management_app.urls")),
    path("apps/report/", include("report_app.urls")),
    path("apps/agent/", include("agent_app.urls")),
    path("apps/user/", include("user_app.urls")),
    
]

if settings.DEBUG:
    urlpatterns += static(
        settings.STATIC_URL,
        document_root=settings.BASE_DIR / "Real_estate" / "static",
    )
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
