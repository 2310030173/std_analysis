import { api } from "../api.js";
import { companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, formatPercent, showDetailsModalHtml, showToast } from "../ui.js";

const shell = initShell({
  pageId: "offers",
  title: "Offers Profit & Loss",
  subtitle: "Company-wise profit/loss tracking with separated combo offer recommendations"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero">
    <h2>Offers and Profit/Loss Intelligence</h2>
    <p>Track company-level profitability and launch related-product combo offers with detailed product photos and pricing insight.</p>
  </section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Companies</div><div class="stat-value" id="offers-company-count">-</div></article>
    <article class="card stat-card"><div class="stat-label">Total Profit</div><div class="stat-value" id="offers-total-profit">-</div></article>
    <article class="card stat-card"><div class="stat-label">Total Loss</div><div class="stat-value" id="offers-total-loss">-</div></article>
    <article class="card stat-card"><div class="stat-label">Combo Offers</div><div class="stat-value" id="offers-combo-count">-</div></article>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Company-wise Profit & Loss</h3>
    <p class="section-note" style="margin-bottom:10px;">Click any company row to open top and low product details with photos.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Revenue</th>
            <th>Profit</th>
            <th>Loss</th>
            <th>Profit Ratio</th>
            <th>Top Product</th>
            <th>Low Product</th>
          </tr>
        </thead>
        <tbody id="offers-company-body"></tbody>
      </table>
    </div>
  </section>

  <section class="card">
    <div class="topbar-row" style="margin-bottom:8px;">
      <h3 class="section-title" style="margin-bottom:0;">Separated Combo Offers (50+)</h3>
      <span class="spacer"></span>
      <span id="offers-top-company-pill" class="pill">Top Company: -</span>
    </div>
    <p class="section-note" style="margin-bottom:12px;">Offers are grouped by company. Click any combo card to open product photos, discount, and projected profit gain.</p>
    <div id="combo-offers-sections"></div>
  </section>
`;

let activeFilters = {};
let activeCombos = [];
let activeCompanyRows = [];

function productPhotoHtml(product, fallbackLabel) {
  if (!product) {
    return `
      <div class="details-photo-card">
        <p class="section-note" style="margin:0;">${fallbackLabel}</p>
      </div>
    `;
  }

  return `
    <div class="details-photo-card">
      <img src="${product.imageUrl}" alt="${product.name}" loading="lazy" />
      <p class="section-note" style="margin:0 0 6px;"><strong>${product.name}</strong></p>
      <div class="kv"><span>Category</span><strong>${product.category}</strong></div>
      <div class="kv"><span>Sales</span><strong>${formatNumber(product.sales)}</strong></div>
      <div class="kv"><span>Profit</span><strong>${formatCurrency(product.profit)}</strong></div>
    </div>
  `;
}

function openCompanyDetails(company) {
  if (!company) {
    return;
  }

  showDetailsModalHtml(`${company.companyName} - Profit & Loss Product Check`, `
    <div class="details-photo-grid">
      ${productPhotoHtml(company.topProduct, "No top product data")}
      ${productPhotoHtml(company.lowProduct, "No low product data")}
    </div>
    <div class="kv"><span>Revenue</span><strong>${formatCurrency(company.revenue)}</strong></div>
    <div class="kv"><span>Profit</span><strong>${formatCurrency(company.profit)}</strong></div>
    <div class="kv"><span>Loss</span><strong>${formatCurrency(company.loss)}</strong></div>
    <div class="kv"><span>Profit Ratio</span><strong>${formatPercent(company.profitRatio)}</strong></div>
  `);
}

function comboDetailsHtml(combo) {
  return `
    <div class="details-photo-grid">
      <div class="details-photo-card">
        <img src="${combo.primaryProduct.imageUrl}" alt="${combo.primaryProduct.name}" loading="lazy" />
        <p class="section-note" style="margin:0 0 6px;"><strong>${combo.primaryProduct.name}</strong></p>
        <div class="kv"><span>Category</span><strong>${combo.primaryProduct.category}</strong></div>
        <div class="kv"><span>Price</span><strong>${formatCurrency(combo.primaryProduct.price)}</strong></div>
      </div>
      <div class="details-photo-card">
        <img src="${combo.secondaryProduct.imageUrl}" alt="${combo.secondaryProduct.name}" loading="lazy" />
        <p class="section-note" style="margin:0 0 6px;"><strong>${combo.secondaryProduct.name}</strong></p>
        <div class="kv"><span>Category</span><strong>${combo.secondaryProduct.category}</strong></div>
        <div class="kv"><span>Price</span><strong>${formatCurrency(combo.secondaryProduct.price)}</strong></div>
      </div>
    </div>
    <div class="kv"><span>Company</span><strong>${combo.companyName}</strong></div>
    <div class="kv"><span>Discount</span><strong>${combo.recommendedDiscount}%</strong></div>
    <div class="kv"><span>Bundle Price</span><strong>${formatCurrency(combo.bundlePrice)}</strong></div>
    <div class="kv"><span>Offer Price</span><strong>${formatCurrency(combo.offerPrice)}</strong></div>
    <div class="kv"><span>Estimated Units Lift</span><strong>${formatNumber(combo.estimatedUnitsLift)}</strong></div>
    <div class="kv"><span>Estimated Profit Gain</span><strong>${formatCurrency(combo.estimatedProfitGain)}</strong></div>
    <div class="kv"><span>Reason</span><strong>${combo.reason}</strong></div>
  `;
}

function openComboDetails(combo) {
  if (!combo) {
    return;
  }

  showDetailsModalHtml(`${combo.companyName} Combo Offer`, comboDetailsHtml(combo));
}

function renderSummary(summary) {
  document.getElementById("offers-company-count").textContent = formatNumber(summary.companyCount);
  document.getElementById("offers-total-profit").textContent = formatCurrency(summary.totalProfit);
  document.getElementById("offers-total-loss").textContent = formatCurrency(summary.totalLoss);
  document.getElementById("offers-combo-count").textContent = formatNumber(summary.comboCount);
  document.getElementById("offers-top-company-pill").textContent = `Top Company: ${summary.topCompany?.companyName || "-"}`;
}

function renderCompanyTable(items) {
  activeCompanyRows = items;

  document.getElementById("offers-company-body").innerHTML = items
    .map((item, index) => {
      return `
        <tr class="clickable-row" data-company-index="${index}">
          <td>
            <div class="company-logo-wrap" style="margin-bottom:0;">
              <img class="company-logo" src="${companyLogo(item.companyId)}" alt="${item.companyName} logo" loading="lazy" />
              <span>${item.companyName}</span>
            </div>
          </td>
          <td>${formatCurrency(item.revenue)}</td>
          <td>${formatCurrency(item.profit)}</td>
          <td>${formatCurrency(item.loss)}</td>
          <td>${formatPercent(item.profitRatio)}</td>
          <td>${item.topProduct?.name || "-"}</td>
          <td>${item.lowProduct?.name || "-"}</td>
        </tr>
      `;
    })
    .join("") || `
      <tr>
        <td colspan="7">No company profit/loss data found for selected date filters.</td>
      </tr>
    `;
}

function renderComboCards(items) {
  activeCombos = items;

  const companyOrder = ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho"];
  const grouped = new Map();
  items.forEach((combo, index) => {
    if (!grouped.has(combo.companyId)) {
      grouped.set(combo.companyId, []);
    }
    grouped.get(combo.companyId).push({ combo, index });
  });

  const groupedSections = [...grouped.entries()]
    .sort((a, b) => {
      const aIdx = companyOrder.indexOf(a[0]);
      const bIdx = companyOrder.indexOf(b[0]);
      const safeA = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx;
      const safeB = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx;
      return safeA - safeB;
    })
    .map(([companyId, entries]) => {
      const companyName = entries[0]?.combo?.companyName || companyId;
      const cards = entries
        .map(({ combo, index }) => {
          return `
            <article class="selector-card combo-card clickable-row" data-combo-index="${index}">
              <div class="combo-photo-row">
                <img src="${combo.primaryProduct.imageUrl}" alt="${combo.primaryProduct.name}" loading="lazy" />
                <span class="combo-plus">+</span>
                <img src="${combo.secondaryProduct.imageUrl}" alt="${combo.secondaryProduct.name}" loading="lazy" />
              </div>

              <h3 class="section-title">${combo.primaryProduct.name} + ${combo.secondaryProduct.name}</h3>
              <div class="kv"><span>Discount</span><strong>${combo.recommendedDiscount}%</strong></div>
              <div class="kv"><span>Offer Price</span><strong>${formatCurrency(combo.offerPrice)}</strong></div>
              <div class="kv"><span>Profit Gain</span><strong>${formatCurrency(combo.estimatedProfitGain)}</strong></div>
              <span class="card-cta">Open Combo Offer</span>
            </article>
          `;
        })
        .join("");

      return `
        <section class="card" style="margin-bottom:12px;">
          <div class="company-logo-wrap" style="margin-bottom:10px;">
            <img class="company-logo" src="${companyLogo(companyId)}" alt="${companyName} logo" loading="lazy" />
            <h3 class="section-title" style="margin-bottom:0;">${companyName} Combo Offers</h3>
            <span class="spacer"></span>
            <span class="pill">${entries.length} offers</span>
          </div>
          <div class="selector-grid">${cards}</div>
        </section>
      `;
    })
    .join("");

  document.getElementById("combo-offers-sections").innerHTML = groupedSections || `
    <article class="card">
      <h3 class="section-title">No Combo Offers Available</h3>
      <p class="section-note" style="margin-bottom:0;">Try another date range to generate combo offers.</p>
    </article>
  `;
}

async function loadOffers() {
  const data = await api.offersOverview({
    ...activeFilters,
    comboLimit: 60
  });

  renderSummary(data.summary);
  renderCompanyTable(data.companyProfitLoss || []);
  renderComboCards(data.comboOffers || []);

  showToast("Offers analytics refreshed", "success", 1300);
}

onFiltersChanged((filters) => {
  activeFilters = filters;
  loadOffers().catch((error) => {
    showToast(error.message || "Failed to load offers analytics", "error", 3200);
  });
});

document.getElementById("offers-company-body").addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-company-index]");
  if (!row) {
    return;
  }

  const index = Number(row.dataset.companyIndex);
  openCompanyDetails(activeCompanyRows[index]);
});

document.getElementById("combo-offers-sections").addEventListener("click", (event) => {
  const card = event.target.closest("article[data-combo-index]");
  if (!card) {
    return;
  }

  const index = Number(card.dataset.comboIndex);
  openComboDetails(activeCombos[index]);
});
