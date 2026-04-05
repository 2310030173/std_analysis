import { api } from "../api.js";
import { companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, showDetailsModalHtml, showToast } from "../ui.js";

const pageCompanyId = document.body.dataset.company || "";
const queryCompanyId = new URLSearchParams(globalThis.location.search).get("company") || "";
const queryCategory = new URLSearchParams(globalThis.location.search).get("category") || "";
const querySubcategory = new URLSearchParams(globalThis.location.search).get("subcategory") || "";
const companyId = pageCompanyId || queryCompanyId;

function formatCompanyName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

const companyLabel = formatCompanyName(companyId);

const shell = initShell({
  pageId: "products",
  title: "Company Product Catalogue",
  subtitle: "Dedicated company product page with search and dynamic top-product insights"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero" id="company-products-hero"></section>

  <section class="card" style="margin-bottom:14px;">
    <div class="topbar-row">
      <a class="pill" href="products.html">Products</a>
      <span class="pill">Company</span>
      <span class="pill">${companyLabel || "Not Selected"}</span>
      <span class="pill">Category</span>
      <span class="pill">${queryCategory || "All"}</span>
      <span class="pill">Subcategory</span>
      <span class="pill">${querySubcategory || "All"}</span>
      <span class="spacer"></span>
      <a class="btn secondary" href="products.html">Back To Categories</a>
    </div>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <div class="topbar-row">
      <select id="company-category-filter" class="select" style="min-width:170px;">
        <option value="">All Categories</option>
      </select>
      <select id="company-view-mode" class="select" style="min-width:180px;">
        <option value="all" selected>All Products View</option>
        <option value="top">Top Products View</option>
      </select>
      <select id="company-top-metric" class="select" style="min-width:150px;" disabled>
        <option value="profit" selected>Top By Profit</option>
        <option value="sales">Top By Sales</option>
      </select>
      <select id="company-top-limit" class="select" style="min-width:120px;" disabled>
        <option value="5">Top 5</option>
        <option value="10" selected>Top 10</option>
        <option value="15">Top 15</option>
      </select>
      <input id="company-product-search" class="input" placeholder="Search products inside this company and category" />
      <button id="company-search-btn" class="btn primary" type="button">Search</button>
    </div>
    <p class="section-note" style="margin:10px 0 0;">Click any product row to view complete product details.</p>
  </section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Company</div><div class="stat-value" id="cp-company">-</div></article>
    <article class="card stat-card"><div class="stat-label">Products</div><div class="stat-value" id="cp-count">-</div></article>
    <article class="card stat-card"><div class="stat-label">Highest Selling</div><div class="stat-value" id="cp-highest-selling">-</div></article>
    <article class="card stat-card"><div class="stat-label">Highest Profit</div><div class="stat-value" id="cp-highest-profit">-</div></article>
  </section>

  <section class="card">
    <h3 class="section-title">Company Product List</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Product</th>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Brand</th>
            <th>Price</th>
            <th>Rating</th>
            <th>Sales</th>
            <th>Revenue</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody id="company-product-body"></tbody>
      </table>
    </div>
  </section>
`;

let activeFilters = {};
let activeProducts = [];

function currentControls() {
  return {
    category: document.getElementById("company-category-filter")?.value || "",
    viewMode: document.getElementById("company-view-mode")?.value || "all",
    topMetric: document.getElementById("company-top-metric")?.value || "profit",
    topLimit: Number(document.getElementById("company-top-limit")?.value || 10)
  };
}

function toggleTopControls() {
  const controls = currentControls();
  const disabled = controls.viewMode !== "top";
  const metricSelect = document.getElementById("company-top-metric");
  const limitSelect = document.getElementById("company-top-limit");

  if (metricSelect) {
    metricSelect.disabled = disabled;
  }
  if (limitSelect) {
    limitSelect.disabled = disabled;
  }
}

function populateCategoryOptions(categories, selectedValue = "") {
  const categorySelect = document.getElementById("company-category-filter");
  if (!categorySelect) {
    return;
  }

  const uniqueCategories = [...new Set((categories || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const preferred = selectedValue || categorySelect.value || queryCategory || "";

  categorySelect.innerHTML = [
    `<option value="">All Categories</option>`,
    ...uniqueCategories.map((category) => `<option value="${category}">${category}</option>`)
  ].join("");

  const exists = uniqueCategories.includes(preferred);
  categorySelect.value = exists ? preferred : "";
}

function sortByMetric(products, metric) {
  const field = metric === "sales" ? "sales" : "profit";
  return [...products].sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0));
}

function openProductDetails(product) {
  if (!product) {
    return;
  }

  const productImage = product.imageUrl || "https://source.unsplash.com/1200x900/?product";

  showDetailsModalHtml(`${product.name} - Product Details`, `
    <div class="details-photo-grid" style="grid-template-columns:1fr;">
      <div class="details-photo-card">
        <img src="${productImage}" alt="${product.name}" loading="lazy" />
        <p class="section-note" style="margin:0;"><strong>${product.name}</strong></p>
      </div>
    </div>
    <div class="kv"><span>Category</span><strong>${product.category}</strong></div>
    <div class="kv"><span>Subcategory</span><strong>${product.subcategory || product.sourceCategory || product.category}</strong></div>
    <div class="kv"><span>Brand</span><strong>${product.brand}</strong></div>
    <div class="kv"><span>Price</span><strong>${formatCurrency(product.price)}</strong></div>
    <div class="kv"><span>Rating</span><strong>${product.rating}</strong></div>
    <div class="kv"><span>Sales</span><strong>${formatNumber(product.sales)}</strong></div>
    <div class="kv"><span>Revenue</span><strong>${formatCurrency(product.revenue)}</strong></div>
    <div class="kv"><span>Profit</span><strong>${formatCurrency(product.profit)}</strong></div>
    <div class="kv"><span>Source Company</span><strong>${product.sourceCompany}</strong></div>
  `);
}

function visibleProducts(products, controls) {
  if (controls.viewMode !== "top") {
    return products;
  }

  return sortByMetric(products, controls.topMetric).slice(0, controls.topLimit);
}

async function loadCompanyProducts() {
  if (!companyId) {
    throw new Error("Company parameter missing in URL");
  }

  const searchValue = document.getElementById("company-product-search").value.trim();
  const controls = currentControls();
  const categoryFilter = controls.category || queryCategory;

  const [data, hierarchy] = await Promise.all([
    api.products({
      ...activeFilters,
      company: companyId,
      search: searchValue,
      category: categoryFilter,
      subcategory: querySubcategory
    }),
    api.productHierarchy({
      ...activeFilters,
      company: companyId
    })
  ]);

  populateCategoryOptions(
    hierarchy.categories.map((entry) => entry.category),
    categoryFilter
  );

  const companyName = data.company?.name || companyLabel || companyId || "Company";
  const companyImage = companyLogo(data.company?.id || companyId);
  const heroEl = document.getElementById("company-products-hero");
  heroEl.classList.add("company-products-hero-bg");
  heroEl.style.setProperty("--company-hero-image", `url("${companyImage}")`);

  heroEl.innerHTML = `
    <div class="company-logo-wrap" style="margin-bottom:8px;">
      <img class="company-logo company-logo-lg" src="${companyLogo(data.company?.id || companyId)}" alt="${companyName} logo" loading="lazy" />
      <h2>${companyName} - Product Catalogue</h2>
    </div>
    <p>Use category, top-product options, and search to explore this company products clearly.</p>
  `;

  activeProducts = visibleProducts(data.products, controls);

  document.getElementById("cp-company").textContent = companyName;
  document.getElementById("cp-count").textContent = formatNumber(activeProducts.length);
  document.getElementById("cp-highest-selling").textContent = sortByMetric(activeProducts, "sales")[0]?.name || "-";
  document.getElementById("cp-highest-profit").textContent = sortByMetric(activeProducts, "profit")[0]?.name || "-";

  document.getElementById("company-product-body").innerHTML = activeProducts
    .map((product, index) => {
      return `
      <tr class="clickable-row" data-product-index="${index}">
        <td><img class="table-thumb" src="${product.imageUrl}" alt="${product.name}" loading="lazy" /></td>
        <td>${product.name}</td>
        <td>${product.category}</td>
        <td>${product.subcategory || product.sourceCategory || product.category}</td>
        <td>${product.brand}</td>
        <td>${formatCurrency(product.price)}</td>
        <td>${product.rating}</td>
        <td>${formatNumber(product.sales)}</td>
        <td>${formatCurrency(product.revenue)}</td>
        <td>${formatCurrency(product.profit)}</td>
      </tr>
    `;
    })
    .join("") || `
      <tr>
        <td colspan="10">No products found for selected filters.</td>
      </tr>
    `;

  showToast("Company product page updated", "success", 1400);
}

onFiltersChanged((filters) => {
  activeFilters = filters;
  loadCompanyProducts().catch((error) => showToast(error.message || "Unable to load company products", "error", 3200));
});

document.getElementById("company-search-btn").addEventListener("click", () => {
  loadCompanyProducts().catch((error) => showToast(error.message || "Search failed", "error", 3200));
});

document.getElementById("company-product-body").addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-product-index]");
  if (!row) {
    return;
  }

  const index = Number(row.dataset.productIndex);
  openProductDetails(activeProducts[index]);
});

["company-category-filter", "company-view-mode", "company-top-metric", "company-top-limit"].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", () => {
    toggleTopControls();
    loadCompanyProducts().catch((error) => showToast(error.message || "Unable to refresh company products", "error", 3200));
  });
});

toggleTopControls();
