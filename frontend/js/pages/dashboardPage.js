import { api } from "../api.js";
import { buildTopSeries, drawChart, professionalDonutOptions } from "../charts.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, formatPercent, showToast } from "../ui.js";

const shell = initShell({
  pageId: "dashboard",
  title: "Executive Dashboard",
  subtitle: "Live commerce performance for Amazon, Flipkart, Myntra, Ajio, Nykaa, and Meesho"
});

const themeColors = getComputedStyle(document.documentElement);
const graphPalette = [
  themeColors.getPropertyValue("--graph-1").trim() || "#165d8f",
  themeColors.getPropertyValue("--graph-2").trim() || "#0d8c7a",
  themeColors.getPropertyValue("--graph-3").trim() || "#b56f1b",
  themeColors.getPropertyValue("--graph-4").trim() || "#5f7ca6",
  themeColors.getPropertyValue("--graph-5").trim() || "#5b8f31",
  themeColors.getPropertyValue("--graph-6").trim() || "#7d5da6"
];

const root = shell.contentEl;
let dashboardGraphVisible = false;
let dashboardCategorySeries = null;

root.innerHTML = `
  <section class="hero">
    <h2>Store Data Analysis Control Center</h2>
    <p>Dynamic KPIs, live company performance, and product-level insights powered by backend APIs.</p>
  </section>

  <section class="grid cols-4" id="kpi-cards">
    <article class="card stat-card" style="animation-delay:0.05s"><div class="stat-label">Total Revenue</div><div class="stat-value" id="kpi-revenue">-</div><div class="stat-helper" id="kpi-revenue-ratio">-</div></article>
    <article class="card stat-card" style="animation-delay:0.1s"><div class="stat-label">Total Profit</div><div class="stat-value" id="kpi-profit">-</div><div class="stat-helper" id="kpi-profit-ratio">-</div></article>
    <article class="card stat-card" style="animation-delay:0.15s"><div class="stat-label">Total Orders</div><div class="stat-value" id="kpi-orders">-</div><div class="stat-helper" id="kpi-aov">-</div></article>
    <article class="card stat-card" style="animation-delay:0.2s"><div class="stat-label">Total Loss</div><div class="stat-value" id="kpi-loss">-</div><div class="stat-helper" id="kpi-loss-ratio">-</div></article>
  </section>

  <section class="card" style="margin-top:14px;">
    <div class="topbar-row">
      <h3 class="section-title" style="margin-bottom:0;">Category Sales Graph</h3>
      <span class="spacer"></span>
      <button id="toggle-dashboard-graph" class="btn secondary" type="button">Show Graph</button>
    </div>
    <p class="section-note" style="margin-top:8px; margin-bottom:0;">Product data is the default view. Open graph only when needed.</p>
  </section>

  <section id="dashboard-chart-wrap" class="card hidden" style="margin-top:14px;">
    <h3 class="section-title">Category Sales Mix (Top 6 + Others)</h3>
    <canvas id="category-chart" height="130"></canvas>
  </section>

  <section class="card" style="margin-top:14px;">
    <h3 class="section-title">Top Performing Products</h3>
    <p class="section-note">Highest-selling and highest-profit products update with date filters.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Company</th>
            <th>Sales</th>
            <th>Revenue</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody id="top-product-body"></tbody>
      </table>
    </div>
  </section>
`;

function renderDashboardGraph() {
  if (!dashboardCategorySeries) {
    return;
  }

  drawChart("category-chart", {
    type: "doughnut",
    data: {
      labels: dashboardCategorySeries.labels,
      datasets: [
        {
          data: dashboardCategorySeries.values,
          backgroundColor: graphPalette
        }
      ]
    },
    options: professionalDonutOptions(dashboardCategorySeries.fullLabels)
  });
}

async function loadDashboard(filters) {
  const data = await api.dashboard(filters);

  document.getElementById("kpi-revenue").textContent = formatCurrency(data.kpis.totalRevenue);
  document.getElementById("kpi-profit").textContent = formatCurrency(data.kpis.totalProfit);
  document.getElementById("kpi-orders").textContent = formatNumber(data.kpis.totalOrders);
  document.getElementById("kpi-loss").textContent = formatCurrency(data.kpis.totalLoss);

  document.getElementById("kpi-revenue-ratio").textContent = `Sales: ${formatNumber(data.kpis.totalSales)}`;
  document.getElementById("kpi-profit-ratio").textContent = `Profit Ratio: ${formatPercent(data.kpis.profitRatio)}`;
  document.getElementById("kpi-aov").textContent = `Avg Order Value: ${formatCurrency(data.kpis.avgOrderValue)}`;
  document.getElementById("kpi-loss-ratio").textContent = `Loss Ratio: ${formatPercent(data.kpis.lossRatio)}`;

  const topRows = data.topProfitProducts.slice(0, 8)
    .map((item) => {
      return `
      <tr>
        <td>${item.name}</td>
        <td>${item.sourceCompany}</td>
        <td>${formatNumber(item.sales)}</td>
        <td>${formatCurrency(item.revenue)}</td>
        <td>${formatCurrency(item.profit)}</td>
      </tr>
    `;
    })
    .join("");

  document.getElementById("top-product-body").innerHTML = topRows || `<tr><td colspan="5">No product data</td></tr>`;

  dashboardCategorySeries = buildTopSeries(data.categoryPerformance, {
    labelField: "category",
    valueField: "units",
    maxItems: 6,
    otherLabel: "Other Categories"
  });

  if (dashboardGraphVisible) {
    renderDashboardGraph();
  }

  showToast("Dashboard refreshed", "success", 1600);
}

document.getElementById("toggle-dashboard-graph").addEventListener("click", () => {
  dashboardGraphVisible = !dashboardGraphVisible;

  const chartWrap = document.getElementById("dashboard-chart-wrap");
  const button = document.getElementById("toggle-dashboard-graph");
  chartWrap.classList.toggle("hidden", !dashboardGraphVisible);
  button.textContent = dashboardGraphVisible ? "Hide Graph" : "Show Graph";

  if (dashboardGraphVisible) {
    renderDashboardGraph();
  }
});

onFiltersChanged((filters) => {
  loadDashboard(filters).catch((error) => {
    showToast(error.message || "Failed to load dashboard", "error", 3200);
  });
});
