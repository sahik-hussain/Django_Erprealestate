function bindProjectNavigation() {
  const routes = {
    dashboardLink: "/index.html",
    crmhomeLink: "/crmhome/",
    TaskListLink: "/task-list/",
    EstateManagementLink: "/estate/",
    ReportLink: "/report/",
  };

  Object.entries(routes).forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => {
      window.location.href = url;
    });
  });
}

const DEFAULT_PROJECTS = [
  {
    project_name: "Skyview Tower",
    project_date: "2024-01-01",
    file_name: "Site_Plan_v1.pdf",
    chat_title: "Construction Q1",
    project_status: "Active",
    document_type: "PDF Document",
    share_with: "",
  },
  {
    project_name: "Skyview Tower",
    project_date: "2024-01-03",
    file_name: "Site_Plan_v2.pdf",
    chat_title: "Construction Q1",
    project_status: "Inactive",
    document_type: "PDF Document",
    share_with: "",
  },
  {
    project_name: "Skyview Tower",
    project_date: "2025-01-15",
    file_name: "Site_Plan_v5.pdf",
    chat_title: "Construction Q3",
    project_status: "Under Review",
    document_type: "PDF Document",
    share_with: "",
  },
];

let activeProjectSearchQuery = "";

function openAddProject() {
  const modal = document.getElementById("addProjectModal");
  if (modal) modal.style.display = "block";
}

function closeProjectModal() {
  const modal = document.getElementById("addProjectModal");
  if (modal) modal.style.display = "none";
}

function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("inactive")) return "inactive";
  if (s.includes("review")) return "review";
  if (s.includes("progress")) return "review";
  if (s.includes("complete")) return "active";
  if (s.includes("active")) return "active";
  return "inactive";
}

function formatProjectDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getProjectRows() {
  const tbody = document.getElementById("projectTableBody");
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll("tr"));
}

function isVisibleProjectRow(row) {
  return !!row && row.style.display !== "none";
}

function getRowCheckbox(row) {
  if (!row) return null;
  return row.querySelector("td input[type='checkbox']");
}

function getSelectedProjectRows() {
  return getProjectRows().filter((row) => {
    if (!isVisibleProjectRow(row)) return false;
    const box = getRowCheckbox(row);
    return !!(box && box.checked);
  });
}

function syncProjectSelectionState() {
  const selectAll = document.getElementById("selectAllProjects");
  const deleteBtn = document.getElementById("deleteProjectsBtn");
  const rows = getProjectRows().filter((row) => isVisibleProjectRow(row));
  const selected = getSelectedProjectRows();

  if (selectAll) {
    const total = rows.length;
    const selectedCount = selected.length;
    selectAll.checked = total > 0 && selectedCount === total;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < total;
  }

  if (deleteBtn) {
    deleteBtn.disabled = selected.length === 0;
  }
}

function renderProjectRow(project) {
  const tbody = document.getElementById("projectTableBody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  tr.setAttribute("data-project-id", project.id || "");

  tr.innerHTML = `
    <td><input type="checkbox" class="project-row-check"></td>
    <td><span class="date">${escapeHtml(formatProjectDate(project.project_date))}</span></td>
    <td>${escapeHtml(project.project_name)}</td>
    <td>${escapeHtml(project.file_name)}</td>
    <td>${escapeHtml(project.chat_title)}</td>
    <td><span class="status ${statusClass(project.project_status)}">* ${escapeHtml(project.project_status || "Active")}</span></td>
    <td>${escapeHtml(project.document_type)}</td>
    <td>${escapeHtml(project.share_with)}</td>
  `;

  tbody.appendChild(tr);
}

function rowMatchesProjectSearch(row) {
  const query = String(activeProjectSearchQuery || "").trim().toLowerCase();
  if (!query) return true;
  const text = String(row?.innerText || "").toLowerCase();
  return text.includes(query);
}

function applyProjectSearchFilter() {
  const rows = getProjectRows();
  rows.forEach((row) => {
    const visible = rowMatchesProjectSearch(row);
    row.style.display = visible ? "" : "none";
    if (!visible) {
      const box = getRowCheckbox(row);
      if (box) box.checked = false;
    }
  });

  syncProjectSelectionState();
}

function updateProjectSummary(rows) {
  const totalEl = document.getElementById("totalProjectsCount");
  const activeEl = document.getElementById("activeProjectsCount");
  const progressEl = document.getElementById("inProgressProjectsCount");
  const completedEl = document.getElementById("completedProjectsCount");

  if (!totalEl || !activeEl || !progressEl || !completedEl) return;

  const total = rows.length;
  let active = 0;
  let inProgress = 0;
  let completed = 0;

  rows.forEach((r) => {
    const s = String(r.project_status || "").toLowerCase();
    if (s.includes("complete")) completed += 1;
    else if (s.includes("progress")) inProgress += 1;
    else if (s.includes("inactive")) {
      // not counted as active
    } else if (s.includes("active")) active += 1;
  });

  totalEl.textContent = String(total);
  activeEl.textContent = String(active);
  progressEl.textContent = String(inProgress);
  completedEl.textContent = String(completed);
}

function toIsoDateFromLegacy(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function readLegacyRowsFromDom() {
  const tbody = document.getElementById("projectTableBody");
  if (!tbody) return [];
  const rows = Array.from(tbody.querySelectorAll("tr"));
  return rows
    .map((tr) => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 8) return null;
      const dateText = (tds[1]?.innerText || "").trim();
      const statusText = (tds[5]?.innerText || "").replace("*", "").replace("•", "").trim();
      return {
        project_name: (tds[2]?.innerText || "").trim(),
        project_date: toIsoDateFromLegacy(dateText),
        file_name: (tds[3]?.innerText || "").trim(),
        chat_title: (tds[4]?.innerText || "").trim(),
        project_status: statusText || "Active",
        document_type: (tds[6]?.innerText || "").trim(),
        share_with: "",
      };
    })
    .filter((x) => x && x.project_name);
}

