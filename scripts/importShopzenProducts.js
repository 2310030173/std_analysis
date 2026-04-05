import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = process.argv[2] || path.join(ROOT, "shopzen_5000_products.html");
const OUTPUT_PATH = path.join(ROOT, "backend", "data", "customProducts.json");
const REPORT_PATH = path.join(ROOT, "backend", "data", "customProducts.cleaningReport.json");

const COMPANIES = [
  { id: "amazon", website: "Amazon", sellers: ["Amazon Retail", "Appario Retail", "Cloudtail India"] },
  { id: "flipkart", website: "Flipkart", sellers: ["SuperComNet", "RetailNet", "Tech-Connect"] },
  { id: "myntra", website: "Myntra", sellers: ["Myntra Fashion", "TruFashion", "StyleHub Seller"] },
  { id: "ajio", website: "Ajio", sellers: ["Ajio Retail", "Reliance Trendz", "UrbanWardrobe"] },
  { id: "nykaa", website: "Nykaa", sellers: ["Nykaa E-Retail", "BeautyLane", "GlowCommerce"] },
  { id: "meesho", website: "Meesho", sellers: ["Meesho Market", "ValueKart", "DailyNeeds Hub"] }
];

const KEYWORD_CATEGORY_RULES = [
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
      "tv",
      "television",
      "monitor",
      "keyboard",
      "mouse",
      "router",
      "ssd",
      "hard drive",
      "charger",
      "power bank",
      "smart watch",
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
      "watch"
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

const EXPLICIT_SUBCATEGORY_CATEGORY_MAP = {
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

const IMAGE_KEYWORD_RULES = [
  { keywords: ["phone", "smartphone", "mobile", "iphone"], tags: ["smartphone", "mobile", "technology"] },
  { keywords: ["earbud", "headphone", "speaker", "audio"], tags: ["headphones", "audio", "electronics"] },
  { keywords: ["laptop", "notebook", "computer", "tablet"], tags: ["laptop", "computer", "technology"] },
  {
    keywords: ["shirt", "kurta", "saree", "dress", "jeans", "hoodie", "jacket", "fashion"],
    tags: ["fashion", "clothing", "apparel"]
  },
  { keywords: ["shoe", "sneaker", "sandal", "boot"], tags: ["shoes", "footwear", "fashion"] },
  { keywords: ["watch", "chronograph", "smartwatch"], tags: ["watch", "wristwatch", "accessories"] },
  { keywords: ["bag", "backpack", "luggage", "wallet"], tags: ["bag", "backpack", "travel"] },
  {
    keywords: ["serum", "lipstick", "perfume", "makeup", "beauty", "sunscreen"],
    tags: ["beauty", "cosmetics", "skincare"]
  },
  {
    keywords: ["fitness", "sports", "yoga", "gym", "dumbbell", "band"],
    tags: ["fitness", "sports", "workout"]
  },
  {
    keywords: ["kitchen", "air fryer", "cookware", "appliance", "furniture", "desk", "chair"],
    tags: ["home", "kitchen", "appliance"]
  }
];

const CATEGORY_IMAGE_TAGS = {
  "Electronics": ["electronics", "gadgets", "technology"],
  "Fashion": ["fashion", "clothing", "style"],
  "Beauty": ["beauty", "cosmetics", "skincare"],
  "Home & Kitchen": ["home", "kitchen", "appliance"],
  "Sports, Fitness & Outdoors": ["fitness", "sports", "workout"],
  "Books": ["book", "reading", "education"],
  "Toys & Games": ["toys", "game", "kids"]
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeText(value).replaceAll(" ", "-");
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

function hashToIndex(seed, size) {
  if (!size) {
    return 0;
  }

  return Math.floor(hashToUnit(seed) * size) % size;
}

function inferTopCategory(sourceCategory, productName) {
  const sourceLower = String(sourceCategory || "").toLowerCase().trim();
  if (sourceLower && EXPLICIT_SUBCATEGORY_CATEGORY_MAP[sourceLower]) {
    return EXPLICIT_SUBCATEGORY_CATEGORY_MAP[sourceLower];
  }

  const text = `${sourceCategory || ""} ${productName || ""}`.toLowerCase();

  for (const rule of KEYWORD_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }

  return "Electronics";
}

function estimateMargin(price, discount) {
  if (Number.isFinite(discount)) {
    return Number(clamp(0.08 + (discount / 100) * 0.48, 0.08, 0.45).toFixed(3));
  }

  if (price > 40000) {
    return 0.11;
  }
  if (price > 15000) {
    return 0.14;
  }
  if (price > 5000) {
    return 0.18;
  }

  return 0.22;
}

function extractAllProductsArrayText(html) {
  const marker = "const ALL_PRODUCTS =";
  const markerIndex = html.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error("ALL_PRODUCTS marker not found in source HTML");
  }

  const arrayStart = html.indexOf("[", markerIndex);
  if (arrayStart === -1) {
    throw new Error("Could not locate start of ALL_PRODUCTS array");
  }

  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escaped = false;

  for (let i = arrayStart; i < html.length; i += 1) {
    const char = html[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === stringChar) {
        inString = false;
      }

      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return html.slice(arrayStart, i + 1);
      }
    }
  }

  throw new Error("Could not find end of ALL_PRODUCTS array");
}

