let currentViewButton = null;
let currentCard = null;
let previewImageUrl = "";
const LOCAL_PROPERTIES_KEY = "crmhome_properties_v1";
const DEFAULT_IMAGE_FALLBACK = "/static/images/home5.jpg";
const IS_USER_VIEW = !!(document.body && document.body.classList.contains("user-view"));
const PURPOSE_ALL = "all";
const PURPOSE_BUY = "buy";
const PURPOSE_SELL = "sell";
const PURPOSE_RENT = "rent";
let activePurposeMode = PURPOSE_BUY;
let addPropertyEditCard = null;
let addPropertyEditViewButton = null;

function setAddPropertyModalMode(isEditMode) {
  const titleEl = document.getElementById("addPropertyModalTitle");
  const subtitleEl = document.getElementById("addPropertyModalSubtitle");
  const submitBtn = document.getElementById("addPropertySubmitBtn");

  if (titleEl) {
    titleEl.textContent = isEditMode ? "Edit Property" : "Add Property";
  }
  if (subtitleEl) {
    subtitleEl.textContent = isEditMode
      ? "Update property details using the same Add Property table."
      : "Fill details below to create a new property and assign it to an agent.";
  }
  if (submitBtn) {
    submitBtn.textContent = isEditMode ? "Save Changes" : "Add";
  }
}

