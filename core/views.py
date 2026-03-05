import json
from datetime import date
from functools import wraps

from django.http import HttpResponseNotAllowed, HttpResponseRedirect, JsonResponse
from django.shortcuts import redirect, render
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, get_user_model
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import ensure_csrf_cookie

from dashboard.models import (
    ActivityEntry,
    Agent,
    Estate,
    Lead,
    Project,
    RecentTransaction,
    ReportEntry,
    SiteVisit,
    Task,
)


def authenticated_only(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("/login/")
        return view_func(request, *args, **kwargs)

    return _wrapped


def staff_only(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("/login/")
        if not request.user.is_staff:
            return redirect("/crmhome/")
        return view_func(request, *args, **kwargs)

    return _wrapped


def can_add_estate(user):
    if not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    email = (getattr(user, "email", "") or "").strip().lower()
    if not email:
        return False
    return Agent.objects.filter(email__iexact=email, is_active=True).exists()


def _ensure_default_login_accounts(user_model):
    """Ensure required default user/agent login accounts exist and are active."""
    defaults = [
        {
            "email": "shaikhussain@gmail.com",
            "username": "shaikhussain",
            "password": "crimson@",
            "is_staff": False,
            "is_superuser": False,
        },
        {
            "email": "admin@gmail.com",
            "username": "admin",
            "password": "Agent@123",
            "is_staff": True,
            "is_superuser": True,
        },
    ]

    for row in defaults:
        user_obj = user_model.objects.filter(email__iexact=row["email"]).first()
        if not user_obj:
            username = row["username"]
            if user_model.objects.filter(username__iexact=username).exists():
                username = _build_unique_username(user_model, username)
            user_obj = user_model.objects.create_user(
                username=username,
                email=row["email"],
                password=row["password"],
                is_staff=row["is_staff"],
                is_superuser=row["is_superuser"],
                is_active=True,
            )
            continue

        changed = []
        if user_obj.is_staff != row["is_staff"]:
            user_obj.is_staff = row["is_staff"]
            changed.append("is_staff")
        if user_obj.is_superuser != row["is_superuser"]:
            user_obj.is_superuser = row["is_superuser"]
            changed.append("is_superuser")
        if not user_obj.is_active:
            user_obj.is_active = True
            changed.append("is_active")

        # Keep default credentials working for these two accounts.
        if not user_obj.check_password(row["password"]):
            user_obj.set_password(row["password"])
            changed.append("password")

        if changed:
            if "password" in changed:
                user_obj.save()
            else:
                user_obj.save(update_fields=changed)


@csrf_exempt
@ensure_csrf_cookie
def login(request):
    if request.method == "POST":
        identifier = (request.POST.get("user") or "").strip()
        password = request.POST.get("password") or ""

        if not identifier or not password:
            return render(request, "login.html", {"error": "Enter username/email and password."})

        user_model = get_user_model()
        _ensure_default_login_accounts(user_model)
        username_candidates = []
        if "@" in identifier:
            user_by_email = user_model.objects.filter(email__iexact=identifier).first()
            if user_by_email:
                username_candidates.append(user_by_email.username)
        else:
            user_by_username = user_model.objects.filter(username__iexact=identifier).first()
            if user_by_username:
                username_candidates.append(user_by_username.username)

            # Allow agents to sign in by full name from the Agent table.
            agent_row = Agent.objects.filter(full_name__iexact=identifier).first()
            if agent_row and agent_row.email:
                user_by_agent_email = user_model.objects.filter(email__iexact=agent_row.email).first()
                if user_by_agent_email:
                    username_candidates.append(user_by_agent_email.username)

        username_candidates.append(identifier)

        user = None
        seen = set()
        for username in username_candidates:
            key = str(username).lower()
            if key in seen:
                continue
            seen.add(key)
            user = authenticate(request, username=username, password=password)
            if user:
                break
        if not user:
            return render(
                request,
                "login.html",
                {
                    "error": (
                        "Invalid login credentials. "
                        "Use username/email. User: shaikhussain@gmail.com / crimson@. "
                        "Agent default password is Agent@123."
                    )
                },
            )

        auth_login(request, user)
        if user.is_staff:
            return redirect("/index.html")

        # Non-admin users land on user property pages.
        return redirect("/crmhome/")

    return render(request, "login.html")


def logout_view(request):
    auth_logout(request)
    return redirect("/login/")

@csrf_exempt
@ensure_csrf_cookie
def register(request):
    if request.method == "POST":
        first_name = (request.POST.get("first_name") or "").strip()
        last_name = (request.POST.get("last_name") or "").strip()
        username = (request.POST.get("username") or "").strip()
        email = (request.POST.get("email") or "").strip().lower()
        password = request.POST.get("password") or ""
        confirm_password = request.POST.get("confirm_password") or ""

        if not username or not email or not password:
            return render(request, "register.html", {"error": "All required fields must be filled."})
        if password != confirm_password:
            return render(request, "register.html", {"error": "Passwords do not match."})

        user_model = get_user_model()
        if user_model.objects.filter(username__iexact=username).exists():
            return render(request, "register.html", {"error": "Username already exists."})
        if user_model.objects.filter(email__iexact=email).exists():
            return render(request, "register.html", {"error": "Email already registered."})

        user_model.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        return redirect("/login/?registered=1")

    return render(request, "register.html")


@staff_only
def index(request):
    return render(request, "index.html")


@authenticated_only
@ensure_csrf_cookie
def crm_home(request):
    context = {"can_add_property": can_add_estate(request.user)}
    if request.user.is_staff:
        user_model = get_user_model()
        assignable_users = user_model.objects.filter(is_staff=True, is_active=True).order_by(
            "first_name",
            "last_name",
            "username",
        )
        context["assignable_agents"] = [
            {
                "id": user_obj.id,
                "name": (user_obj.get_full_name() or user_obj.username).strip(),
                "email": (user_obj.email or "").strip(),
            }
            for user_obj in assignable_users
        ]
    return render(request, "crmhome.html", context)


@staff_only
def staff_users_api(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    user_model = get_user_model()
    rows = user_model.objects.filter(is_staff=True, is_active=True).order_by(
        "first_name",
        "last_name",
        "username",
    )
    return JsonResponse(
        [
            {
                "id": user_obj.id,
                "name": (user_obj.get_full_name() or user_obj.username).strip(),
                "email": (user_obj.email or "").strip(),
            }
            for user_obj in rows
        ],
        safe=False,
    )


@authenticated_only
def services_page(request):
    return render(request, "services.html")


@authenticated_only
def user_contact(request):
    return render(request, "user_contact.html")


@staff_only
def marketing(request):
    return render(request, "Marketing.html")


@staff_only
def lead(request):
    return render(request, "Lead.html")


@staff_only
@csrf_exempt
def lead_create(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    name = (request.POST.get("name") or "").strip()
    if not name:
        return redirect("/lead/?saved=0")

    created_date, _ = _parse_date(request.POST.get("created_date"), "created_date")
    next_follow_up, _ = _parse_date(request.POST.get("next_follow_up"), "next_follow_up")

    Lead.objects.create(
        name=name,
        enquiry=(request.POST.get("enquiry") or "").strip(),
        created_date=created_date,
        next_follow_up=next_follow_up,
        owner=(request.POST.get("owner") or "").strip(),
        status=(request.POST.get("status") or Lead.STATUS_FRESH).strip() or Lead.STATUS_FRESH,
        image=request.FILES.get("image"),
    )
    return redirect("/lead/?saved=1")


@staff_only
def listings(request):
    return render(request, "Listings.html")


@staff_only
def library(request):
    return render(request, "Library.html")


@staff_only
def contact(request):
    return render(request, "contact.html")


@staff_only
def deals(request):
    return render(request, "deals.html")


@staff_only
def estate(request):
    return render(request, "estate.html")


@staff_only
def add_task(request):
    return render(request, "AddTask.html")


@staff_only
def complete_task(request):
    return render(request, "completeTask.html")


@staff_only
def task_list(request):
    return render(request, "TaskList.html")

@staff_only
@csrf_exempt
def task_create(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    title = (request.POST.get("title") or "").strip()
    if not title:
        return redirect("/task-list/?saved=0")

    due_date, _ = _parse_date(request.POST.get("due_date"), "due_date")

    Task.objects.create(
        title=title,
        description=(request.POST.get("description") or "").strip(),
        task_type=(request.POST.get("task_type") or "").strip(),
        priority=(request.POST.get("priority") or "Normal").strip() or "Normal",
        due_date=due_date,
        status=(request.POST.get("status") or "Pending").strip() or "Pending",
    )
    return redirect("/task-list/?saved=1")


@staff_only
def add_project(request):
    return render(request, "Addproject.html")


@staff_only
def project(request):
    return render(request, "project.html")


@staff_only
def agent(request):
    user_model = get_user_model()
    staff_users = user_model.objects.filter(is_staff=True).order_by("first_name", "last_name", "username")
    staff_user_ids = list(staff_users.values_list("id", flat=True))
    assigned_by_user = {}
    if staff_user_ids:
        assigned_rows = Estate.objects.filter(created_by_id__in=staff_user_ids).values_list("created_by_id", "title")
        for user_id, title in assigned_rows:
            if user_id not in assigned_by_user:
                assigned_by_user[user_id] = []
            assigned_by_user[user_id].append((title or "").strip())

    staff_agents = []
    for user_obj in staff_users:
        display_name = (user_obj.get_full_name() or user_obj.username or "").strip()
        assigned_properties = assigned_by_user.get(user_obj.id, [])
        staff_agents.append(
            {
                "id": user_obj.id,
                "name": display_name,
                "username": user_obj.username,
                "email": (user_obj.email or "").strip(),
                "is_active": user_obj.is_active,
                "assigned_properties": assigned_properties,
                "assigned_property_count": len(assigned_properties),
            }
        )
    return render(request, "Agent.html", {"staff_agents": staff_agents})


@staff_only
def agent_create(request):
    if request.method != "POST":
        return redirect("/agent/")

    first_name = (request.POST.get("first_name") or "").strip()
    last_name = (request.POST.get("last_name") or "").strip()
    email = (request.POST.get("email") or "").strip().lower()
    date_of_birth, _ = _parse_date(request.POST.get("dob"), "dob")
    license_expiry_date, license_expiry_error = _parse_date(
        request.POST.get("license_expiry_date"),
        "license_expiry_date",
    )
    years_raw = (request.POST.get("years_of_experience") or "").strip()
    years_of_experience = None
    if years_raw:
        try:
            years_of_experience = int(years_raw)
        except ValueError:
            return redirect("/agent/?saved=0")
        if years_of_experience < 0:
            return redirect("/agent/?saved=0")

    license_number = (request.POST.get("license_number") or "").strip()
    license_state = (request.POST.get("license_state") or "").strip()
    specialization = (request.POST.get("specialization") or "").strip()
    full_name = (first_name + " " + last_name).strip()
    if not full_name:
        full_name = (request.POST.get("full_name") or "").strip()

    if license_expiry_error:
        return redirect("/agent/?saved=0")

    if not full_name or not email or not license_number or not license_state or not specialization:
        return redirect("/agent/?saved=0")

    with transaction.atomic():
        Agent.objects.create(
            first_name=first_name,
            last_name=last_name,
            full_name=full_name,
            email=email,
            phone=(request.POST.get("phone") or "").strip(),
            date_of_birth=date_of_birth,
            license_number=license_number,
            license_state=license_state,
            license_expiry_date=license_expiry_date,
            years_of_experience=years_of_experience,
            specialization=specialization,
            languages_spoken=(request.POST.get("languages_spoken") or "").strip(),
            certifications=(request.POST.get("certifications") or "").strip(),
            role=(request.POST.get("role") or "Agent").strip() or "Agent",
            is_active=True,
        )

        user_model = get_user_model()
        existing_user = user_model.objects.filter(email__iexact=email).first()
        if existing_user:
            updated_fields = []
            if not existing_user.is_staff:
                existing_user.is_staff = True
                updated_fields.append("is_staff")
            if first_name and existing_user.first_name != first_name:
                existing_user.first_name = first_name
                updated_fields.append("first_name")
            if last_name and existing_user.last_name != last_name:
                existing_user.last_name = last_name
                updated_fields.append("last_name")
            if updated_fields:
                existing_user.save(update_fields=updated_fields)
        else:
            username = _build_unique_username(user_model, email.split("@", 1)[0])
            user_model.objects.create_user(
                username=username,
                email=email,
                password="Agent@123",
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
            )
    return redirect("/agent/?saved=1")


@staff_only
def professional(request):
    return redirect("/Agent.html")


@staff_only
def company(request):
    return redirect("/Agent.html")


@staff_only
def report(request):
    return render(request, "Report.html")


def _parse_date(raw_value, field_name):
    if not raw_value:
        return None, None
    try:
        return date.fromisoformat(str(raw_value)), None
    except ValueError:
        return None, f"{field_name} must be YYYY-MM-DD"


def _build_unique_username(user_model, base_name):
    base = (base_name or "agent").strip().replace(" ", "_") or "agent"
    username = base
    suffix = 1
    while user_model.objects.filter(username__iexact=username).exists():
        username = f"{base}{suffix}"
        suffix += 1
    return username


def _task_to_dict(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "task_type": task.task_type,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else "",
        "status": task.status,
    }


def _project_to_dict(project):
    return {
        "id": project.id,
        "project_name": project.project_name,
        "project_date": project.project_date.isoformat() if project.project_date else "",
        "file_name": project.file_name,
        "chat_title": project.chat_title,
        "project_status": project.project_status,
        "document_type": project.document_type,
        "share_with": project.share_with,
    }


def _lead_to_dict(lead_obj):
    return {
        "id": lead_obj.id,
        "name": lead_obj.name,
        "enquiry": lead_obj.enquiry,
        "created_date": lead_obj.created_date.isoformat() if lead_obj.created_date else "",
        "next_follow_up": lead_obj.next_follow_up.isoformat() if lead_obj.next_follow_up else "",
        "owner": lead_obj.owner,
        "status": lead_obj.status,
        "img": lead_obj.image.url if getattr(lead_obj, "image", None) else "",
    }


def _site_visit_to_dict(site_visit):
    return {
        "id": site_visit.id,
        "lead_id": site_visit.lead_id,
        "lead_name": site_visit.lead.name,
        "visit_date": site_visit.visit_date.isoformat(),
        "notes": site_visit.notes,
        "status": site_visit.status,
    }


def _estate_to_dict(estate_obj):
    created_by = getattr(estate_obj, "created_by", None)
    return {
        "id": estate_obj.id,
        "title": estate_obj.title,
        "estate_type": estate_obj.estate_type,
        "location": estate_obj.location,
        "price": float(estate_obj.price),
        "status": estate_obj.status,
        "created_by_id": created_by.id if created_by else None,
        "created_by_name": (
            (created_by.get_full_name() or created_by.username).strip()
            if created_by
            else ""
        ),
    }


def _transaction_to_dict(txn):
    return {
        "id": txn.id,
        "property_name": txn.property_name,
        "transaction_type": txn.transaction_type,
        "client_name": txn.client_name,
        "amount": float(txn.amount),
        "status": txn.status,
    }


def _agent_to_dict(agent_obj):
    return {
        "id": agent_obj.id,
        "first_name": getattr(agent_obj, "first_name", ""),
        "last_name": getattr(agent_obj, "last_name", ""),
        "full_name": agent_obj.full_name,
        "email": agent_obj.email,
        "phone": agent_obj.phone,
        "date_of_birth": agent_obj.date_of_birth.isoformat() if getattr(agent_obj, "date_of_birth", None) else "",
        "license_number": getattr(agent_obj, "license_number", ""),
        "license_state": getattr(agent_obj, "license_state", ""),
        "license_expiry_date": (
            agent_obj.license_expiry_date.isoformat()
            if getattr(agent_obj, "license_expiry_date", None)
            else ""
        ),
        "years_of_experience": getattr(agent_obj, "years_of_experience", None),
        "specialization": getattr(agent_obj, "specialization", ""),
        "languages_spoken": getattr(agent_obj, "languages_spoken", ""),
        "certifications": getattr(agent_obj, "certifications", ""),
        "role": agent_obj.role,
        "is_active": agent_obj.is_active,
    }


def _report_to_dict(report_obj):
    return {
        "id": report_obj.id,
        "property_name": report_obj.property_name,
        "report_type": report_obj.report_type,
        "client_name": report_obj.client_name,
        "amount": float(report_obj.amount),
        "status": report_obj.status,
        "notes": report_obj.notes,
    }

def _activity_to_dict(activity_obj):
    return {
        "id": activity_obj.id,
        "title": activity_obj.title,
        "activity_type": activity_obj.activity_type,
        "activity_date": activity_obj.activity_date.isoformat() if activity_obj.activity_date else "",
        "notes": activity_obj.notes,
    }


def _load_payload(request):
    content_type = (request.content_type or "").lower()

    if request.method == "POST" and (
        "multipart/form-data" in content_type
        or "application/x-www-form-urlencoded" in content_type
    ):
        return request.POST.dict(), None

    raw_bytes = request.body or b""
    try:
        raw_body = raw_bytes.decode("utf-8").strip()
    except UnicodeDecodeError:
        raw_body = ""

    # Accept normal form posts as a fallback when client-side JSON submit fails.
    if not raw_body and request.method == "POST":
        if request.POST:
            return request.POST.dict(), None
        return {}, None

    if "application/json" in content_type:
        try:
            return json.loads(raw_body or "{}"), None
        except json.JSONDecodeError:
            return None, JsonResponse({"error": "Invalid JSON"}, status=400)

    # Fallback: try JSON first, then form/querydict payload.
    try:
        return json.loads(raw_body or "{}"), None
    except json.JSONDecodeError:
        if request.method == "POST":
            return request.POST.dict(), None
        return None, JsonResponse({"error": "Invalid request payload"}, status=400)


@staff_only
@csrf_exempt
def tasks_api(request):
    if request.method == "GET":
        return JsonResponse([_task_to_dict(t) for t in Task.objects.all()], safe=False)

    if request.method == "POST":
        payload, error = _load_payload(request)
        if error:
            return error

        title = (payload.get("title") or "").strip()
        if not title:
            return JsonResponse({"error": "title is required"}, status=400)

        due_date, date_error = _parse_date(payload.get("due_date"), "due_date")
        if date_error:
            return JsonResponse({"error": date_error}, status=400)

        task = Task.objects.create(
            title=title,
            description=(payload.get("description") or "").strip(),
            task_type=(payload.get("task_type") or payload.get("type") or "").strip(),
            priority=(payload.get("priority") or "Normal").strip() or "Normal",
            due_date=due_date,
            status=(payload.get("status") or "Pending").strip() or "Pending",
        )
        return JsonResponse(_task_to_dict(task), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@staff_only
@csrf_exempt
def task_detail_api(request, task_id):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return JsonResponse({"error": "Task not found"}, status=404)

    task.delete()
    return JsonResponse({"ok": True})


@staff_only
@csrf_exempt
def projects_api(request):
    if request.method == "GET":
        return JsonResponse([_project_to_dict(p) for p in Project.objects.all()], safe=False)

    if request.method == "POST":
        payload, error = _load_payload(request)
        if error:
            return error

        project_name = (payload.get("project_name") or "").strip()
        if not project_name:
            return JsonResponse({"error": "project_name is required"}, status=400)

        project_date, date_error = _parse_date(payload.get("project_date"), "project_date")
        if date_error:
            return JsonResponse({"error": date_error}, status=400)

        project = Project.objects.create(
            project_name=project_name,
            project_date=project_date,
            file_name=(payload.get("file_name") or "").strip(),
            chat_title=(payload.get("chat_title") or "").strip(),
            project_status=(payload.get("project_status") or "Active").strip() or "Active",
            document_type=(payload.get("document_type") or "").strip(),
            share_with=(payload.get("share_with") or "").strip(),
        )
        return JsonResponse(_project_to_dict(project), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@authenticated_only
@csrf_exempt
def property_requests_api(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    payload, error = _load_payload(request)
    if error:
        return error

    title = (payload.get("title") or payload.get("property_title") or "").strip()
    property_type = (payload.get("type") or payload.get("property_type") or "").strip()
    location = (payload.get("location") or payload.get("property_location") or "").strip()
    price = str(payload.get("price") or payload.get("property_price") or "").strip()
    purpose = (payload.get("purpose") or payload.get("request_type") or "Property Request").strip()
    if not title:
        return JsonResponse({"error": "title is required"}, status=400)

    user = request.user
    requester_name = (user.get_full_name() or user.username or "Customer").strip()
    owner_name = (payload.get("owner") or requester_name).strip()

    enquiry_parts = [p for p in [title, property_type, location, price] if p]
    enquiry_text = " | ".join(enquiry_parts) if enquiry_parts else "Property"
    enquiry = f"{purpose}: {enquiry_text}"[:100]

    today = date.today()
    existing = Lead.objects.filter(
        name__iexact=requester_name,
        enquiry__iexact=enquiry,
        owner__iexact=owner_name,
        created_date=today,
    ).first()
    if existing:
        return JsonResponse(
            {"ok": True, "created": False, "lead": _lead_to_dict(existing)}
        )

    lead_obj = Lead.objects.create(
        name=requester_name[:255],
        enquiry=enquiry,
        created_date=today,
        owner=owner_name[:255],
        status=Lead.STATUS_FRESH,
        email=(getattr(user, "email", "") or "").strip().lower(),
    )
    return JsonResponse(
        {"ok": True, "created": True, "lead": _lead_to_dict(lead_obj)},
        status=201,
    )


@staff_only
@csrf_exempt
def project_detail_api(request, project_id):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    try:
        project_obj = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Project not found"}, status=404)

    project_obj.delete()
    return JsonResponse({"ok": True})


@staff_only
@csrf_exempt
def leads_api(request):
    if request.method == "GET":
        return JsonResponse([_lead_to_dict(l) for l in Lead.objects.all()], safe=False)

    if request.method == "POST":
        payload, error = _load_payload(request)
        if error:
            return error

        name = (payload.get("name") or "").strip()
        if not name:
            return JsonResponse({"error": "name is required"}, status=400)

        created_date, created_error = _parse_date(payload.get("created_date"), "created_date")
        if created_error:
            return JsonResponse({"error": created_error}, status=400)

        next_follow_up, follow_error = _parse_date(payload.get("next_follow_up"), "next_follow_up")
        if follow_error:
            return JsonResponse({"error": follow_error}, status=400)

        lead_obj = Lead.objects.create(
            name=name,
            enquiry=(payload.get("enquiry") or "").strip(),
            created_date=created_date,
            next_follow_up=next_follow_up,
            owner=(payload.get("owner") or "").strip(),
            status=(payload.get("status") or Lead.STATUS_FRESH).strip() or Lead.STATUS_FRESH,
            image=request.FILES.get("image"),
        )
        return JsonResponse(_lead_to_dict(lead_obj), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@staff_only
@csrf_exempt
def lead_detail_api(request, lead_id):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    try:
        lead_obj = Lead.objects.get(id=lead_id)
    except Lead.DoesNotExist:
        return JsonResponse({"error": "Lead not found"}, status=404)

    lead_obj.delete()
    return JsonResponse({"ok": True})


@staff_only
@csrf_exempt
def site_visits_api(request):
    if request.method == "GET":
        rows = SiteVisit.objects.select_related("lead").all()
        return JsonResponse([_site_visit_to_dict(v) for v in rows], safe=False)

    if request.method == "POST":
        payload, error = _load_payload(request)
        if error:
            return error

        lead_id = payload.get("lead_id")
        if not lead_id:
            return JsonResponse({"error": "lead_id is required"}, status=400)

        try:
            lead_obj = Lead.objects.get(id=lead_id)
        except Lead.DoesNotExist:
            return JsonResponse({"error": "Lead not found"}, status=404)

        visit_date, date_error = _parse_date(payload.get("visit_date"), "visit_date")
        if date_error:
            return JsonResponse({"error": date_error}, status=400)
        if not visit_date:
            return JsonResponse({"error": "visit_date is required"}, status=400)

        site_visit = SiteVisit.objects.create(
            lead=lead_obj,
            visit_date=visit_date,
            notes=(payload.get("notes") or "").strip(),
            status=(payload.get("status") or "Scheduled").strip() or "Scheduled",
        )
        return JsonResponse(_site_visit_to_dict(site_visit), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@authenticated_only
@csrf_exempt
def estates_api(request):
    if request.method == "GET":
        return JsonResponse([_estate_to_dict(e) for e in Estate.objects.all()], safe=False)

    if request.method == "POST":
        if not can_add_estate(request.user):
            return JsonResponse({"error": "Only staff or agent users can add properties"}, status=403)

        payload, error = _load_payload(request)
        if error:
            return error

        title = (payload.get("title") or "").strip()
        if not title:
            return JsonResponse({"error": "title is required"}, status=400)

        assigned_user = request.user
        assigned_agent_raw = str(payload.get("assigned_agent_id") or "").strip()
        if request.user.is_staff and assigned_agent_raw:
            try:
                assigned_agent_id = int(assigned_agent_raw)
            except (TypeError, ValueError):
                return JsonResponse({"error": "assigned_agent_id must be a valid integer"}, status=400)

            user_model = get_user_model()
            assigned_user = user_model.objects.filter(id=assigned_agent_id, is_active=True).first()
            if not assigned_user:
                return JsonResponse({"error": "Assigned agent not found"}, status=404)
            if not assigned_user.is_staff:
                return JsonResponse({"error": "Assigned agent must be a staff user"}, status=400)

        estate_obj = Estate.objects.create(
            title=title,
            estate_type=(payload.get("estate_type") or "").strip(),
            location=(payload.get("location") or "").strip(),
            price=payload.get("price") or 0,
            status=(payload.get("status") or "Available").strip() or "Available",
            created_by=assigned_user,
        )
        return JsonResponse(_estate_to_dict(estate_obj), status=201)

    if request.method in ("PUT", "PATCH"):
        if not can_add_estate(request.user):
            return JsonResponse({"error": "Only staff or agent users can edit properties"}, status=403)

        payload, error = _load_payload(request)
        if error:
            return error

        estate_id_raw = payload.get("id") or payload.get("estate_id")
        try:
            estate_id = int(estate_id_raw)
        except (TypeError, ValueError):
            return JsonResponse({"error": "id is required and must be a valid integer"}, status=400)

        try:
            estate_obj = Estate.objects.get(id=estate_id)
        except Estate.DoesNotExist:
            return JsonResponse({"error": "Estate not found"}, status=404)

        # Non-staff users can only update properties assigned to themselves.
        if not request.user.is_staff and estate_obj.created_by_id != request.user.id:
            return JsonResponse({"error": "You can only edit your assigned properties"}, status=403)

        title = (payload.get("title") or "").strip()
        if title:
            estate_obj.title = title
        estate_obj.estate_type = (payload.get("estate_type") or estate_obj.estate_type or "").strip()
        estate_obj.location = (payload.get("location") or estate_obj.location or "").strip()
        if payload.get("price") is not None:
            estate_obj.price = payload.get("price") or 0
        estate_obj.status = (payload.get("status") or estate_obj.status or "Available").strip() or "Available"

        assigned_user = estate_obj.created_by
        assigned_agent_raw = str(payload.get("assigned_agent_id") or "").strip()
        if request.user.is_staff and assigned_agent_raw:
            try:
                assigned_agent_id = int(assigned_agent_raw)
            except (TypeError, ValueError):
                return JsonResponse({"error": "assigned_agent_id must be a valid integer"}, status=400)
            user_model = get_user_model()
            assigned_user = user_model.objects.filter(id=assigned_agent_id, is_active=True).first()
            if not assigned_user:
                return JsonResponse({"error": "Assigned agent not found"}, status=404)
            if not assigned_user.is_staff:
                return JsonResponse({"error": "Assigned agent must be a staff user"}, status=400)
        if assigned_user is not None:
            estate_obj.created_by = assigned_user

        estate_obj.save()
        return JsonResponse(_estate_to_dict(estate_obj), status=200)

    return HttpResponseNotAllowed(["GET", "POST", "PUT", "PATCH"])


@staff_only
@csrf_exempt
def transactions_api(request):
    if request.method == "GET":
        return JsonResponse([_transaction_to_dict(t) for t in RecentTransaction.objects.all()], safe=False)

    if request.method == "POST":
        payload, error = _load_payload(request)
        if error:
            return error

        property_name = (payload.get("property_name") or "").strip()
        if not property_name:
            return JsonResponse({"error": "property_name is required"}, status=400)

        txn = RecentTransaction.objects.create(
            property_name=property_name,
            transaction_type=(payload.get("transaction_type") or RecentTransaction.TYPE_SALE).strip() or RecentTransaction.TYPE_SALE,
            client_name=(payload.get("client_name") or "").strip(),
            amount=payload.get("amount") or 0,
            status=(payload.get("status") or RecentTransaction.STATUS_PENDING).strip() or RecentTransaction.STATUS_PENDING,
        )
        return JsonResponse(_transaction_to_dict(txn), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@staff_only
@csrf_exempt
def agents_api(request):
    if request.method == "GET":
        return JsonResponse([_agent_to_dict(a) for a in Agent.objects.all()], safe=False)

    if request.method == "POST":
        payload, error = _load_payload(request)
        if error:
            return error

        full_name = (payload.get("full_name") or "").strip()
        first_name = (payload.get("first_name") or "").strip()
        last_name = (payload.get("last_name") or "").strip()
        if not full_name and (first_name or last_name):
            full_name = (first_name + " " + last_name).strip()
        if not full_name:
            return JsonResponse({"error": "full_name is required"}, status=400)
        date_of_birth, date_error = _parse_date(payload.get("date_of_birth"), "date_of_birth")
        if date_error:
            return JsonResponse({"error": date_error}, status=400)
        license_expiry_date, license_expiry_error = _parse_date(
            payload.get("license_expiry_date"),
            "license_expiry_date",
        )
        if license_expiry_error:
            return JsonResponse({"error": license_expiry_error}, status=400)

        years_raw = str(payload.get("years_of_experience") or "").strip()
        years_of_experience = None
        if years_raw:
            try:
                years_of_experience = int(years_raw)
            except ValueError:
                return JsonResponse({"error": "years_of_experience must be a whole number"}, status=400)
            if years_of_experience < 0:
                return JsonResponse({"error": "years_of_experience must be >= 0"}, status=400)

        agent_obj = Agent.objects.create(
            first_name=first_name,
            last_name=last_name,
            full_name=full_name,
            email=(payload.get("email") or "").strip(),
            phone=(payload.get("phone") or "").strip(),
            date_of_birth=date_of_birth,
            license_number=(payload.get("license_number") or "").strip(),
            license_state=(payload.get("license_state") or "").strip(),
            license_expiry_date=license_expiry_date,
            years_of_experience=years_of_experience,
            specialization=(payload.get("specialization") or "").strip(),
            languages_spoken=(payload.get("languages_spoken") or "").strip(),
            certifications=(payload.get("certifications") or "").strip(),
            role=(payload.get("role") or "Agent").strip() or "Agent",
            is_active=bool(payload.get("is_active", True)),
        )
        return JsonResponse(_agent_to_dict(agent_obj), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@staff_only
@csrf_exempt
def reports_api(request):
    if request.method == "GET":
        return JsonResponse([_report_to_dict(r) for r in ReportEntry.objects.all()], safe=False)

    if request.method == "POST":
        payload, error = _load_payload(request)
        if error:
            return error

        property_name = (payload.get("property_name") or "").strip()
        if not property_name:
            return JsonResponse({"error": "property_name is required"}, status=400)

        report_obj = ReportEntry.objects.create(
            property_name=property_name,
            report_type=(payload.get("report_type") or "").strip(),
            client_name=(payload.get("client_name") or "").strip(),
            amount=payload.get("amount") or 0,
            status=(payload.get("status") or "Pending").strip() or "Pending",
            notes=(payload.get("notes") or "").strip(),
        )
        return JsonResponse(_report_to_dict(report_obj), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@staff_only
@csrf_exempt
def activities_api(request):
    if request.method == "GET":
        return JsonResponse([_activity_to_dict(a) for a in ActivityEntry.objects.all()], safe=False)

    if request.method == "POST":
        payload, error = _load_payload(request)
        if error:
            return error

        title = (payload.get("title") or "").strip()
        if not title:
            return JsonResponse({"error": "title is required"}, status=400)

        activity_date, date_error = _parse_date(payload.get("activity_date"), "activity_date")
        if date_error:
            return JsonResponse({"error": date_error}, status=400)

        activity_obj = ActivityEntry.objects.create(
            title=title,
            activity_type=(payload.get("activity_type") or ActivityEntry.TYPE_OTHER).strip() or ActivityEntry.TYPE_OTHER,
            activity_date=activity_date,
            notes=(payload.get("notes") or "").strip(),
        )
        return JsonResponse(_activity_to_dict(activity_obj), status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@staff_only
@csrf_exempt
def activity_detail_api(request, activity_id):
    if request.method != "DELETE":
        return HttpResponseNotAllowed(["DELETE"])

    try:
        activity_obj = ActivityEntry.objects.get(id=activity_id)
    except ActivityEntry.DoesNotExist:
        return JsonResponse({"error": "Activity not found"}, status=404)

    activity_obj.delete()
    return JsonResponse({"ok": True})


@staff_only
def crm_summary_api(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    data = {
        "lead_total": Lead.objects.count(),
        "fresh_lead": Lead.objects.filter(status=Lead.STATUS_FRESH).count(),
        "returning": Lead.objects.filter(status=Lead.STATUS_RETURNING).count(),
        "untouched": Lead.objects.filter(status=Lead.STATUS_UNTOUCHED).count(),
        "unassigned": Lead.objects.filter(status=Lead.STATUS_UNASSIGNED).count(),
        "tasks": Task.objects.count(),
        "site_visits": SiteVisit.objects.count(),
        "projects": Project.objects.count(),
        "estate": Estate.objects.count(),
        "recent_transactions": RecentTransaction.objects.count(),
        "agents": Agent.objects.count(),
        "reports": ReportEntry.objects.count(),
        "activities_total": ActivityEntry.objects.count(),
        "activities_meeting": ActivityEntry.objects.filter(activity_type=ActivityEntry.TYPE_MEETING).count(),
        "activities_call": ActivityEntry.objects.filter(activity_type=ActivityEntry.TYPE_CALL).count(),
        "activities_mail": ActivityEntry.objects.filter(activity_type=ActivityEntry.TYPE_MAIL).count(),
        "activities_other": ActivityEntry.objects.filter(activity_type=ActivityEntry.TYPE_OTHER).count(),
    }
    return JsonResponse(data)


def legacy_static(request, asset_path):
    return HttpResponseRedirect(f"/static/{asset_path}")


def legacy_asset(request, folder, asset_path):
    return HttpResponseRedirect(f"/static/{folder}/{asset_path}")


def legacy_image_root(request, asset_name):
    return HttpResponseRedirect(f"/static/images/{asset_name}")
