import { api } from "../api.js";
import { companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, showToast } from "../ui.js";

const companyDisplayOrder = ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho"];

function orderCompanies(items) {
  return [...items].sort((a, b) => {
    const aIndex = companyDisplayOrder.indexOf(a.companyId);
    const bIndex = companyDisplayOrder.indexOf(b.companyId);

    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

    if (safeA !== safeB) {
      return safeA - safeB;
    }

    return String(a.companyName || "").localeCompare(String(b.companyName || ""));
  });
}

function normalizeNameKey(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function buildFeaturedPills(featuredProducts) {
  const seen = new Set();
  const labels = [];

  for (const item of featuredProducts || []) {
    const name = String(item?.name || "").trim();
    if (!name) {
      continue;
    }

    const key = normalizeNameKey(name);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    labels.push(name);

    if (labels.length >= 6) {
      break;
    }
  }

  return labels.map((name) => `<span class="pill season-product-pill">${name}</span>`).join("");
}

const pageSeasonId = document.body.dataset.season || "";
const querySeasonId = new URLSearchParams(globalThis.location.search).get("season") || "";
const seasonId = pageSeasonId || querySeasonId;
let seasonLabel = seasonId;

async function resolveSeasonLabel() {
  try {
    const data = await api.seasons();
    const match = (data.seasons || []).find((item) => item.id === seasonId);
    seasonLabel = match?.label || seasonId;

    const seasonExampleEl = document.getElementById("season-example-list");
    if (seasonExampleEl) {
      const examples = Array.isArray(match?.productExamples) ? match.productExamples : [];
      seasonExampleEl.innerHTML = examples.length
        ? examples.map((item) => `<span class="pill" style="margin:0 8px 8px 0;">${item}</span>`).join("")
        : "<span class=\"section-note\">No seasonal example products configured.</span>";
    }
  } catch {
    seasonLabel = seasonId;
  }

  const seasonNameEl = document.getElementById("season-name");
  if (seasonNameEl) {
    seasonNameEl.textContent = seasonLabel || "-";
  }
}

const shell = initShell({
  pageId: "seasonal",
  title: "Seasonal Product Explorer",
  subtitle: "Product-first seasonal catalogue with marketplace-specific trend report access"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero">
    <h2>Season: <span id="season-name">${seasonLabel || "-"}</span></h2>
    <p>Select a seasonal product card to open detailed trend reports with company context.</p>
  </section>

  <section class="card" style="margin-bottom:12px;">
    <h3 class="section-title">Season Product Coverage</h3>
    <p class="section-note">All example products for this season are listed below and covered in seasonal reports.</p>
    <div id="season-example-list"></div>
  </section>

  <section id="season-company-grid" class="selector-grid"></section>
`;

await resolveSeasonLabel();

onFiltersChanged((filters) => {
  if (!seasonId) {
    showToast("Season parameter missing", "error", 3000);
    return;
  }

  api
    .seasonCompanies(seasonId, filters)
    .then((data) => {
      document.getElementById("season-company-grid").innerHTML = orderCompanies(data.companies)
        .map((company, index) => {
          const topProductImage = company.topProduct?.imageUrl || "https://source.unsplash.com/1200x900/?seasonal-product";
          const topProductName = company.topProduct?.name || "Seasonal Product Not Available";
          const featuredPills = buildFeaturedPills(company.featuredProducts);

          return `
            <a class="selector-card animate-stagger" style="animation-delay:${index * 60}ms" href="seasonal-report-${company.companyId}.html?season=${seasonId}">
              <img class="card-thumb season-company-thumb" src="${topProductImage}" alt="${topProductName}" loading="lazy" />
              <div class="company-logo-wrap">
                <img class="company-logo" src="${companyLogo(company.companyId)}" alt="${company.companyName} logo" loading="lazy" />
                <h3 class="section-title" style="margin-bottom:0;">${topProductName}</h3>
              </div>
              <div class="kv"><span>Marketplace</span><strong>${company.companyName}</strong></div>
              <div class="kv"><span>Season Products</span><strong>${formatNumber(company.productCount || 0)}</strong></div>
              <div class="kv"><span>Revenue</span><strong>${formatCurrency(company.revenue)}</strong></div>
              <div class="kv"><span>Profit</span><strong>${formatCurrency(company.profit)}</strong></div>
              <div class="kv"><span>Orders</span><strong>${formatNumber(company.orders)}</strong></div>
              <div class="season-product-pill-row">${featuredPills || `<span class="section-note">No related seasonal products found.</span>`}</div>
              <span class="card-cta">Open Seasonal Trend Report</span>
            </a>
          `;
        })
        .join("");

      showToast("Seasonal products refreshed", "success", 1400);
    })
    .catch((error) => showToast(error.message || "Failed to load season companies", "error", 3200));
});
