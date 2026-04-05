import { api } from "../api.js";
import { companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, showDetailsModalHtml, showToast } from "../ui.js";

const shell = initShell({
  pageId: "analytics",
  title: "Product Live Analytics",
  subtitle: "Search a product and discover best-performing company, profit, and seasonal movement"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="card" style="margin-bottom:14px;">
    <div class="topbar-row">
      <input id="product-analytics-search" class="input" list="product-suggestions" placeholder="Search product name" />
      <datalist id="product-suggestions"></datalist>
      <button id="run-product-analytics" class="btn primary" type="button">Analyze Product</button>
    </div>
  </section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Best Company</div><div class="stat-value" id="pa-best-company">-</div></article>
    <article class="card stat-card"><div class="stat-label">Best Company Profit</div><div class="stat-value" id="pa-best-profit">-</div></article>
    <article class="card stat-card"><div class="stat-label">Best Company Revenue</div><div class="stat-value" id="pa-best-revenue">-</div></article>
    <article class="card stat-card"><div class="stat-label">Matched Products</div><div class="stat-value" id="pa-match-count">-</div></article>
  </section>

  <section class="grid cols-2" style="margin-bottom:14px;">
    <article class="card">
      <h3 class="section-title">Top Companies</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Sales</th>
              <th>Revenue</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody id="product-top-company-body"></tbody>
        </table>
      </div>
    </article>
    <article class="card">
      <h3 class="section-title">Top Brands</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Brand</th>
              <th>Sales</th>
              <th>Revenue</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody id="product-top-brand-body"></tbody>
        </table>
      </div>
    </article>
  </section>

  <section class="grid cols-2" style="margin-bottom:14px;">
    <article class="card">
      <h3 class="section-title">Season Performance</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Season</th>
              <th>Sales</th>
              <th>Revenue</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody id="product-season-body"></tbody>
        </table>
      </div>
    </article>
    <article class="card">
      <h3 class="section-title">Related Analytics</h3>
      <ul id="product-related-insights" class="list"></ul>
    </article>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">All Companies Performance for Searched Product</h3>
    <p class="section-note" style="margin-bottom:10px;">This table always shows all companies, while the best one is highlighted.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Sales</th>
            <th>Revenue</th>
            <th>Profit</th>
            <th>Loss</th>
          </tr>
        </thead>
        <tbody id="product-company-body"></tbody>
      </table>
    </div>
  </section>

  <section>
    <h3 class="section-title">Matched Products</h3>
    <div id="matched-products-grid" class="product-grid"></div>
  </section>
`;

let activeFilters = {};
let latestMatches = [];

async function fillSuggestions(text) {
  if (!text || text.trim().length < 2) {
    return;
  }

  const data = await api.productSearch(text.trim());
  document.getElementById("product-suggestions").innerHTML = data.products
    .map((item) => `<option value="${item.name}"></option>`)
    .join("");
}

async function runProductAnalytics() {
  const query = document.getElementById("product-analytics-search").value.trim();
  if (!query) {
    showToast("Enter a product name", "error", 2600);
    return;
  }

  const data = await api.productAnalytics({
    ...activeFilters,
    product: query
  });

  document.getElementById("pa-best-company").textContent = data.bestCompany?.companyName || "-";
  document.getElementById("pa-best-profit").textContent = formatCurrency(data.bestCompany?.profit || 0);
  document.getElementById("pa-best-revenue").textContent = formatCurrency(data.bestCompany?.revenue || 0);
  document.getElementById("pa-match-count").textContent = formatNumber(data.matches?.length || 0);

  document.getElementById("product-related-insights").innerHTML = (data.relatedInsights || [])
    .map((line) => `<li>${line}</li>`)
    .join("");

  document.getElementById("product-top-company-body").innerHTML = (data.topCompanies || [])
    .map((item) => {
      return `
      <tr>
        <td>
          <div class="company-logo-wrap" style="margin-bottom:0;">
            <img class="company-logo" src="${companyLogo(item.companyId)}" alt="${item.companyName} logo" loading="lazy" />
            <span>${item.companyName}</span>
          </div>
        </td>
        <td>${formatNumber(item.units)}</td>
        <td>${formatCurrency(item.revenue)}</td>
        <td>${formatCurrency(item.profit)}</td>
      </tr>
    `;
    })
    .join("") || `
      <tr>
        <td colspan="4">No top-company data available.</td>
      </tr>
    `;

  document.getElementById("product-top-brand-body").innerHTML = (data.topBrands || [])
    .map((item) => {
      return `
      <tr>
        <td>${item.brand}</td>
        <td>${formatNumber(item.units)}</td>
        <td>${formatCurrency(item.revenue)}</td>
        <td>${formatCurrency(item.profit)}</td>
      </tr>
    `;
    })
    .join("") || `
      <tr>
        <td colspan="4">No top-brand data available.</td>
      </tr>
    `;

  document.getElementById("product-company-body").innerHTML = (data.companyPerformance || [])
    .map((item) => {
      const isTop = item.companyId === data.bestCompany?.companyId;
      return `
      <tr>
        <td>
          <div class="company-logo-wrap" style="margin-bottom:0;">
            <img class="company-logo" src="${companyLogo(item.companyId)}" alt="${item.companyName} logo" loading="lazy" />
            <span>${item.companyName}${isTop ? " (Top)" : ""}</span>
          </div>
        </td>
        <td>${formatNumber(item.units)}</td>
        <td>${formatCurrency(item.revenue)}</td>
        <td>${formatCurrency(item.profit)}</td>
        <td>${formatCurrency(item.loss)}</td>
      </tr>
    `;
    })
    .join("");

  latestMatches = (data.matches || []).slice(0, 20);

  document.getElementById("matched-products-grid").innerHTML = latestMatches
    .map((item, index) => {
      return `
      <article class="product-card" data-product-index="${index}" style="cursor:pointer;">
        <img src="${item.imageUrl}" alt="${item.name}" loading="lazy" />
        <h3 class="section-title" style="margin-top:10px;">${item.name}</h3>
        <div class="product-meta">
          <div><strong>Company:</strong> ${item.sourceCompany}</div>
          <div><strong>Brand:</strong> ${item.brand || "-"}</div>
          <div><strong>Category:</strong> ${item.category}</div>
          <div><strong>Price:</strong> ${formatCurrency(item.price)}</div>
          <div><strong>Rating:</strong> ${item.rating}</div>
        </div>
      </article>
    `;
    })
    .join("");

  document.getElementById("product-season-body").innerHTML = (data.seasonPerformance || [])
    .map((item) => {
      return `
      <tr>
        <td>${item.season}</td>
        <td>${formatNumber(item.units)}</td>
        <td>${formatCurrency(item.revenue)}</td>
        <td>${formatCurrency(item.profit)}</td>
      </tr>
    `;
    })
    .join("");

  showToast("Product live analytics refreshed", "success", 1400);
}

async function openMatchedProductDetails(product) {
  if (!product) {
    return;
  }

  const detail = await api.productAnalytics({
    ...activeFilters,
    product: product.name
  });

  const topCompanies = (detail.topCompanies || [])
    .slice(0, 5)
    .map((item) => `${item.companyName} (${formatCurrency(item.profit)} profit)`)
    .join(" | ");

  const topBrands = (detail.topBrands || [])
    .slice(0, 5)
    .map((item) => `${item.brand} (${formatCurrency(item.profit)} profit)`)
    .join(" | ");

  showDetailsModalHtml(`${product.name} - Analytics Details`, `
    <div class="details-photo-grid" style="grid-template-columns:1fr;">
      <div class="details-photo-card">
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" />
        <p class="section-note" style="margin:0;"><strong>${product.name}</strong></p>
      </div>
    </div>
    <div class="kv"><span>Company</span><strong>${product.sourceCompany}</strong></div>
    <div class="kv"><span>Brand</span><strong>${product.brand || "-"}</strong></div>
    <div class="kv"><span>Category</span><strong>${product.category}</strong></div>
    <div class="kv"><span>Price</span><strong>${formatCurrency(product.price)}</strong></div>
    <div class="kv"><span>Rating</span><strong>${product.rating}</strong></div>
    <div class="kv"><span>Top Companies</span><strong>${topCompanies || "No top companies found"}</strong></div>
    <div class="kv"><span>Top Brands</span><strong>${topBrands || "No top brands found"}</strong></div>
  `);
}

onFiltersChanged((filters) => {
  activeFilters = filters;
});

document.getElementById("run-product-analytics").addEventListener("click", () => {
  runProductAnalytics().catch((error) => showToast(error.message || "Product analytics failed", "error", 3200));
});

document.getElementById("product-analytics-search").addEventListener("input", (event) => {
  fillSuggestions(event.target.value).catch(() => {
    // Suggestions are optional, so failures are silent.
  });
});

document.getElementById("matched-products-grid").addEventListener("click", (event) => {
  const card = event.target.closest("article[data-product-index]");
  if (!card) {
    return;
  }

  const index = Number(card.dataset.productIndex);
  openMatchedProductDetails(latestMatches[index]).catch((error) => {
    showToast(error.message || "Unable to load product analytics details", "error", 3200);
  });
});
