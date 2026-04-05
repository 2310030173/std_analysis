import { api } from "../api.js";
import { companyLogo } from "../config.js";
import { initShell, onFiltersChanged } from "../shell.js";
import { formatCurrency, formatNumber, showDetailsModal, showToast } from "../ui.js";

const pageCompanyId = document.body.dataset.company || "";
const queryCompanyId = new URLSearchParams(globalThis.location.search).get("company") || "";
const companyId = pageCompanyId || queryCompanyId;

const shell = initShell({
  pageId: "payments",
  title: "Order Payment Summary",
  subtitle: "Customer-level order and payment records for selected company"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero" id="payment-hero"></section>

  <section class="grid cols-4" style="margin-bottom:14px;">
    <article class="card stat-card"><div class="stat-label">Total Orders</div><div class="stat-value" id="pay-orders">-</div></article>
    <article class="card stat-card"><div class="stat-label">Total Amount</div><div class="stat-value" id="pay-amount">-</div></article>
    <article class="card stat-card"><div class="stat-label">Avg Ticket Size</div><div class="stat-value" id="pay-ticket">-</div></article>
    <article class="card stat-card"><div class="stat-label">Quantity Sold</div><div class="stat-value" id="pay-qty">-</div></article>
  </section>

  <section class="card" style="margin-bottom:14px;">
    <h3 class="section-title">Payment Method Split</h3>
    <div id="payment-methods"></div>
  </section>

  <section class="card">
    <h3 class="section-title">Order Payment Records</h3>
    <p class="section-note" style="margin-bottom:10px;">Click any customer row to view full customer and product details.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Address</th>
            <th>Phone</th>
            <th>Purchased Product</th>
            <th>Quantity</th>
            <th>Total Price</th>
            <th>Payment Method</th>
            <th>Order Date</th>
            <th>Payment Summary</th>
          </tr>
        </thead>
        <tbody id="payment-record-body"></tbody>
      </table>
    </div>
  </section>
`;

let activeRecords = [];

function openRecordDetails(record) {
  if (!record) {
    return;
  }

  showDetailsModal(`${record.customerName} - Customer Order Details`, {
    Customer: record.customerName,
    Address: record.address,
    Phone: record.phone,
    Product: record.purchasedProduct,
    Quantity: record.quantity,
    "Total Price": formatCurrency(record.totalPrice),
    "Payment Method": record.paymentMethod,
    "Order Date": record.orderDate,
    "Payment Summary": record.paymentSummary
  });
}

onFiltersChanged((filters) => {
  if (!companyId) {
    showToast("Company parameter missing", "error", 3200);
    return;
  }

  api
    .paymentSummary(companyId, filters)
    .then((data) => {
      document.getElementById("payment-hero").innerHTML = `
        <div class="company-logo-wrap" style="margin-bottom:8px;">
          <img class="company-logo company-logo-lg" src="${companyLogo(data.company.id)}" alt="${data.company.name} logo" loading="lazy" />
          <h2>${data.company.name} - Order Payment Summary</h2>
        </div>
        <p>Detailed customer orders and payment behavior for the selected date range.</p>
      `;

      document.getElementById("pay-orders").textContent = formatNumber(data.summary.totalOrders);
      document.getElementById("pay-amount").textContent = formatCurrency(data.summary.totalAmount);
      document.getElementById("pay-ticket").textContent = formatCurrency(data.summary.avgTicketSize);
      document.getElementById("pay-qty").textContent = formatNumber(data.summary.totalQuantity);

      document.getElementById("payment-methods").innerHTML = data.paymentMethodSplit
        .map((item) => `<div class="kv"><span>${item.method}</span><strong>${formatCurrency(item.amount)}</strong></div>`)
        .join("");

      activeRecords = data.records || [];

      document.getElementById("payment-record-body").innerHTML = activeRecords
        .map((item, index) => {
          return `
          <tr class="clickable-row" data-record-index="${index}">
            <td>${item.customerName}</td>
            <td>${item.address}</td>
            <td>${item.phone}</td>
            <td>${item.purchasedProduct}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.totalPrice)}</td>
            <td>${item.paymentMethod}</td>
            <td>${item.orderDate}</td>
            <td>${item.paymentSummary}</td>
          </tr>
        `;
        })
        .join("") || `
          <tr>
            <td colspan="9">No payment records found for selected range.</td>
          </tr>
        `;

      showToast("Order payment summary refreshed", "success", 1400);
    })
    .catch((error) => showToast(error.message || "Unable to load payment summary", "error", 3200));
});

document.getElementById("payment-record-body").addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-record-index]");
  if (!row) {
    return;
  }

  const index = Number(row.dataset.recordIndex);
  openRecordDetails(activeRecords[index]);
});
