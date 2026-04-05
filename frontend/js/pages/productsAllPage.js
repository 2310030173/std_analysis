import { api } from "../api.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, showDetailsModal, showToast } from "../ui.js";

const pageParams = new URLSearchParams(globalThis.location.search);
const contextCategory = String(pageParams.get("category") || "").trim();
const contextSubcategory = String(pageParams.get("subcategory") || "").trim();

const shell = initShell({
  pageId: "products",
  title: "All-Company Products",
  subtitle: "Final step in navigation: filtered product catalogue with exact image URLs"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="card" style="margin-bottom:14px;">
    <div class="topbar-row">
      <a class="pill" href="products.html">Products</a>
      <span class="pill">Category</span>
      <span id="ctx-category" class="pill">${contextCategory || "All"}</span>
      <span class="pill">Subcategory</span>
      <span id="ctx-subcategory" class="pill">${contextSubcategory || "All"}</span>
      <span class="spacer"></span>
      <a id="ctx-back-link" class="btn secondary" href="products.html">Back To Categories</a>
      <a class="btn secondary" href="products-all.html">Clear Context</a>
    </div>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <div class="topbar-row">
      <select id="product-data-source" class="select">
        <option value="platform">Platform Analytics Data</option>
        <option value="live">Live Website Data</option>
      </select>
      <input id="product-search" class="input" placeholder="Search by product, brand, category, or company" />
      <button id="search-btn" class="btn primary" type="button">Search</button>
      <span id="source-pill" class="pill">Source: Platform</span>
    </div>
  </section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Visible Products</div><div class="stat-value" id="summary-products">-</div></article>
    <article class="card stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value" id="summary-revenue">-</div></article>
    <article class="card stat-card"><div class="stat-label">Total Profit</div><div class="stat-value" id="summary-profit">-</div></article>
    <article class="card stat-card"><div class="stat-label">Top Product</div><div class="stat-value" id="summary-top">-</div></article>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Highest Performance Summary</h3>
    <div class="kv"><span>Highest Selling Product</span><strong id="highest-selling">-</strong></div>
    <div class="kv"><span>Highest Profit Product</span><strong id="highest-profit">-</strong></div>
  </section>

  <section>
    <div id="products-grid" class="product-grid"></div>
  </section>
`;

let activeFilters = {};
let visibleProducts = [];

function normalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

function getContextedBackLink() {
  if (!contextCategory) {
    return "products.html";
  }
  return `products-category.html?category=${encodeURIComponent(contextCategory)}`;
}

function productMatchesContext(product) {
  const productCategory = normalizedText(product.category);
  const productSubcategory = normalizedText(product.subcategory || product.sourceCategory || product.category);

  const categoryMatch = !contextCategory || productCategory === normalizedText(contextCategory);
  const subcategoryMatch = !contextSubcategory || productSubcategory === normalizedText(contextSubcategory);

  return categoryMatch && subcategoryMatch;
}

function summarizeProducts(items) {
  const totalRevenue = items.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const totalProfit = items.reduce((sum, item) => sum + Number(item.profit || 0), 0);
  const highestSellingProduct = [...items].sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))[0] || null;
  const highestProfitProduct = [...items].sort((a, b) => Number(b.profit || 0) - Number(a.profit || 0))[0] || null;

  return {
    totalProducts: items.length,
    totalRevenue: Math.round(totalRevenue),
    totalProfit: Math.round(totalProfit),
    highestSellingProduct,
    highestProfitProduct
  };
}

function renderProducts(products) {
  visibleProducts = products.slice(0, 100);

  const cards = visibleProducts.map((product, index) => {
    const subcategory = product.subcategory || product.sourceCategory || product.category;
    const mrpText = product.mrp ? formatCurrency(product.mrp) : "-";
    const discountText = product.discount !== null && product.discount !== undefined ? `${product.discount}%` : "-";
    const stockText = product.inStock === false ? "Out of stock" : "In stock";

    return `
      <article class="product-card" data-product-index="${index}" style="cursor:pointer;">
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" />
        <h3 class="section-title" style="margin-top:10px;">${product.name}</h3>
        <div class="product-meta">
          <div><strong>Category:</strong> ${product.category}</div>
          <div><strong>Subcategory:</strong> ${subcategory}</div>
          <div><strong>Brand:</strong> ${product.brand}</div>
          <div><strong>Price:</strong> ${formatCurrency(product.price)}</div>
          <div><strong>MRP:</strong> ${mrpText}</div>
          <div><strong>Discount:</strong> ${discountText}</div>
          <div><strong>Rating:</strong> ${product.rating}</div>
          <div><strong>Stock:</strong> ${stockText}</div>
          <div><strong>Sales:</strong> ${formatNumber(product.sales)}</div>
          <div><strong>Revenue:</strong> ${formatCurrency(product.revenue)}</div>
          <div><strong>Profit:</strong> ${formatCurrency(product.profit)}</div>
          <div><strong>Source Company:</strong> ${product.sourceCompany}</div>
        </div>
      </article>
    `;
  });

  document.getElementById("products-grid").innerHTML = cards.join("") || `
    <article class="card">
      <h3 class="section-title">No Products Found</h3>
      <p class="section-note">No products match the selected category, subcategory, filters, and search text.</p>
      <a class="btn primary" href="products.html">Back to Category Navigator</a>
    </article>
  `;
}

function openProductDetails(product) {
  if (!product) {
    return;
  }

  showDetailsModal(`${product.name} - Product Details`, {
    Product: product.name,
    Category: product.category,
    Subcategory: product.subcategory || product.sourceCategory || product.category,
    Brand: product.brand,
    Price: formatCurrency(product.price),
    MRP: product.mrp ? formatCurrency(product.mrp) : "-",
    Discount: product.discount !== null && product.discount !== undefined ? `${product.discount}%` : "-",
    Rating: product.rating,
    Stock: product.inStock === false ? "Out of stock" : "In stock",
    Sales: formatNumber(product.sales),
    Revenue: formatCurrency(product.revenue),
    Profit: formatCurrency(product.profit),
    "Source Company": product.sourceCompany
  });
}

async function loadProducts() {
  const searchValue = document.getElementById("product-search").value.trim();
  const sourceType = document.getElementById("product-data-source").value;
  const data = sourceType === "live"
    ? await api.liveProducts({ search: searchValue || contextSubcategory || contextCategory, limit: 180 })
    : await api.products({
        ...activeFilters,
        search: searchValue,
        category: contextCategory,
        subcategory: contextSubcategory
      });

  const filteredProducts = sourceType === "live"
    ? data.products.filter((item) => productMatchesContext(item))
    : data.products;

  const summary = sourceType === "live" ? summarizeProducts(filteredProducts) : data.summary;

  const sourcePill = document.getElementById("source-pill");
  if (sourceType === "live") {
    sourcePill.textContent = data.sourceStatus === "online"
      ? "Source: Live Website"
      : "Source: Fallback Catalog";
  } else {
    sourcePill.textContent = "Source: Platform";
  }

  document.getElementById("summary-products").textContent = formatNumber(summary.totalProducts);
  document.getElementById("summary-revenue").textContent = formatCurrency(summary.totalRevenue);
  document.getElementById("summary-profit").textContent = formatCurrency(summary.totalProfit);
  document.getElementById("summary-top").textContent = summary.highestProfitProduct?.name || "-";

  document.getElementById("highest-selling").textContent =
    `${summary.highestSellingProduct?.name || "N/A"} (${summary.highestSellingProduct?.sourceCompany || "-"})`;
  document.getElementById("highest-profit").textContent =
    `${summary.highestProfitProduct?.name || "N/A"} (${summary.highestProfitProduct?.sourceCompany || "-"})`;

  renderProducts(filteredProducts);

  if (sourceType === "live" && data.message) {
    showToast(data.message, data.sourceStatus === "online" ? "success" : "error", 2200);
    return;
  }

  showToast("Product catalogue refreshed", "success", 1400);
}

document.getElementById("ctx-back-link").setAttribute("href", getContextedBackLink());

onFiltersChanged((filters) => {
  activeFilters = filters;
  loadProducts().catch((error) => showToast(error.message || "Unable to load products", "error", 3000));
});

document.getElementById("search-btn").addEventListener("click", () => {
  loadProducts().catch((error) => showToast(error.message || "Search failed", "error", 3000));
});

document.getElementById("product-data-source").addEventListener("change", () => {
  loadProducts().catch((error) => showToast(error.message || "Unable to switch product source", "error", 3000));
});

document.getElementById("products-grid").addEventListener("click", (event) => {
  const card = event.target.closest("article[data-product-index]");
  if (!card) {
    return;
  }

  const index = Number(card.dataset.productIndex);
  openProductDetails(visibleProducts[index]);
});
