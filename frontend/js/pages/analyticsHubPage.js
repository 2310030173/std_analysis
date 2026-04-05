import { api } from "../api.js";
import { analyticsCompanyPage, companyLogo } from "../config.js";
import { initShell } from "../shell.js";
import { showToast } from "../ui.js";

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
  pageId: "analytics",
  title: "Analytics Module",
  subtitle: "Company live analytics, multi-company comparisons, and product live analytics"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero">
    <h2>Analytics Navigation</h2>
    <p>Navigate company-level analytics, multi-company comparison, and product live intelligence.</p>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Comparison Analytics</h3>
    <p class="section-note">Analyze 1 to 6 selected companies together with profit and product insights.</p>
    <a class="selector-card" href="analytics-compare.html">
      <p class="section-note" style="margin-bottom:0;">Highest and lowest profit companies, ratios, and top performing products.</p>
      <span class="card-cta">View Comparison Analytics</span>
    </a>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Product Live Analytics</h3>
    <p class="section-note">Search a product and view best-performing company, profit, and season behavior.</p>
    <a class="selector-card" href="analytics-product.html">
      <p class="section-note" style="margin-bottom:0;">Search products and inspect company and season performance instantly.</p>
      <span class="card-cta">View Product Live Analytics</span>
    </a>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Offers Profit & Loss</h3>
    <p class="section-note">Company-wise profit/loss view with AI-style combo offers and projected profit gain.</p>
    <a class="selector-card" href="offers.html">
      <p class="section-note" style="margin-bottom:0;">Open 50+ combo offers, click cards, and inspect product photos and discount plans.</p>
      <span class="card-cta">View Offers P&L</span>
    </a>
  </section>

  <section>
    <h3 class="section-title">Company Live Analytics Pages</h3>
    <div id="analytics-company-grid" class="selector-grid"></div>
  </section>
`;

async function bootstrap() {
  const data = await api.productCompanies();

  document.getElementById("analytics-company-grid").innerHTML = orderCompanies(data.companies)
    .map((company) => {
      return `
      <a class="selector-card" href="${analyticsCompanyPage(company.id)}">
        <div class="company-logo-wrap">
          <img class="company-logo" src="${companyLogo(company.id)}" alt="${company.name} logo" loading="lazy" />
          <h3 class="section-title" style="margin-bottom:0;">${company.name}</h3>
        </div>
        <p class="section-note">Dedicated company live analytics page with dynamic charts and insights.</p>
        <span class="card-cta">View ${company.name} Analytics</span>
      </a>
    `;
    })
    .join("");

  showToast("Analytics navigation loaded", "success", 1500);
}

try {
  await bootstrap();
} catch (error) {
  showToast(error.message || "Unable to load analytics navigation", "error", 3200);
}
