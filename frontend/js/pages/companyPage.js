import { api } from "../api.js";
import { buildTopSeries, drawChart, professionalDonutOptions } from "../charts.js";
import { companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, formatPercent, showDetailsModalHtml, showToast } from "../ui.js";

const companyId = document.body.dataset.company;

function formatCompanyName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

const shell = initShell({
  pageId: "companies",
  title: `${formatCompanyName(companyId) || "Company"} Live Page`,
  subtitle: "Company-wise dynamic insights across revenue, profit, products, and categories"
});

const themeColors = getComputedStyle(document.documentElement);
const graphPalette = [
  themeColors.getPropertyValue("--graph-1").trim() || "#165d8f",
  themeColors.getPropertyValue("--graph-2").trim() || "#0d8c7a",
  themeColors.getPropertyValue("--graph-3").trim() || "#b56f1b",
  themeColors.getPropertyValue("--graph-4").trim() || "#5f7ca6",
  themeColors.getPropertyValue("--graph-5").trim() || "#5b8f31",
  themeColors.getPropertyValue("--graph-6").trim() || "#7d5da6"
];

const root = shell.contentEl;
let companyGraphVisible = false;
let companyCategorySeries = null;
let activeFilters = {};
let activeTopProducts = [];

function hasImageUrl(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function removeBrokenImageRows(tableBodyEl, emptyMessage, colspan) {
  if (!tableBodyEl) {
    return;
  }

  const ensureEmptyState = () => {
    if (!tableBodyEl.querySelector("tr[data-product-index]")) {
      tableBodyEl.innerHTML = `
        <tr>
          <td colspan="${colspan}">${emptyMessage}</td>
        </tr>
      `;
    }
  };

  tableBodyEl.querySelectorAll("tr[data-product-index] img.table-thumb").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        img.closest("tr[data-product-index]")?.remove();
        ensureEmptyState();
      },
      { once: true }
    );
  });
}

function topControls() {
  return {
    category: document.getElementById("cmp-category-filter")?.value || "",
    topMetric: document.getElementById("cmp-top-metric")?.value || "profit",
    topLimit: Number(document.getElementById("cmp-top-limit")?.value || 10)
  };
}

