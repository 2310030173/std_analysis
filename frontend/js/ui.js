import { DEFAULT_FILTERS, STORAGE_KEYS } from "./config.js";

let detailsModalEl = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ensureDetailsModal() {
  if (detailsModalEl) {
    return detailsModalEl;
  }

  const wrapper = document.createElement("div");
  wrapper.id = "details-modal";
  wrapper.className = "details-modal hidden";
  wrapper.innerHTML = `
    <div class="details-modal-overlay" data-close="true"></div>
    <article class="details-modal-panel" role="dialog" aria-modal="true" aria-labelledby="details-modal-title">
      <div class="topbar-row details-modal-header">
        <h3 id="details-modal-title" class="section-title">Details</h3>
        <span class="spacer"></span>
        <button id="details-modal-close" class="btn secondary" type="button">Close</button>
      </div>
      <div id="details-modal-content" class="details-modal-content"></div>
    </article>
  `;

  wrapper.addEventListener("click", (event) => {
    if (event.target?.dataset?.close === "true") {
      hideDetailsModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideDetailsModal();
    }
  });

  document.body.appendChild(wrapper);

  const closeButton = wrapper.querySelector("#details-modal-close");
  closeButton?.addEventListener("click", hideDetailsModal);

  detailsModalEl = wrapper;
  return wrapper;
}

function detailRows(details) {
  if (!details) {
    return [];
  }

  if (Array.isArray(details)) {
    return details
      .map((item) => ({
        label: item?.label,
        value: item?.value
      }))
      .filter((item) => String(item.label || "").trim() !== "");
  }

  return Object.entries(details).map(([label, value]) => ({ label, value }));
}

export function hideDetailsModal() {
  if (!detailsModalEl) {
    return;
  }
  detailsModalEl.classList.add("hidden");
}

export function showDetailsModal(title, details = {}) {
  const modal = ensureDetailsModal();
  const titleEl = modal.querySelector("#details-modal-title");
  const contentEl = modal.querySelector("#details-modal-content");

  if (titleEl) {
    titleEl.textContent = title || "Details";
  }

  const rows = detailRows(details);
  contentEl.innerHTML = rows.length
    ? rows
        .map((item) => {
          return `
            <div class="kv">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </div>
          `;
        })
        .join("")
    : `<p class="section-note" style="margin-bottom:0;">No additional details available.</p>`;

  modal.classList.remove("hidden");
}

export function showDetailsModalHtml(title, htmlContent = "") {
  const modal = ensureDetailsModal();
  const titleEl = modal.querySelector("#details-modal-title");
  const contentEl = modal.querySelector("#details-modal-content");

  if (titleEl) {
    titleEl.textContent = title || "Details";
  }

  contentEl.innerHTML = String(htmlContent || "").trim() ||
    `<p class="section-note" style="margin-bottom:0;">No additional details available.</p>`;

  modal.classList.remove("hidden");
}

function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Unable to parse JSON from storage: ${error.message}`);
    return fallback;
  }
}

export function getSavedTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || "light";
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function toggleTheme() {
  const next = getSavedTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function getSavedFilters() {
  const raw = localStorage.getItem(STORAGE_KEYS.filters);
  if (!raw) {
    return { ...DEFAULT_FILTERS };
  }

  return {
    ...DEFAULT_FILTERS,
    ...parseJson(raw, DEFAULT_FILTERS)
  };
}

export function saveFilters(filters) {
  const merged = {
    ...DEFAULT_FILTERS,
    ...filters
  };

  localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(merged));
  return merged;
}

export function showSpinner() {
  const el = document.getElementById("global-spinner");
  if (el) {
    el.classList.remove("hidden");
  }
}

export function hideSpinner() {
  const el = document.getElementById("global-spinner");
  if (el) {
    el.classList.add("hidden");
  }
}

export function showToast(message, type = "success", timeout = 2400) {
  const stack = document.getElementById("toast-stack");
  if (!stack) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  stack.appendChild(toast);

  globalThis.setTimeout(() => {
    toast.remove();
  }, timeout);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export function companyBadge(name) {
  return `<span class="company-badge">${name}</span>`;
}
