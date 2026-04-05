const LOCAL_API_FALLBACK = "http://localhost:4000/api";

function normalizeBaseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  const runtimeOverride = globalThis.__SDA_API_BASE_URL__;
  if (typeof runtimeOverride === "string" && runtimeOverride.trim()) {
    return normalizeBaseUrl(runtimeOverride);
  }

  try {
    const saved = globalThis.localStorage?.getItem("sda_api_base_url");
    if (saved?.trim()) {
      return normalizeBaseUrl(saved);
    }
  } catch {
    // Ignore localStorage access issues and continue with environment inference.
  }

  const locationInfo = globalThis.location;
  const origin = normalizeBaseUrl(locationInfo?.origin || "");
  const protocol = String(locationInfo?.protocol || "").toLowerCase();
  const hostname = String(locationInfo?.hostname || "").toLowerCase();

  if (!origin || protocol === "file:") {
    return LOCAL_API_FALLBACK;
  }

  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocalHost && !origin.endsWith(":4000")) {
    return LOCAL_API_FALLBACK;
  }

  return `${origin}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const STORAGE_KEYS = {
  session: "sda_session",
  theme: "sda_theme",
  filters: "sda_filters"
};

export const DEFAULT_FILTERS = {
  range: "month",
  from: "",
  to: ""
};

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "dashboard.html" },
  { id: "companies", label: "Companies", href: "companies.html" },
  { id: "products", label: "Products", href: "products.html" },
  { id: "seasonal", label: "Seasonal Trends", href: "seasonal.html" },
  { id: "analytics", label: "Analytics", href: "analytics.html" },
  { id: "payments", label: "Order Payments", href: "payments.html" },
  { id: "offers", label: "Offers P&L", href: "offers.html" }
];

export const COMPANY_PAGE_MAP = {
  amazon: "company-amazon.html",
  flipkart: "company-flipkart.html",
  myntra: "company-myntra.html",
  ajio: "company-ajio.html",
  nykaa: "company-nykaa.html",
  meesho: "company-meesho.html"
};

export const COMPANY_LOGO_MAP = {
  amazon: "./assets/company-logos/amazon.png",
  flipkart: "./assets/company-logos/flipkart.png",
  myntra: "./assets/company-logos/myntra.png",
  ajio: "./assets/company-logos/ajio.png",
  nykaa: "./assets/company-logos/nykaa.png",
  meesho: "./assets/company-logos/meesho.png"
};

export const PRODUCTS_COMPANY_PAGE_MAP = {
  amazon: "products-amazon.html",
  flipkart: "products-flipkart.html",
  myntra: "products-myntra.html",
  ajio: "products-ajio.html",
  nykaa: "products-nykaa.html",
  meesho: "products-meesho.html"
};

export const PAYMENTS_COMPANY_PAGE_MAP = {
  amazon: "payments-amazon.html",
  flipkart: "payments-flipkart.html",
  myntra: "payments-myntra.html",
  ajio: "payments-ajio.html",
  nykaa: "payments-nykaa.html",
  meesho: "payments-meesho.html"
};

export const ANALYTICS_COMPANY_PAGE_MAP = {
  amazon: "analytics-amazon.html",
  flipkart: "analytics-flipkart.html",
  myntra: "analytics-myntra.html",
  ajio: "analytics-ajio.html",
  nykaa: "analytics-nykaa.html",
  meesho: "analytics-meesho.html"
};

export const SEASON_SUB_PAGE_MAP = {
  summer: "season-summer.html",
  monsoon: "season-monsoon.html",
  winter: "season-winter.html",
  festive: "season-festive.html",
  spring: "season-spring.html"
};

export function productCompanyPage(companyId) {
  return PRODUCTS_COMPANY_PAGE_MAP[companyId] || `products-company.html?company=${companyId}`;
}

export function paymentCompanyPage(companyId) {
  return PAYMENTS_COMPANY_PAGE_MAP[companyId] || `payments-company.html?company=${companyId}`;
}

export function analyticsCompanyPage(companyId) {
  return ANALYTICS_COMPANY_PAGE_MAP[companyId] || `analytics-company.html?company=${companyId}`;
}

export function seasonSubPage(seasonId) {
  return SEASON_SUB_PAGE_MAP[seasonId] || `seasonal-companies.html?season=${seasonId}`;
}

export function companyLogo(companyId) {
  return COMPANY_LOGO_MAP[companyId] || "./assets/company-logos/default.png";
}

export function queryString(params = {}) {
  const qp = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      qp.set(key, value);
    }
  });

  const text = qp.toString();
  return text ? `?${text}` : "";
}
