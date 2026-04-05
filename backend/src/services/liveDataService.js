import { getCategoryTaxonomy, getProducts } from "./dataStore.js";

const WEBSITE_SOURCE_BASE = "https://dummyjson.com/products";
const CACHE_TTL_MS = 1000 * 60 * 4;

const cache = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}

function normalizeCategory(rawCategory) {
  const taxonomy = getCategoryTaxonomy();
  const source = String(rawCategory || "").toLowerCase();

  const found = taxonomy.find((category) => {
    const lower = category.toLowerCase();
    return lower.includes(source) || source.includes(lower);
  });

  if (found) {
    return found;
  }

  if (source.includes("beauty")) {
    return "Beauty";
  }
  if (source.includes("shoe") || source.includes("bag")) {
    return "Shoes & Handbags";
  }
  if (source.includes("home") || source.includes("furniture")) {
    return "Home & Kitchen";
  }
  if (source.includes("phone")) {
    return "Mobiles";
  }
  if (source.includes("laptop") || source.includes("computer")) {
    return "Computers & Accessories";
  }

  return "Electronics";
}

function summarizeProducts(items) {
  const totalRevenue = items.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalProfit = items.reduce((sum, item) => sum + (item.profit || 0), 0);

  const highestSellingProduct = [...items].sort((a, b) => (b.sales || 0) - (a.sales || 0))[0] || null;
  const highestProfitProduct = [...items].sort((a, b) => (b.profit || 0) - (a.profit || 0))[0] || null;

  return {
    totalProducts: items.length,
    totalRevenue: Math.round(totalRevenue),
    totalProfit: Math.round(totalProfit),
    highestSellingProduct,
    highestProfitProduct
  };
}

function mapLiveProduct(item, index) {
  const priceInr = Math.round((Number(item.price) || 0) * 83.5);
  const sales = Math.max(25, Math.round((Number(item.stock) || 40) * (1.8 + (index % 5) * 0.11)));
  const orders = Math.max(1, Math.round(sales * 0.62));
  const revenue = Math.round(priceInr * sales);
  const profit = Math.round(revenue * 0.2);
  const loss = Math.round(revenue * 0.028);
  const rawRating = Number(item.rating);
  const rating = Number.isFinite(rawRating) ? Number(rawRating.toFixed(1)) : 4;

  return {
    id: `live-${item.id || index + 1}`,
    productFamily: slugify(item.title || `live-product-${index + 1}`),
    name: item.title || `Live Product ${index + 1}`,
    category: normalizeCategory(item.category),
    brand: item.brand || "Live Brand",
    sourceCompany: "Live Website Catalog",
    sourceCompanyId: "live-web",
    price: priceInr,
    rating,
    imageUrl: item.thumbnail || item.images?.[0] || "https://source.unsplash.com/1200x900/?product",
    sales,
    orders,
    revenue,
    profit,
    loss,
    avgOrderValue: orders ? Math.round(revenue / orders) : 0,
    profitRatio: 20,
    lossRatio: 2.8
  };
}

function localFallback(search, limit) {
  const keyword = String(search || "").toLowerCase().trim();

  const rows = getProducts()
    .filter((item) => {
      if (!keyword) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.brand.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.sourceCompany.toLowerCase().includes(keyword)
      );
    })
    .slice(0, limit)
    .map((item, index) => {
      const sales = Math.max(18, Math.round(35 + item.rating * 28 + (index % 7) * 8));
      const orders = Math.max(1, Math.round(sales * 0.58));
      const revenue = Math.round(item.price * sales);
      const profit = Math.round(revenue * item.margin);
      const loss = Math.round(revenue * 0.024);

      return {
        id: `fallback-${item.id}`,
        productFamily: item.productFamily,
        name: item.name,
        category: item.category,
        brand: item.brand,
        sourceCompany: item.sourceCompany,
        sourceCompanyId: item.companyId,
        price: item.price,
        rating: item.rating,
        imageUrl: item.imageUrl,
        sales,
        orders,
        revenue,
        profit,
        loss,
        avgOrderValue: orders ? Math.round(revenue / orders) : 0,
        profitRatio: revenue ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
        lossRatio: revenue ? Number(((loss / revenue) * 100).toFixed(2)) : 0
      };
    });

  return {
    range: {
      range: "live",
      from: "",
      to: ""
    },
    source: "local-fallback",
    sourceStatus: "fallback-local",
    message: "Live website source unavailable; serving local catalog fallback.",
    summary: summarizeProducts(rows),
    products: rows
  };
}

async function fetchFromWebsite(search, limit) {
  const url = new URL(search ? `${WEBSITE_SOURCE_BASE}/search` : WEBSITE_SOURCE_BASE);
  if (search) {
    url.searchParams.set("q", search);
  }
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("skip", "0");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Live source request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getLiveProductsOverview(query = {}) {
  const search = String(query.search || query.q || "").trim();
  const limit = clamp(Number(query.limit || 60), 1, 200);

  const cacheKey = `${search}::${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.payload;
  }

  try {
    const payload = await fetchFromWebsite(search, limit);
    const list = Array.isArray(payload.products) ? payload.products : [];
    const mapped = list.map(mapLiveProduct);

    const response = {
      range: {
        range: "live",
        from: "",
        to: ""
      },
      source: "dummyjson",
      sourceStatus: "online",
      message: "Live website product feed connected successfully.",
      summary: summarizeProducts(mapped),
      products: mapped
    };

    cache.set(cacheKey, {
      createdAt: Date.now(),
      payload: response
    });

    return response;
  } catch (error) {
    console.warn(`Live website source unavailable, switching to local fallback: ${error.message}`);
    return localFallback(search, limit);
  }
}
