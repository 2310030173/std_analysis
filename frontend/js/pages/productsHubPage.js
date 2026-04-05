import { api } from "../api.js";
import { initShell } from "../shell.js";
import { formatNumber, showToast } from "../ui.js";

const shell = initShell({
  pageId: "products",
  title: "Products Module",
  subtitle: "Category-first product intelligence with structured navigation"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero">
    <h2>Product Category Navigator</h2>
    <p>Follow a structured flow: categories, subcategories, then filtered product lists with exact product images.</p>
  </section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Categories</div><div class="stat-value" id="summary-categories">-</div></article>
    <article class="card stat-card"><div class="stat-label">Subcategories</div><div class="stat-value" id="summary-subcategories">-</div></article>
    <article class="card stat-card"><div class="stat-label">Products</div><div class="stat-value" id="summary-products">-</div></article>
    <article class="card stat-card"><div class="stat-label">Flow</div><div class="stat-value">Category -> Subcategory -> Product</div></article>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Choose A Category</h3>
    <p class="section-note">Start here. Every category opens dedicated subcategory pages before the product listing.</p>
    <div id="category-grid" class="selector-grid"></div>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Quick Access</h3>
    <div class="selector-grid">
      <a class="selector-card" href="products-all.html">
        <h3 class="section-title">All Products</h3>
        <p class="section-note">Open the full catalogue without category restrictions.</p>
        <span class="card-cta">Browse Full Catalogue</span>
      </a>
    </div>
  </section>
`;

async function bootstrap() {
  const hierarchyData = await api.productHierarchy();

  document.getElementById("summary-categories").textContent = formatNumber(hierarchyData.summary.totalCategories);
  document.getElementById("summary-subcategories").textContent = formatNumber(hierarchyData.summary.totalSubcategories);
  document.getElementById("summary-products").textContent = formatNumber(hierarchyData.summary.totalProducts);

  document.getElementById("category-grid").innerHTML = hierarchyData.categories
    .map((category) => {
      const topSubcategories = category.subcategories
        .slice(0, 3)
        .map((item) => item.subcategory)
        .join(" | ");
      const href = `products-category.html?category=${encodeURIComponent(category.category)}`;

      return `
      <a class="selector-card" href="${href}">
        <h3 class="section-title">${category.category}</h3>
        <p class="section-note">${formatNumber(category.totalProducts)} products across ${formatNumber(category.totalSubcategories)} subcategories.</p>
        <p class="section-note" style="margin-bottom:0;">Top subcategories: ${topSubcategories || "General"}</p>
        <span class="card-cta">Open ${category.category}</span>
      </a>
    `;
    })
    .join("");

  showToast("Category navigation ready", "success", 1500);
}

try {
  await bootstrap();
} catch (error) {
  showToast(error.message || "Failed to load products module", "error", 3200);
}
