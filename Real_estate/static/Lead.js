function getLeadTableBody() {
  return (
    document.getElementById("leadTable") ||
    document.getElementById("tableBody") ||
    document.querySelector(".table-card table tbody")
  );
}

function csvEscape(value) {
  const text = String(value == null ? "" : value);
  return '"' + text.replace(/"/g, '""') + '"';
}

function downloadCsvFile(filename, csvText) {
  const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportLeadsToCsv() {
  const exportBtn = document.getElementById("exportLeadsBtn");
  const originalText = exportBtn ? exportBtn.innerHTML : "";
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
  }

  try {
    const response = await fetch("/api/leads", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load lead records for export");
    const leads = await response.json();
    const rows = Array.isArray(leads) ? leads : [];

    if (!rows.length) {
      alert("No leads found to export.");
      return;
    }

    const header = [
      "Name",
      "Enquiry",
      "Created Date",
      "Next Follow Up",
      "Status",
      "Owner",
    ];

    const lines = [header.map(csvEscape).join(",")];
    rows.forEach(function (lead) {
      lines.push(
        [
          lead.name || "",
          lead.enquiry || "",
          lead.created_date || "",
          lead.next_follow_up || "",
          lead.status || "",
          lead.owner || "",
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "_",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");
    downloadCsvFile("leads_export_" + stamp + ".csv", lines.join("\n"));
  } catch (error) {
    console.error("export leads error:", error);
    alert("Unable to export leads: " + String(error.message || "Unknown error"));
  } finally {
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = originalText;
    }
  }
}

function getLeadEmptyStateRow() {
  return document.getElementById("leadEmptyState");
}

function renderEmptyLeadState() {
  const tableBody = getLeadTableBody();
  if (!tableBody) return;
  const existing = getLeadEmptyStateRow();
  if (existing) return;
  tableBody.insertAdjacentHTML(
    "beforeend",
    '<tr id="leadEmptyState"><td colspan="7" class="empty-cell">No leads found. Click Add Lead to create your first lead.</td></tr>'
  );
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value.includes("assigned")) return "green";
  if (value.includes("return")) return "yellow";
  if (value.includes("closed")) return "red";
  return "blue";
}

function appendLeadRow(lead) {
  const tableBody = getLeadTableBody();
  if (!tableBody) return false;
  const empty = getLeadEmptyStateRow();
  if (empty) empty.remove();
  const badgeClass = statusClass(lead.status);
  // Local SVG data URI fallback avoids third-party DNS/network dependency.
  const defaultAvatar =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23e5e7eb'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%239ca3af'/%3E%3Cpath d='M8 34c1.8-6 6.2-9 12-9s10.2 3 12 9' fill='%239ca3af'/%3E%3C/svg%3E";
  const imgSrc = lead.img || defaultAvatar;
  const row = `
    <tr data-lead-id="${lead.id || ""}">
      <td class="user-info">
        <img src="${imgSrc}" class="avatar-img">
        <span>${lead.name || ""}</span>
      </td>
      <td>${lead.enquiry || ""}</td>
      <td>${lead.created || lead.created_date || ""}</td>
      <td>${lead.next || lead.next_follow_up || ""}</td>
      <td><span class="status-badge ${badgeClass}">${lead.status || ""}</span></td>
      <td>${lead.owner || ""}</td>
      <td>
        <button type="button" class="lead-delete-btn" data-lead-id="${lead.id || ""}">
          Delete
        </button>
      </td>
    </tr>`;
  tableBody.insertAdjacentHTML("beforeend", row);
  return true;
}

function clearLeadRows() {
  const tableBody = getLeadTableBody();
  if (!tableBody) return;
  tableBody.innerHTML = "";
}

async function loadLeadsFromDatabase() {
  const tableBody = getLeadTableBody();
  if (!tableBody) return;

  try {
    const response = await fetch("/api/leads", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to fetch leads");
    const leads = await response.json();
    clearLeadRows();
    const rows = Array.isArray(leads) ? leads : [];
    if (!rows.length) {
      renderEmptyLeadState();
      return;
    }
    rows.forEach(appendLeadRow);
  } catch (error) {
    console.error("load leads error:", error);
    renderEmptyLeadState();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  loadLeadsFromDatabase();
  const exportBtn = document.getElementById("exportLeadsBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      exportLeadsToCsv();
    });
  }

  const tableBody = getLeadTableBody();
  if (tableBody) {
    tableBody.addEventListener("click", async function (event) {
      const button = event.target.closest(".lead-delete-btn");
      if (!button) return;
      const leadId = button.getAttribute("data-lead-id");
      if (!leadId) return;
      const ok = window.confirm("Delete this lead?");
      if (!ok) return;
      try {
        const response = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Delete failed");
        }
        await loadLeadsFromDatabase();
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "lead-created" }, "*");
        }
      } catch (error) {
        console.error("delete lead error:", error);
        alert(`Unable to delete lead: ${error.message}`);
      }
    });
  }

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  const modal = document.getElementById("leadModal");
  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });
  }
});

function openModal(){
  const modal = document.getElementById("leadModal");
  if (modal) modal.style.display = "flex";

  const createdInput = document.getElementById("created");
  if (createdInput && !createdInput.value) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    createdInput.value = y + "-" + m + "-" + d;
  }
}

function closeModal(){
  const modal = document.getElementById("leadModal");
  if (modal) modal.style.display = "none";
}

function submitLeadForm(event) {
  if (event) event.preventDefault();
  saveLead();
  return false;
}

async function saveLead() {
  const name = document.getElementById("name").value.trim();
  const enquiry = document.getElementById("enquiry").value.trim();
  const created = document.getElementById("created").value;
  const next = document.getElementById("nextfollow").value;
  const status = document.getElementById("status").value.trim();
  const owner = document.getElementById("owner").value.trim();
  const leadImageInput = document.getElementById("leadImage");
  const leadImageFile =
    leadImageInput && leadImageInput.files && leadImageInput.files.length
      ? leadImageInput.files[0]
      : null;

  if (!name) {
    alert("Enter Name");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("enquiry", enquiry);
    formData.append("created_date", created || "");
    formData.append("next_follow_up", next || "");
    formData.append("status", status || "Fresh Lead");
    formData.append("owner", owner);
    if (leadImageFile) {
      formData.append("image", leadImageFile);
    }

    const response = await fetch("/api/leads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Save failed");
    }

    const createdLead = await response.json();
    await loadLeadsFromDatabase();

    // If Lead page is opened inside index dashboard iframe, notify parent to refresh counts/details.
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "lead-created", lead: createdLead },
        "*"
      );
    }

    document.getElementById("name").value = "";
    document.getElementById("enquiry").value = "";
    document.getElementById("created").value = "";
    document.getElementById("nextfollow").value = "";
    document.getElementById("status").value = "Fresh Lead";
    document.getElementById("owner").value = "";
    document.getElementById("leadImage").value = "";
    closeModal();
  } catch (error) {
    console.error("save lead error:", error);
    alert(`Unable to save lead: ${error.message}`);
  }
}


function searchLead() {
    let input = document.getElementById("searchInput").value.toLowerCase();
    let table = getLeadTableBody();

    if (!table) return;

    let tr = table.getElementsByTagName("tr");

    for (let i = 0; i < tr.length; i++) {
        let rowText = tr[i].innerText.toLowerCase();

        if (rowText.includes(input)) {
            tr[i].style.display = "";
        } else {
            tr[i].style.display = "none";
        }
    }
}
