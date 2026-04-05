import { api } from "../api.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, formatPercent, showToast } from "../ui.js";

const shell = initShell({
  pageId: "analytics",
  title: "Comparison Analytics",
  subtitle: "Analyze 1 to 6 companies together and compare profit, revenue, and product leadership"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Select Companies (1 to 6)</h3>
    <div id="company-checkboxes" class="filter-group" style="margin-bottom:10px;"></div>
    <button id="run-compare" class="btn primary" type="button">Run Comparison Analytics</button>
  </section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Selected Companies</div><div class="stat-value" id="cmp-selected">-</div></article>
    <article class="card stat-card"><div class="stat-label">Highest Profit Company</div><div class="stat-value" id="cmp-highest">-</div></article>
    <article class="card stat-card"><div class="stat-label">Lowest Profit Company</div><div class="stat-value" id="cmp-lowest">-</div></article>
    <article class="card stat-card"><div class="stat-label">Overall Profit / Loss Ratio</div><div class="stat-value" id="cmp-ratio">-</div></article>
  </section>

  <section class="grid cols-2" style="margin-bottom:14px;">
    <article class="card">
      <h3 class="section-title">Company Snapshot</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Orders</th>
              <th>Sales</th>
              <th>Profit Ratio</th>
              <th>Loss Ratio</th>
            </tr>
          </thead>
          <tbody id="compare-company-body"></tbody>
        </table>
      </div>
    </article>
    <article class="card">
      <h3 class="section-title">Top Performing Products</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Company</th>
              <th>Revenue</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody id="compare-products-body"></tbody>
        </table>
      </div>
    </article>
  </section>

  <section class="grid cols-2">
    <article class="card">
      <h3 class="section-title">Company-wise Insights</h3>
      <ul id="compare-company-insights" class="list"></ul>
    </article>
    <article class="card">
      <h3 class="section-title">Product-wise Insights</h3>
      <ul id="compare-product-insights" class="list"></ul>
    </article>
  </section>
`;

let activeFilters = {};

function getSelectedCompanies() {
  return [...document.querySelectorAll("input[name='compare-company']:checked")].map((item) => item.value);
}

async function runComparison() {
  const selected = getSelectedCompanies();
  if (!selected.length || selected.length > 6) {
    showToast("Select between 1 and 6 companies", "error", 2600);
    return;
  }

  const data = await api.compareAnalytics({
    ...activeFilters,
    companies: selected.join(",")
  });

  document.getElementById("cmp-selected").textContent = formatNumber(data.selectedCompanyCount);
  document.getElementById("cmp-highest").textContent = data.highestProfitCompany?.companyName || "-";
  document.getElementById("cmp-lowest").textContent = data.lowestProfitCompany?.companyName || "-";
  document.getElementById("cmp-ratio").textContent = `${formatPercent(data.profitRatio)} / ${formatPercent(data.lossRatio)}`;

  document.getElementById("compare-products-body").innerHTML = data.topPerformingProducts
    .slice(0, 10)
    .map((item) => {
      return `
      <tr>
        <td>${item.name}</td>
        <td>${item.sourceCompany}</td>
        <td>${formatCurrency(item.revenue)}</td>
        <td>${formatCurrency(item.profit)}</td>
      </tr>
    `;
    })
    .join("");

  document.getElementById("compare-company-insights").innerHTML = data.companyWiseInsights
    .map((line) => `<li>${line}</li>`)
    .join("");

  document.getElementById("compare-product-insights").innerHTML = data.productWiseInsights
    .map((line) => `<li>${line}</li>`)
    .join("");

  document.getElementById("compare-company-body").innerHTML = data.selectedCompanies
    .map((item) => {
      return `
      <tr>
        <td>${item.companyName}</td>
        <td>${formatNumber(item.orders)}</td>
        <td>${formatNumber(item.sales)}</td>
        <td>${formatPercent(item.profitRatio)}</td>
        <td>${formatPercent(item.lossRatio)}</td>
      </tr>
    `;
    })
    .join("");

  showToast("Comparison analytics updated", "success", 1400);
}

async function bootstrap() {
  const data = await api.productCompanies();

  document.getElementById("company-checkboxes").innerHTML = data.companies
    .map((company, index) => {
      const checked = index < 2 ? "checked" : "";
      return `
        <label class="pill">
          <input type="checkbox" name="compare-company" value="${company.id}" ${checked} />
          ${company.name}
        </label>
      `;
    })
    .join("");

  await runComparison();
}

try {
  await bootstrap();
} catch (error) {
  showToast(error.message || "Unable to load companies", "error", 3200);
}

onFiltersChanged((filters) => {
  activeFilters = filters;
});

document.getElementById("run-compare").addEventListener("click", () => {
  runComparison().catch((error) => showToast(error.message || "Comparison failed", "error", 3200));
});
