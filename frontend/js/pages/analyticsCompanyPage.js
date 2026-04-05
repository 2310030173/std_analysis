import { api } from "../api.js";
import { buildTopSeries, drawChart, professionalDonutOptions } from "../charts.js";
import { companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, formatPercent, showToast } from "../ui.js";

const pageCompanyId = document.body.dataset.company || "";
const queryCompanyId = new URLSearchParams(globalThis.location.search).get("company") || "";
const companyId = pageCompanyId || queryCompanyId;

const shell = initShell({
  pageId: "analytics",
  title: "Company Live Analytics",
  subtitle: "Live company analytics driven by backend comparison and trend computations"
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
let analyticsGraphVisible = false;
let analyticsCategorySeries = null;
let activeFilters = {};

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

function analyticsTopControls() {
  return {
    category: document.getElementById("analytics-category-filter")?.value || "",
    topMetric: document.getElementById("analytics-top-metric")?.value || "sales",
    topLimit: Number(document.getElementById("analytics-top-limit")?.value || 10)
  };
}

function populateAnalyticsCategoryOptions(categories, selectedCategory = "") {
  const categorySelect = document.getElementById("analytics-category-filter");
  if (!categorySelect) {
    return;
  }

  const uniqueCategories = [...new Set((categories || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const preferred = selectedCategory || categorySelect.value || "";

  categorySelect.innerHTML = [
    `<option value="">All Categories</option>`,
    ...uniqueCategories.map((category) => `<option value="${category}">${category}</option>`)
  ].join("");

  categorySelect.value = uniqueCategories.includes(preferred) ? preferred : "";
}

function topSalesProduct(items) {
  return [...(items || [])].sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))[0] || null;
}

root.innerHTML = `
  <section class="hero" id="analytics-company-hero"></section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Company Branches</h3>
    <p class="section-note">Branch visibility for current live analytics company.</p>
    <div id="analytics-branch-list" class="filter-group"></div>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <div class="topbar-row">
      <h3 class="section-title" style="margin-bottom:0;">Live Product Selection</h3>
      <span class="spacer"></span>
      <select id="analytics-category-filter" class="select" style="min-width:170px;">
        <option value="">All Categories</option>
      </select>
      <select id="analytics-top-metric" class="select" style="min-width:150px;">
        <option value="sales" selected>Top By Sales</option>
        <option value="profit">Top By Profit</option>
      </select>
      <select id="analytics-top-limit" class="select" style="min-width:120px;">
        <option value="5">Top 5</option>
        <option value="10" selected>Top 10</option>
        <option value="15">Top 15</option>
      </select>
    </div>
    <p class="section-note" style="margin-top:10px; margin-bottom:0;">Select categories and top-sales rules to refresh company live analytics.</p>
  </section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Revenue</div><div class="stat-value" id="a-revenue">-</div></article>
    <article class="card stat-card"><div class="stat-label">Profit</div><div class="stat-value" id="a-profit">-</div></article>
    <article class="card stat-card"><div class="stat-label">Profit Ratio</div><div class="stat-value" id="a-profit-ratio">-</div></article>
    <article class="card stat-card"><div class="stat-label">Loss Ratio</div><div class="stat-value" id="a-loss-ratio">-</div></article>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Top Sales Snapshot</h3>
    <div class="kv"><span>Selected Category</span><strong id="a-selected-category">All Categories</strong></div>
    <div class="kv"><span>Top Sales Product</span><strong id="a-top-sales-name">-</strong></div>
    <div class="kv"><span>Top Sales Units</span><strong id="a-top-sales-units">-</strong></div>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <div class="topbar-row">
      <h3 class="section-title" style="margin-bottom:0;">Category Activity Graph</h3>
      <span class="spacer"></span>
      <button id="toggle-analytics-company-graph" class="btn secondary" type="button">Show Graph</button>
    </div>
    <p class="section-note" style="margin-top:8px; margin-bottom:0;">Product data and insights are the default view. Open graph only when needed.</p>
  </section>

  <section id="analytics-company-chart-wrap" class="card hidden" style="margin-bottom:14px;">
    <h3 class="section-title">Category Activity (Top 6 + Others)</h3>
    <canvas id="analytics-company-category" height="130"></canvas>
  </section>

  <section class="grid cols-2">
    <article class="card">
      <h3 class="section-title">Company-wise Insights</h3>
      <ul id="company-insights" class="list"></ul>
    </article>
    <article class="card">
      <h3 class="section-title">Product-wise Insights</h3>
      <ul id="product-insights" class="list"></ul>
    </article>
  </section>

  <section class="card" style="margin-top:14px;">
    <h3 class="section-title">Top Products</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Product</th>
            <th>Category</th>
            <th>Sales</th>
            <th>Revenue</th>
            <th>Profit</th>
            <th>Avg Order Value</th>
          </tr>
        </thead>
        <tbody id="analytics-company-products"></tbody>
      </table>
    </div>
  </section>
`;

function renderAnalyticsCompanyGraph() {
  if (!analyticsCategorySeries) {
    return;
  }

  drawChart("analytics-company-category", {
    type: "doughnut",
    data: {
      labels: analyticsCategorySeries.labels,
      datasets: [
        {
          label: "Sales",
          data: analyticsCategorySeries.values,
          backgroundColor: graphPalette
        }
      ]
    },
    options: professionalDonutOptions(analyticsCategorySeries.fullLabels)
  });
}

async function loadAnalyticsCompany(filters = activeFilters) {
  if (!companyId) {
    throw new Error("Company parameter missing");
  }

  const controls = analyticsTopControls();
  const data = await api.companyAnalytics(companyId, {
    ...filters,
    category: controls.category,
    topMetric: controls.topMetric,
    topLimit: controls.topLimit
  });

  populateAnalyticsCategoryOptions(data.availableCategories || [], controls.category);

  document.getElementById("analytics-company-hero").innerHTML = `
    <div class="company-logo-wrap" style="margin-bottom:8px;">
      <img class="company-logo company-logo-lg" src="${companyLogo(data.company.id)}" alt="${data.company.name} logo" loading="lazy" />
      <h2>${data.company.name} - Live Analytics</h2>
    </div>
    <p>Company-level revenue, profit ratio, category movement, and product contribution for selected date range.</p>
  `;

  const branchList = Array.isArray(data.company.branches) ? data.company.branches : [];
  document.getElementById("analytics-branch-list").innerHTML = branchList.length
    ? branchList.map((branch) => `<span class="pill">${branch}</span>`).join("")
    : `<span class="pill">No branch data available</span>`;

  document.getElementById("a-revenue").textContent = formatCurrency(data.summary.revenue);
  document.getElementById("a-profit").textContent = formatCurrency(data.summary.profit);
  document.getElementById("a-profit-ratio").textContent = formatPercent(data.summary.profitRatio);
  document.getElementById("a-loss-ratio").textContent = formatPercent(data.summary.lossRatio);

  const topProductsWithImage = (data.topProducts || []).filter((item) => hasImageUrl(item.imageUrl));
  const currentTopSalesProduct = topSalesProduct(topProductsWithImage);
  document.getElementById("a-selected-category").textContent = controls.category || "All Categories";
  document.getElementById("a-top-sales-name").textContent = currentTopSalesProduct?.name || "-";
  document.getElementById("a-top-sales-units").textContent = formatNumber(currentTopSalesProduct?.sales || 0);

  document.getElementById("company-insights").innerHTML = data.companyWiseInsights.map((line) => `<li>${line}</li>`).join("");
  document.getElementById("product-insights").innerHTML = data.productWiseInsights.map((line) => `<li>${line}</li>`).join("");

  const productBody = document.getElementById("analytics-company-products");

  productBody.innerHTML = topProductsWithImage
    .map((item, index) => {
      return `
      <tr data-product-index="${index}">
        <td><img class="table-thumb" src="${item.imageUrl}" alt="${item.name}" loading="lazy" /></td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${formatNumber(item.sales)}</td>
        <td>${formatCurrency(item.revenue)}</td>
        <td>${formatCurrency(item.profit)}</td>
        <td>${formatCurrency(item.avgOrderValue)}</td>
      </tr>
    `;
    })
    .join("") || `
      <tr>
        <td colspan="7">No products found with valid images for selected category and top-product options.</td>
      </tr>
    `;

  removeBrokenImageRows(
    productBody,
    "No products found with valid images for selected category and top-product options.",
    7
  );

  analyticsCategorySeries = buildTopSeries(data.categoryBreakdown, {
    labelField: "category",
    valueField: "units",
    maxItems: 6,
    otherLabel: "Other Categories"
  });

  if (analyticsGraphVisible) {
    renderAnalyticsCompanyGraph();
  }

  showToast("Company live analytics refreshed", "success", 1400);
}

onFiltersChanged((filters) => {
  activeFilters = filters;

  loadAnalyticsCompany(filters).catch((error) => {
    showToast(error.message || "Failed to load company analytics", "error", 3200);
  });
});

document.getElementById("toggle-analytics-company-graph").addEventListener("click", () => {
  analyticsGraphVisible = !analyticsGraphVisible;

  const chartWrap = document.getElementById("analytics-company-chart-wrap");
  const button = document.getElementById("toggle-analytics-company-graph");
  chartWrap.classList.toggle("hidden", !analyticsGraphVisible);
  button.textContent = analyticsGraphVisible ? "Hide Graph" : "Show Graph";

  if (analyticsGraphVisible) {
    renderAnalyticsCompanyGraph();
  }
});

["analytics-category-filter", "analytics-top-metric", "analytics-top-limit"].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", () => {
    loadAnalyticsCompany(activeFilters).catch((error) => {
      showToast(error.message || "Unable to refresh company live analytics", "error", 3200);
    });
  });
});
