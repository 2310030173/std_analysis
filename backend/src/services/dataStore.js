import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");

function readJson(fileName) {
  const fullPath = path.join(dataDir, fileName);
  const content = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(content);
}

function readJsonOptional(fileName, fallbackValue) {
  try {
    const fullPath = path.join(dataDir, fileName);
    if (!fs.existsSync(fullPath)) {
      return fallbackValue;
    }
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    console.warn(`Unable to read optional JSON ${fileName}: ${error.message}`);
    return fallbackValue;
  }
}

const companies = readJson("companies.json");
const productFamilies = readJson("productFamilies.json");
const paymentProfiles = readJson("paymentProfiles.json");
const imageOverrides = readJsonOptional("productImages.json", {});
const customProductsRaw = readJsonOptional("customProducts.json", []);

const defaultCategoryTaxonomy = [
  "Electronics",
  "Computers & Accessories",
  "Mobiles",
  "Clothing & Accessories",
  "Fashion",
  "Shoes & Handbags",
  "Beauty",
  "Health & Personal Care",
  "Home & Kitchen",
  "Grocery & Gourmet Foods",
  "Books",
  "Toys & Games",
  "Baby",
  "Sports, Fitness & Outdoors",
  "Car & Motorbike",
  "Pet Supplies",
  "Office Products",
  "Jewellery",
  "Watches",
  "Luggage & Bags",
  "Video Games",
  "Tools & Home Improvement",
  "Furniture",
  "Musical Instruments"
];

const companyDemandFactor = {
  amazon: 1.23,
  flipkart: 1.14,
  myntra: 1.02,
  ajio: 0.96,
  nykaa: 0.98,
  meesho: 0.91
};

const companyPriceFactor = {
  amazon: 1.04,
  flipkart: 0.99,
  myntra: 1.08,
  ajio: 1.03,
  nykaa: 1.06,
  meesho: 0.94
};

const companyMarginFactor = {
  amazon: 1.04,
  flipkart: 1.01,
  myntra: 1.08,
  ajio: 1.03,
  nykaa: 1.12,
  meesho: 0.95
};

const categoryDemandIndex = {
  "Electronics": 34,
  "Computers & Accessories": 21,
  "Mobiles": 29,
  "Clothing & Accessories": 26,
  "Fashion": 25,
  "Shoes & Handbags": 18,
  "Beauty": 23,
  "Health & Personal Care": 19,
  "Home & Kitchen": 24,
  "Grocery & Gourmet Foods": 17,
  "Books": 11,
  "Toys & Games": 12,
  "Baby": 10,
  "Sports, Fitness & Outdoors": 14,
  "Car & Motorbike": 9,
  "Pet Supplies": 8,
  "Office Products": 13,
  "Jewellery": 7,
  "Watches": 8,
  "Luggage & Bags": 10,
  "Video Games": 9,
  "Tools & Home Improvement": 8,
  "Furniture": 7,
  "Musical Instruments": 6
};

const categoryMarginIndex = {
  "Electronics": 0.16,
  "Computers & Accessories": 0.14,
  "Mobiles": 0.12,
  "Clothing & Accessories": 0.23,
  "Fashion": 0.24,
  "Shoes & Handbags": 0.22,
  "Beauty": 0.31,
  "Health & Personal Care": 0.26,
  "Home & Kitchen": 0.19,
  "Grocery & Gourmet Foods": 0.13,
  "Books": 0.21,
  "Toys & Games": 0.2,
  "Baby": 0.18,
  "Sports, Fitness & Outdoors": 0.19,
  "Car & Motorbike": 0.15,
  "Pet Supplies": 0.17,
  "Office Products": 0.16,
  "Jewellery": 0.28,
  "Watches": 0.27,
  "Luggage & Bags": 0.22,
  "Video Games": 0.17,
  "Tools & Home Improvement": 0.16,
  "Furniture": 0.2,
  "Musical Instruments": 0.18
};

