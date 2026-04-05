const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = process.argv[2] || path.join(ROOT, "shopzen_5000_products.html");
const OUTPUT_PATH = path.join(ROOT, "backend", "data", "customProducts.json");

const COMPANY_IDS = ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho"];

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashToIndex(seed, size) {
  let hash = 0;
  const text = String(seed || "seed");

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash % size;
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

function normalizeProducts(products) {
  return products.map((item, index) => {
    const numericId = Number(item.id);
    const idValue = Number.isFinite(numericId) && numericId > 0 ? numericId : index + 1;

    const name = String(item.name || `ShopZen Product ${index + 1}`).trim();
    const sourceCategory = String(item.category || "General").trim() || "General";
    const topCategory = inferTopCategory(sourceCategory, name);
    const brand = String(item.brand || "ShopZen").trim() || "ShopZen";

    const numericPrice = Number(item.price);
    const price = Number.isFinite(numericPrice) && numericPrice > 0 ? Math.round(numericPrice) : 999;

    const numericMrp = Number(item.mrp);
    const numericDiscount = Number(item.discount);
    const discount = Number.isFinite(numericDiscount) ? clamp(Math.round(numericDiscount), 0, 95) : null;
    const mrp = Number.isFinite(numericMrp) && numericMrp > 0
      ? Math.round(numericMrp)
      : Math.round(price * (discount !== null ? 1 + discount / 100 : 1.2));

    const numericRating = Number(item.rating);
    const rating = Number.isFinite(numericRating) ? clamp(Number(numericRating.toFixed(1)), 1, 5) : 4.1;
    const margin = estimateMargin(price, discount);

    const companySeed = `${idValue}-${name}-${brand}`;
    const companyId = COMPANY_IDS[hashToIndex(companySeed, COMPANY_IDS.length)];

    const model = String(item.model || "").trim();
    const color = String(item.color || "").trim();
    const spec = String(item.spec || "").trim();
    const imageUrl = String(item.image || item.imageUrl || "").trim();

    return {
      id: `shopzen-${idValue}`,
      name,
      category: topCategory,
      subcategory: sourceCategory,
      sourceCategory,
      brand,
      model,
      color,
      spec,
      companyId,
      price,
      mrp,
      discount,
      rating,
      margin,
      imageUrl,
      imageQuery: [brand, model, sourceCategory].filter(Boolean).join(" "),
      in_stock: item.in_stock !== false
    };
  }).filter((item) => item.imageUrl);
}

function summarize(normalizedRows) {
  const categorySet = new Set(normalizedRows.map((item) => item.category));
  const subcategorySet = new Set(normalizedRows.map((item) => item.subcategory));
  const countsByCompany = normalizedRows.reduce((acc, item) => {
    acc[item.companyId] = (acc[item.companyId] || 0) + 1;
    return acc;
  }, {});

  return {
    products: normalizedRows.length,
    categories: categorySet.size,
    subcategories: subcategorySet.size,
    companyDistribution: countsByCompany
  };
}

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`ShopZen source file not found: ${SOURCE_PATH}`);
    console.error("Usage: node scripts/importShopzenProducts.js <absolute-or-relative-path-to-shopzen_5000_products.html>");
    process.exit(1);
  }

  const html = fs.readFileSync(SOURCE_PATH, "utf8");
  const arrayText = extractAllProductsArrayText(html);
  const products = JSON.parse(arrayText);

  if (!Array.isArray(products) || !products.length) {
    throw new Error("No products found in ALL_PRODUCTS");
  }

  const normalizedRows = normalizeProducts(products);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(normalizedRows, null, 2)}\n`, "utf8");

  const result = summarize(normalizedRows);
  console.log(`Imported ${result.products} products to ${OUTPUT_PATH}`);
  console.log(`Top categories: ${result.categories}`);
  console.log(`Subcategories: ${result.subcategories}`);
  console.log("Company distribution:", result.companyDistribution);
}

try {
  main();
} catch (error) {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
}
