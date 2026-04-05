import { api } from "../api.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, showToast } from "../ui.js";

const params = new URLSearchParams(globalThis.location.search);
const selectedCategory = String(params.get("category") || "").trim();

const shell = initShell({
  pageId: "products",
  title: selectedCategory ? `${selectedCategory} Subcategories` : "Product Subcategories",
  subtitle: "Second step in product navigation: choose a subcategory"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="card" style="margin-bottom:14px;">
    <div class="topbar-row">
      <a class="pill" href="products.html">Products</a>
      <span class="pill">Category</span>
      <span id="selected-category-pill" class="pill">${selectedCategory || "Not Selected"}</span>
      <span class="spacer"></span>
      <a class="btn secondary" href="products-all.html">Open Full Catalogue</a>
    </div>
  </section>

  <section class="grid cols-3" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Category</div><div class="stat-value" id="category-title">-</div></article>
    <article class="card stat-card"><div class="stat-label">Subcategories</div><div class="stat-value" id="subcategory-count">-</div></article>
    <article class="card stat-card"><div class="stat-label">Products</div><div class="stat-value" id="category-product-count">-</div></article>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Select A Subcategory</h3>
    <p class="section-note">Each subcategory page filters to products in that exact group.</p>
    <div id="subcategory-grid" class="selector-grid"></div>
  </section>
`;

let activeFilters = {};

function matchesCategory(item, categoryName) {
  return String(item.category || "").toLowerCase() === String(categoryName || "").toLowerCase();
}

function renderMissingCategory() {
  document.getElementById("category-title").textContent = "Not Found";
  document.getElementById("subcategory-count").textContent = "0";
  document.getElementById("category-product-count").textContent = "0";
  document.getElementById("subcategory-grid").innerHTML = `
    <article class="card">
      <h3 class="section-title">Category not available</h3>
      <p class="section-note">Choose a valid category from the products home page.</p>
      <a class="btn primary" href="products.html">Back to Categories</a>
    </article>
  `;
}

async function loadCategoryHierarchy() {
  const data = await api.productHierarchy(activeFilters);

  if (!selectedCategory) {
    renderMissingCategory();
    return;
  }

  const category = data.categories.find((item) => matchesCategory(item, selectedCategory));
  if (!category) {
    renderMissingCategory();
    return;
  }

  document.getElementById("selected-category-pill").textContent = category.category;
  document.getElementById("category-title").textContent = category.category;
  document.getElementById("subcategory-count").textContent = formatNumber(category.totalSubcategories);
  document.getElementById("category-product-count").textContent = formatNumber(category.totalProducts);

  document.getElementById("subcategory-grid").innerHTML = category.subcategories
    .map((subcategory) => {
      const href = `products-all.html?category=${encodeURIComponent(category.category)}&subcategory=${encodeURIComponent(subcategory.subcategory)}`;
      const topProduct = subcategory.topProduct;

      return `
      <a class="selector-card" href="${href}">
        <h3 class="section-title">${subcategory.subcategory}</h3>
        <p class="section-note">${formatNumber(subcategory.totalProducts)} products</p>
        <p class="section-note">Revenue: ${formatCurrency(subcategory.totalRevenue)}</p>
        <p class="section-note">Profit: ${formatCurrency(subcategory.totalProfit)}</p>
        <p class="section-note" style="margin-bottom:0;">Top product: ${topProduct ? `${topProduct.name} (${topProduct.sourceCompany})` : "N/A"}</p>
        <span class="card-cta">Open ${subcategory.subcategory}</span>
      </a>
    `;
    })
    .join("");

  showToast("Subcategories loaded", "success", 1200);
}

onFiltersChanged((filters) => {
  activeFilters = filters;
  loadCategoryHierarchy().catch((error) => {
    showToast(error.message || "Failed to load subcategories", "error", 2800);
  });
});