function normalizeImageIdentity(urlText) {
  const text = String(urlText || "").trim();
  if (!text) {
    return "";
  }

  try {
    const parsed = new URL(text);
    const host = String(parsed.hostname || "").toLowerCase();
    const pathname = String(parsed.pathname || "").toLowerCase();
    if (host.includes("images.unsplash.com")) {
      const photoTokenPattern = /photo-[a-z0-9_-]+/i;
      const photoToken = photoTokenPattern.exec(pathname)?.[0];
      if (photoToken) {
        return `unsplash:${photoToken.toLowerCase()}`;
      }
    }

    return `${host}${pathname}`;
  } catch {
    return text.toLowerCase();
  }
}

function selectImageTags(text, category) {
  const normalized = normalizeText(text);

  for (const rule of IMAGE_KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return [...rule.tags];
    }
  }

  const categoryTags = CATEGORY_IMAGE_TAGS[String(category || "").trim()];
  if (categoryTags) {
    return [...categoryTags];
  }

  return ["product", "shopping", "ecommerce"];
}

function buildRelevantImageUrl(row) {
  const text = [row.name, row.brand, row.variant, row.subcategory, row.category, row.id].filter(Boolean).join(" ");
  const tags = selectImageTags(text, row.category)
    .slice(0, 3)
    .map((value) => encodeURIComponent(value))
    .join(",");

  const seed = slugify(text) || "shopzen-product";
  const lock = Number.isFinite(Number(row.sourceId)) && Number(row.sourceId) > 0
    ? Number(row.sourceId)
    : Math.floor(hashToUnit(seed) * 2_000_000_000) + 1;

  return `https://loremflickr.com/1200/900/${tags}?lock=${lock}`;
}

function buildMeaningfulSignature(row) {
  return JSON.stringify({
    website: String(row.website || "").trim().toLowerCase(),
    seller: String(row.seller || "").trim().toLowerCase(),
    price: row.price,
    mrp: row.mrp,
    discount: row.discount,
    combo: row.combo ? 1 : 0,
    variant: String(row.variant || "").trim().toLowerCase(),
    stock: row.in_stock ? "in" : "out",
    rating: row.rating,
    subcategory: String(row.subcategory || "").trim().toLowerCase(),
    brand: String(row.brand || "").trim().toLowerCase(),
    model: String(row.model || "").trim().toLowerCase(),
    color: String(row.color || "").trim().toLowerCase(),
    spec: String(row.spec || "").trim().toLowerCase()
  });
}

function normalizeProducts(rawProducts) {
  return rawProducts.map((item, index) => {
    const numericId = Number(item.id);
    const idValue = Number.isFinite(numericId) && numericId > 0 ? numericId : index + 1;

    const name = String(item.name || `ShopZen Product ${index + 1}`).trim();
    const sourceCategory = String(item.category || "General").trim() || "General";
    const topCategory = sourceCategory;
    const brand = String(item.brand || "ShopZen").trim() || "ShopZen";

    const model = String(item.model || "").trim();
    const color = String(item.color || "").trim();
    const spec = String(item.spec || "").trim();
    const variant = [model, color, spec].filter(Boolean).join(" | ");

    const numericPrice = Number(item.price);
    const numericMrp = Number(item.mrp);
    const numericDiscount = Number(item.discount);
    const price = Number.isFinite(numericPrice) ? numericPrice : null;
    const mrp = Number.isFinite(numericMrp) ? numericMrp : null;
    const discount = Number.isFinite(numericDiscount) ? numericDiscount : null;

    const rawRating = Number(item.rating);
    const rating = Number.isFinite(rawRating) ? rawRating : null;
    const margin = estimateMargin(Number.isFinite(price) ? price : 999, Number.isFinite(discount) ? discount : null);

    const imageUrl = String(item.image || item.imageUrl || "").trim();
    const imageIdentity = normalizeImageIdentity(imageUrl);

    const combo = /combo|bundle|pack\s*of|set of/i.test(`${name} ${spec}`);

    return {
      id: `shopzen-${idValue}`,
      sourceId: idValue,
      name,
      nameKey: normalizeText(name),
      category: topCategory,
      subcategory: sourceCategory,
      sourceCategory,
      brand,
      model,
      color,
      spec,
      variant,
      combo,
      price,
      mrp,
      discount,
      rating,
      margin,
      imageUrl,
      imageIdentity,
      imageQuery: [brand, model, sourceCategory, name].filter(Boolean).join(" "),
      in_stock: item.in_stock !== false,
      reviews: Number.isFinite(Number(item.reviews)) ? Math.max(0, Math.round(Number(item.reviews))) : null,
      website: String(item.website || "").trim(),
      seller: String(item.seller || "").trim()
    };
  });
}