async function seedLegacyProjectsIfNeeded(apiRows) {
  if (apiRows.length > 0) return apiRows;
  const legacyRows = readLegacyRowsFromDom();
  if (!legacyRows.length) return apiRows;

  for (const row of legacyRows) {
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
    } catch (err) {
      console.error("seed legacy project error:", err);
    }
  }

  const refetch = await fetch("/api/projects", { cache: "no-store" });
  if (!refetch.ok) return apiRows;
  return refetch.json();
}

async function seedDefaultProjectsIfNeeded(apiRows) {
  if (apiRows.length > 0) return apiRows;
  // Keep empty state when all projects are deleted; do not auto-add defaults again.
  return apiRows;
}

async function loadProjects() {
  const tbody = document.getElementById("projectTableBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/projects", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load projects");
    let rows = await res.json();
    rows = await seedLegacyProjectsIfNeeded(rows);
    rows = await seedDefaultProjectsIfNeeded(rows);
    tbody.innerHTML = "";
    rows.forEach(renderProjectRow);
    updateProjectSummary(rows);
    applyProjectSearchFilter();
  } catch (err) {
    console.error("loadProjects error:", err);
    applyProjectSearchFilter();
  }
}

async function deleteSelectedProjects() {
  const selectedRows = getSelectedProjectRows();
  if (!selectedRows.length) {
    alert("Select at least one project to delete.");
    return;
  }

  if (!confirm(`Delete ${selectedRows.length} selected project(s)?`)) return;

  const deleteBtn = document.getElementById("deleteProjectsBtn");
  if (deleteBtn) deleteBtn.disabled = true;

  let failedCount = 0;

  for (const row of selectedRows) {
    const projectId = String(row.getAttribute("data-project-id") || "").trim();
    if (!projectId) {
      row.remove();
      continue;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        failedCount += 1;
        continue;
      }
      row.remove();
    } catch (err) {
      console.error("delete project error:", err);
      failedCount += 1;
    }
  }

  if (failedCount > 0) {
    alert(`Unable to delete ${failedCount} project(s).`);
  }

  await loadProjects();
}

function bindProjectTableActions() {
  const selectAll = document.getElementById("selectAllProjects");
  const deleteBtn = document.getElementById("deleteProjectsBtn");
  const tbody = document.getElementById("projectTableBody");

  if (selectAll && selectAll.dataset.bound !== "1") {
    selectAll.addEventListener("change", () => {
      const checked = !!selectAll.checked;
      getProjectRows()
        .filter((row) => isVisibleProjectRow(row))
        .forEach((row) => {
        const box = getRowCheckbox(row);
        if (box) box.checked = checked;
      });
      syncProjectSelectionState();
    });
    selectAll.dataset.bound = "1";
  }

  if (tbody && tbody.dataset.bound !== "1") {
    tbody.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches("td input[type='checkbox']")) return;
      syncProjectSelectionState();
    });
    tbody.dataset.bound = "1";
  }

  if (deleteBtn && deleteBtn.dataset.bound !== "1") {
    deleteBtn.addEventListener("click", () => {
      deleteSelectedProjects();
    });
    deleteBtn.dataset.bound = "1";
  }

  syncProjectSelectionState();
}

function bindProjectSearch() {
  const input = document.getElementById("projectSearchInput");
  if (!input || input.dataset.bound === "1") return;

  input.addEventListener("input", () => {
    activeProjectSearchQuery = String(input.value || "").trim();
    applyProjectSearchFilter();
  });

  input.dataset.bound = "1";
}

let isProjectSubmitting = false;

async function addProject(event) {
  event.preventDefault();
  if (isProjectSubmitting) return;

  const payload = {
    project_name: (document.getElementById("pname")?.value || "").trim(),
    project_date: document.getElementById("pdate")?.value || "",
    file_name: (document.getElementById("pfile")?.value || "").trim(),
    chat_title: (document.getElementById("pchat")?.value || "").trim(),
    document_type: (document.getElementById("docType")?.value || "").trim(),
    project_status: (document.getElementById("projectStatus")?.value || "").trim(),
    share_with: (document.getElementById("shareWith")?.value || "").trim(),
  };

  if (!payload.project_name) return;

  const submitBtn = event.submitter || document.querySelector("#addProjectModal button[type='submit']");
  isProjectSubmitting = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Save failed");
    }

    await loadProjects();

    const form = document.querySelector("#addProjectModal form");
    if (form) form.reset();
    closeProjectModal();
  } catch (err) {
    console.error("save project error:", err);
    alert("Project save failed");
  } finally {
    isProjectSubmitting = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

window.openAddProject = openAddProject;
window.closeProjectModal = closeProjectModal;
window.addProject = addProject;

document.addEventListener("DOMContentLoaded", () => {
  bindProjectNavigation();
  bindProjectTableActions();
  bindProjectSearch();
  loadProjects();
});
