function bindNavigation() {
  const routes = {
    dashboardLink: '/index.html',
    crmhomeLink: '/crmhome/',
    projectLink: '/project/',
    EstateManagementLink: '/estate/',
    ReportLink: '/report/'
  };

  Object.entries(routes).forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      window.location.href = url;
    });
  });
}

const DEFAULT_TASKS = [
  {
    title: 'Move in anniversary',
    description: 'Apr 18 - Send a card (kane, Valerie)',
    task_type: 'General',
    priority: 'Normal',
    due_date: '2025-02-02',
    status: 'Not Started'
  },
  {
    title: 'Move in anniversary',
    description: 'Apr 18 - Send a card',
    task_type: 'General',
    priority: 'Normal',
    due_date: '2025-02-07',
    status: 'Pending'
  },
  {
    title: 'Mike Smith',
    description: '916-977-1991',
    task_type: 'General',
    priority: 'Normal',
    due_date: '2025-02-27',
    status: 'Completed'
  },
  {
    title: 'Emily Brow',
    description: '516-977-1991',
    task_type: 'General',
    priority: 'Normal',
    due_date: '2025-02-27',
    status: 'Not Started'
  },
  {
    title: 'Alex Cater(M)',
    description: '616-977-9912(M)',
    task_type: 'General',
    priority: 'Normal',
    due_date: '2025-02-08',
    status: 'Pending'
  }
];

let activeTaskView = 'incomplete';
let activeQuickView = 'this-week';
let activeStatusFilter = 'All';
let activeSearchQuery = '';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const text = String(value || '').trim();
  if (!text) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDueDate(value) {
  const d = parseDate(value);
  if (!d) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

function formatDueDateForView(value) {
  const d = parseDate(value);
  if (!d) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function statusClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete')) return 'completed';
  if (s.includes('pending')) return 'pending';
  return '';
}

function isCompletedStatus(status) {
  return String(status || '').toLowerCase().includes('complete');
}

function rowStatus(row) {
  return (row.getAttribute('data-status') || '').trim();
}

function rowDueDate(row) {
  const attr = (row.getAttribute('data-due-date') || '').trim();
  if (attr) return attr;

  const cellText = row.querySelectorAll('td')[3]?.innerText?.trim() || '';
  return parseLegacyDateToIso(cellText);
}

function getRenderedRows() {
  return Array.from(document.querySelectorAll('#taskTableBody tr'));
}

function rowMatchesSearch(row) {
  const query = String(activeSearchQuery || '').trim().toLowerCase();
  if (!query) return true;
  const text = String(row?.innerText || '').toLowerCase();
  return text.includes(query);
}

function bindTaskTableDeleteClicks() {
  const tbody = document.getElementById('taskTableBody');
  if (!tbody || tbody.dataset.deleteBound === '1') return;

  tbody.addEventListener('click', (event) => {
    const button = event.target.closest('.delete-btn, .row-menu');
    if (!button) return;

    const row = button.closest('tr');
    if (!row) return;
    const taskId = String(row.getAttribute('data-task-id') || '').trim();
    deleteTask(taskId, row);
  });

  tbody.dataset.deleteBound = '1';
}

function renderTaskRow(task) {
  const tbody = document.getElementById('taskTableBody');
  if (!tbody) return;

  const rowStatusText = (task.status || 'Not Started').trim();
  const dueDateIso = formatDueDate(task.due_date);

  const row = document.createElement('tr');
  row.setAttribute('data-status', rowStatusText);
  row.setAttribute('data-task-id', task.id || '');
  row.setAttribute('data-due-date', dueDateIso);

  row.innerHTML = `
    <td>
      <input type="checkbox">
      <div>
        <strong>${escapeHtml(task.title || '')}</strong>
        <small>${escapeHtml(task.description || '')}</small>
      </div>
    </td>
    <td>${escapeHtml(task.task_type || 'General')}</td>
    <td>${escapeHtml(task.priority || 'Normal')}</td>
    <td>${escapeHtml(formatDueDateForView(dueDateIso))}</td>
    <td><span class="status ${statusClass(rowStatusText)}">${escapeHtml(rowStatusText)}</span></td>
    <td><button type="button" class="delete-btn">Delete</button></td>
  `;

  tbody.appendChild(row);
}

async function deleteTask(taskId, rowEl) {
  if (!confirm('Delete this task?')) return;

  if (!taskId) {
    if (rowEl) rowEl.remove();
    applyCurrentTaskView();
    return;
  }

  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    if (rowEl) rowEl.remove();
    applyCurrentTaskView();
  } catch (err) {
    console.error('delete task error:', err);
    alert('Task delete failed');
  }
}