const seasonConfig = [
  {
    id: "summer",
    label: "Summer",
    months: [4, 5, 6],
    focusCategories: ["Home & Kitchen", "Electronics", "Sports, Fitness & Outdoors", "Beauty"],
    productExamples: ["Sunglasses", "Cooling Bottle", "Portable Fan", "Summer Accessories", "Sunscreen", "Ice Box"]
  },
  {
    id: "monsoon",
    label: "Rainy Season",
    months: [7, 8, 9],
    focusCategories: ["Fashion", "Home & Kitchen", "Office Products", "Sports, Fitness & Outdoors"],
    productExamples: ["Raincoat", "Waterproof Backpack", "Quick Dry Shoes", "Umbrella", "Rain Boots", "Dry Bag"]
  },
  {
    id: "winter",
    label: "Winter",
    months: [11, 12, 1],
    focusCategories: ["Home & Kitchen", "Fashion", "Beauty"],
    productExamples: [
      "Room Heater",
      "Winter Wear",
      "Warm Beverage Maker",
      "Thermal Essentials",
      "Wool Blanket",
      "Moisturizer"
    ]
  },
  {
    id: "festive",
    label: "Festive Season",
    months: [10, 11],
    focusCategories: ["Electronics", "Fashion", "Beauty", "Home & Kitchen"],
    productExamples: ["Saree", "Kurti", "Perfume", "Smartphone", "Smartwatch", "Decorative Lights"]
  },
  {
    id: "spring",
    label: "Spring",
    months: [2, 3],
    focusCategories: ["Sports, Fitness & Outdoors", "Office Products", "Beauty", "Electronics"],
    productExamples: ["Running Shoes", "Yoga Mat", "Laptop", "Wireless Keyboard", "Fitness Band", "Travel Backpack"]
  }
];

const seasonalExampleCategoryMap = {
  sunglasses: "Fashion",
  "cooling bottle": "Home & Kitchen",
  "portable fan": "Electronics",
  "summer accessories": "Fashion",
  sunscreen: "Beauty",
  "ice box": "Home & Kitchen",
  raincoat: "Fashion",
  "waterproof backpack": "Fashion",
  "quick dry shoes": "Fashion",
  umbrella: "Fashion",
  "rain boots": "Fashion",
  "dry bag": "Luggage & Bags",
  "room heater": "Home & Kitchen",
  "winter wear": "Fashion",
  "warm beverage maker": "Home & Kitchen",
  "thermal essentials": "Fashion",
  "wool blanket": "Home & Kitchen",
  moisturizer: "Beauty",
  saree: "Fashion",
  kurti: "Fashion",
  perfume: "Beauty",
  smartphone: "Electronics",
  smartwatch: "Electronics",
  "decorative lights": "Home & Kitchen",
  "running shoes": "Fashion",
  "yoga mat": "Sports, Fitness & Outdoors",
  laptop: "Electronics",
  "wireless keyboard": "Electronics",
  "fitness band": "Sports, Fitness & Outdoors",
  "travel backpack": "Luggage & Bags"
};

const keywordCategoryRules = [
  {
    category: "Electronics",
    keywords: [
      "phone",
      "smartphone",
      "mobile",
      "laptop",
      "notebook",
      "tablet",
      "earbud",
      "headphone",
      "speaker",
      "camera",
      "television",
      "tv",
      "monitor",
      "keyboard",
      "mouse",
      "router",
      "ssd",
      "hard drive",
      "charger",
      "power bank",
      "smart watch",
      "game console",
      "gaming console"
    ]
  },
  {
    category: "Fashion",
    keywords: [
      "jean",
      "shirt",
      "t-shirt",
      "dress",
      "kurta",
      "saree",
      "hoodie",
      "jacket",
      "shoe",
      "sneaker",
      "sandal",
      "bag",
      "wallet",
      "watch",
      "raincoat",
      "umbrella"
    ]
  },
  {
    category: "Beauty",
    keywords: [
      "lipstick",
      "serum",
      "moisturizer",
      "makeup",
      "foundation",
      "face wash",
      "shampoo",
      "conditioner",
      "sunscreen",
      "perfume",
      "deodorant",
      "skin care"
    ]
  },
  {
    category: "Home & Kitchen",
    keywords: [
      "kitchen",
      "cookware",
      "pressure cooker",
      "furniture",
      "utensil",
      "mixer",
      "grinder",
      "bottle",
      "mattress",
      "bedsheet",
      "home"
    ]
  },
  {
    category: "Grocery & Gourmet Foods",
    keywords: ["snack", "tea", "coffee", "rice", "oil", "masala", "chocolate", "food", "grocery"]
  },
  {
    category: "Sports, Fitness & Outdoors",
    keywords: ["fitness", "sports", "gym", "outdoor", "cycle", "yoga", "dumbbell", "treadmill"]
  },
  {
    category: "Books",
    keywords: ["book", "novel", "magazine", "textbook"]
  },
  {
    category: "Toys & Games",
    keywords: ["toy", "puzzle", "board game", "lego", "rc car"]
  },
  {
    category: "Baby",
    keywords: ["baby", "diaper", "feeding bottle", "stroller"]
  },
  {
    category: "Office Products",
    keywords: ["office", "printer", "stationery", "notepad", "pen", "chair"]
  },
  {
    category: "Car & Motorbike",
    keywords: ["car", "motorbike", "helmet", "bike", "automotive"]
  },
  {
    category: "Pet Supplies",
    keywords: ["pet", "dog", "cat", "aquarium", "bird feed"]
  }
];

