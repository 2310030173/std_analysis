import { api } from "../api.js";
import { COMPANY_PAGE_MAP, companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, formatPercent, showToast } from "../ui.js";

const companyDisplayOrder = ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho"];

function orderCompanies(items) {
  return [...items].sort((a, b) => {
    const aIndex = companyDisplayOrder.indexOf(a.id);
    const bIndex = companyDisplayOrder.indexOf(b.id);

    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

    if (safeA !== safeB) {
      return safeA - safeB;
    }

    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

const shell = initShell({
  pageId: "companies",
  title: "Company Intelligence",
  subtitle: "Dedicated company pages with performance, products, and trend intelligence."
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero">
    <h2>Marketplace Company Pages</h2>
    <p>Choose a company card to move into a focused analytics workspace.</p>
  </section>
  <section id="company-grid" class="company-grid"></section>
`;

async function loadCompanies(filters) {
  const response = await api.companies(filters);
  const cards = orderCompanies(response.companies)
    .map((company, index) => {
      const topProductSubcategory = company.topProduct?.subcategory || company.topProduct?.category || "-";
      const branchList = Array.isArray(company.branches) ? company.branches : [];
      const branchPreview = branchList.slice(0, 3).join(" | ") || "No branches configured";

      return `
      <a class="company-card animate-stagger" style="animation-delay:${index * 60}ms" href="${COMPANY_PAGE_MAP[company.id]}">
        <div class="company-logo-wrap">
          <img class="company-logo company-logo-lg" src="${companyLogo(company.id)}" alt="${company.name} logo" loading="lazy" />
          <h3 class="section-title" style="margin-bottom:0;">${company.name}</h3>
        </div>
        <p class="section-note">${company.description}</p>
        <div class="kv"><span>Branches</span><strong>${branchList.length}</strong></div>
        <div class="kv"><span>Branch Preview</span><strong>${branchPreview}</strong></div>
        <div class="kv"><span>Revenue</span><strong>${formatCurrency(company.summary.revenue)}</strong></div>
        <div class="kv"><span>Profit</span><strong>${formatCurrency(company.summary.profit)}</strong></div>
        <div class="kv"><span>Orders</span><strong>${formatNumber(company.summary.orders)}</strong></div>
        <div class="kv"><span>Profit Ratio</span><strong>${formatPercent(company.summary.profitRatio)}</strong></div>
        <div class="kv"><span>Top Category</span><strong>${company.topCategory}</strong></div>
        <div class="kv"><span>Top Product</span><strong>${company.topProduct?.name || "N/A"}</strong></div>
        <div class="kv"><span>Top Subcategory</span><strong>${topProductSubcategory}</strong></div>
        <span class="card-cta">View Company Workspace</span>
      </a>
    `;
    })
    .join("");

  document.getElementById("company-grid").innerHTML = cards;
}

onFiltersChanged((filters) => {
  loadCompanies(filters).catch((error) => {
    showToast(error.message || "Unable to load companies", "error");
  });
});