function formatDateForInput(rawDate) {
  const text = String(rawDate || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const directParsed = new Date(text);
  if (!Number.isNaN(directParsed.getTime())) {
    const y = directParsed.getFullYear();
    const m = String(directParsed.getMonth() + 1).padStart(2, "0");
    const d = String(directParsed.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  const shortMonthMatch = text.match(/^(\d{1,2})[-\/ ]([A-Za-z]{3,})[-\/ ](\d{4})$/);
  if (!shortMonthMatch) return "";
  const day = String(shortMonthMatch[1] || "").padStart(2, "0");
  const monthToken = String(shortMonthMatch[2] || "").slice(0, 3).toLowerCase();
  const year = String(shortMonthMatch[3] || "");
  const monthMap = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const month = monthMap[monthToken] || "";
  if (!month) return "";
  return year + "-" + month + "-" + day;
}

function getCookie(name) {
  const target = String(name || "").trim();
  if (!target || !document.cookie) return "";
  const parts = document.cookie.split(";");
  for (let i = 0; i < parts.length; i += 1) {
    const chunk = String(parts[i] || "").trim();
    if (chunk.startsWith(target + "=")) {
      return decodeURIComponent(chunk.slice(target.length + 1));
    }
  }
  return "";
}

function getCsrfToken() {
  return getCookie("estate_csrftoken") || getCookie("csrftoken");
}

function estateApiRequest(method, payload) {
  return fetch("/api/estates", {
    method: method,
    headers: (function () {
      const h = { "Content-Type": "application/json" };
      const csrfToken = getCsrfToken();
      if (csrfToken) h["X-CSRFToken"] = csrfToken;
      return h;
    })(),
    credentials: "same-origin",
    body: JSON.stringify(payload || {}),
  }).then(function (res) {
    return res
      .json()
      .catch(function () {
        return {};
      })
      .then(function (body) {
        if (!res.ok) {
          const message = String((body && body.error) || "").trim() || ("Request failed (" + res.status + ")");
          throw new Error(message);
        }
        return body || {};
      });
  });
}

function openAgentRegisterForProperty() {
  window.open("/agent/#personalInfo", "_blank", "noopener");
}

function setAssignedAgentSelection(selectEl, value) {
  if (!selectEl) return;
  const target = String(value || "").trim();
  if (!target) {
    selectEl.value = "";
    return;
  }
  let matchedIndex = -1;
  for (let i = 0; i < selectEl.options.length; i += 1) {
    if (String(selectEl.options[i].value || "") === target) {
      matchedIndex = i;
      break;
    }
  }
  if (matchedIndex >= 0) {
    selectEl.selectedIndex = matchedIndex;
  } else {
    selectEl.value = "";
  }
}

function refillAssignedAgentSelect(selectEl, rows) {
  if (!selectEl) return;
  const previousValue = String(selectEl.value || "").trim();
  selectEl.innerHTML = "";

  const blankOpt = document.createElement("option");
  blankOpt.value = "";
  blankOpt.textContent = "Select Agent";
  selectEl.appendChild(blankOpt);

  rows.forEach(function (row) {
    const opt = document.createElement("option");
    opt.value = String(row.id || "");
    const name = String(row.name || "").trim();
    const email = String(row.email || "").trim();
    opt.textContent = email ? name + " (" + email + ")" : name;
    selectEl.appendChild(opt);
  });

  setAssignedAgentSelection(selectEl, previousValue);
}

function reloadAssignableAgents() {
  const selectEl = document.getElementById("apAssignedAgent");
  if (!selectEl) return;

  fetch("/api/staff-users", {
    method: "GET",
    credentials: "same-origin",
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Could not load staff users");
      return res.json();
    })
    .then(function (rows) {
      refillAssignedAgentSelect(selectEl, Array.isArray(rows) ? rows : []);
      alert("Agent list refreshed.");
    })
    .catch(function () {
      alert("Agent list refresh failed. Please reload the page.");
    });
}

function normalizeImageUrl(src) {
  const s = String(src || "").trim();
  if (!s) return "";
  if (!s.startsWith("data:") && s.includes(",")) {
    const first = s
      .split(",")
      .map(function (part) {
        return String(part || "").trim();
      })
      .find(function (part) {
        return !!part;
      });
    if (first) return normalizeImageUrl(first);
  }
  if (s.startsWith("data:")) return s;
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
  if (s.startsWith("images/")) return "/static/" + s;
  return "/static/images/" + s;
}

function setSafeImage(imgEl, src) {
  if (!imgEl) return;
  const normalized = normalizeImageUrl(src) || DEFAULT_IMAGE_FALLBACK;
  imgEl.onerror = function () {
    imgEl.onerror = null;
    imgEl.src = DEFAULT_IMAGE_FALLBACK;
  };
  imgEl.src = normalized;
}

function normalizePurpose(rawValue) {
  const text = String(rawValue || "").trim().toLowerCase();
  if (!text) return "";
  if (text === PURPOSE_ALL) return PURPOSE_ALL;
  if (text.includes("rent") || text.includes("lease")) return PURPOSE_RENT;
  if (text.includes("sell") || text.includes("sale")) return PURPOSE_SELL;
  if (text.includes("buy") || text.includes("purchase")) return PURPOSE_BUY;
  return "";
}

function purposeFallback() {
  if (!IS_USER_VIEW) return "";
  const mode = normalizePurpose(activePurposeMode);
  if (!mode || mode === PURPOSE_ALL) return PURPOSE_BUY;
  return mode;
}

function resolvePurpose(candidates, fallback) {
  for (let i = 0; i < candidates.length; i += 1) {
    const mode = normalizePurpose(candidates[i]);
    if (mode) return mode;
  }
  return normalizePurpose(fallback) || "";
}

function setActivePurposeMode(mode) {
  const normalized = normalizePurpose(mode);
  activePurposeMode = normalized || purposeFallback() || PURPOSE_BUY;

  const controls = document.querySelectorAll(".user-tabs [data-mode], .user-hero-nav [data-mode]");
  controls.forEach(function (node) {
    const nodeMode = normalizePurpose(node.dataset.mode);
    const makeActive = nodeMode === activePurposeMode;
    node.classList.toggle("active", makeActive);
  });

  applyPropertyFilters();
}

function bindPurposeTabs() {
  if (!IS_USER_VIEW) return;

  const controls = document.querySelectorAll(".user-tabs [data-mode], .user-hero-nav [data-mode]");
  if (!controls.length) return;

  controls.forEach(function (node) {
    if (node.dataset.purposeBound === "1") return;
    node.addEventListener("click", function () {
      const mode = normalizePurpose(node.dataset.mode);
      if (mode) setActivePurposeMode(mode);
    });
    node.dataset.purposeBound = "1";
  });

  const activeNode = document.querySelector(".user-tabs .active[data-mode], .user-hero-nav .active[data-mode]");
  const initialMode = normalizePurpose(activeNode ? activeNode.dataset.mode : PURPOSE_BUY) || PURPOSE_BUY;
  setActivePurposeMode(initialMode);
}

function readLocalProperties() {
  try {
    const raw = localStorage.getItem(LOCAL_PROPERTIES_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];
  }
}

function writeLocalProperties(rows) {
  try {
    localStorage.setItem(LOCAL_PROPERTIES_KEY, JSON.stringify(rows));
    return true;
  } catch (e) {}
  return false;
}

function cardToPropertyData(card) {
  if (!card) return null;
  syncCardMeta(card);
  const viewBtn = card.querySelector("button.green");
  const imgEl = card.querySelector("img");
  const images = normalizeImages(
    (viewBtn && viewBtn.dataset.images) || card.dataset.images || (imgEl ? imgEl.src : ""),
    imgEl ? imgEl.src : ""
  );
  return {
    id: card.dataset.id || "",
    local_id: card.dataset.localId || "",
    purpose: card.dataset.purpose || "",
    title: card.dataset.title || "",
    address: card.dataset.address || "",
    city: card.dataset.city || "",
    type: card.dataset.type || "",
    condition: card.dataset.condition || "",
    date: card.dataset.date || "",
    area: card.dataset.area || "",
    price: card.dataset.price || "",
    beds: card.dataset.beds || "",
    baths: card.dataset.baths || "",
    desc: card.dataset.desc || "",
    assigned_agent_id: card.dataset.assignedAgentId || "",
    assigned_agent_name: card.dataset.assignedAgent || "",
    image: images[0] || "",
    images: images,
  };
}

function makeCardKey(title, address, city) {
  return (
    String(title || "").trim().toLowerCase() +
    "|" +
    String(address || city || "").trim().toLowerCase()
  );
}

function getImagePool() {
  const out = [];
  document.querySelectorAll(".grid .card img").forEach(function (img) {
    const src = String((img && img.src) || "").trim();
    if (src && !out.includes(src)) out.push(src);
  });
  return out;
}

function pickDefaultImage(seed) {
  const pool = getImagePool();
  if (!pool.length) return "";
  const idx = Math.abs(Number(seed) || 0) % pool.length;
  return pool[idx];
}

function applyPropertyDataToCard(card, data) {
  if (!card || !data) return;
  const viewBtn = card.querySelector("button.green");
  const imgEl = card.querySelector("img");
  const titleEl = card.querySelector("h3");
  const descEl = card.querySelector("p");
  const priceEl = card.querySelector(".price");
  const tags = card.querySelectorAll(".tags span");

  const images = normalizeImages(data.images || data.image || "", data.image || "");
  const firstImage = images[0] || "";
  const purpose = resolvePurpose(
    [data.purpose, card.dataset.purpose, data.condition, data.type],
    purposeFallback()
  );

  card.dataset.id = String(data.id || card.dataset.id || "");
  card.dataset.localId = String(data.local_id || card.dataset.localId || "");
  card.dataset.purpose = purpose;
  card.dataset.title = data.title || "";
  card.dataset.address = data.address || "";
  card.dataset.city = data.city || "";
  card.dataset.type = data.type || "";
  card.dataset.condition = data.condition || "";
  card.dataset.date = data.date || "";
  card.dataset.area = data.area || "";
  card.dataset.price = data.price || "";
  card.dataset.beds = data.beds || "";
  card.dataset.baths = data.baths || "";
  card.dataset.desc = data.desc || "";
  card.dataset.assignedAgent = data.assigned_agent_name || card.dataset.assignedAgent || "";
  card.dataset.assignedAgentId = String(data.assigned_agent_id || card.dataset.assignedAgentId || "");
  card.dataset.images = JSON.stringify(images);

  if (imgEl) setSafeImage(imgEl, firstImage);
  if (titleEl) titleEl.textContent = data.title || "Property";
  if (descEl) descEl.textContent = data.desc || "";
  if (priceEl) priceEl.textContent = data.price || "";
  if (tags[0]) tags[0].innerHTML = '<i class="fa-solid fa-bed"></i> ' + (data.beds || "-") + " Bedroom";
  if (tags[1]) tags[1].innerHTML = '<i class="fa-solid fa-bath"></i> ' + (data.baths || "-") + " Bathroom";
  if (tags[2]) tags[2].innerHTML = '<i class="fa-solid fa-house"></i> ' + (data.type || "Property");

  if (viewBtn) {
    viewBtn.dataset.img = firstImage;
    viewBtn.dataset.images = JSON.stringify(images);
    viewBtn.dataset.purpose = purpose;
    viewBtn.dataset.title = data.title || "";
    viewBtn.dataset.address = data.address || "";
    viewBtn.dataset.city = data.city || "";
    viewBtn.dataset.type = data.type || "";
    viewBtn.dataset.condition = data.condition || "";
    viewBtn.dataset.date = data.date || "";
    viewBtn.dataset.area = data.area || "";
    viewBtn.dataset.price = data.price || "";
    viewBtn.dataset.beds = data.beds || "";
    viewBtn.dataset.baths = data.baths || "";
    viewBtn.dataset.desc = data.desc || "";
    viewBtn.dataset.assignedAgent = data.assigned_agent_name || card.dataset.assignedAgent || "";
  }
  syncCardMeta(card);
}

function persistCard(card) {
  const item = cardToPropertyData(card);
  if (!item) return;
  if (!item.local_id) {
    item.local_id = "local-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
    card.dataset.localId = item.local_id;
  }
  const rows = readLocalProperties();
  const idx = rows.findIndex((r) => {
    if (item.id && r.id) return String(r.id) === String(item.id);
    return String(r.local_id || "") === String(item.local_id || "");
  });
  if (idx >= 0) rows[idx] = item;
  else rows.unshift(item);
  return writeLocalProperties(rows);
}

function searchCard() {
  applyPropertyFilters();
}

function parseMoneyToNumber(raw) {
  const text = String(raw || "").replace(/,/g, "").toLowerCase();
  const num = parseFloat(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function buildPropertyRequestPayload(card) {
  if (!card) return null;
  syncCardMeta(card);
  const title = String(card.dataset.title || "").trim();
  const propertyType = String(card.dataset.type || "").trim();
  const address = String(card.dataset.address || "").trim();
  const city = String(card.dataset.city || "").trim();
  const price = String(card.dataset.price || "").trim();
  const purpose = String(card.dataset.purpose || "").trim();
  const location = [address, city].filter(Boolean).join(", ");
  return {
    title: title,
    type: propertyType,
    location: location,
    price: price,
    purpose: purpose ? purpose + " request" : "Property Request",
  };
}

async function submitPropertyRequest(card, reqBtn) {
  if (!IS_USER_VIEW || !card || !reqBtn) return;
  if (reqBtn.dataset.submitting === "1") return;

  const payload = buildPropertyRequestPayload(card);
  if (!payload || !payload.title) {
    alert("Unable to submit request for this property.");
    return;
  }

  const originalText = reqBtn.textContent;
  reqBtn.dataset.submitting = "1";
  reqBtn.disabled = true;
  reqBtn.textContent = "Sending...";

  try {
    const headers = { "Content-Type": "application/json" };
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;

    const response = await fetch("/api/property-requests", {
      method: "POST",
      headers: headers,
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    const bodyText = await response.text();
    let body = {};
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        body = {};
      }
    }

    if (!response.ok) {
      const message =
        (body && body.error) ||
        bodyText ||
        "Unable to submit request right now.";
      throw new Error(message);
    }

    reqBtn.textContent = "Requested";
    reqBtn.classList.add("requested");
    reqBtn.dataset.requested = "1";
    alert("Request saved successfully. It is now visible in Leads.");
  } catch (error) {
    reqBtn.disabled = false;
    reqBtn.textContent = originalText;
    alert(error.message || "Request failed.");
  } finally {
    reqBtn.dataset.submitting = "0";
  }
}

function matchPriceRange(cardPrice, selected) {
  const v = String(selected || "").trim();
  if (!v || v === "Any Price") return true;
  if (v === "AED 0 - 500k") return cardPrice >= 0 && cardPrice <= 500000;
  if (v === "AED 500k - 1M") return cardPrice > 500000 && cardPrice <= 1000000;
  if (v === "AED 1M+") return cardPrice > 1000000;
  return true;
}

function applyPropertyFilters() {
  const inputEl = document.getElementById("searchInput");
  const typeEl = document.getElementById("typeFilter");
  const priceEl = document.getElementById("priceFilter");
  const locationValue = String(inputEl ? inputEl.value : "").trim();
  const query = !locationValue || locationValue.toLowerCase() === "any location"
    ? ""
    : locationValue.toLowerCase();
  const selectedTypeText = String(typeEl ? typeEl.value : "Any Type").trim();
  const selectedType = selectedTypeText.toLowerCase();
  const selectedPrice = String(priceEl ? priceEl.value : "Any Price").trim();
  const selectedPurpose = IS_USER_VIEW
    ? (normalizePurpose(activePurposeMode) || PURPOSE_BUY)
    : PURPOSE_ALL;
  const cards = document.querySelectorAll(".card");

  cards.forEach((card) => {
    syncCardMeta(card);
    const searchText = String(card.dataset.searchText || "").toLowerCase();
    const cardType = String(card.dataset.type || "").toLowerCase();
    const cardPriceText = String(card.dataset.price || (card.querySelector(".price") ? card.querySelector(".price").innerText : ""));
    const cardPrice = parseMoneyToNumber(cardPriceText);
    const cardPurpose = normalizePurpose(card.dataset.purpose);

    const locationMatch = !query || searchText.includes(query);
    const typeMatch = selectedType === "any type" || cardType.includes(selectedType);
    const priceMatch = matchPriceRange(cardPrice, selectedPrice);
    const purposeMatch = !IS_USER_VIEW || selectedPurpose === PURPOSE_ALL || cardPurpose === selectedPurpose;
    const show = locationMatch && typeMatch && priceMatch && purposeMatch;
    card.style.display = show ? "block" : "none";
  });
}

function openDetail(btn) {
  currentViewButton = btn;
  currentCard = btn ? btn.closest(".card") : null;
  if (!currentViewButton || !currentCard) return;
  syncCardMeta(currentCard);

  document.getElementById("detailModal").style.display = "flex";

  const cardImg = currentCard.querySelector("img");
  const currentImg = String((cardImg && cardImg.src) || currentViewButton.dataset.img || "");
  currentViewButton.dataset.img = currentImg;
  document.getElementById("dImg").src = currentImg;
  document.getElementById("dTitle").innerText = currentViewButton.dataset.title || "";
  document.getElementById("dAddress").innerText = currentViewButton.dataset.address || "";
  document.getElementById("dAddressTable").innerText = currentViewButton.dataset.address || "";
  document.getElementById("dType").innerText = currentViewButton.dataset.type || "";
  document.getElementById("dCondition").innerText = currentViewButton.dataset.condition || "";
  document.getElementById("dDate").innerText = currentViewButton.dataset.date || "";
  document.getElementById("dCity").innerText = currentViewButton.dataset.city || "";
  document.getElementById("dArea").innerText = currentViewButton.dataset.area || "";
  document.getElementById("dAssignedAgent").innerText = currentViewButton.dataset.assignedAgent || "Unassigned";
  document.getElementById("dPrice").innerText = currentViewButton.dataset.price || "";
  document.getElementById("dBeds").innerText = currentViewButton.dataset.beds || "";
  document.getElementById("dBaths").innerText = currentViewButton.dataset.baths || "";
  document.getElementById("dDesc").innerText = currentViewButton.dataset.desc || "";
  renderGallery(currentViewButton.dataset.images || currentImg, currentImg);

  showReadOnlyDetail();
}

function openEditFromCard(btn) {
  if (!btn) return;
  const card = btn.closest(".card");
  const viewBtn = card ? card.querySelector("button.green") : null;
  if (!viewBtn) return;
  openDetail(viewBtn);
  enableEditDetail();
}

function closeDetail() {
  document.getElementById("detailModal").style.display = "none";
  currentViewButton = null;
  currentCard = null;
  previewImageUrl = "";
}

function fillAddPropertyFormFromCard(viewBtn, card) {
  if (!viewBtn || !card) return;

  const title = String(viewBtn.dataset.title || card.dataset.title || "").trim();
  const address = String(viewBtn.dataset.address || card.dataset.address || "").trim();
  const type = String(viewBtn.dataset.type || card.dataset.type || "").trim();
  const condition = String(viewBtn.dataset.condition || card.dataset.condition || "").trim();
  const dateValue = formatDateForInput(viewBtn.dataset.date || card.dataset.date || "");
  const city = String(viewBtn.dataset.city || card.dataset.city || "").trim();
  const area = String(viewBtn.dataset.area || card.dataset.area || "").trim();
  const price = String(viewBtn.dataset.price || card.dataset.price || "").trim();
  const beds = String(viewBtn.dataset.beds || card.dataset.beds || "").trim();
  const baths = String(viewBtn.dataset.baths || card.dataset.baths || "").trim();
  const desc = String(viewBtn.dataset.desc || card.dataset.desc || "").trim();
  const assignedAgentId = String(card.dataset.assignedAgentId || "").trim();
  const assignedAgentName = String(viewBtn.dataset.assignedAgent || card.dataset.assignedAgent || "").trim();

  const setValue = function (id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };

  setValue("apTitle", title);
  setValue("apAddress", address);
  setValue("apType", type);
  setValue("apCondition", condition);
  setValue("apDate", dateValue);
  setValue("apCity", city);
  setValue("apArea", area);
  setValue("apPrice", price);
  setValue("apBeds", beds);
  setValue("apBaths", baths);
  setValue("apDesc", desc);

  const assignedSelect = document.getElementById("apAssignedAgent");
  if (assignedSelect) {
    assignedSelect.value = "";
    if (assignedAgentId && assignedSelect.querySelector('option[value="' + assignedAgentId + '"]')) {
      assignedSelect.value = assignedAgentId;
    } else if (assignedAgentName) {
      const assignedNameLower = assignedAgentName.toLowerCase();
      for (let i = 0; i < assignedSelect.options.length; i += 1) {
        const opt = assignedSelect.options[i];
        const optText = String(opt.text || "").toLowerCase();
        if (optText.startsWith(assignedNameLower) || optText.includes(assignedNameLower)) {
          assignedSelect.selectedIndex = i;
          break;
        }
      }
    }
  }
}

function openAddPropertyModal(options) {
  const modal = document.getElementById("addPropertyModal");
  const form = document.getElementById("addPropertyForm");
  if (!modal) return;

  const opts = options || {};
  const editCard = opts.editCard || null;
  const editViewButton = opts.editViewButton || null;

  if (form) form.reset();
  const imageInput = document.getElementById("apImage");
  if (imageInput) imageInput.value = "";

  if (editCard && editViewButton) {
    addPropertyEditCard = editCard;
    addPropertyEditViewButton = editViewButton;
    setAddPropertyModalMode(true);
    fillAddPropertyFormFromCard(editViewButton, editCard);
  } else {
    addPropertyEditCard = null;
    addPropertyEditViewButton = null;
    setAddPropertyModalMode(false);
  }

  modal.style.display = "flex";
}

function closeAddPropertyModal() {
  const modal = document.getElementById("addPropertyModal");
  const form = document.getElementById("addPropertyForm");
  if (modal) modal.style.display = "none";
  if (form) form.reset();
  addPropertyEditCard = null;
  addPropertyEditViewButton = null;
  setAddPropertyModalMode(false);
}

function readSelectedImages(fileInput, done) {
  const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
  if (!files.length) {
    done([]);
    return;
  }

  const out = [];
  let doneCount = 0;
  files.forEach(function (file, idx) {
    fileToOptimizedDataUrl(file, function (dataUrl) {
      out[idx] = String(dataUrl || "");
      doneCount += 1;
      if (doneCount === files.length) done(out.filter(Boolean));
    });
  });
}

function fileToOptimizedDataUrl(file, done) {
  const reader = new FileReader();
  reader.onload = function (evt) {
    const src = String(evt && evt.target ? evt.target.result : "");
    if (!src) {
      done("");
      return;
    }

    const img = new Image();
    img.onload = function () {
      try {
        const maxSize = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          done(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        done(canvas.toDataURL("image/jpeg", 0.75));
      } catch (e) {
        done(src);
      }
    };
    img.onerror = function () {
      done(src);
    };
    img.src = src;
  };
  reader.onerror = function () {
    done("");
  };
  reader.readAsDataURL(file);
}

function enableEditDetail() {
  if (!currentViewButton || !currentCard) return;
  const editCard = currentCard;
  const editViewButton = currentViewButton;
  closeDetail();
  openAddPropertyModal({ editCard: editCard, editViewButton: editViewButton });
}

function cancelEditDetail() {
  showReadOnlyDetail();
  const imageInput = document.getElementById("eImage");
  if (imageInput) imageInput.value = "";
  previewImageUrl = "";
}

function showReadOnlyDetail() {
  const detailTable = document.getElementById("detailTable");
  const heading = document.getElementById("propertyDetailsHeading");
  const editBtn = document.getElementById("editDetailBtn");
  const saveBtn = document.getElementById("saveDetailBtn");
  if (detailTable) detailTable.classList.remove("hidden");
  if (heading) heading.classList.remove("hidden");
  if (editBtn) editBtn.classList.remove("hidden");
  if (saveBtn) saveBtn.classList.add("hidden");
  document.getElementById("detailEditForm").classList.add("hidden");
}

function applyImagePreviewIfAny(onDone) {
  const imageInput = document.getElementById("eImage");
  readSelectedImages(imageInput, function (images) {
    previewImageUrl = images.length ? images[0] : "";
    onDone(images);
  });
}

function saveDetailChanges() {
  if (!currentViewButton || !currentCard) return;

  const newTitle = document.getElementById("eTitle").value.trim();
  const newAddress = document.getElementById("eAddress").value.trim();
  const newType = document.getElementById("eType").value.trim();
  const newCondition = document.getElementById("eCondition").value.trim();
  const newDate = document.getElementById("eDate").value.trim();
  const newCity = document.getElementById("eCity").value.trim();
  const newArea = document.getElementById("eArea").value.trim();

  applyImagePreviewIfAny(function (newImages) {
    if (newImages && newImages.length) {
      currentViewButton.dataset.img = newImages[0];
      currentViewButton.dataset.images = JSON.stringify(newImages);
      const cardImg = currentCard.querySelector("img");
      if (cardImg) cardImg.src = newImages[0];
    }

    currentViewButton.dataset.title = newTitle;
    currentViewButton.dataset.address = newAddress;
    currentViewButton.dataset.type = newType;
    currentViewButton.dataset.condition = newCondition;
    currentViewButton.dataset.date = newDate;
    currentViewButton.dataset.city = newCity;
    currentViewButton.dataset.area = newArea;

    const cardTitle = currentCard.querySelector("h3");
    if (cardTitle) cardTitle.innerText = newTitle || "Property";
    currentCard.dataset.address = newAddress;
    currentCard.dataset.city = newCity;
    currentCard.dataset.title = newTitle;
    currentCard.dataset.type = newType;
    syncCardMeta(currentCard);

    document.getElementById("dImg").src = currentViewButton.dataset.img || "";
    document.getElementById("dTitle").innerText = newTitle;
    document.getElementById("dAddress").innerText = newAddress;
    document.getElementById("dAddressTable").innerText = newAddress;
    document.getElementById("dType").innerText = newType;
    document.getElementById("dCondition").innerText = newCondition;
    document.getElementById("dDate").innerText = newDate;
    document.getElementById("dCity").innerText = newCity;
    document.getElementById("dArea").innerText = newArea;
    renderGallery(
      currentViewButton.dataset.images || currentViewButton.dataset.img || "",
      currentViewButton.dataset.img || ""
    );
    persistCard(currentCard);

    cancelEditDetail();
    alert("Details updated.");
  });
}

window.addEventListener("click", function (event) {
  const modal = document.getElementById("detailModal");
  if (modal && event.target === modal) closeDetail();
  const addModal = document.getElementById("addPropertyModal");
  if (addModal && event.target === addModal) closeAddPropertyModal();
});

function bindCard(card) {
  if (!card || card.dataset.bound === "1") return;
  syncCardMeta(card);
  const reqBtn = card.querySelector("button.req");
  if (IS_USER_VIEW && reqBtn && reqBtn.dataset.bound !== "1") {
    reqBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      submitPropertyRequest(card, reqBtn);
    });
    reqBtn.dataset.bound = "1";
  }
  card.style.cursor = "pointer";
  card.addEventListener("click", function (event) {
    if (event.target.closest("button")) return;
    const localViewBtn = card.querySelector("button.green");
    if (localViewBtn) openDetail(localViewBtn);
  });
  card.dataset.bound = "1";
}

function syncCardMeta(card) {
  if (!card) return;
  const viewBtn = card.querySelector("button.green");
  const titleEl = card.querySelector("h3");
  const descEl = card.querySelector("p");
  const imgEl = card.querySelector("img");

  const title = String((viewBtn && viewBtn.dataset.title) || (titleEl && titleEl.innerText) || card.dataset.title || "").trim();
  const desc = String((descEl && descEl.innerText) || "").trim();
  const address = String((viewBtn && viewBtn.dataset.address) || card.dataset.address || "").trim();
  const city = String((viewBtn && viewBtn.dataset.city) || card.dataset.city || "").trim();
  const type = String((viewBtn && viewBtn.dataset.type) || card.dataset.type || "").trim();
  const condition = String((viewBtn && viewBtn.dataset.condition) || card.dataset.condition || "").trim();
  const date = String((viewBtn && viewBtn.dataset.date) || card.dataset.date || "").trim();
  const area = String((viewBtn && viewBtn.dataset.area) || card.dataset.area || "").trim();
  const assignedAgent = String((viewBtn && viewBtn.dataset.assignedAgent) || card.dataset.assignedAgent || "").trim();
  const img = String((imgEl && imgEl.src) || (viewBtn && viewBtn.dataset.img) || "").trim();
  const priceEl = card.querySelector(".price");
  const price = String((viewBtn && viewBtn.dataset.price) || (priceEl && priceEl.innerText) || card.dataset.price || "").trim();
  const tagSpans = card.querySelectorAll(".tags span");
  const beds = String((viewBtn && viewBtn.dataset.beds) || (tagSpans[0] ? tagSpans[0].innerText.replace(/[^\d]/g, "") : "") || card.dataset.beds || "").trim();
  const baths = String((viewBtn && viewBtn.dataset.baths) || (tagSpans[1] ? tagSpans[1].innerText.replace(/[^\d]/g, "") : "") || card.dataset.baths || "").trim();
  const imagesText = (viewBtn && viewBtn.dataset.images) || card.dataset.images || img;
  const images = normalizeImages(imagesText, img);
  const purpose = resolvePurpose(
    [
      (viewBtn && viewBtn.dataset.purpose) || "",
      card.dataset.purpose || "",
      card.dataset.condition || "",
      condition,
      type,
    ],
    purposeFallback()
  );

  if (viewBtn) {
    viewBtn.dataset.purpose = purpose;
    viewBtn.dataset.title = title;
    viewBtn.dataset.address = address;
    viewBtn.dataset.city = city;
    viewBtn.dataset.type = type;
    viewBtn.dataset.condition = condition;
    viewBtn.dataset.date = date;
    viewBtn.dataset.area = area;
    viewBtn.dataset.img = images[0] || img;
    viewBtn.dataset.images = JSON.stringify(images);
    viewBtn.dataset.price = price;
    viewBtn.dataset.beds = beds;
    viewBtn.dataset.baths = baths;
    viewBtn.dataset.desc = desc;
    viewBtn.dataset.assignedAgent = assignedAgent;
  }

  card.dataset.title = title;
  card.dataset.purpose = purpose;
  card.dataset.address = address;
  card.dataset.city = city;
  card.dataset.type = type;
  card.dataset.condition = condition;
  card.dataset.date = date;
  card.dataset.area = area;
  card.dataset.price = price;
  card.dataset.beds = beds;
  card.dataset.baths = baths;
  card.dataset.desc = desc;
  card.dataset.assignedAgent = assignedAgent;
  card.dataset.images = JSON.stringify(images);
  card.dataset.searchText = [title, desc, address, city, type, assignedAgent].join(" ").toLowerCase();
}

function normalizeImages(imagesText, fallback) {
  const out = [];
  try {
    if (imagesText && String(imagesText).trim().startsWith("[")) {
      const arr = JSON.parse(imagesText);
      if (Array.isArray(arr)) {
        arr.forEach(function (v) {
          const s = String(v || "").trim();
          if (s) out.push(s);
        });
      }
    } else if (imagesText) {
      const raw = String(imagesText).trim();
      if (raw.startsWith("data:")) {
        out.push(raw);
      } else if (raw.includes("|")) {
        raw.split("|").forEach(function (v) {
          const s = String(v || "").trim();
          if (s) out.push(s);
        });
      } else if (raw.includes(",")) {
        raw.split(",").forEach(function (v) {
          const s = String(v || "").trim();
          if (s) out.push(s);
        });
      } else {
        out.push(raw);
      }
    }
  } catch (e) {
    const s = String(imagesText || "").trim();
    if (s) out.push(s);
  }
  const cleaned = out.map(normalizeImageUrl).filter(function (s) {
    const t = String(s || "").trim();
    if (!t) return false;
    if (t.includes("{%") || t.includes("%}")) return false;
    if (t === "undefined" || t === "null") return false;
    return true;
  });

  const fb = normalizeImageUrl(fallback);
  if (!out.length && fb) out.push(fb);
  if (!cleaned.length && fb) cleaned.push(fb);
  return cleaned;
}

function renderGallery(imagesText, selectedSrc) {
  const el = document.getElementById("dGallery");
  if (!el) return;
  el.innerHTML = "";
  const images = normalizeImages(imagesText, "");
  const selected = String(selectedSrc || "").trim();
  images.forEach(function (src) {
    const img = document.createElement("img");
    setSafeImage(img, src);
    if (selected && src === selected) {
      img.classList.add("active");
    }
    img.addEventListener("click", function () {
      const big = document.getElementById("dImg");
      if (big) big.src = src;
      const all = el.querySelectorAll("img");
      all.forEach(function (node) {
        node.classList.remove("active");
      });
      img.classList.add("active");
      if (currentViewButton) {
        currentViewButton.dataset.img = src;
      }
      if (currentCard) {
        const cardImg = currentCard.querySelector("img");
        if (cardImg) cardImg.src = src;
        const ok = persistCard(currentCard);
        if (!ok) {
          alert("Image updated, but browser storage is full. Refresh may not keep all images.");
        }
      }
      openBigImagePreview(src);
    });
    el.appendChild(img);
  });
}

function openBigImagePreview(src) {
  const modal = document.getElementById("imagePreviewModal");
  const img = document.getElementById("imagePreviewLarge");
  if (!modal || !img || !src) return;
  img.src = src;
  modal.style.display = "flex";
}

function closeBigImagePreview() {
  const modal = document.getElementById("imagePreviewModal");
  const img = document.getElementById("imagePreviewLarge");
  if (!modal || !img) return;
  modal.style.display = "none";
  img.src = "";
}

function addMoreImagesToCurrent() {
  if (!currentViewButton) return;
  const fileInput = document.getElementById("dAddImagesInput");
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
}

function handleMoreImagesSelected() {
  if (!currentViewButton || !currentCard) return;
  const fileInput = document.getElementById("dAddImagesInput");
  if (!fileInput) return;

  readSelectedImages(fileInput, function (newImages) {
    if (!newImages.length) return;
    const existing = normalizeImages(
      currentViewButton.dataset.images || currentViewButton.dataset.img || "",
      currentViewButton.dataset.img || ""
    );
    const merged = existing.concat(newImages);
    currentViewButton.dataset.images = JSON.stringify(merged);
    currentViewButton.dataset.img = merged[0] || "";
    renderGallery(currentViewButton.dataset.images, currentViewButton.dataset.img);
    const ok = persistCard(currentCard);
    if (!ok) {
      alert("Images added, but browser storage is full. Refresh may not keep all images.");
    }
  });
}

function submitAddProperty(event) {
  event.preventDefault();

  const title = document.getElementById("apTitle").value.trim();
  const address = document.getElementById("apAddress").value.trim();
  const type = document.getElementById("apType").value.trim();
  const condition = document.getElementById("apCondition").value.trim();
  const date = document.getElementById("apDate").value.trim();
  const city = document.getElementById("apCity").value.trim();
  const area = document.getElementById("apArea").value.trim();
  const price = document.getElementById("apPrice").value.trim();
  const beds = document.getElementById("apBeds").value.trim();
  const baths = document.getElementById("apBaths").value.trim();
  const desc = document.getElementById("apDesc").value.trim();
  const assignedAgentSelect = document.getElementById("apAssignedAgent");
  const assignedAgentId = assignedAgentSelect ? String(assignedAgentSelect.value || "").trim() : "";
  const assignedAgentName = assignedAgentSelect
    ? String((assignedAgentSelect.options[assignedAgentSelect.selectedIndex] || {}).text || "").trim()
    : "";
  const imageInput = document.getElementById("apImage");
  const grid = document.getElementById("grid");

  if (!grid) return;
  if (assignedAgentSelect && !assignedAgentId) {
    alert("Please select an assigned agent.");
    return;
  }

  const fallbackImage = (document.querySelector(".grid .card img") || {}).src || "";

  readSelectedImages(imageInput, function (pickedImages) {
    const purpose = resolvePurpose([condition, type], purposeFallback());
    const images = pickedImages.length ? pickedImages : [fallbackImage];
    const image = images[0];
    const payload = {
      title: title,
      purpose: purpose,
      estate_type: type,
      location: (address + (city ? ", " + city : "")).trim(),
      price: parseMoneyToNumber(price),
      status: condition || "Available",
      assigned_agent_id: assignedAgentId,
    };

    const localData = {
      id: "",
      local_id: "local-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
      purpose: purpose,
      title: title,
      address: address,
      city: city,
      type: type,
      condition: condition,
      date: date,
      area: area,
      price: price,
      beds: beds,
      baths: baths,
      desc: desc,
      assigned_agent_id: assignedAgentId,
      assigned_agent_name: assignedAgentName,
      image: image,
      images: images,
    };

    if (addPropertyEditCard && addPropertyEditViewButton) {
      const estateId = String(addPropertyEditCard.dataset.id || "").trim();
      const existingImages = normalizeImages(
        addPropertyEditViewButton.dataset.images || addPropertyEditViewButton.dataset.img || "",
        addPropertyEditViewButton.dataset.img || ""
      );
      const mergedImages = pickedImages.length
        ? pickedImages
        : (existingImages.length ? existingImages : images);

      localData.id = estateId;
      localData.local_id = addPropertyEditCard.dataset.localId || localData.local_id;
      localData.image = mergedImages[0] || "";
      localData.images = mergedImages;
      const method = estateId ? "PUT" : "POST";
      const requestPayload = {
        title: title,
        estate_type: type,
        location: (address + (city ? ", " + city : "")).trim(),
        price: parseMoneyToNumber(price),
        status: condition || "Available",
        assigned_agent_id: assignedAgentId,
      };
      if (estateId) requestPayload.id = estateId;

      function applySavedEstateToCard(savedEstate, isFallbackCreate) {
        localData.id = String((savedEstate && savedEstate.id) || estateId || "");
        if (savedEstate && savedEstate.created_by_id) {
          localData.assigned_agent_id = String(savedEstate.created_by_id);
          localData.assigned_agent_name = String(savedEstate.created_by_name || assignedAgentName || "");
        }

        applyPropertyDataToCard(addPropertyEditCard, localData);
        const savedEdited = persistCard(addPropertyEditCard);
        if (!savedEdited) {
          alert("Property updated, but browser storage is full. Refresh may not keep all details/images.");
        }
        closeAddPropertyModal();
        if (isFallbackCreate) {
          alert("Old property record was missing. Created a new saved record and assigned agent.");
        } else {
          alert(estateId ? "Property details updated." : "Property saved.");
        }
      }

      estateApiRequest(method, requestPayload)
        .then(function (saved) {
          applySavedEstateToCard(saved, false);
        })
        .catch(function (error) {
          const message = String((error && error.message) || "Unknown error");
          const missingRecordOnPut = method === "PUT" && /estate not found/i.test(message);
          if (!missingRecordOnPut) {
            alert("Property save failed: " + message);
            return;
          }

          const createPayload = {
            title: requestPayload.title,
            estate_type: requestPayload.estate_type,
            location: requestPayload.location,
            price: requestPayload.price,
            status: requestPayload.status,
            assigned_agent_id: requestPayload.assigned_agent_id,
          };
          estateApiRequest("POST", createPayload)
            .then(function (created) {
              applySavedEstateToCard(created, true);
            })
            .catch(function (fallbackError) {
              alert("Property save failed: " + String((fallbackError && fallbackError.message) || "Unknown error"));
            });
        });
      return;
    }

    estateApiRequest("POST", payload)
      .then(function (saved) {
        localData.id = String(saved.id || "");
        if (saved && saved.created_by_id) {
          localData.assigned_agent_id = String(saved.created_by_id);
          localData.assigned_agent_name = String(saved.created_by_name || assignedAgentName || "");
        }
        const card = buildPropertyCard(localData);
        syncCardMeta(card);
        grid.prepend(card);
        bindCard(card);
        const savedLocal = persistCard(card);
        if (!savedLocal) {
          alert("Property added, but browser storage is full. Refresh may not keep full details/images.");
        }
        closeAddPropertyModal();
        alert("Property added.");
      })
      .catch(function (error) {
        alert("Property save failed: " + String((error && error.message) || "Unknown error"));
      });
  });
}

function buildPropertyCard(data) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = String(data.id || "");
  card.dataset.localId = String(data.local_id || "");
  card.dataset.purpose = resolvePurpose(
    [data.purpose, data.condition, data.type],
    purposeFallback()
  );
  card.dataset.title = data.title || "";
  card.dataset.address = data.address || "";
  card.dataset.city = data.city || "";
  card.dataset.type = data.type || "";
  card.dataset.condition = data.condition || "";
  card.dataset.date = data.date || "";
  card.dataset.area = data.area || "";
  card.dataset.price = data.price || "";
  card.dataset.beds = data.beds || "";
  card.dataset.baths = data.baths || "";
  card.dataset.desc = data.desc || "";
  card.dataset.assignedAgent = data.assigned_agent_name || "";
  card.dataset.assignedAgentId = String(data.assigned_agent_id || "");
  card.dataset.images = JSON.stringify(data.images || (data.image ? [data.image] : []));

  const img = document.createElement("img");
  setSafeImage(img, data.image || "");
  card.appendChild(img);

  const h3 = document.createElement("h3");
  h3.textContent = data.title || "Property";
  card.appendChild(h3);

  const p = document.createElement("p");
  p.textContent = data.desc || "";
  card.appendChild(p);

  const tags = document.createElement("div");
  tags.className = "tags";

  const bedTag = document.createElement("span");
  bedTag.innerHTML = '<i class="fa-solid fa-bed"></i> ' + (data.beds || "-") + " Bedroom";
  tags.appendChild(bedTag);

  const bathTag = document.createElement("span");
  bathTag.innerHTML = '<i class="fa-solid fa-bath"></i> ' + (data.baths || "-") + " Bathroom";
  tags.appendChild(bathTag);

  const typeTag = document.createElement("span");
  typeTag.innerHTML = '<i class="fa-solid fa-house"></i> ' + (data.type || "Property");
  tags.appendChild(typeTag);

  card.appendChild(tags);

  const bottom = document.createElement("div");
  bottom.className = "bottom";

  const priceEl = document.createElement("span");
  priceEl.className = "price";
  priceEl.textContent = data.price || "";
  bottom.appendChild(priceEl);

  const viewBtn = document.createElement("button");
  viewBtn.className = "green";
  viewBtn.textContent = "View";
  viewBtn.dataset.img = data.image || "";
  viewBtn.dataset.purpose = card.dataset.purpose || "";
  viewBtn.dataset.title = data.title || "";
  viewBtn.dataset.address = data.address || "";
  viewBtn.dataset.type = data.type || "";
  viewBtn.dataset.condition = data.condition || "";
  viewBtn.dataset.date = data.date || "";
  viewBtn.dataset.city = data.city || "";
  viewBtn.dataset.area = data.area || "";
  viewBtn.dataset.price = data.price || "";
  viewBtn.dataset.beds = data.beds || "";
  viewBtn.dataset.baths = data.baths || "";
  viewBtn.dataset.desc = data.desc || "";
  viewBtn.dataset.assignedAgent = data.assigned_agent_name || "";
  viewBtn.dataset.images = JSON.stringify(data.images || []);
  viewBtn.onclick = function () {
    openDetail(viewBtn);
  };
  bottom.appendChild(viewBtn);

  const reqBtn = document.createElement("button");
  reqBtn.className = "req";
  reqBtn.textContent = "Request";
  bottom.appendChild(reqBtn);

  card.appendChild(bottom);
  return card;
}

function loadLocalProperties() {
  const grid = document.getElementById("grid");
  if (!grid) return;
  const rows = readLocalProperties();
  if (!rows.length) return;

  rows.forEach(function (r) {
    const key = makeCardKey(r.title, r.address, r.city);
    let existing = null;
    document.querySelectorAll(".grid .card").forEach(function (card) {
      if (existing) return;
      syncCardMeta(card);
      const ck = makeCardKey(card.dataset.title, card.dataset.address, card.dataset.city);
      if (ck === key) existing = card;
    });

    if (existing) {
      applyPropertyDataToCard(existing, r);
      bindCard(existing);
      return;
    }

    const card = buildPropertyCard(r);
    applyPropertyDataToCard(card, r);
    grid.prepend(card);
    bindCard(card);
  });
}

function loadSavedEstates() {
  const grid = document.getElementById("grid");
  if (!grid) return;
  fetch("/api/estates", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Failed to load estates");
      return res.json();
    })
    .then(function (rows) {
      const localRows = readLocalProperties();
      const localById = {};
      const localByKey = {};
      localRows.forEach(function (x) {
        if (x && x.id) localById[String(x.id)] = x;
        localByKey[makeCardKey(x.title, x.address, x.city)] = x;
      });

      const existingKeys = new Set();
      document.querySelectorAll(".grid .card").forEach(function (card) {
        syncCardMeta(card);
        existingKeys.add(makeCardKey(card.dataset.title, card.dataset.address, card.dataset.city));
      });

      rows.forEach(function (r, idx) {
        const title = String(r.title || "").trim();
        const loc = String(r.location || "").trim();
        const parts = loc.split(",");
        const address = String(parts[0] || "").trim();
        const city = String(parts.slice(1).join(",") || "").trim();
        const key = makeCardKey(title, address, city);
        if (existingKeys.has(key)) return;

        const local = localById[String(r.id)] || localByKey[key] || {};
        const priceText = local.price || (r.price ? "AED " + Number(r.price).toLocaleString("en-US") : "");
        const image = local.image || pickDefaultImage(r.id || idx);
        const images = local.images || (image ? [image] : []);
        const purpose = resolvePurpose(
          [local.purpose, r.purpose, r.status, r.estate_type],
          purposeFallback()
        );

        const card = buildPropertyCard({
          id: r.id,
          local_id: local.local_id || "",
          purpose: purpose,
          title: title || "Property",
          address: local.address || address,
          city: local.city || city,
          type: local.type || r.estate_type || "Property",
          condition: local.condition || r.status || "Available",
          date: local.date || "",
          area: local.area || "",
          price: priceText,
          beds: local.beds || "",
          baths: local.baths || "",
          desc: local.desc || "",
          assigned_agent_id: local.assigned_agent_id || (r.created_by_id ? String(r.created_by_id) : ""),
          assigned_agent_name: local.assigned_agent_name || r.created_by_name || "",
          image: image,
          images: images,
        });
        applyPropertyDataToCard(card, {
          id: r.id,
          local_id: local.local_id || "",
          purpose: purpose,
          title: title || "Property",
          address: local.address || address,
          city: local.city || city,
          type: local.type || r.estate_type || "Property",
          condition: local.condition || r.status || "Available",
          date: local.date || "",
          area: local.area || "",
          price: priceText,
          beds: local.beds || "",
          baths: local.baths || "",
          desc: local.desc || "",
          assigned_agent_id: local.assigned_agent_id || (r.created_by_id ? String(r.created_by_id) : ""),
          assigned_agent_name: local.assigned_agent_name || r.created_by_name || "",
          image: image,
          images: images,
        });
        grid.prepend(card);
        bindCard(card);
        persistCard(card);
      });
    })
    .catch(function () {});
}

function initCrmHomeCards() {
  const openBtn = document.getElementById("openAddPropertyBtn");
  if (openBtn && openBtn.dataset.bound !== "1") {
    openBtn.addEventListener("click", openAddPropertyModal);
    openBtn.dataset.bound = "1";
  }

  const cards = document.querySelectorAll(".grid .card");
  cards.forEach((card) => {
    bindCard(card);
  });
  bindPurposeTabs();
  loadLocalProperties();
  loadSavedEstates();

  const searchBtn = document.getElementById("locationSearchBtn");
  if (searchBtn && searchBtn.dataset.bound !== "1") {
    searchBtn.addEventListener("click", applyPropertyFilters);
    searchBtn.dataset.bound = "1";
  }

  const typeEl = document.getElementById("typeFilter");
  if (typeEl && typeEl.dataset.bound !== "1") {
    typeEl.addEventListener("change", applyPropertyFilters);
    typeEl.dataset.bound = "1";
  }

  const locationEl = document.getElementById("searchInput");
  if (locationEl && locationEl.dataset.bound !== "1") {
    locationEl.addEventListener("change", applyPropertyFilters);
    locationEl.addEventListener("keyup", applyPropertyFilters);
    locationEl.dataset.bound = "1";
  }

  const priceEl = document.getElementById("priceFilter");
  if (priceEl && priceEl.dataset.bound !== "1") {
    priceEl.addEventListener("change", applyPropertyFilters);
    priceEl.dataset.bound = "1";
  }

  const addMoreBtn = document.getElementById("addMoreImagesBtn");
  if (addMoreBtn && addMoreBtn.dataset.bound !== "1") {
    addMoreBtn.addEventListener("click", addMoreImagesToCurrent);
    addMoreBtn.dataset.bound = "1";
  }

  const moreImagesInput = document.getElementById("dAddImagesInput");
  if (moreImagesInput && moreImagesInput.dataset.bound !== "1") {
    moreImagesInput.addEventListener("change", handleMoreImagesSelected);
    moreImagesInput.dataset.bound = "1";
  }

  const mainPreview = document.getElementById("dImg");
  if (mainPreview && mainPreview.dataset.bound !== "1") {
    mainPreview.style.cursor = "zoom-in";
    mainPreview.addEventListener("click", function () {
      if (mainPreview.src) openBigImagePreview(mainPreview.src);
    });
    mainPreview.dataset.bound = "1";
  }

  const previewClose = document.getElementById("imagePreviewClose");
  if (previewClose && previewClose.dataset.bound !== "1") {
    previewClose.addEventListener("click", closeBigImagePreview);
    previewClose.dataset.bound = "1";
  }

  const previewModal = document.getElementById("imagePreviewModal");
  if (previewModal && previewModal.dataset.bound !== "1") {
    previewModal.addEventListener("click", function (event) {
      if (event.target === previewModal) closeBigImagePreview();
    });
    previewModal.dataset.bound = "1";
  }

  applyPropertyFilters();
}

window.openAddPropertyModal = openAddPropertyModal;
window.closeAddPropertyModal = closeAddPropertyModal;
window.submitAddProperty = submitAddProperty;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCrmHomeCards);
} else {
  initCrmHomeCards();
}