const explicitSubcategoryCategoryMap = {
  "true wireless earbuds": "Electronics",
  "neckband earphones": "Electronics",
  smartphone: "Electronics",
  smartwatch: "Electronics",
  laptop: "Electronics",
  "wireless keyboard": "Electronics",
  saree: "Fashion",
  kurti: "Fashion",
  "running shoes": "Fashion",
  backpack: "Fashion",
  sunglasses: "Fashion",
  jeans: "Fashion",
  "floor lamp": "Home & Kitchen",
  "coffee maker": "Home & Kitchen",
  "pressure cooker": "Home & Kitchen",
  "water bottle": "Home & Kitchen",
  perfume: "Beauty",
  "electric toothbrush": "Beauty",
  "yoga mat": "Sports, Fitness & Outdoors",
  "desk chair": "Office Products"
};

const explicitSubcategorySeasonMap = {
  "true wireless earbuds": "festive",
  "neckband earphones": "summer",
  smartphone: "festive",
  smartwatch: "festive",
  laptop: "spring",
  "wireless keyboard": "spring",
  saree: "festive",
  kurti: "festive",
  "running shoes": "spring",
  backpack: "monsoon",
  sunglasses: "summer",
  jeans: "winter",
  "floor lamp": "winter",
  "coffee maker": "winter",
  "pressure cooker": "winter",
  "water bottle": "summer",
  perfume: "festive",
  "electric toothbrush": "spring",
  "yoga mat": "spring",
  "desk chair": "spring",
  raincoat: "monsoon",
  umbrella: "monsoon",
  "waterproof backpack": "monsoon",
  "cooling bottle": "summer",
  "portable fan": "summer",
  "summer accessories": "summer",
  sunscreen: "summer",
  "ice box": "summer",
  "quick dry shoes": "monsoon",
  "rain boots": "monsoon",
  "dry bag": "monsoon",
  "winter wear": "winter",
  "warm beverage maker": "winter",
  "thermal essentials": "winter",
  "wool blanket": "winter",
  moisturizer: "winter",
  "decorative lights": "festive",
  "fitness band": "spring",
  "travel backpack": "spring"
};

const seasonKeywordRules = [
  {
    seasonId: "summer",
    keywords: [
      "cooler",
      "air conditioner",
      "ac",
      "fan",
      "water bottle",
      "sunglass",
      "summer",
      "hydration"
    ]
  },
  {
    seasonId: "monsoon",
    keywords: ["rain", "raincoat", "umbrella", "waterproof", "monsoon", "rainy", "quick dry", "backpack"]
  },
  {
    seasonId: "winter",
    keywords: ["heater", "blanket", "hoodie", "jacket", "thermal", "coffee maker", "winter", "warm"]
  },
  {
    seasonId: "festive",
    keywords: ["festive", "party", "ethnic", "saree", "kurti", "perfume", "smartphone", "earbuds"]
  },
  {
    seasonId: "spring",
    keywords: ["running", "yoga", "fitness", "spring", "work from home", "keyboard", "chair", "laptop"]
  }
];