function dedupeByNameAndImage(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const imageKey = row.imageIdentity || `missing-image:${row.sourceId}`;
    const groupKey = `${row.nameKey}__${imageKey}`;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey).push(row);
  }

  const output = [];
  let exactRemoved = 0;
  let meaningfulVariantKept = 0;

  for (const groupRows of grouped.values()) {
    const seenSignatures = new Set();
    for (const row of groupRows) {
      const signature = buildMeaningfulSignature(row);
      if (seenSignatures.has(signature)) {
        exactRemoved += 1;
        continue;
      }

      seenSignatures.add(signature);
      output.push(row);
    }

    if (seenSignatures.size > 1) {
      meaningfulVariantKept += seenSignatures.size;
    }
  }

  return {
    rows: output,
    groupedPairs: grouped.size,
    exactRemoved,
    meaningfulVariantKept
  };
}

function selectDominantNameGroup(nameGroups) {
  let selectedNameKey = "";
  let selectedCount = -1;
  let selectedAvgRating = -1;

  for (const [nameKey, rows] of nameGroups.entries()) {
    const count = rows.length;
    const avgRating = rows.reduce((sum, row) => sum + (Number(row.rating) || 0), 0) / Math.max(1, count);

    if (count > selectedCount) {
      selectedNameKey = nameKey;
      selectedCount = count;
      selectedAvgRating = avgRating;
      continue;
    }

    if (count === selectedCount && avgRating > selectedAvgRating) {
      selectedNameKey = nameKey;
      selectedAvgRating = avgRating;
      continue;
    }

    if (count === selectedCount && avgRating === selectedAvgRating && nameKey < selectedNameKey) {
      selectedNameKey = nameKey;
    }
  }

  return selectedNameKey;
}

function resolveImageConflicts(rows) {
  const groupedByImage = new Map();

  for (const row of rows) {
    if (!row.imageIdentity) {
      continue;
    }

    if (!groupedByImage.has(row.imageIdentity)) {
      groupedByImage.set(row.imageIdentity, []);
    }
    groupedByImage.get(row.imageIdentity).push(row);
  }

  const keptRows = [...rows];
  let changedRows = 0;
  let sameNameImageGroups = 0;
  let crossNameImageConflictGroups = 0;
  const flagged = [];

  for (const [imageIdentity, imageRows] of groupedByImage.entries()) {
    if (imageRows.length <= 1) {
      continue;
    }

    const names = new Set(imageRows.map((row) => row.nameKey));
    if (names.size <= 1) {
      sameNameImageGroups += 1;

      flagged.push({
        imageIdentity,
        status: "same-name-image-variants",
        uniqueNames: names.size,
        rows: imageRows.length,
        sampleNames: [...new Set(imageRows.map((row) => row.name))].slice(0, 8)
      });
      continue;
    }

    crossNameImageConflictGroups += 1;
    const uniqueNames = [...new Set(imageRows.map((row) => row.name))];

    flagged.push({
      imageIdentity,
      status: "cross-name-image-conflict-flagged",
      uniqueNames: names.size,
      rows: imageRows.length,
      sampleNames: uniqueNames.slice(0, 8)
    });
  }

  return {
    rows: keptRows,
    flagged,
    changedRows,
    sameNameImageGroups,
    crossNameImageConflictGroups
  };
}