function parseLegacyDateToIso(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split('/');
    return `${year}-${month}-${day}`;
  }

  return formatDueDate(text);
}

function readLegacyTasksFromDom() {
  const tbody = document.getElementById('taskTableBody');
  if (!tbody) return [];

  const rows = Array.from(tbody.querySelectorAll('tr'));
  return rows
    .map((tr) => {
      const status = (tr.getAttribute('data-status') || '').trim();
      const title = tr.querySelector('strong')?.innerText?.trim() || '';
      const description = tr.querySelector('small')?.innerText?.trim() || '';
      const tds = tr.querySelectorAll('td');
      const taskType = tds[1]?.innerText?.trim() || 'General';
      const priority = tds[2]?.innerText?.trim() || 'Normal';
      const dueDateRaw = tds[3]?.innerText?.trim() || '';
      return {
        title,
        description,
        task_type: taskType,
        priority,
        due_date: parseLegacyDateToIso(dueDateRaw),
        status: status || 'Pending'
      };
    })
    .filter((x) => x.title);
}

async function seedLegacyTasksIfNeeded(apiRows) {
  if (apiRows.length > 0) return apiRows;
  const legacyRows = readLegacyTasksFromDom();
  if (!legacyRows.length) return apiRows;

  for (const row of legacyRows) {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row)
      });
    } catch (err) {
      console.error('seed legacy task error:', err);
    }
  }

  const refetch = await fetch('/api/tasks', { cache: 'no-store' });
  if (!refetch.ok) return apiRows;
  return refetch.json();
}

async function seedDefaultTasksIfNeeded(apiRows) {
  if (apiRows.length > 0) return apiRows;

  for (const row of DEFAULT_TASKS) {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row)
      });
    } catch (err) {
      console.error('seed default task error:', err);
    }
  }

  const refetch = await fetch('/api/tasks', { cache: 'no-store' });
  if (!refetch.ok) return apiRows;
  return refetch.json();
}

async function loadTasks() {
  const tbody = document.getElementById('taskTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/tasks', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load tasks');

    let rows = await res.json();
    rows = await seedLegacyTasksIfNeeded(rows);
    rows = await seedDefaultTasksIfNeeded(rows);

    tbody.innerHTML = '';
    rows.forEach((t) => renderTaskRow(t));
  } catch (err) {
    console.error('loadTasks error:', err);
  }

  applyCurrentTaskView();
}

function openAddTask() {
  const modal = document.getElementById('addTaskModal');
  if (modal) modal.style.display = 'block';
}

function closeAddModal() {
  const modal = document.getElementById('addTaskModal');
  if (modal) modal.style.display = 'none';
}

function toggleCompletedStatus(checkbox) {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  statusEl.value = checkbox && checkbox.checked ? 'Completed' : 'Pending';
}

let isTaskSubmitting = false;

