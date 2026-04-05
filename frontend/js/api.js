import { API_BASE_URL, queryString } from "./config.js";
import { hideSpinner, showSpinner } from "./ui.js";

async function request(path, { method = "GET", query = {}, body = null } = {}) {
  const url = `${API_BASE_URL}${path}${queryString(query)}`;

  showSpinner();

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : null
    });

    const raw = await response.text();
    const contentType = response.headers.get("content-type") || "";
    let json = null;

    if (raw.trim()) {
      const appearsJson = contentType.includes("application/json") || raw.trim().startsWith("{") || raw.trim().startsWith("[");
      if (appearsJson) {
        try {
          json = JSON.parse(raw);
        } catch {
          json = null;
        }
      }
    }

    const isHtmlResponse = raw.trim().startsWith("<!doctype") || raw.trim().startsWith("<html");

    if (!response.ok) {
      if (isHtmlResponse) {
        throw new Error("Backend API is not connected in deployment. Configure /api to point to backend.");
      }

      throw new Error(json?.message || json?.error || `API request failed (${response.status})`);
    }

    if (json !== null) {
      return json;
    }

    if (!raw.trim()) {
      return {};
    }

    throw new Error("API returned an invalid response format");
  } finally {
    hideSpinner();
  }
}

export const api = {
  login(payload) {
    return request("/auth/login", { method: "POST", body: payload });
  },

  dashboard(filters) {
    return request("/dashboard/overview", { query: filters });
  },

  categories() {
    return request("/meta/categories");
  },

  companies(filters) {
    return request("/companies", { query: filters });
  },

  company(companyId, filters) {
    return request(`/companies/${companyId}`, { query: filters });
  },

  productCompanies() {
    return request("/products/companies");
  },

  products(filters) {
    return request("/products", { query: filters });
  },

  productHierarchy(filters) {
    return request("/products/hierarchy", { query: filters });
  },

  liveProducts(filters) {
    return request("/products/live", { query: filters });
  },

  topProducts(filters) {
    return request("/products/top", { query: filters });
  },

  productSearch(query) {
    return request("/products/search", { query: { q: query } });
  },

  seasons() {
    return request("/seasonal/seasons");
  },

  seasonCompanies(seasonId, filters) {
    return request(`/seasonal/${seasonId}/companies`, { query: filters });
  },

  seasonCompanyReport(seasonId, companyId, filters) {
    return request(`/seasonal/${seasonId}/${companyId}`, { query: filters });
  },

  paymentCompanies() {
    return request("/payments/companies");
  },

  paymentSummary(companyId, filters) {
    return request(`/payments/${companyId}`, { query: filters });
  },

  companyAnalytics(companyId, filters) {
    return request(`/analytics/company/${companyId}`, { query: filters });
  },

  compareAnalytics(filters) {
    return request("/analytics/compare", { query: filters });
  },

  offersOverview(filters) {
    return request("/analytics/offers", { query: filters });
  },

  productAnalytics(filters) {
    return request("/analytics/product", { query: filters });
  }
};
