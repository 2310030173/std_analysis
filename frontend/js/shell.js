import { NAV_ITEMS } from "./config.js";
import { getSession, logout, requireAuth } from "./auth.js";
import {
  applyTheme,
  getSavedFilters,
  getSavedTheme,
  saveFilters,
  showToast,
  toggleTheme
} from "./ui.js";

function buildNav(activeId) {
  return NAV_ITEMS.map((item) => {
    const activeClass = item.id === activeId ? "active" : "";
    return `<a class="nav-link ${activeClass}" href="${item.href}"><span>${item.label}</span></a>`;
  }).join("");
}

function customDateInputsHtml(filters) {
  const hidden = filters.range === "custom" ? "" : "hidden";
  return `
    <div id="custom-date-wrap" class="filter-group ${hidden}">
      <input id="filter-from" class="input" type="date" value="${filters.from || ""}" />
      <input id="filter-to" class="input" type="date" value="${filters.to || ""}" />
    </div>
  `;
}

function normalizeFilters(raw) {
  return {
    range: raw.range || "month",
    from: raw.from || "",
    to: raw.to || ""
  };
}

function dispatchFilterEvent(filters) {
  globalThis.dispatchEvent(
    new CustomEvent("sda:filters-changed", {
      detail: normalizeFilters(filters)
    })
  );
}

export function initShell({ pageId, title, subtitle }) {
  const root = document.getElementById("app") || document.body;

  if (!requireAuth()) {
    return {
      contentEl: root,
      authenticated: false
    };
  }

  const session = getSession();
  const filters = getSavedFilters();

  applyTheme(getSavedTheme());

  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <h1 class="brand-title">Store Data Analysis</h1>
          <p class="brand-subtitle">Enterprise Commerce Intelligence</p>
        </div>
        <nav class="nav-list">${buildNav(pageId)}</nav>
      </aside>

      <div class="main-area">
        <header class="topbar">
          <div class="topbar-row">
            <div>
              <h2 class="page-title">${title}</h2>
              <p class="page-subtitle">${subtitle}</p>
            </div>
            <div class="spacer"></div>
            <button id="back-btn" class="btn secondary" type="button">Back</button>
            <button id="theme-btn" class="btn secondary" type="button">Theme</button>
            <button id="logout-btn" class="btn ghost" type="button">Logout</button>
          </div>
          <div class="topbar-row" style="margin-top:10px;">
            <div class="filter-group">
              <select id="filter-range" class="select">
                <option value="day" ${filters.range === "day" ? "selected" : ""}>Day</option>
                <option value="week" ${filters.range === "week" ? "selected" : ""}>Week</option>
                <option value="month" ${filters.range === "month" ? "selected" : ""}>Month</option>
                <option value="custom" ${filters.range === "custom" ? "selected" : ""}>Custom</option>
              </select>
              ${customDateInputsHtml(filters)}
              <button id="apply-filters-btn" class="btn primary" type="button">Apply Filters</button>
            </div>
            <div class="spacer"></div>
            <div class="pill">${session?.user?.email || "Analyst"}</div>
          </div>
        </header>

        <main class="content" id="page-content"></main>

        <footer class="footer">
          <span id="footer-copy"></span>
        </footer>
      </div>
    </div>

    <div id="global-spinner" class="spinner-overlay hidden" aria-live="polite" aria-label="Loading">
      <div class="spinner"></div>
    </div>

    <div id="toast-stack" class="toast-stack"></div>
  `;

  const footerCopy = document.getElementById("footer-copy");
  footerCopy.textContent = `Store Data Analysis | ${new Date().getFullYear()} | Professional e-commerce analytics platform`;

  const backBtn = document.getElementById("back-btn");
  backBtn.addEventListener("click", () => {
    if (globalThis.history.length > 1) {
      globalThis.history.back();
      return;
    }
    globalThis.location.href = "dashboard.html";
  });

  const themeBtn = document.getElementById("theme-btn");
  themeBtn.addEventListener("click", () => {
    const next = toggleTheme();
    showToast(`Switched to ${next} theme`, "success");
  });

  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn.addEventListener("click", () => {
    logout();
  });

  const rangeEl = document.getElementById("filter-range");
  const applyBtn = document.getElementById("apply-filters-btn");

  function setCustomDateVisibility() {
    const customWrap = document.getElementById("custom-date-wrap");
    if (!customWrap) {
      return;
    }

    if (rangeEl.value === "custom") {
      customWrap.classList.remove("hidden");
    } else {
      customWrap.classList.add("hidden");
    }
  }

  rangeEl.addEventListener("change", setCustomDateVisibility);

  applyBtn.addEventListener("click", () => {
    const next = normalizeFilters({
      range: rangeEl.value,
      from: document.getElementById("filter-from")?.value || "",
      to: document.getElementById("filter-to")?.value || ""
    });

    const saved = saveFilters(next);
    dispatchFilterEvent(saved);
    showToast("Date filters updated", "success");
  });

  setCustomDateVisibility();
  dispatchFilterEvent(filters);

  return {
    contentEl: document.getElementById("page-content")
  };
}

export function onFiltersChanged(handler) {
  function callback(event) {
    handler(event.detail);
  }

  globalThis.addEventListener("sda:filters-changed", callback);
  handler(normalizeFilters(getSavedFilters()));
  return () => globalThis.removeEventListener("sda:filters-changed", callback);
}
