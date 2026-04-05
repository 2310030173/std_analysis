import { api } from "../api.js";
import { companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, formatPercent, showDetailsModalHtml, showToast } from "../ui.js";

const params = new URLSearchParams(globalThis.location.search);
const seasonId = document.body.dataset.season || params.get("season");
const companyId = document.body.dataset.company || params.get("company");

const shell = initShell({
  pageId: "seasonal",
  title: "Seasonal Product Report",
  subtitle: "Company-level seasonal trend analysis with product insights"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero" id="season-report-hero"></section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Revenue</div><div class="stat-value" id="ss-revenue">-</div></article>
    <article class="card stat-card"><div class="stat-label">Profit</div><div class="stat-value" id="ss-profit">-</div></article>
    <article class="card stat-card"><div class="stat-label">Orders</div><div class="stat-value" id="ss-orders">-</div></article>
    <article class="card stat-card"><div class="stat-label">Profit Ratio</div><div class="stat-value" id="ss-profit-ratio">-</div></article>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Seasonal Insights</h3>
    <ul id="season-insights" class="list"></ul>
  </section>

  <section class="grid cols-3" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Rising Products</div><div class="stat-value" id="st-rising">-</div></article>
    <article class="card stat-card"><div class="stat-label">Stable Products</div><div class="stat-value" id="st-stable">-</div></article>
    <article class="card stat-card"><div class="stat-label">Declining Products</div><div class="stat-value" id="st-declining">-</div></article>
  </section>

  <section class="card">
    <h3 class="section-title">Seasonal Products</h3>
    <p class="section-note" style="margin-bottom:10px;">All seasonal products are shown here. Trend check is sorted by trend growth. Click any row to open full product trend details with photo.</p>
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
            <th>Trend</th>
            <th>Trend Growth</th>
          </tr>
        </thead>
        <tbody id="season-product-body"></tbody>
      </table>
    </div>
  </section>
`;

let activeSeasonProducts = [];

function normalizeNameKey(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function dedupeSeasonProducts(products) {
  const merged = new Map();

  for (const product of products || []) {
    const key = normalizeNameKey(product?.name) || String(product?.id || "");
    if (!key) {
      continue;
    }

    if (!merged.has(key)) {
      merged.set(key, { ...product });
      continue;
    }

    const current = merged.get(key);
    current.sales = Number(current.sales || 0) + Number(product.sales || 0);
    current.orders = Number(current.orders || 0) + Number(product.orders || 0);
    current.revenue = Number(current.revenue || 0) + Number(product.revenue || 0);
    current.profit = Number(current.profit || 0) + Number(product.profit || 0);
    current.loss = Number(current.loss || 0) + Number(product.loss || 0);
    current.trendGrowthPercent = Math.max(Number(current.trendGrowthPercent || 0), Number(product.trendGrowthPercent || 0));

    if (!current.imageUrl && product.imageUrl) {
      current.imageUrl = product.imageUrl;
    }
  }

  return [...merged.values()];
}

function updateTrendSummary(products) {
  const rising = products.filter((item) => item.trendDirection === "Rising").length;
  const stable = products.filter((item) => item.trendDirection === "Stable").length;
  const declining = products.filter((item) => item.trendDirection === "Declining").length;

  document.getElementById("st-rising").textContent = formatNumber(rising);
  document.getElementById("st-stable").textContent = formatNumber(stable);
  document.getElementById("st-declining").textContent = formatNumber(declining);
}

function renderSeasonProducts(products) {
  const uniqueProducts = dedupeSeasonProducts(products);

  activeSeasonProducts = [...uniqueProducts].sort((a, b) => {
    return Number(b.trendGrowthPercent || 0) - Number(a.trendGrowthPercent || 0) || Number(b.sales || 0) - Number(a.sales || 0);
  });

  updateTrendSummary(activeSeasonProducts);

  document.getElementById("season-product-body").innerHTML = activeSeasonProducts
    .map((product, index) => {
      return `
          <tr class="clickable-row" data-season-product-index="${index}">
            <td><img class="table-thumb season-product-thumb" src="${product.imageUrl}" alt="${product.name}" loading="lazy" /></td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.subcategory || product.sourceCategory || product.category}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${formatNumber(product.sales)}</td>
            <td>${formatCurrency(product.revenue)}</td>
            <td>${formatCurrency(product.profit)}</td>
            <td>${product.trendDirection}</td>
            <td>${formatPercent(product.trendGrowthPercent)}</td>
          </tr>
        `;
    })
    .join("") || `
      <tr>
        <td colspan="10">No seasonal products found for the selected filters.</td>
      </tr>
    `;
}

function openSeasonProductDetails(product) {
  if (!product) {
    return;
  }

  showDetailsModalHtml(`${product.name} - Seasonal Trend Details`, `
    <div class="details-photo-grid" style="grid-template-columns:1fr;">
      <div class="details-photo-card season-details-photo-card">
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" />
        <p class="section-note" style="margin:0;"><strong>${product.name}</strong></p>
      </div>
    </div>
    <div class="kv"><span>Category</span><strong>${product.category}</strong></div>
    <div class="kv"><span>Subcategory</span><strong>${product.subcategory || product.sourceCategory || product.category}</strong></div>
    <div class="kv"><span>Sales</span><strong>${formatNumber(product.sales)}</strong></div>
    <div class="kv"><span>Revenue</span><strong>${formatCurrency(product.revenue)}</strong></div>
    <div class="kv"><span>Profit</span><strong>${formatCurrency(product.profit)}</strong></div>
    <div class="kv"><span>Trend</span><strong>${product.trendDirection}</strong></div>
    <div class="kv"><span>Trend Growth</span><strong>${formatPercent(product.trendGrowthPercent)}</strong></div>
  `);
}

onFiltersChanged((filters) => {
  if (!seasonId || !companyId) {
    showToast("Missing season or company parameters", "error", 3200);
    return;
  }

  api
    .seasonCompanyReport(seasonId, companyId, filters)
    .then((data) => {
      document.getElementById("season-report-hero").innerHTML = `
        <div class="company-logo-wrap" style="margin-bottom:8px;">
          <img class="company-logo company-logo-lg" src="${companyLogo(data.company.id)}" alt="${data.company.name} logo" loading="lazy" />
          <h2>${data.company.name} - ${data.season.label} Report</h2>
        </div>
        <p>Season-focused products, pricing trends, and demand behavior for selected date range.</p>
      `;

      document.getElementById("ss-revenue").textContent = formatCurrency(data.summary.revenue);
      document.getElementById("ss-profit").textContent = formatCurrency(data.summary.profit);
      document.getElementById("ss-orders").textContent = formatNumber(data.summary.orders);
      document.getElementById("ss-profit-ratio").textContent = formatPercent(data.summary.profitRatio);

      document.getElementById("season-insights").innerHTML = data.insights.map((line) => `<li>${line}</li>`).join("");

      renderSeasonProducts(data.products || []);

      showToast("Seasonal report updated", "success", 1400);
    })
    .catch((error) => showToast(error.message || "Failed to load seasonal report", "error", 3200));
});

document.getElementById("season-product-body").addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-season-product-index]");
  if (!row) {
    return;
  }

  const index = Number(row.dataset.seasonProductIndex);
  openSeasonProductDetails(activeSeasonProducts[index]);
});