async function addTask(event) {
  event.preventDefault();
  if (isTaskSubmitting) return;

  const subject = document.getElementById('subject')?.value?.trim() || '';
  const taskType = document.getElementById('taskType')?.value?.trim() || 'General';
  const priority = document.getElementById('priority')?.value?.trim() || 'Normal';
  const date = document.getElementById('date')?.value || '';
  const status = document.getElementById('status')?.value?.trim() || 'Pending';
  const description = document.getElementById('taskDescription')?.value?.trim() || '';

  if (!subject) return;

  const submitBtn = event.submitter || document.querySelector("#addTaskModal button[type='submit']");
  if (submitBtn && submitBtn.disabled) return;

  isTaskSubmitting = true;
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: subject,
        description,
        task_type: taskType,
        priority,
        due_date: date,
        status
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Save failed');
    }

    const created = await res.json();
    renderTaskRow(created);

    const form = document.querySelector('.modern-task-form');
    if (form) form.reset();

    const completedBox = document.getElementById('completed');
    if (completedBox) completedBox.checked = false;

    closeAddModal();
    applyCurrentTaskView();
  } catch (err) {
    console.error('save task error:', err);
    alert('Task save failed');
  } finally {
    isTaskSubmitting = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

function toggleFilter() {
  const box = document.getElementById('filterBox');
  if (!box) return;
  box.style.display = box.style.display === 'none' || box.style.display === '' ? 'block' : 'none';
}

function applyFilter() {
  const value = document.getElementById('statusFilter')?.value || 'All';
  activeStatusFilter = value;
  applyCurrentTaskView();
}

function rowMatchesBaseFilters(row) {
  const statusText = rowStatus(row);

  if (activeTaskView === 'complete' && !isCompletedStatus(statusText)) return false;
  if (activeTaskView === 'incomplete' && isCompletedStatus(statusText)) return false;

  if (activeStatusFilter !== 'All') {
    if (statusText.toLowerCase() !== activeStatusFilter.toLowerCase()) return false;
  }

  return rowMatchesSearch(row);
}

function bindTaskSearch() {
  const searchInput = document.getElementById('taskSearchInput');
  if (!searchInput || searchInput.dataset.bound === '1') return;

  searchInput.addEventListener('input', () => {
    activeSearchQuery = String(searchInput.value || '').trim();
    applyCurrentTaskView();
  });

  searchInput.dataset.bound = '1';
}

function applyTaskTableFilters() {
  const rows = getRenderedRows();

  rows.forEach((row) => {
    const visible = rowMatchesBaseFilters(row);
    row.style.display = visible ? '' : 'none';
  });
}

function setActiveTaskTab(activeTab) {
  const tabs = document.querySelectorAll('.tabs .tab');
  if (!tabs.length) return;

  tabs.forEach((tab) => tab.classList.remove('active'));

  if (activeTab === 'complete' && tabs[1]) {
    tabs[1].classList.add('active');
    return;
  }

  if (tabs[0]) {
    tabs[0].classList.add('active');
  }
}

function setActiveQuickButton() {
  const thisWeekBtn = document.getElementById('thisWeekBtn');
  const myTasksBtn = document.getElementById('myTasksBtn');

  if (thisWeekBtn) thisWeekBtn.classList.toggle('active', activeQuickView === 'this-week');
  if (myTasksBtn) myTasksBtn.classList.toggle('active', activeQuickView === 'my-tasks');
}

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isInCurrentWeek(isoDate) {
  const taskDate = parseDate(isoDate);
  if (!taskDate) return false;

  const today = new Date();
  const start = startOfWeek(today);
  const end = endOfWeek(today);
  return taskDate >= start && taskDate <= end;
}

function sortRowsByDueDate(rows) {
  return [...rows].sort((a, b) => {
    const aDate = parseDate(rowDueDate(a));
    const bDate = parseDate(rowDueDate(b));
    const aValue = aDate ? aDate.getTime() : Number.MAX_SAFE_INTEGER;
    const bValue = bDate ? bDate.getTime() : Number.MAX_SAFE_INTEGER;
    return aValue - bValue;
  });
}

function getBaseRows() {
  return getRenderedRows().filter((row) => rowMatchesBaseFilters(row));
}

function updateScopePanel() {
  const scopeTitle = document.getElementById('scopeTitle');
  const scopeCount = document.getElementById('scopeCount');
  const scopeSummary = document.getElementById('scopeSummary');
  const scopeDetailsList = document.getElementById('scopeDetailsList');

  if (!scopeTitle || !scopeCount || !scopeSummary || !scopeDetailsList) return;

  const baseRows = getBaseRows();
  let detailRows = [];
  let summaryText = '';

  if (activeQuickView === 'my-tasks') {
    scopeTitle.textContent = 'My Tasks Details';
    detailRows = baseRows.filter((row) => !isCompletedStatus(rowStatus(row)));
    summaryText = 'Open tasks in your current queue.';
  } else {
    scopeTitle.textContent = 'This Week Details';
    detailRows = baseRows.filter((row) => isInCurrentWeek(rowDueDate(row)));

    if (detailRows.length) {
      const today = new Date();
      const weekStart = formatDueDateForView(startOfWeek(today));
      const weekEnd = formatDueDateForView(endOfWeek(today));
      summaryText = `Scheduled tasks for ${weekStart} to ${weekEnd}.`;
    } else {
      detailRows = sortRowsByDueDate(baseRows).slice(0, 4);
      summaryText = 'No tasks are scheduled this week. Showing nearest task details.';
    }
  }

  if (activeSearchQuery) {
    summaryText = `Search: "${activeSearchQuery}" | ` + summaryText;
  }

  scopeSummary.textContent = summaryText;
  scopeCount.textContent = `${detailRows.length} tasks`;

  if (!detailRows.length) {
    const emptyText = activeSearchQuery
      ? 'No matching task details found'
      : 'No task details available';
    scopeDetailsList.innerHTML = `<div class="scope-item empty"><strong>${emptyText}</strong></div>`;
    return;
  }

  const maxRows = detailRows.slice(0, 4);
  scopeDetailsList.innerHTML = maxRows
    .map((row) => {
      const subject = row.querySelector('strong')?.innerText?.trim() || 'Task';
      const status = rowStatus(row) || 'Pending';
      const dueDate = formatDueDateForView(rowDueDate(row));
      const meta = [dueDate ? `Due ${dueDate}` : '', status].filter(Boolean).join(' | ');
      return `<div class="scope-item"><strong>${escapeHtml(subject)}</strong><small>${escapeHtml(meta)}</small></div>`;
    })
    .join('');
}

function showThisWeekDetails() {
  activeQuickView = 'this-week';
  setActiveQuickButton();
  updateScopePanel();
}

function showMyTasksDetails() {
  activeQuickView = 'my-tasks';
  setActiveQuickButton();
  updateScopePanel();
}

function showIncomplete() {
  activeTaskView = 'incomplete';
  applyCurrentTaskView();
}

function showComplete() {
  activeTaskView = 'complete';
  applyCurrentTaskView();
}

function openComplete() {
  showComplete();
}

function showAllTasks() {
  activeTaskView = 'all';
  applyCurrentTaskView();
}

function applyCurrentTaskView() {
  setActiveTaskTab(activeTaskView);
  setActiveQuickButton();
  applyTaskTableFilters();
  updateScopePanel();
}

window.openAddTask = openAddTask;
window.closeAddModal = closeAddModal;
window.toggleFilter = toggleFilter;
window.applyFilter = applyFilter;
window.showIncomplete = showIncomplete;
window.openComplete = openComplete;
window.showThisWeekDetails = showThisWeekDetails;
window.showMyTasksDetails = showMyTasksDetails;
window.toggleCompletedStatus = toggleCompletedStatus;
window.addTask = addTask;

document.addEventListener('DOMContentLoaded', () => {
  bindNavigation();
  bindTaskTableDeleteClicks();
  bindTaskSearch();
  loadTasks();
});

