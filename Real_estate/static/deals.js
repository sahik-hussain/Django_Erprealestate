(function () {
  const API_URL = "/api/recent-transactions";
  const avatarPool = Array.isArray(window.DEALS_AVATAR_POOL) ? window.DEALS_AVATAR_POOL : [];

  const cardsWrap = document.getElementById("dealsCards");
  const stepsWrap = document.getElementById("dealSteps");
  const modal = document.getElementById("dealFormModal");
  const form = document.getElementById("dealForm");
  const openBtn = document.getElementById("openDealFormBtn");
  const closeBtn = document.getElementById("closeDealFormBtn");
  const cancelBtn = document.getElementById("cancelDealBtn");

  const detail = {
    propertyTitle: document.getElementById("detailPropertyTitle"),
    reference: document.getElementById("detailReference"),
    shared: document.getElementById("detailShared"),
    estimatedDate: document.getElementById("detailEstimatedDate"),
    actualDate: document.getElementById("detailActualDate"),
    type: document.getElementById("detailType"),
    transaction: document.getElementById("detailTransaction"),
    buyerType: document.getElementById("detailBuyerType"),
    finance: document.getElementById("detailFinance"),
    createdBy: document.getElementById("detailCreatedBy"),
    leadReference: document.getElementById("detailLeadReference"),
    status: document.getElementById("detailStatus"),
    amount: document.getElementById("detailAmount"),
  };

  let deals = [];
  let selectedDealId = null;

  function todayText() {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  }

  function toMoney(value) {
    const n = Number(value || 0);
    return "AED " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function makeReference(id) {
    return "EVO-" + String(id || "").padStart(6, "0");
  }

  function makeLeadReference(id) {
    return "LEAD-" + String(id || "").padStart(5, "0");
  }

  function getStatusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "completed") return "completed";
    if (s === "cancelled") return "cancelled";
    return "pending";
  }

  function getStatusStep(status) {
    const s = String(status || "").toLowerCase();
    if (s === "completed") return 5;
    if (s === "cancelled") return 3;
    return 4;
  }

  function updateSteps(status) {
    const step = getStatusStep(status);
    if (!stepsWrap) return;

    stepsWrap.querySelectorAll(".step").forEach(function (node) {
      const idx = Number(node.dataset.step || 0);
      node.classList.remove("active");
      node.classList.remove("done");
      if (idx < step) node.classList.add("done");
      if (idx === step) node.classList.add("active");
    });
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = String(value || "-");
  }

  function showDealDetails(row) {
    if (!row) {
      setText(detail.propertyTitle, "No deal selected");
      setText(detail.reference, "-");
      setText(detail.shared, "None");
      setText(detail.estimatedDate, "-");
      setText(detail.actualDate, "-");
      setText(detail.type, "-");
      setText(detail.transaction, "-");
      setText(detail.buyerType, "-");
      setText(detail.finance, "Mortgage");
      setText(detail.createdBy, "-");
      setText(detail.leadReference, "-");
      setText(detail.status, "-");
      setText(detail.amount, "-");
      updateSteps("new");
      return;
    }

    selectedDealId = row.id;
    const tType = row.transaction_type || "Sale";
    const now = todayText();

    setText(detail.propertyTitle, row.property_name);
    setText(detail.reference, makeReference(row.id));
    setText(detail.shared, "None");
    setText(detail.estimatedDate, now);
    setText(detail.actualDate, now);
    setText(detail.type, tType);
    setText(detail.transaction, tType);
    setText(detail.buyerType, tType);
    setText(detail.finance, "Mortgage");
    setText(detail.createdBy, row.client_name || "CRM User");
    setText(detail.leadReference, makeLeadReference(row.id));
    setText(detail.status, row.status || "Pending");
    setText(detail.amount, toMoney(row.amount));
    updateSteps(row.status);
    markSelectedCard();
  }

  function markSelectedCard() {
    if (!cardsWrap) return;
    cardsWrap.querySelectorAll(".deal-card").forEach(function (card) {
      const id = Number(card.dataset.id || 0);
      card.classList.toggle("selected", id === Number(selectedDealId || 0));
    });
  }

  function buildCard(row, index) {
    const article = document.createElement("article");
    article.className = "card deal-card";
    article.dataset.id = String(row.id || "");

    const img = document.createElement("img");
    img.src = avatarPool.length ? avatarPool[index % avatarPool.length] : "";
    img.alt = row.client_name || "Client";
    article.appendChild(img);

    const info = document.createElement("div");
    info.className = "info";

    const top = document.createElement("div");
    top.className = "top";

    const name = document.createElement("h3");
    name.textContent = row.client_name || "Client";
    top.appendChild(name);

    const ref = document.createElement("span");
    ref.textContent = makeReference(row.id);
    top.appendChild(ref);
    info.appendChild(top);

    const contact = document.createElement("p");
    contact.className = "contact";
    contact.textContent = row.property_name || "Property";
    info.appendChild(contact);

    const meta = document.createElement("div");
    meta.className = "deal-meta";

    const amount = document.createElement("span");
    amount.className = "amount";
    amount.textContent = toMoney(row.amount);
    meta.appendChild(amount);

    const status = document.createElement("span");
    status.className = "status-pill " + getStatusClass(row.status);
    status.textContent = row.status || "Pending";
    meta.appendChild(status);
    info.appendChild(meta);

    const btns = document.createElement("div");
    btns.className = "btns";

    const tBtn = document.createElement("button");
    tBtn.type = "button";
    tBtn.textContent = row.transaction_type || "Sale";
    btns.appendChild(tBtn);

    const cBtn = document.createElement("button");
    cBtn.type = "button";
    cBtn.textContent = "Deal";
    btns.appendChild(cBtn);
    info.appendChild(btns);

    article.appendChild(info);
    article.addEventListener("click", function () {
      showDealDetails(row);
    });

    return article;
  }

  function renderCards() {
    if (!cardsWrap) return;
    cardsWrap.innerHTML = "";

    if (!deals.length) {
      const empty = document.createElement("div");
      empty.className = "empty-deals";
      empty.textContent = "No deals found. Click New Deal to create the first one.";
      cardsWrap.appendChild(empty);
      showDealDetails(null);
      return;
    }

    deals.forEach(function (row, index) {
      cardsWrap.appendChild(buildCard(row, index));
    });
    markSelectedCard();
  }

  async function loadDeals() {
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load deals");
      const rows = await res.json();
      deals = Array.isArray(rows) ? rows : [];
      renderCards();
      if (deals.length) {
        const selected =
          deals.find(function (x) { return Number(x.id) === Number(selectedDealId); }) ||
          deals[0];
        showDealDetails(selected);
      }
    } catch (err) {
      if (cardsWrap) {
        cardsWrap.innerHTML = "<div class='empty-deals'>Unable to load deals right now.</div>";
      }
      showDealDetails(null);
    }
  }

  function openModal() {
    if (modal) modal.style.display = "flex";
  }

  function closeModal() {
    if (modal) modal.style.display = "none";
    if (form) form.reset();
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!form) return;

    const payload = {
      property_name: String(form.property_name.value || "").trim(),
      client_name: String(form.client_name.value || "").trim(),
      transaction_type: String(form.transaction_type.value || "Sale").trim() || "Sale",
      amount: Number(form.amount.value || 0),
      status: String(form.status.value || "Pending").trim() || "Pending",
    };

    if (!payload.property_name) {
      alert("Property Name is required.");
      return;
    }
    if (!payload.client_name) {
      alert("Client Name is required.");
      return;
    }
    if (!Number.isFinite(payload.amount) || payload.amount < 0) {
      alert("Amount must be a valid number.");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await res.text();
      let body = {};
      try {
        body = txt ? JSON.parse(txt) : {};
      } catch (e) {
        body = {};
      }

      if (!res.ok) {
        const msg = body.error || txt || "Unable to create deal.";
        throw new Error(msg);
      }

      const created = body || {};
      deals.unshift(created);
      selectedDealId = created.id;
      renderCards();
      showDealDetails(created);
      closeModal();
    } catch (err) {
      alert(err.message || "Failed to create deal.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.self !== window.top) {
      const topNav = document.querySelector(".navbar");
      if (topNav) topNav.style.display = "none";
    }

    if (openBtn) openBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
    }
    if (form) form.addEventListener("submit", onSubmit);
    loadDeals();
  });
})();
