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

function normalizeToken(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function hashToUnit(seed) {
  let hash = 2166136261;
  const text = String(seed || "seed");

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.codePointAt(i) || 0;
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return ((hash >>> 0) % 10000) / 10000;
}

const imageKeywordRules = [
  {
    keywords: ["smartphone", "mobile", "phone", "iphone"],
    tags: ["smartphone", "mobile", "technology"]
  },
  {
    keywords: ["earbud", "headphone", "speaker", "audio", "soundbar"],
    tags: ["headphones", "audio", "electronics"]
  },
  {
    keywords: ["laptop", "notebook", "computer", "pc", "tablet"],
    tags: ["laptop", "computer", "technology"]
  },
  {
    keywords: ["shirt", "jeans", "kurta", "saree", "dress", "hoodie", "jacket", "fashion"],
    tags: ["fashion", "clothing", "apparel"]
  },
  {
    keywords: ["shoe", "sneaker", "sandal", "boot"],
    tags: ["shoes", "footwear", "fashion"]
  },
  {
    keywords: ["watch", "chronograph", "smartwatch"],
    tags: ["watch", "wristwatch", "accessories"]
  },
  {
    keywords: ["bag", "backpack", "luggage", "tote", "wallet"],
    tags: ["bag", "backpack", "travel"]
  },
  {
    keywords: ["serum", "lipstick", "perfume", "makeup", "cosmetic", "beauty", "sunscreen"],
    tags: ["cosmetics", "beauty", "skincare"]
  },
  {
    keywords: ["air fryer", "kitchen", "cookware", "appliance", "furniture", "desk", "chair"],
    tags: ["home", "kitchen", "appliance"]
  },
  {
    keywords: ["book", "novel", "magazine"],
    tags: ["book", "reading", "education"]
  },
  {
    keywords: ["toy", "game", "puzzle", "block"],
    tags: ["toys", "game", "kids"]
  },
  {
    keywords: ["baby", "diaper", "stroller"],
    tags: ["baby", "newborn", "care"]
  },
  {
    keywords: ["fitness", "sports", "yoga", "gym", "dumbbell", "band"],
    tags: ["fitness", "sports", "workout"]
  },
  {
    keywords: ["car", "bike", "motorbike", "dashboard", "helmet", "automotive"],
    tags: ["car", "automotive", "vehicle"]
  },
  {
    keywords: ["pet", "dog", "cat", "grooming"],
    tags: ["pet", "dog", "cat"]
  },
  {
    keywords: ["keyboard", "mouse", "office", "stationery", "printer"],
    tags: ["office", "workspace", "stationery"]
  },
  {
    keywords: ["drill", "tool", "hardware", "improvement"],
    tags: ["tools", "hardware", "workshop"]
  },
  {
    keywords: ["piano", "guitar", "musical", "instrument"],
    tags: ["music", "instrument", "piano"]
  }
];

const categoryImageTags = {
  "Electronics": ["electronics", "gadgets", "technology"],
  "Computers & Accessories": ["computer", "laptop", "technology"],
  "Mobiles": ["smartphone", "mobile", "technology"],
  "Clothing & Accessories": ["fashion", "clothing", "apparel"],
  "Fashion": ["fashion", "clothing", "style"],
  "Shoes & Handbags": ["fashion", "footwear", "handbag"],
  "Beauty": ["beauty", "cosmetics", "skincare"],
  "Health & Personal Care": ["health", "personal-care", "wellness"],
  "Home & Kitchen": ["home", "kitchen", "appliance"],
  "Grocery & Gourmet Foods": ["grocery", "food", "packaging"],
  "Books": ["book", "reading", "education"],
  "Toys & Games": ["toys", "game", "kids"],
  "Baby": ["baby", "newborn", "care"],
  "Sports, Fitness & Outdoors": ["fitness", "sports", "workout"],
  "Car & Motorbike": ["car", "automotive", "vehicle"],
  "Pet Supplies": ["pet", "dog", "cat"],
  "Office Products": ["office", "workspace", "stationery"],
  "Jewellery": ["jewelry", "necklace", "accessories"],
  "Watches": ["watch", "wristwatch", "accessories"],
  "Luggage & Bags": ["bag", "travel", "luggage"],
  "Video Games": ["gaming", "controller", "console"],
  "Tools & Home Improvement": ["tools", "hardware", "workshop"],
  "Furniture": ["furniture", "home", "interior"],
  "Musical Instruments": ["music", "instrument", "piano"]
};

function selectImageTags(text, category) {
  const normalizedText = normalizeToken(text);
  for (const rule of imageKeywordRules) {
    if (rule.keywords.some((keyword) => normalizedText.includes(keyword))) {
      return [...rule.tags];
    }
  }

  const categoryKey = String(category || "").trim();
  if (categoryKey && categoryImageTags[categoryKey]) {
    return [...categoryImageTags[categoryKey]];
  }

  return ["product", "shopping", "ecommerce"];
}

function buildRelevantImageUrl({ productName = "", category = "", brand = "", subcategory = "" }) {
  const text = [productName, category, brand, subcategory].filter(Boolean).join(" ");
  const tags = selectImageTags(text, category)
    .slice(0, 3)
    .map((tag) => encodeURIComponent(tag))
    .join(",");
  const seed = slugify(text) || "product-image";
  const lock = Math.floor(hashToUnit(seed) * 999) + 1;

  return `https://loremflickr.com/1200/900/${tags}?lock=${lock}`;
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
  const category = normalizeCategory(item.category);
  const fallbackImageUrl = buildRelevantImageUrl({
    productName: item.title || `Live Product ${index + 1}`,
    category,
    brand: item.brand || "",
    subcategory: item.category || ""
  });
  const sourceImageUrl = String(item.thumbnail || item.images?.[0] || "").trim();

  return {
    id: `live-${item.id || index + 1}`,
    productFamily: slugify(item.title || `live-product-${index + 1}`),
    name: item.title || `Live Product ${index + 1}`,
    category,
    brand: item.brand || "Live Brand",
    sourceCompany: "Live Website Catalog",
    sourceCompanyId: "live-web",
    price: priceInr,
    rating,
    imageUrl: sourceImageUrl || fallbackImageUrl,
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
  const cacheKey = `local::${search}::${limit}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.payload;
  }

  const response = localFallback(search, limit);
  response.source = "uploaded-products";
  response.sourceStatus = "local-uploaded";
  response.message = "Serving uploaded product dataset.";

  cache.set(cacheKey, {
    createdAt: Date.now(),
    payload: response
  });

  return response;
}
