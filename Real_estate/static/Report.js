(function () {
  const lineSeries = {
    labels: ["Jan", "Mar", "May", "Aug", "Oct", "Dec"],
    sales: [50, 70, 230, 80, 40, 30],
    listings: [30, 40, 60, 110, 50, 40],
  };

  const doughnutSeries = {
    labels: ["Residential", "Industrial", "Commercial", "Land"],
    values: [44, 12, 26, 18],
    colors: ["#22d3ee", "#818cf8", "#10b981", "#fb923c"],
  };

  const barSeries = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    revenue: [30, 15, 12, 25, 30, 95, 120, 160, 45, 25, 15, 10],
    expenses: [25, 10, 15, 20, 25, 80, 140, 185, 40, 20, 12, 8],
  };

  let lineChartInstance = null;
  let pieChartInstance = null;
  let barChartInstance = null;

  function distributionBucketFromEstateType(rawType) {
    const text = String(rawType || "").trim().toLowerCase();
    if (!text) return 0; // Residential

    if (
      text.includes("land") ||
      text.includes("plot")
    ) {
      return 3; // Land
    }

    if (
      text.includes("industrial") ||
      text.includes("warehouse") ||
      text.includes("factory")
    ) {
      return 1; // Industrial
    }

    if (
      text.includes("commercial") ||
      text.includes("office") ||
      text.includes("retail") ||
      text.includes("shop")
    ) {
      return 2; // Commercial
    }

    return 0; // Residential
  }

  async function loadPropertyDistribution() {
    try {
      const res = await fetch("/api/estates", { cache: "no-store" });
      if (!res.ok) return;

      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return;

      const counts = [0, 0, 0, 0];
      rows.forEach((row) => {
        const idx = distributionBucketFromEstateType(row && row.estate_type);
        counts[idx] += 1;
      });

      const total = counts.reduce((a, b) => a + b, 0);
      if (total > 0) {
        doughnutSeries.values = counts;
      }
    } catch (error) {
      // Keep static fallback values when API is unavailable.
    }
  }

  function scaleCanvas(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return {
      ctx,
      width: rect.width,
      height: rect.height,
    };
  }

  function drawGrid(ctx, width, height, leftPad, topPad, rightPad, bottomPad) {
    const chartW = Math.max(10, width - leftPad - rightPad);
    const chartH = Math.max(10, height - topPad - bottomPad);

    ctx.strokeStyle = "#e6edf7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i += 1) {
      const y = topPad + (chartH * i) / 4;
      ctx.moveTo(leftPad, y);
      ctx.lineTo(leftPad + chartW, y);
    }
    ctx.stroke();

    return { chartW, chartH };
  }

  function drawLineFallback(canvas) {
    const prepared = scaleCanvas(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;

    ctx.clearRect(0, 0, width, height);

    const leftPad = 36;
    const rightPad = 10;
    const topPad = 16;
    const bottomPad = 28;
    const { chartW, chartH } = drawGrid(ctx, width, height, leftPad, topPad, rightPad, bottomPad);

    const maxValue = Math.max(
      ...lineSeries.sales,
      ...lineSeries.listings,
      1
    );

    function pointAt(index, value) {
      const xStep = lineSeries.labels.length > 1 ? chartW / (lineSeries.labels.length - 1) : 0;
      const x = leftPad + xStep * index;
      const y = topPad + chartH - (value / maxValue) * chartH;
      return { x, y };
    }

    function plot(values, stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      values.forEach((v, i) => {
        const p = pointAt(i, v);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = stroke;
      values.forEach((v, i) => {
        const p = pointAt(i, v);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    plot(lineSeries.sales, "#f87171");
    plot(lineSeries.listings, "#818cf8");

    ctx.fillStyle = "#5f7494";
    ctx.font = "12px Trebuchet MS, Segoe UI, Verdana, sans-serif";
    ctx.textAlign = "center";
    lineSeries.labels.forEach((label, i) => {
      const p = pointAt(i, 0);
      ctx.fillText(label, p.x, height - 8);
    });
  }

  function drawDoughnutFallback(canvas) {
    const prepared = scaleCanvas(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(10, Math.min(width, height) * 0.35);
    const inner = radius * 0.62;

    const total = doughnutSeries.values.reduce((a, b) => a + b, 0) || 1;
    let start = -Math.PI / 2;

    doughnutSeries.values.forEach((value, i) => {
      const slice = (value / total) * Math.PI * 2;
      const end = start + slice;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.arc(cx, cy, inner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = doughnutSeries.colors[i % doughnutSeries.colors.length];
      ctx.fill();

      start = end;
    });

    ctx.fillStyle = "#14345d";
    ctx.font = "700 14px Trebuchet MS, Segoe UI, Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("100%", cx, cy + 5);
  }

  function drawBarFallback(canvas) {
    const prepared = scaleCanvas(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;

    ctx.clearRect(0, 0, width, height);

    const leftPad = 38;
    const rightPad = 12;
    const topPad = 16;
    const bottomPad = 34;
    const { chartW, chartH } = drawGrid(ctx, width, height, leftPad, topPad, rightPad, bottomPad);

    const maxValue = Math.max(...barSeries.revenue, ...barSeries.expenses, 1);
    const groupCount = barSeries.labels.length;
    const groupW = chartW / groupCount;
    const barW = Math.max(2, groupW * 0.34);

    function barY(value) {
      return topPad + chartH - (value / maxValue) * chartH;
    }

    for (let i = 0; i < groupCount; i += 1) {
      const groupX = leftPad + i * groupW;
      const rev = barSeries.revenue[i] || 0;
      const exp = barSeries.expenses[i] || 0;

      const revY = barY(rev);
      const expY = barY(exp);

      ctx.fillStyle = "#818cf8";
      ctx.fillRect(groupX + groupW * 0.12, revY, barW, topPad + chartH - revY);

      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(groupX + groupW * 0.54, expY, barW, topPad + chartH - expY);

      ctx.fillStyle = "#5f7494";
      ctx.font = "10px Trebuchet MS, Segoe UI, Verdana, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(barSeries.labels[i], groupX + groupW * 0.5, height - 8);
    }
  }

  function destroyChartInstances() {
    if (lineChartInstance) {
      lineChartInstance.destroy();
      lineChartInstance = null;
    }
    if (pieChartInstance) {
      pieChartInstance.destroy();
      pieChartInstance = null;
    }
    if (barChartInstance) {
      barChartInstance.destroy();
      barChartInstance = null;
    }
  }

  function renderWithChartJs() {
    const lineCanvas = document.getElementById("lineChart");
    const pieCanvas = document.getElementById("pieChart");
    const barCanvas = document.getElementById("barChart");
    if (!lineCanvas || !pieCanvas || !barCanvas || typeof Chart === "undefined") return false;

    destroyChartInstances();

    lineChartInstance = new Chart(lineCanvas, {
      type: "line",
      data: {
        labels: lineSeries.labels,
        datasets: [
          {
            label: "Sales",
            data: lineSeries.sales,
            borderColor: "#f87171",
            borderWidth: 3,
            tension: 0.4,
            pointBackgroundColor: "#fff",
            fill: false,
          },
          {
            label: "Listings",
            data: lineSeries.listings,
            borderColor: "#818cf8",
            borderWidth: 3,
            tension: 0.4,
            pointBackgroundColor: "#fff",
            fill: false,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });

    pieChartInstance = new Chart(pieCanvas, {
      type: "doughnut",
      data: {
        labels: doughnutSeries.labels,
        datasets: [
          {
            data: doughnutSeries.values,
            backgroundColor: doughnutSeries.colors,
            borderWidth: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: { legend: { position: "bottom" } },
      },
    });

    barChartInstance = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels: barSeries.labels,
        datasets: [
          {
            label: "Revenue",
            data: barSeries.revenue,
            backgroundColor: "#818cf8",
            borderRadius: 5,
          },
          {
            label: "Expenses",
            data: barSeries.expenses,
            backgroundColor: "#fca5a5",
            borderRadius: 5,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        scales: { y: { grid: { borderDash: [5, 5] } } },
      },
    });

    return true;
  }

  function renderFallbackCharts() {
    const lineCanvas = document.getElementById("lineChart");
    const pieCanvas = document.getElementById("pieChart");
    const barCanvas = document.getElementById("barChart");

    if (lineCanvas) drawLineFallback(lineCanvas);
    if (pieCanvas) drawDoughnutFallback(pieCanvas);
    if (barCanvas) drawBarFallback(barCanvas);
  }

  function renderCharts() {
    const usedChartJs = renderWithChartJs();
    if (!usedChartJs) {
      renderFallbackCharts();
    }
  }

  function openModal() {
    const modal = document.getElementById("reportModal");
    if (modal) modal.style.display = "flex";
  }

  function closeModal() {
    const modal = document.getElementById("reportModal");
    if (modal) modal.style.display = "none";
  }

  function addReport() {
    const property = (document.getElementById("property")?.value || "").trim();
    const type = (document.getElementById("type")?.value || "").trim();
    const client = (document.getElementById("client")?.value || "").trim();
    const amount = (document.getElementById("amount")?.value || "").trim();
    const status = (document.getElementById("status")?.value || "").trim();

    if (!property || !type || !client || !amount) {
      alert("Please fill property, type, client, and amount.");
      return;
    }

    const statusText = status.toLowerCase();
    const isCompleted = statusText === "complete" || statusText === "completed";
    const badgeClass = isCompleted ? "status-badge status-complete" : "status-badge status-pending";
    const badgeLabel = isCompleted ? "Completed" : "Pending";

    const tableBody = document.getElementById("reportTableBody");
    if (!tableBody) return;

    const row = document.createElement("tr");
    const typeClass = type.toLowerCase() === "lease" ? "lease" : "sale";

    row.innerHTML = `
      <td>
        <div class="primary">${escapeHtml(property)}</div>
        <div class="secondary">Custom entry</div>
      </td>
      <td class="type ${typeClass}">${escapeHtml(type)}</td>
      <td>${escapeHtml(client)}</td>
      <td class="amount">$${escapeHtml(amount)}</td>
      <td><span class="${badgeClass}">${badgeLabel}</span></td>
    `;

    tableBody.appendChild(row);
    applyReportSearchFilter();

    ["property", "type", "client", "amount", "status"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = "";
    });

    closeModal();
  }

  function submitReportForm(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    addReport();
    return false;
  }

  function getReportTableRows() {
    const tableBody = document.getElementById("reportTableBody");
    if (!tableBody) return [];
    return Array.from(tableBody.querySelectorAll("tr"));
  }

  function applyReportSearchFilter() {
    const searchInput = document.getElementById("reportSearchInput");
    const summaryEl = document.getElementById("reportSearchSummary");
    const query = String(searchInput?.value || "").trim().toLowerCase();
    const rows = getReportTableRows();

    if (!rows.length) {
      if (summaryEl) summaryEl.textContent = "No details available";
      return;
    }

    let visibleCount = 0;
    rows.forEach((row) => {
      const rowText = String(row.innerText || "").toLowerCase();
      const visible = !query || rowText.includes(query);
      row.style.display = visible ? "" : "none";
      if (visible) visibleCount += 1;
    });

    if (!summaryEl) return;
    if (!query) {
      summaryEl.textContent = `Showing all details (${visibleCount})`;
    } else if (visibleCount === 0) {
      summaryEl.textContent = "No matching details found";
    } else {
      summaryEl.textContent = `Showing ${visibleCount} matching detail(s)`;
    }
  }

  function bindReportSearch() {
    const searchInput = document.getElementById("reportSearchInput");
    if (!searchInput || searchInput.dataset.bound === "1") return;
    searchInput.addEventListener("input", () => {
      applyReportSearchFilter();
    });
    searchInput.dataset.bound = "1";
    applyReportSearchFilter();
  }

  function bindModalUi() {
    const modal = document.getElementById("reportModal");
    if (!modal) return;

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
  }

  let resizeTimer = null;
  function bindResizeRedraw() {
    window.addEventListener("resize", () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderCharts();
      }, 180);
    });
  }

  async function init() {
    await loadPropertyDistribution();
    renderCharts();
    bindReportSearch();
    bindModalUi();
    bindResizeRedraw();
  }

  window.openModal = openModal;
  window.closeModal = closeModal;
  window.addReport = addReport;
  window.submitReportForm = submitReportForm;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