function hashToUnit(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.codePointAt(i) || 0;
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function getPastDateStrings(totalDays = 180) {
  const values = [];
  const now = new Date();

  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    values.push(d.toISOString().slice(0, 10));
  }

  return values;
}

function getSeasonForDate(isoDate) {
  const date = new Date(isoDate);
  const month = date.getMonth() + 1;
  return seasonConfig.find((s) => s.months.includes(month)) || seasonConfig[0];
}

function categorySeasonMultiplier(category, seasonId, preferredSeasonId) {
  const season = seasonConfig.find((item) => item.id === seasonId);
  if (!season) {
    return 1;
  }

  if (preferredSeasonId && preferredSeasonId === seasonId) {
    return 1.34;
  }

  if (season.focusCategories.includes(category)) {
    return 1.16;
  }

  return 0.79;
}

function resolvePreferredSeason({ category, subcategory, productName }) {
  const subcategoryText = String(subcategory || "").trim().toLowerCase();
  if (subcategoryText && explicitSubcategorySeasonMap[subcategoryText]) {
    return explicitSubcategorySeasonMap[subcategoryText];
  }

  const fullText = `${category || ""} ${subcategory || ""} ${productName || ""}`.toLowerCase();
  for (const rule of seasonKeywordRules) {
    if (rule.keywords.some((keyword) => fullText.includes(keyword))) {
      return rule.seasonId;
    }
  }

  if (category === "Home & Kitchen") {
    return "winter";
  }
  if (category === "Sports, Fitness & Outdoors") {
    return "spring";
  }
  if (category === "Office Products") {
    return "monsoon";
  }
  if (category === "Fashion") {
    return "festive";
  }
  if (category === "Beauty") {
    return "summer";
  }

  return "festive";
}

function resolveTopCategory(explicitCategory, sourceCategory, productName = "") {
  const explicit = String(explicitCategory || "").trim();
  if (explicit && defaultCategoryTaxonomy.includes(explicit)) {
    return explicit;
  }

  const source = String(sourceCategory || "").trim();
  const sourceLower = source.toLowerCase();
  if (sourceLower && explicitSubcategoryCategoryMap[sourceLower]) {
    return explicitSubcategoryCategoryMap[sourceLower];
  }

  if (source && defaultCategoryTaxonomy.includes(source)) {
    return source;
  }

  const text = `${explicit} ${source} ${productName}`.toLowerCase();
  for (const rule of keywordCategoryRules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }

  return "Electronics";
}

function deriveCategoryTaxonomy(productRows) {
  const categories = new Set(
    productRows
      .map((item) => String(item.category || "").trim())
      .filter(Boolean)
  );

  if (!categories.size) {
    return [...defaultCategoryTaxonomy];
  }

  return [...categories].sort((a, b) => a.localeCompare(b));
}