function spreadAcrossCompanies(rows) {
  const arranged = [...rows];

  return arranged.map((row, index) => {
    const company = COMPANIES[index % COMPANIES.length];
    const seller =
      row.seller ||
      company.sellers[hashToIndex(`${row.name}|${row.brand}|${row.variant}|${row.sourceId}`, company.sellers.length)];
    const website = row.website || company.website;

    return {
      id: String(row.id ?? row.sourceId ?? index + 1),
      name: row.name,
      slug: slugify(`${row.name}-${row.variant || row.sourceId}`) || `shopzen-${index + 1}`,
      category: row.category,
      subcategory: row.subcategory,
      sourceCategory: row.sourceCategory,
      brand: row.brand,
      model: row.model,
      color: row.color,
      spec: row.spec,
      variant: row.variant,
      combo: row.combo,
      companyId: company.id,
      sourceCompany: website,
      website,
      seller,
      price: row.price,
      mrp: row.mrp,
      discount: row.discount,
      rating: row.rating,
      margin: row.margin,
      imageUrl: row.imageUrl,
      imageQuery: row.imageQuery,
      stock: row.in_stock ? "In stock" : "Out of stock",
      in_stock: row.in_stock,
      reviews: row.reviews
    };
  });
}

function summarize(rows) {
  const categorySet = new Set(rows.map((item) => item.category));
  const subcategorySet = new Set(rows.map((item) => item.subcategory));
  const countsByCompany = rows.reduce((acc, item) => {
    acc[item.companyId] = (acc[item.companyId] || 0) + 1;
    return acc;
  }, {});

  return {
    products: rows.length,
    categories: categorySet.size,
    subcategories: subcategorySet.size,
    companyDistribution: countsByCompany
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`ShopZen source file not found: ${SOURCE_PATH}`);
    console.error("Usage: node scripts/importShopzenProducts.js <absolute-or-relative-path-to-shopzen_5000_products.html>");
    process.exit(1);
  }

  const html = fs.readFileSync(SOURCE_PATH, "utf8");
  const arrayText = extractAllProductsArrayText(html);
  const rawProducts = JSON.parse(arrayText);

  if (!Array.isArray(rawProducts) || !rawProducts.length) {
    throw new Error("No products found in ALL_PRODUCTS");
  }

  const normalized = normalizeProducts(rawProducts).filter((row) => row.name);
  const dedupePreview = dedupeByNameAndImage(normalized);
  const resolved = resolveImageConflicts(normalized);
  const finalRows = spreadAcrossCompanies(resolved.rows);

  writeJson(OUTPUT_PATH, finalRows);

  const summary = summarize(finalRows);
  const report = {
    sourcePath: SOURCE_PATH,
    generatedAt: new Date().toISOString(),
    sourceRows: rawProducts.length,
    normalizedRows: normalized.length,
    dedupe: {
      mode: "preserve-source-no-row-removal",
      groupedByNameAndImage: dedupePreview.groupedPairs,
      exactDuplicatesDetected: dedupePreview.exactRemoved,
      meaningfulVariantsDetected: dedupePreview.meaningfulVariantKept,
      exactDuplicatesRemoved: 0
    },
    imageConflicts: {
      flaggedGroups: resolved.flagged.length,
      sameNameImageGroups: resolved.sameNameImageGroups,
      crossNameImageConflictGroups: resolved.crossNameImageConflictGroups,
      rowsUpdatedForCrossNameConflicts: resolved.changedRows,
      samples: resolved.flagged.slice(0, 30)
    },
    final: summary,
    notes: [
      "Source rows are preserved as uploaded; no deduplication row removal is applied.",
      "Exact duplicate signatures are reported for review only.",
      "If one image URL appears under different product names, conflict groups are flagged for review while preserving uploaded source image URLs.",
      "Final rows are evenly distributed across Amazon, Flipkart, Myntra, Ajio, Nykaa, and Meesho."
    ]
  };

  writeJson(REPORT_PATH, report);

  console.log(`Cleaned dataset written to ${OUTPUT_PATH}`);
  console.log(`Cleaning report written to ${REPORT_PATH}`);
  console.log(`Final products: ${summary.products}`);
  console.log(`Categories: ${summary.categories}`);
  console.log(`Subcategories: ${summary.subcategories}`);
  console.log("Company distribution:", summary.companyDistribution);
  console.log(`Exact duplicates detected: ${dedupePreview.exactRemoved}`);
  console.log("Exact duplicates removed: 0 (preserve-source mode)");
  console.log(`Image conflict groups flagged: ${resolved.flagged.length}`);
  console.log(`Rows updated for cross-name image conflicts: ${resolved.changedRows}`);
}

try {
  main();
} catch (error) {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
}
