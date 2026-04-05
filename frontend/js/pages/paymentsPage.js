import { api } from "../api.js";
import { companyLogo, paymentCompanyPage } from "../config.js";
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
  pageId: "payments",
  title: "Order Payment Summary",
  subtitle: "Company-wise payment records with dedicated summary pages"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero">
    <h2>Company Payment Pages</h2>
    <p>Select a company card to access transaction-level order payment insights.</p>
  </section>
  <section id="payment-company-grid" class="selector-grid"></section>
`;

async function bootstrap() {
  const data = await api.paymentCompanies();

  document.getElementById("payment-company-grid").innerHTML = orderCompanies(data.companies)
    .map((company) => {
      return `
      <a class="selector-card" href="${paymentCompanyPage(company.id)}">
        <div class="company-logo-wrap">
          <img class="company-logo" src="${companyLogo(company.id)}" alt="${company.name} logo" loading="lazy" />
          <h3 class="section-title" style="margin-bottom:0;">${company.name}</h3>
        </div>
        <p class="section-note">Headquarters: ${company.headquarters}</p>
        <span class="card-cta">View Order Payment Summary</span>
      </a>
    `;
    })
    .join("");

  showToast("Payment companies loaded", "success", 1400);
}

try {
  await bootstrap();
} catch (error) {
  showToast(error.message || "Unable to load payment companies", "error", 3200);
}