function fallbackUnsplashUrl(query) {
  const seed = tokenToSlug(query) || "product-image";
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/900`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeProductToken(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function tokenToSlug(value) {
  return normalizeProductToken(value).replaceAll(" ", "-");
}

function buildSeasonProductKey(companyId, seasonId, nameToken) {
  return `${companyId}|${seasonId}|${nameToken}`;
}

const seasonalExampleBasePrices = {
  "Electronics": 13999,
  "Home & Kitchen": 2499,
  "Fashion": 1799,
  "Beauty": 899,
  "Sports, Fitness & Outdoors": 2199,
  "Luggage & Bags": 2499,
  "Office Products": 1899
};

const companyById = new Map(companies.map((company) => [company.id, company]));
const fallbackCompany = companies[0] || {
  id: "default",
  name: "Default Company",
  color: "#165d8f"
};

const fallbackProduct = {
  id: "fallback-product",
  name: "Fallback Product",
  category: "Electronics",
  subcategory: "Electronics",
  sourceCategory: "Electronics",
  brand: "Generic",
  companyId: fallbackCompany.id,
  sourceCompany: fallbackCompany.name,
  price: 999,
  rating: 4,
  margin: 0.14,
  imageQuery: "generic product",
  imageUrl: fallbackUnsplashUrl("generic product"),
  model: "",
  color: "",
  spec: "",
  mrp: 1199,
  discount: 17,
  inStock: true
};

function resolveCompanyFromCustomProduct(item, index) {
  const rawCompanyId = String(item.companyId || item.sourceCompanyId || "")
    .toLowerCase()
    .trim();
  const rawCompanyName = String(item.sourceCompany || item.companyName || "")
    .toLowerCase()
    .trim();

  if (companyById.has(rawCompanyId)) {
    return companyById.get(rawCompanyId);
  }

  const byName = companies.find((company) => company.name.toLowerCase() === rawCompanyName);
  if (byName) {
    return byName;
  }

  if (!companies.length) {
    return fallbackCompany;
  }

  const fallbackIndex = Math.min(
    companies.length - 1,
    Math.floor(hashToUnit(`${item.id || item.name || index}`) * companies.length)
  );
  return companies[fallbackIndex] || fallbackCompany;
}

function normalizeCustomProducts(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const company = resolveCompanyFromCustomProduct(item, index);
      const baseName = String(item.name || item.title || `Custom Product ${index + 1}`).trim();
      const slug = String(item.slug || item.productFamily || baseName)
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/(^-|-$)/g, "");

      const sourceCategory = String(item.sourceCategory || item.subcategory || item.category || "General").trim();
      const explicitCategory = String(item.topCategory || item.categoryBucket || item.category || "").trim();
      const category = resolveTopCategory(explicitCategory, sourceCategory, baseName);
      const numericPrice = Number(item.price);
      const numericRating = Number(item.rating);
      const numericMargin = Number(item.margin);
      const numericMrp = Number(item.mrp);
      const numericDiscount = Number(item.discount);
      const stockValue = item.inStock ?? item.in_stock;

      const fallbackSlug = slug || `custom-${index + 1}`;
      const fallbackId = `${company.id}-${fallbackSlug}-${index + 1}`;
      const imageUrl = String(item.imageUrl || item.image || "").trim();
      const imageQuery = String(item.imageQuery || `${item.brand || ""} ${item.model || ""} ${baseName}`).trim();
      const preferredSeason = String(item.preferredSeason || "").trim();
      const seasonId = ["summer", "monsoon", "winter", "festive", "spring"].includes(preferredSeason)
        ? preferredSeason
        : resolvePreferredSeason({ category, subcategory: sourceCategory, productName: baseName });

      return {
        id: String(item.id || fallbackId),
        slug: fallbackSlug,
        productFamily: fallbackSlug,
        name: baseName,
        category,
        subcategory: sourceCategory,
        sourceCategory,
        brand: String(item.brand || `${company.name} Brand`).trim(),
        companyId: company.id,
        sourceCompany: company.name,
        price: Number.isFinite(numericPrice) && numericPrice > 0 ? Math.round(numericPrice) : 999,
        rating: Number.isFinite(numericRating) ? clamp(numericRating, 1, 5) : 4.1,
        margin: Number.isFinite(numericMargin) ? clamp(numericMargin, 0.06, 0.55) : 0.18,
        imageQuery: imageQuery || baseName,
        imageUrl: imageOverrides[fallbackSlug] || imageUrl || fallbackUnsplashUrl(baseName),
        model: String(item.model || "").trim(),
        color: String(item.color || "").trim(),
        spec: String(item.spec || "").trim(),
        preferredSeason: seasonId,
        mrp: Number.isFinite(numericMrp) && numericMrp > 0 ? Math.round(numericMrp) : null,
        discount: Number.isFinite(numericDiscount) ? clamp(Math.round(numericDiscount), 0, 95) : null,
        inStock: typeof stockValue === "boolean" ? stockValue : true
      };
    })
    .filter((item) => item?.name && item?.companyId);
}

function buildExistingSeasonalProductKeys(rows) {
  return new Set(
    rows
      .map((item) => {
        const companyId = String(item.companyId || "").trim();
        const seasonId = String(item.preferredSeason || "").trim();
        const nameToken = normalizeProductToken(item.name);
        if (!companyId || !seasonId || !nameToken) {
          return null;
        }
        return buildSeasonProductKey(companyId, seasonId, nameToken);
      })
      .filter(Boolean)
  );
}

function buildSeasonalExampleProduct(company, season, exampleName, nameToken) {
  const category = seasonalExampleCategoryMap[nameToken] || season.focusCategories[0] || "Fashion";
  const slug = tokenToSlug(exampleName) || `seasonal-product-${season.id}`;
  const id = `seasonal-example-${company.id}-${season.id}-${slug}`;
  const seed = `${id}-${company.id}-${season.id}`;
  const priceFactor = companyPriceFactor[company.id] || 1;
  const marginFactor = companyMarginFactor[company.id] || 1;
  const rawBase = seasonalExampleBasePrices[category] || 1999;
  const price = Math.max(399, Math.round(rawBase * priceFactor * (0.88 + hashToUnit(`${seed}-price`) * 0.36)));
  const rating = clamp(Number((4 + hashToUnit(`${seed}-rating`) * 0.9).toFixed(1)), 3.9, 4.9);
  const margin = clamp((categoryMarginIndex[category] || 0.18) * marginFactor * (0.9 + hashToUnit(`${seed}-margin`) * 0.22), 0.1, 0.5);
  const mrp = Math.max(price + 80, Math.round(price * (1.17 + hashToUnit(`${seed}-mrp`) * 0.14)));
  const discount = clamp(Math.round(((mrp - price) / mrp) * 100), 8, 42);

  return {
    id,
    slug,
    productFamily: slug,
    name: exampleName,
    category,
    subcategory: exampleName,
    sourceCategory: exampleName,
    brand: `${company.name} Seasonal`,
    companyId: company.id,
    sourceCompany: company.name,
    price,
    rating,
    margin,
    imageQuery: `${exampleName} ${season.label} product`,
    imageUrl: imageOverrides[slug] || fallbackUnsplashUrl(`${exampleName} product`),
    model: "",
    color: "",
    spec: `${season.label} bestseller`,
    preferredSeason: season.id,
    mrp,
    discount,
    inStock: true
  };
}

function collectSeasonalExampleAdditions(rows, existing, season, company) {
  const seasonExamples = Array.isArray(season.productExamples) ? season.productExamples : [];

  return seasonExamples
    .map((exampleName) => {
      const nameToken = normalizeProductToken(exampleName);
      if (!nameToken) {
        return null;
      }

      const key = buildSeasonProductKey(company.id, season.id, nameToken);
      if (existing.has(key)) {
        return null;
      }

      existing.add(key);
      return buildSeasonalExampleProduct(company, season, exampleName, nameToken);
    })
    .filter(Boolean);
}

function ensureSeasonalExampleProducts(baseProducts) {
  const rows = Array.isArray(baseProducts) ? [...baseProducts] : [];
  if (!rows.length) {
    return rows;
  }

  const existing = buildExistingSeasonalProductKeys(rows);
  const additions = seasonConfig.flatMap((season) => {
    return companies.flatMap((company) => {
      return collectSeasonalExampleAdditions(rows, existing, season, company);
    });
  });

  return additions.length ? [...rows, ...additions] : rows;
}

function ensureDistinctImageLinksByProductName(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  const imageOwnerByKey = new Map();
  const replacementCache = new Map();

  const buildImageIdentityKey = (urlText) => {
    const text = String(urlText || "").trim();
    if (!text) {
      return "";
    }

    try {
      const parsed = new URL(text);
      const host = String(parsed.hostname || "").toLowerCase();
      const pathname = String(parsed.pathname || "").toLowerCase();

      if (host.includes("images.unsplash.com")) {
        const photoPattern = /photo-([a-z0-9_-]+)/i;
        const photoMatch = photoPattern.exec(pathname);
        if (photoMatch?.[1]) {
          return `unsplash-photo:${photoMatch[1]}`;
        }
        return `unsplash-path:${pathname}`;
      }

      if (host.includes("source.unsplash.com")) {
        return `source-unsplash:${pathname}`;
      }

      return `url:${text}`;
    } catch {
      return `url:${text}`;
    }
  };

  const isSourceUnsplash = (urlText) => {
    return String(urlText || "").toLowerCase().includes("://source.unsplash.com/");
  };

  return rows.map((item, index) => {
    if (!item || typeof item !== "object") {
      return item;
    }

    const currentUrl = String(item.imageUrl || "").trim();
    const nameToken = normalizeProductToken(item.name) || `product-${index + 1}`;
    const slug = String(item.slug || tokenToSlug(item.name) || `product-${index + 1}`).trim();

    const baseFallbackUrl = fallbackUnsplashUrl(`${item.name || "product"} ${item.category || ""} ${slug}`);

    let resolvedUrl = currentUrl;
    if (!resolvedUrl || isSourceUnsplash(resolvedUrl)) {
      resolvedUrl = baseFallbackUrl;
    }

    let identityKey = buildImageIdentityKey(resolvedUrl);

    if (!identityKey) {
      identityKey = buildImageIdentityKey(baseFallbackUrl);
      resolvedUrl = baseFallbackUrl;
    }

    if (!imageOwnerByKey.has(identityKey)) {
      imageOwnerByKey.set(identityKey, nameToken);

      if (resolvedUrl === currentUrl) {
        return item;
      }

      return {
        ...item,
        imageUrl: resolvedUrl
      };
    }

    const existingOwnerToken = imageOwnerByKey.get(identityKey);
    if (existingOwnerToken === nameToken) {
      if (resolvedUrl === currentUrl) {
        return item;
      }

      return {
        ...item,
        imageUrl: resolvedUrl
      };
    }

    const cacheKey = `${identityKey}|${nameToken}`;
    if (!replacementCache.has(cacheKey)) {
      const overrideUrl = String(imageOverrides[slug] || "").trim();
      let candidateUrl = overrideUrl;
      if (!candidateUrl || candidateUrl === resolvedUrl || isSourceUnsplash(candidateUrl)) {
        candidateUrl = baseFallbackUrl;
      }

      let candidateKey = buildImageIdentityKey(candidateUrl);
      if (imageOwnerByKey.has(candidateKey) && imageOwnerByKey.get(candidateKey) !== nameToken) {
        candidateUrl = fallbackUnsplashUrl(`${item.name || "product"} ${item.category || ""} ${slug} alt ${index + 1}`);
        candidateKey = buildImageIdentityKey(candidateUrl);
      }

      replacementCache.set(cacheKey, candidateUrl);
      imageOwnerByKey.set(candidateKey, nameToken);
    }

    return {
      ...item,
      imageUrl: replacementCache.get(cacheKey)
    };
  });
}

const generatedProducts = companies.flatMap((company) => {
  return productFamilies.map((family) => {
    const id = `${company.id}-${family.slug}`;
    const basePrice = Math.round(family.basePrice * (companyPriceFactor[company.id] || 1));
    const ratingDelta = (hashToUnit(`${id}-rating`) - 0.5) * 0.35;
    const rating = Math.max(3.8, Math.min(4.9, Number((family.rating + ratingDelta).toFixed(1))));
    const margin = Math.max(
      0.08,
      Math.min(0.42, (categoryMarginIndex[family.category] || 0.16) * (companyMarginFactor[company.id] || 1))
    );

    return {
      id,
      slug: family.slug,
      productFamily: family.slug,
      name: family.name,
      category: family.category,
      subcategory: family.category,
      sourceCategory: family.category,
      brand: `${family.brand} ${company.name}`,
      companyId: company.id,
      sourceCompany: company.name,
      price: basePrice,
      rating,
      margin,
      imageQuery: family.imageQuery,
      imageUrl: imageOverrides[family.slug] || fallbackUnsplashUrl(family.imageQuery),
      model: "",
      color: "",
      spec: "",
      preferredSeason: resolvePreferredSeason({
        category: family.category,
        subcategory: family.category,
        productName: family.name
      }),
      mrp: Math.round(basePrice * 1.18),
      discount: 15,
      inStock: true
    };
  });
});

const customProducts = normalizeCustomProducts(customProductsRaw);
const seasonalReadyProducts = ensureSeasonalExampleProducts(customProducts.length ? customProducts : generatedProducts);
const products = ensureDistinctImageLinksByProductName(seasonalReadyProducts);
const categoryTaxonomy = deriveCategoryTaxonomy(products);
const productPool = products.length ? products : [fallbackProduct];

const dateAxis = getPastDateStrings(220);

const dailyMetrics = productPool.flatMap((product) => {
  const companyDemand = companyDemandFactor[product.companyId] || 1;
  const categoryDemand = categoryDemandIndex[product.category] || 11;

  return dateAxis.map((dateKey) => {
    const season = getSeasonForDate(dateKey);
    const productSeasonId = product.preferredSeason || resolvePreferredSeason({
      category: product.category,
      subcategory: product.subcategory,
      productName: product.name
    });
    const seasonalBoost = categorySeasonMultiplier(product.category, season.id, productSeasonId);

    const randomA = hashToUnit(`${product.id}-${dateKey}-a`);
    const randomB = hashToUnit(`${product.id}-${dateKey}-b`);
    const randomC = hashToUnit(`${product.id}-${dateKey}-c`);
    const randomD = hashToUnit(`${product.id}-${dateKey}-d`);

    const seasonalExampleBoost = product.id.startsWith("seasonal-example-") ? 1.48 : 1;
    const unitLoad = categoryDemand * companyDemand * seasonalBoost * seasonalExampleBoost * (0.72 + randomA * 0.74);
    const units = Math.max(2, Math.round(unitLoad));
    const orders = Math.max(1, Math.round(units / (1.05 + randomB * 1.55)));

    const soldPrice = Math.round(product.price * (0.91 + randomB * 0.19));
    const revenue = units * soldPrice;
    const profit = Math.round(revenue * product.margin * (0.9 + randomC * 0.2));
    const loss = Math.round(revenue * (0.01 + randomD * 0.055));

    return {
      date: dateKey,
      companyId: product.companyId,
      productId: product.id,
      category: product.category,
      seasonId: season.id,
      productSeasonId,
      units,
      orders,
      soldPrice,
      revenue,
      profit,
      loss
    };
  });
});

function buildPhone(seed) {
  const numeric = Math.floor(hashToUnit(seed) * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `9${numeric}`;
}

const paymentOrders = companies.flatMap((company, companyIndex) => {
  const companyProducts = productPool.filter((product) => product.companyId === company.id);
  const companyProductPool = companyProducts.length ? companyProducts : productPool;

  return Array.from({ length: 15 }, (_, idx) => {
    const product = companyProductPool[(idx * 3 + companyIndex) % companyProductPool.length] || fallbackProduct;
    const customerName = paymentProfiles.customers[(idx + companyIndex) % paymentProfiles.customers.length];
    const address = paymentProfiles.addresses[(idx * 2 + companyIndex) % paymentProfiles.addresses.length];
    const paymentMethod = paymentProfiles.paymentMethods[(idx + companyIndex) % paymentProfiles.paymentMethods.length];
    const paymentSummary = paymentProfiles.summaryTags[(idx + 2 * companyIndex) % paymentProfiles.summaryTags.length];

    const quantity = 1 + ((idx + companyIndex) % 4);
    const dayOffset = idx * 3 + companyIndex;
    const orderDate = dateAxis[Math.max(0, dateAxis.length - 1 - dayOffset)];

    return {
      orderId: `OPS-${company.id.toUpperCase()}-${String(idx + 1).padStart(3, "0")}`,
      companyId: company.id,
      companyName: company.name,
      customerName,
      address,
      phone: buildPhone(`${company.id}-${customerName}-${idx}`),
      productId: product.id,
      purchasedProduct: product.name,
      category: product.category,
      quantity,
      totalPrice: Math.round(product.price * quantity),
      paymentMethod,
      orderDate,
      paymentSummary
    };
  });
});

export function getCompanies() {
  return companies;
}

export function getProducts() {
  return products;
}

export function getDailyMetrics() {
  return dailyMetrics;
}

export function getPaymentOrders() {
  return paymentOrders;
}

export function getSeasonConfig() {
  return seasonConfig;
}

export function getCategoryTaxonomy() {
  return categoryTaxonomy;
}
