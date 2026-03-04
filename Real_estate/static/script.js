// Safe DOM access and navigation handlers
document.addEventListener("DOMContentLoaded", function () {
  const menu = document.querySelectorAll(".sidebar ul li");
  if (menu && menu.length) {
    menu.forEach(item => {
      item.addEventListener("click", () => {
        menu.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
      });
    });
  }

  console.log("CRM Dashboard Loaded");

  const estateLink = document.getElementById("estateLink");
  if (estateLink) {
    estateLink.addEventListener("click", function () {
      window.location.href = "/estate/";
    });
  }

  const taskListLink = document.getElementById("Task ListLink") || document.getElementById("TaskListLink") || document.getElementById("taskListLink");
  if (taskListLink) {
    taskListLink.addEventListener("click", function () {
      window.location.href = "/task-list/";
    });
  }

  const projectLink = document.getElementById("projectLink");
  if (projectLink) {
    projectLink.addEventListener("click", function () {
      window.location.href = "/project/";
    });
  }

  const dashboardLink = document.getElementById("dashboardLink");
  if (dashboardLink) {
    dashboardLink.addEventListener("click", function () {
      window.location.href = "/dashboard/";
    });
  }

  const crmhomeLink = document.getElementById("crmhomeLink");
  if (crmhomeLink) {
    crmhomeLink.addEventListener("click", function () {
      window.location.href = "/crmhome/";
    });

    const query = new URLSearchParams(window.location.search);
    if (query.get("view") === "crmhome") {
      window.location.replace("/crmhome/");
    }
  }

  const reportLink = document.getElementById("ReportLink");
  if (reportLink) {
    reportLink.addEventListener("click", function () {
      window.location.href = "/Report.html";
    });
  }
  const AgentLink = document.getElementById("AgentLink");
  if (AgentLink) {
    AgentLink.addEventListener("click",function(){
      window.location.href ="/agent/";
    });
  }

  const myPerformanceLeadsCard = document.getElementById("myPerformanceLeadsCard");
  if (myPerformanceLeadsCard) {
    myPerformanceLeadsCard.style.cursor = "pointer";
    myPerformanceLeadsCard.addEventListener("click", function () {
      window.openLeadDetailsModal();
    });
  }

  const leadDetailModalClose = document.getElementById("leadDetailModalClose");
  if (leadDetailModalClose) {
    leadDetailModalClose.addEventListener("click", function () {
      window.closeLeadDetailsModal();
    });
  }

  window.addEventListener("click", function (event) {
    const modal = document.getElementById("leadDetailModal");
    if (modal && event.target === modal) {
      window.closeLeadDetailsModal();
    }
  });

  // expose simple navigations if other scripts call them
  window.goDashboard = function () { window.location.href = "/dashboard/"; };
  window.gohome = function () { window.location.href = "/index/"; };
  window.gocontact = function () { window.location.href = "/contact/"; };
});

window.openLeadDetailsModal = function () {
  const modal = document.getElementById("leadDetailModal");
  if (modal) {
    modal.style.display = "block";
  }
};

window.closeLeadDetailsModal = function () {
  const modal = document.getElementById("leadDetailModal");
  if (modal) {
    modal.style.display = "none";
  }
};