function populateCategoryOptions(categories, selectedCategory) {
  const categorySelect = document.getElementById("cmp-category-filter");
  if (!categorySelect) {
    return;
  }

  const uniqueCategories = [...new Set((categories || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const previous = selectedCategory || categorySelect.value || "";

  categorySelect.innerHTML = [
    `<option value="">All Categories</option>`,
    ...uniqueCategories.map((category) => `<option value="${category}">${category}</option>`)
  ].join("");

  const exists = uniqueCategories.includes(previous);
  categorySelect.value = exists ? previous : "";
}

function openProductDetails(item) {
  if (!item) {
    return;
  }

  const productImage = item.imageUrl || "https://source.unsplash.com/1200x900/?product";

  showDetailsModalHtml(`${item.name} - Product Details`, `
    <div class="details-photo-grid" style="grid-template-columns:1fr;">
      <div class="details-photo-card">
        <img src="${productImage}" alt="${item.name}" loading="lazy" />
        <p class="section-note" style="margin:0;"><strong>${item.name}</strong></p>
      </div>
    </div>
    <div class="kv"><span>Category</span><strong>${item.category}</strong></div>
    <div class="kv"><span>Subcategory</span><strong>${item.subcategory || item.sourceCategory || item.category}</strong></div>
    <div class="kv"><span>Brand</span><strong>${item.brand}</strong></div>
    <div class="kv"><span>Source Company</span><strong>${item.sourceCompany}</strong></div>
    <div class="kv"><span>Price</span><strong>${formatCurrency(item.price)}</strong></div>
    <div class="kv"><span>Sales</span><strong>${formatNumber(item.sales)}</strong></div>
    <div class="kv"><span>Orders</span><strong>${formatNumber(item.orders)}</strong></div>
    <div class="kv"><span>Revenue</span><strong>${formatCurrency(item.revenue)}</strong></div>
    <div class="kv"><span>Profit</span><strong>${formatCurrency(item.profit)}</strong></div>
    <div class="kv"><span>Avg Order Value</span><strong>${formatCurrency(item.avgOrderValue)}</strong></div>
    <div class="kv"><span>Rating</span><strong>${item.rating}</strong></div>
  `);
}

root.innerHTML = `
  <section class="hero" id="company-hero"></section>

  <section class="card" style="margin-top:14px;">
    <h3 class="section-title">Company Branches</h3>
    <p class="section-note">Operational branches for this company.</p>
    <div id="cmp-branch-list" class="filter-group"></div>
  </section>

  <section class="grid cols-4">
    <article class="card stat-card"><div class="stat-label">Revenue</div><div class="stat-value" id="cmp-revenue">-</div></article>
    <article class="card stat-card"><div class="stat-label">Profit</div><div class="stat-value" id="cmp-profit">-</div></article>
    <article class="card stat-card"><div class="stat-label">Orders</div><div class="stat-value" id="cmp-orders">-</div></article>
    <article class="card stat-card"><div class="stat-label">Profit Ratio</div><div class="stat-value" id="cmp-profit-ratio">-</div></article>
  </section>

  <section class="card" style="margin-top:14px;">
    <div class="topbar-row">
      <h3 class="section-title" style="margin-bottom:0;">Category Sales Graph</h3>
      <span class="spacer"></span>
      <button id="toggle-company-graph" class="btn secondary" type="button">Show Graph</button>
    </div>
    <p class="section-note" style="margin-top:8px; margin-bottom:0;">Product data is the default view. Open graph only when needed.</p>
  </section>

  <section id="company-chart-wrap" class="card hidden" style="margin-top:14px;">
    <h3 class="section-title">Category Sales Split (Top 6 + Others)</h3>
    <canvas id="cmp-category-chart" height="130"></canvas>
  </section>

  <section class="card" style="margin-top:14px;">
    <div class="topbar-row" style="margin-bottom:8px;">
      <h3 class="section-title" style="margin-bottom:0;">Top Products</h3>
      <span class="spacer"></span>
      <select id="cmp-category-filter" class="select" style="min-width:170px;">
        <option value="">All Categories</option>
      </select>
      <select id="cmp-top-metric" class="select" style="min-width:150px;">
        <option value="profit">Top By Profit</option>
        <option value="sales">Top By Sales</option>
      </select>
      <select id="cmp-top-limit" class="select" style="min-width:120px;">
        <option value="5">Top 5</option>
        <option value="10" selected>Top 10</option>
        <option value="15">Top 15</option>
      </select>
    </div>
    <p class="section-note" style="margin-bottom:10px;">Click any product row to view complete product details.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Product</th>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Price</th>
            <th>Sales</th>
            <th>Revenue</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody id="cmp-product-body"></tbody>
      </table>
    </div>
  </section>
`;

function renderCompanyGraph() {
  if (!companyCategorySeries) {
    return;
  }

  drawChart("cmp-category-chart", {
    type: "doughnut",
    data: {
      labels: companyCategorySeries.labels,
      datasets: [
        {
          data: companyCategorySeries.values,
          backgroundColor: graphPalette
        }
      ]
    },
    options: professionalDonutOptions(companyCategorySeries.fullLabels)
  });
}

async function loadCompany(filters) {
  const controls = topControls();
  const data = await api.company(companyId, {
    ...filters,
    category: controls.category,
    topMetric: controls.topMetric,
    topLimit: controls.topLimit
  });

  populateCategoryOptions(data.availableCategories || [], controls.category);

  const logoUrl = companyLogo(data.company.id);

  document.getElementById("company-hero").innerHTML = `
    <div class="company-logo-wrap" style="margin-bottom:8px;">
      <img class="company-logo company-logo-lg" src="${logoUrl}" alt="${data.company.name} logo" loading="lazy" />
      <h2>${data.company.name} - Company Analytics</h2>
    </div>
    <p>${data.company.description} | Headquarters: ${data.company.headquarters} | Branches: ${(data.company.branches || []).length}</p>
  `;

  const branchList = Array.isArray(data.company.branches) ? data.company.branches : [];
  document.getElementById("cmp-branch-list").innerHTML = branchList.length
    ? branchList.map((branch) => `<span class="pill">${branch}</span>`).join("")
    : `<span class="pill">No branch data available</span>`;

  document.getElementById("cmp-revenue").textContent = formatCurrency(data.summary.revenue);
  document.getElementById("cmp-profit").textContent = formatCurrency(data.summary.profit);
  document.getElementById("cmp-orders").textContent = formatNumber(data.summary.orders);
  document.getElementById("cmp-profit-ratio").textContent = formatPercent(data.summary.profitRatio);

  activeTopProducts = (data.topProducts || []).filter((item) => hasImageUrl(item.imageUrl));

  const productBody = document.getElementById("cmp-product-body");

  productBody.innerHTML = activeTopProducts
    .map((item, index) => {
      return `
      <tr class="clickable-row" data-product-index="${index}">
        <td><img class="table-thumb" src="${item.imageUrl}" alt="${item.name}" loading="lazy" /></td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${item.subcategory || item.sourceCategory || item.category}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatNumber(item.sales)}</td>
        <td>${formatCurrency(item.revenue)}</td>
        <td>${formatCurrency(item.profit)}</td>
      </tr>
    `;
    })
    .join("") || `
      <tr>
        <td colspan="8">No products found for selected category and top-product options.</td>
      </tr>
    `;

  removeBrokenImageRows(
    productBody,
    "No products found with valid images for selected category and top-product options.",
    8
  );

  companyCategorySeries = buildTopSeries(data.categoryBreakdown, {
    labelField: "category",
    valueField: "units",
    maxItems: 6,
    otherLabel: "Other Categories"
  });

  if (companyGraphVisible) {
    renderCompanyGraph();
  }

  showToast(`${data.company.name} page updated`, "success", 1400);
}

document.getElementById("toggle-company-graph").addEventListener("click", () => {
  companyGraphVisible = !companyGraphVisible;

  const chartWrap = document.getElementById("company-chart-wrap");
  const button = document.getElementById("toggle-company-graph");
  chartWrap.classList.toggle("hidden", !companyGraphVisible);
  button.textContent = companyGraphVisible ? "Hide Graph" : "Show Graph";

  if (companyGraphVisible) {
    renderCompanyGraph();
  }
});

onFiltersChanged((filters) => {
  activeFilters = filters;
  loadCompany(filters).catch((error) => {
    showToast(error.message || "Failed to load company details", "error", 3200);
  });
});

document.getElementById("cmp-product-body").addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-product-index]");
  if (!row) {
    return;
  }

  const index = Number(row.dataset.productIndex);
  openProductDetails(activeTopProducts[index]);
});

["cmp-category-filter", "cmp-top-metric", "cmp-top-limit"].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", () => {
    loadCompany(activeFilters).catch((error) => {
      showToast(error.message || "Unable to refresh top products", "error", 3200);
    });
  });
});