// searchCard needs to be globally accessible for inline onkeyup handlers
window.searchCard = function () {
  const inputEl = document.getElementById("searchInput");
  if (!inputEl) return;
  const input = inputEl.value.toLowerCase();
  const cards = document.querySelectorAll(".card");

  cards.forEach(card => {
    const titleEl = card.querySelector("h3");
    const title = titleEl ? titleEl.innerText.toLowerCase() : "";
    if (title.includes(input)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
};

// small helpers used in some pages
window.goHome = function () { window.location.href = "/crmhome/"; };



var cachedLeads = [];

function normalizeLead(lead) {
  return {
    name: lead && lead.name ? lead.name : "",
    enquiry: lead && lead.enquiry ? lead.enquiry : "",
    created: lead && (lead.created || lead.created_date) ? (lead.created || lead.created_date) : "",
    next: lead && (lead.next || lead.next_follow_up) ? (lead.next || lead.next_follow_up) : "",
    status: lead && lead.status ? lead.status : "",
    owner: lead && lead.owner ? lead.owner : ""
  };
}

async function fetchLeadsFromApi() {
  try {
    var res = await fetch("/api/leads", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load leads");
    var rows = await res.json();
    cachedLeads = (Array.isArray(rows) ? rows : []).map(normalizeLead);
    return cachedLeads.slice();
  } catch (e) {
    return cachedLeads.slice();
  }
}

function getSavedLeads() {
  return cachedLeads.slice();
}

function esc(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLeadRows(leads) {
  if (!leads.length) {
    return "<tr><td colspan='6' style='text-align:center;color:#666;'>No lead data found.</td></tr>";
  }

  return leads.map(function (lead) {
    var row = normalizeLead(lead);
    return "<tr>" +
      "<td>" + esc(row.name) + "</td>" +
      "<td>" + esc(row.enquiry) + "</td>" +
      "<td>" + esc(row.created) + "</td>" +
      "<td>" + esc(row.next) + "</td>" +
      "<td>" + esc(row.status) + "</td>" +
      "<td>" + esc(row.owner) + "</td>" +
    "</tr>";
  }).join("");
}

function escHtml(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTaskRows(tasks) {
  if (!tasks || !tasks.length) {
    return "<tr><td colspan='6' style='text-align:center;color:#666;'>No task data found.</td></tr>";
  }
  return tasks.map(function (t) {
    return "<tr>" +
      "<td>" + escHtml(t.title) + "</td>" +
      "<td>" + escHtml(t.description) + "</td>" +
      "<td>" + escHtml(t.task_type) + "</td>" +
      "<td>" + escHtml(t.priority) + "</td>" +
      "<td>" + escHtml(t.due_date) + "</td>" +
      "<td>" + escHtml(t.status) + "</td>" +
    "</tr>";
  }).join("");
}

function renderSiteVisitRows(visits) {
  if (!visits || !visits.length) {
    return "<tr><td colspan='4' style='text-align:center;color:#666;'>No site visit data found.</td></tr>";
  }
  return visits.map(function (v) {
    return "<tr>" +
      "<td>" + escHtml(v.lead_name) + "</td>" +
      "<td>" + escHtml(v.visit_date) + "</td>" +
      "<td>" + escHtml(v.status) + "</td>" +
      "<td>" + escHtml(v.notes) + "</td>" +
    "</tr>";
  }).join("");
}

function renderActivityRows(rows) {
  if (!rows || !rows.length) {
    return "<tr><td colspan='4' style='text-align:center;color:#666;'>No activity data found.</td></tr>";
  }
  return rows.map(function (a) {
    return "<tr>" +
      "<td>" + escHtml(a.title) + "</td>" +
      "<td>" + escHtml(a.activity_type) + "</td>" +
      "<td>" + escHtml(a.activity_date) + "</td>" +
      "<td>" + escHtml(a.notes) + "</td>" +
    "</tr>";
  }).join("");
}

function countActivitiesByType(rows, typeName) {
  var wanted = String(typeName || "").toLowerCase();
  return rows.filter(function (a) {
    return String((a && a.activity_type) || "").toLowerCase() === wanted;
  }).length;
}

async function addActivityRecord(defaultType) {
  var title = window.prompt("Enter activity title:");
  if (title === null) return;
  title = String(title || "").trim();
  if (!title) {
    alert("Activity title is required.");
    return;
  }

  var activityType = window.prompt("Activity Type (Meeting/Call/Mail/Other):", defaultType || "Other");
  if (activityType === null) return;
  activityType = String(activityType || "Other").trim() || "Other";

  var activityDate = window.prompt("Activity date (YYYY-MM-DD):", "");
  if (activityDate === null) return;
  activityDate = String(activityDate || "").trim();

  var notes = window.prompt("Notes (optional):", "");
  if (notes === null) return;

  try {
    var res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        activity_type: activityType,
        activity_date: activityDate,
        notes: notes || "",
      })
    });
    if (!res.ok) {
      var txt = await res.text();
      throw new Error(txt || "Save failed");
    }
    await updateDashboardCounts();
    alert("Activity saved to database.");
  } catch (e) {
    alert("Unable to save activity: " + (e.message || "Unknown error"));
  }
}

async function openActivityDetailsModal(title, types) {
  var modal = document.getElementById("leadPageModal");
  var frame = document.getElementById("leadPageFrame");
  if (modal) modal.style.display = "block";
  if (!frame) return;

  frame.src = "about:blank";
  frame.srcdoc = "<!DOCTYPE html><html><body style='font-family:Segoe UI,Arial,sans-serif;margin:20px;'>Loading activity details...</body></html>";

  try {
    var res = await fetch("/api/activities", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load activities");
    var allRows = await res.json();
    var safeRows = Array.isArray(allRows) ? allRows : [];
    var filtered = safeRows;
    if (Array.isArray(types) && types.length) {
      var allowed = {};
      types.forEach(function (t) { allowed[String(t).toLowerCase()] = true; });
      filtered = safeRows.filter(function (a) {
        return !!allowed[String((a && a.activity_type) || "").toLowerCase()];
      });
    }
    var rows = renderActivityRows(filtered);
    frame.srcdoc = "<!DOCTYPE html>" +
      "<html lang='en'><head>" +
      "<meta charset='UTF-8' />" +
      "<meta name='viewport' content='width=device-width, initial-scale=1.0' />" +
      "<title>" + escHtml(title) + "</title>" +
      "<style>" +
      "body{font-family:Segoe UI,Arial,sans-serif;margin:20px;color:#222;}" +
      "h2{margin:0 0 14px 0;}" +
      ".top{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px;}" +
      ".chip{display:inline-block;padding:6px 10px;border-radius:999px;background:#e7f2ff;color:#1e88ff;font-weight:600;}" +
      "button{padding:7px 12px;border:0;border-radius:6px;background:#1e88ff;color:#fff;cursor:pointer;}" +
      "table{width:100%;border-collapse:collapse;}" +
      "th,td{border:1px solid #e3e3e3;padding:10px;text-align:left;}" +
      "th{background:#f8faff;}" +
      "</style></head><body>" +
      "<h2>" + escHtml(title) + " Details</h2>" +
      "<div class='top'><div class='chip'>Total: " + filtered.length + "</div>" +
      "<button onclick=\"parent.addActivityRecord('" + escHtml((types && types[0]) || "Other") + "')\">+ Add Activity</button></div>" +
      "<table><thead><tr>" +
      "<th>Title</th><th>Type</th><th>Date</th><th>Notes</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>" +
      "</body></html>";
  } catch (e) {
    frame.srcdoc = "<!DOCTYPE html><html><body style='font-family:Segoe UI,Arial,sans-serif;margin:20px;color:#b00020;'>Unable to load activity details.</body></html>";
  }
}

function countByStatus(leads, statusName) {
  var wanted = String(statusName || "").toLowerCase();
  return leads.filter(function (lead) {
    return String((lead && lead.status) || "").toLowerCase() === wanted;
  }).length;
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

async function updateDashboardCounts() {
  async function fetchJson(url, fallback) {
    try {
      var res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return fallback;
      return await res.json();
    } catch (e) {
      return fallback;
    }
  }

  var leads = await fetchJson("/api/leads", []);
  var tasks = await fetchJson("/api/tasks", []);
  var siteVisits = await fetchJson("/api/site-visits", []);
  var activities = await fetchJson("/api/activities", []);
  var summary = await fetchJson("/api/crm-summary", {});

  var safeLeads = Array.isArray(leads) ? leads.map(normalizeLead) : [];
  var total = safeLeads.length || (summary.lead_total || 0);
  var fresh = countByStatus(safeLeads, "fresh lead") || (summary.fresh_lead || 0);
  var returning = countByStatus(safeLeads, "returning") || (summary.returning || 0);
  var unassigned = countByStatus(safeLeads, "unassigned") || (summary.unassigned || 0);
  var untouched = countByStatus(safeLeads, "untouched") || (summary.untouched || 0);
  var taskCount = Array.isArray(tasks) ? tasks.length : (summary.tasks || 0);
  var siteVisitCount = Array.isArray(siteVisits) ? siteVisits.length : (summary.site_visits || 0);
  var safeActivities = Array.isArray(activities) ? activities : [];
  var activitiesTotal = safeActivities.length || (summary.activities_total || 0);
  var activitiesMeeting = countActivitiesByType(safeActivities, "meeting") || (summary.activities_meeting || 0);
  var activitiesCall = countActivitiesByType(safeActivities, "call") || (summary.activities_call || 0);
  var activitiesMail = countActivitiesByType(safeActivities, "mail") || (summary.activities_mail || 0);
  var activitiesOther = countActivitiesByType(safeActivities, "other") || (summary.activities_other || 0);

  setText("orgTotalLeadsCount", total);
  setText("orgFreshLeadsCount", fresh);
  setText("orgReturningLeadsCount", returning);
  setText("orgUntouchedLeadsCount", untouched);
  setText("unassignedLeadsCount", unassigned);

  setText("myLeadsCount", total);
  setText("myFreshLeadsCount", fresh);
  setText("myReturningLeadsCount", returning);
  setText("myTasksCount", taskCount);
  setText("mySiteVisitsCount", siteVisitCount);
  setText("activitiesTotalCount", activitiesTotal);
  setText("activitiesMeetingCount", activitiesMeeting);
  setText("activitiesCallCount", activitiesCall);
  setText("activitiesMailCount", activitiesMail);
  setText("activitiesSiteVisitsCount", siteVisitCount);
  setText("activitiesOtherCount", activitiesOther);
}

function openLeadPageModal() {
  var modal = document.getElementById("leadPageModal");
  var frame = document.getElementById("leadPageFrame");
  if (frame) frame.src = "/lead/";
  if (modal) modal.style.display = "block";
}

async function openTotalLeadDetailsModal() {
  var modal = document.getElementById("leadPageModal");
  var frame = document.getElementById("leadPageFrame");
  if (frame) {
    var allLeads = await fetchLeadsFromApi();
    var rows = renderLeadRows(allLeads);
    frame.src = "about:blank";
    frame.srcdoc = "<!DOCTYPE html>" +
      "<html lang='en'><head>" +
      "<meta charset='UTF-8' />" +
      "<meta name='viewport' content='width=device-width, initial-scale=1.0' />" +
      "<title>Total Lead Details</title>" +
      "<style>" +
      "body{font-family:Segoe UI,Arial,sans-serif;margin:20px;color:#222;}" +
      "h2{margin:0 0 14px 0;}" +
      ".chip{display:inline-block;padding:6px 10px;border-radius:999px;background:#e7f2ff;color:#1e88ff;font-weight:600;margin-bottom:12px;}" +
      "table{width:100%;border-collapse:collapse;}" +
      "th,td{border:1px solid #e3e3e3;padding:10px;text-align:left;}" +
      "th{background:#f8faff;}" +
      "</style></head><body>" +
      "<h2>Total Leads Details</h2>" +
      "<div class='chip'>Total Leads: " + allLeads.length + "</div>" +
      "<table><thead><tr>" +
      "<th>Name</th><th>Enquiry</th><th>Created</th><th>Next Follow</th><th>Status</th><th>Owner</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>" +
      "</body></html>";
  }
  if (modal) modal.style.display = "block";
}

function openTaskPageModal() {
  var modal = document.getElementById("leadPageModal");
  var frame = document.getElementById("leadPageFrame");
  if (modal) modal.style.display = "block";
  if (!frame) return;

  frame.src = "about:blank";
  frame.srcdoc = "<!DOCTYPE html><html><body style='font-family:Segoe UI,Arial,sans-serif;margin:20px;'>Loading task details...</body></html>";

  fetch("/api/tasks")
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load tasks");
      return res.json();
    })
    .then(function (tasks) {
      var rows = renderTaskRows(Array.isArray(tasks) ? tasks : []);
      frame.srcdoc = "<!DOCTYPE html>" +
        "<html lang='en'><head>" +
        "<meta charset='UTF-8' />" +
        "<meta name='viewport' content='width=device-width, initial-scale=1.0' />" +
        "<title>Task Details</title>" +
        "<style>" +
        "body{font-family:Segoe UI,Arial,sans-serif;margin:20px;color:#222;}" +
        "h2{margin:0 0 14px 0;}" +
        ".chip{display:inline-block;padding:6px 10px;border-radius:999px;background:#f1e9ff;color:#5a3ea6;font-weight:600;margin-bottom:12px;}" +
        "table{width:100%;border-collapse:collapse;}" +
        "th,td{border:1px solid #e3e3e3;padding:10px;text-align:left;vertical-align:top;}" +
        "th{background:#f8faff;}" +
        "</style></head><body>" +
        "<h2>Tasks Details</h2>" +
        "<div class='chip'>Total Tasks: " + (Array.isArray(tasks) ? tasks.length : 0) + "</div>" +
        "<table><thead><tr>" +
        "<th>Title</th><th>Description</th><th>Type</th><th>Priority</th><th>Due Date</th><th>Status</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table>" +
        "</body></html>";
    })
    .catch(function () {
      frame.srcdoc = "<!DOCTYPE html><html><body style='font-family:Segoe UI,Arial,sans-serif;margin:20px;color:#b00020;'>Unable to load task details.</body></html>";
    });
}

function openSiteVisitsDetailsModal() {
  var modal = document.getElementById("leadPageModal");
  var frame = document.getElementById("leadPageFrame");
  if (modal) modal.style.display = "block";
  if (!frame) return;

  frame.src = "about:blank";
  frame.srcdoc = "<!DOCTYPE html><html><body style='font-family:Segoe UI,Arial,sans-serif;margin:20px;'>Loading site visit details...</body></html>";

  fetch("/api/site-visits", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load site visits");
      return res.json();
    })
    .then(function (visits) {
      var safeVisits = Array.isArray(visits) ? visits : [];
      var rows = renderSiteVisitRows(safeVisits);
      frame.srcdoc = "<!DOCTYPE html>" +
        "<html lang='en'><head>" +
        "<meta charset='UTF-8' />" +
        "<meta name='viewport' content='width=device-width, initial-scale=1.0' />" +
        "<title>Site Visits Details</title>" +
        "<style>" +
        "body{font-family:Segoe UI,Arial,sans-serif;margin:20px;color:#222;}" +
        "h2{margin:0 0 14px 0;}" +
        ".chip{display:inline-block;padding:6px 10px;border-radius:999px;background:#e7f2ff;color:#1e88ff;font-weight:600;margin-bottom:12px;}" +
        "table{width:100%;border-collapse:collapse;}" +
        "th,td{border:1px solid #e3e3e3;padding:10px;text-align:left;}" +
        "th{background:#f8faff;}" +
        "</style></head><body>" +
        "<h2>Site Visits Details</h2>" +
        "<div class='chip'>Total Site Visits: " + safeVisits.length + "</div>" +
        "<table><thead><tr>" +
        "<th>Lead</th><th>Visit Date</th><th>Status</th><th>Notes</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table>" +
        "</body></html>";
    })
    .catch(function () {
      frame.srcdoc = "<!DOCTYPE html><html><body style='font-family:Segoe UI,Arial,sans-serif;margin:20px;color:#b00020;'>Unable to load site visit details.</body></html>";
    });
}

async function openStatusDetailsModal(title, statuses, chipColor, chipTextColor) {
  var modal = document.getElementById("leadPageModal");
  var frame = document.getElementById("leadPageFrame");
  if (frame) {
    var allLeads = await fetchLeadsFromApi();
    var allowed = {};
    statuses.forEach(function (s) { allowed[String(s).toLowerCase()] = true; });
    var filteredLeads = allLeads.filter(function (lead) {
      return !!allowed[String((lead && lead.status) || "").toLowerCase()];
    });
    var rows = renderLeadRows(filteredLeads);

    frame.src = "about:blank";
    frame.srcdoc = "<!DOCTYPE html>" +
      "<html lang='en'><head>" +
      "<meta charset='UTF-8' />" +
      "<meta name='viewport' content='width=device-width, initial-scale=1.0' />" +
      "<title>" + esc(title) + " Details</title>" +
      "<style>" +
      "body{font-family:Segoe UI,Arial,sans-serif;margin:20px;color:#222;}" +
      "h2{margin:0 0 14px 0;}" +
      ".chip{display:inline-block;padding:6px 10px;border-radius:999px;background:" + chipColor + ";color:" + chipTextColor + ";font-weight:600;margin-bottom:12px;}" +
      "table{width:100%;border-collapse:collapse;}" +
      "th,td{border:1px solid #e3e3e3;padding:10px;text-align:left;}" +
      "th{background:#f8faff;}" +
      "</style></head><body>" +
      "<h2>" + esc(title) + " Details</h2>" +
      "<div class='chip'>" + esc(title) + ": " + filteredLeads.length + "</div>" +
      "<table><thead><tr>" +
      "<th>Name</th><th>Enquiry</th><th>Created</th><th>Next Follow</th><th>Status</th><th>Owner</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>" +
      "</body></html>";
  }
  if (modal) modal.style.display = "block";
}

function openFreshLeadDetailsModal() {
  openStatusDetailsModal("Fresh Lead", ["fresh lead"], "#e8f7ed", "#1e7e34");
}

function openReturningLeadDetailsModal() {
  openStatusDetailsModal("Returning", ["returning"], "#fff3cd", "#856404");
}

function openUnassignedLeadDetailsModal() {
  openStatusDetailsModal("Unassigned", ["unassigned"], "#f1f1f1", "#495057");
}

function openUntouchedLeadDetailsModal() {
  openStatusDetailsModal("Untouched", ["untouched"], "#fdecec", "#9b1c1c");
}

function closeLeadPageModal() {
  var modal = document.getElementById("leadPageModal");
  if (modal) modal.style.display = "none";
}

// Keep old method names for compatibility with existing code.
function openLeadDetailsModal() { openLeadPageModal(); }
function closeLeadDetailsModal() { closeLeadPageModal(); }

window.addEventListener("click", function (event) {
  var modal = document.getElementById("leadPageModal");
  if (modal && event.target === modal) {
    closeLeadPageModal();
  }
});

document.addEventListener("DOMContentLoaded", function () {
  fetchLeadsFromApi();
  updateDashboardCounts();
  setInterval(updateDashboardCounts, 5000);
});

window.addEventListener("message", function (event) {
  var data = event && event.data ? event.data : {};
  if (data.type !== "lead-created") return;
  updateDashboardCounts();
  fetchLeadsFromApi();
});
