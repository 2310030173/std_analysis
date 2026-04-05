import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const familiesPath = path.join(ROOT, "backend", "data", "productFamilies.json");
const customProductsPath = path.join(ROOT, "backend", "data", "customProducts.json");
const outputPath = path.join(ROOT, "backend", "data", "productImages.json");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`Unable to parse ${filePath}: ${error.message}`);
    return fallback;
  }
}

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeToken(value).replaceAll(" ", "-");
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

const keywordRules = [
  { keywords: ["smartphone", "mobile", "phone", "iphone"], tags: ["smartphone", "mobile", "technology"] },
  { keywords: ["earbud", "headphone", "speaker", "audio", "soundbar"], tags: ["headphones", "audio", "electronics"] },
  { keywords: ["laptop", "notebook", "computer", "pc", "tablet"], tags: ["laptop", "computer", "technology"] },
  { keywords: ["shirt", "t-shirt", "jeans", "kurta", "saree", "dress", "hoodie", "jacket", "fashion"], tags: ["fashion", "clothing", "apparel"] },
  { keywords: ["shoe", "sneaker", "sandal", "boot"], tags: ["shoes", "footwear", "fashion"] },
  { keywords: ["watch", "chronograph", "smartwatch"], tags: ["watch", "wristwatch", "accessories"] },
  { keywords: ["bag", "backpack", "luggage", "tote", "wallet"], tags: ["bag", "backpack", "travel"] },
  { keywords: ["serum", "lipstick", "perfume", "makeup", "cosmetic", "beauty", "sunscreen"], tags: ["cosmetics", "beauty", "skincare"] },
  { keywords: ["toothbrush", "health", "grooming", "wellness"], tags: ["health", "personal-care", "wellness"] },
  { keywords: ["air fryer", "kitchen", "cookware", "appliance", "furniture", "desk", "chair"], tags: ["home", "kitchen", "appliance"] },
  { keywords: ["coffee", "tea", "snack", "grocery", "food"], tags: ["grocery", "food", "packaging"] },
  { keywords: ["book", "novel", "magazine"], tags: ["book", "reading", "education"] },
  { keywords: ["toy", "game", "puzzle", "block", "lego"], tags: ["toys", "game", "kids"] },
  { keywords: ["baby", "diaper", "stroller", "feeding"], tags: ["baby", "newborn", "care"] },
  { keywords: ["fitness", "sports", "yoga", "gym", "dumbbell", "band"], tags: ["fitness", "sports", "workout"] },
  { keywords: ["car", "bike", "motorbike", "dashboard", "helmet", "automotive"], tags: ["car", "automotive", "vehicle"] },
  { keywords: ["pet", "dog", "cat", "grooming"], tags: ["pet", "dog", "cat"] },
  { keywords: ["keyboard", "mouse", "office", "stationery", "printer"], tags: ["office", "workspace", "stationery"] },
  { keywords: ["drill", "tool", "hardware", "improvement"], tags: ["tools", "hardware", "workshop"] },
  { keywords: ["piano", "guitar", "musical", "instrument"], tags: ["music", "instrument", "piano"] }
];

const categoryTags = {
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

const genericStockHosts = ["images.unsplash.com", "source.unsplash.com", "picsum.photos", "loremflickr.com"];

function selectTags(text, category) {
  const normalized = normalizeToken(text);

  for (const rule of keywordRules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return [...rule.tags];
    }
  }

  const categoryText = String(category || "").trim();
  if (categoryText && categoryTags[categoryText]) {
    return [...categoryTags[categoryText]];
  }

  return ["product", "shopping", "ecommerce"];
}

function buildRelevantImageUrl({ query = "", name = "", category = "", subcategory = "", brand = "", slug = "" }) {
  const combined = [query, name, brand, subcategory, category, slug].filter(Boolean).join(" ");
  const tags = selectTags(combined, category)
    .slice(0, 3)
    .map((tag) => encodeURIComponent(tag))
    .join(",");
  const lockSeed = slugify(combined) || slugify(`${name} ${category}`) || "product-image";
  const lock = Math.floor(hashToUnit(lockSeed) * 999) + 1;

  return `https://loremflickr.com/1200/900/${tags}?lock=${lock}`;
}

function shouldKeepProvidedImageUrl(urlText) {
  const text = String(urlText || "").trim();
  if (!text) {
    return false;
  }

  if (text.startsWith("./assets/") || text.startsWith("/assets/")) {
    return true;
  }

  if (!text.includes("://")) {
    return false;
  }

  try {
    const parsed = new URL(text);
    const host = String(parsed.hostname || "").toLowerCase();
    return !genericStockHosts.some((candidateHost) => host.includes(candidateHost));
  } catch {
    return false;
  }
}

function resolveCustomProductSlug(item, index) {
  const base = item.slug || item.productFamily || item.name || item.title || `custom-product-${index + 1}`;
  return slugify(base) || `custom-${index + 1}`;
}

function toSortedObject(inputMap) {
  return Object.fromEntries(
    Object.entries(inputMap).sort(([a], [b]) => a.localeCompare(b))
  );
}

function main() {
  const families = readJson(familiesPath, []);
  const customProducts = readJson(customProductsPath, []);
  const existingMap = readJson(outputPath, {});
  const imageMap = {};

  for (const [slug, imageUrl] of Object.entries(existingMap)) {
    if (shouldKeepProvidedImageUrl(imageUrl)) {
      imageMap[slug] = imageUrl;
    }
  }

  for (const family of families) {
    const slug = String(family.slug || "").trim();
    if (!slug) {
      continue;
    }

    const existingUrl = String(existingMap[slug] || "").trim();
    imageMap[slug] =
      shouldKeepProvidedImageUrl(existingUrl)
        ? existingUrl
        : buildRelevantImageUrl({
          query: family.imageQuery || family.name,
          name: family.name,
          category: family.category,
          subcategory: family.name,
          brand: family.brand,
          slug
        });
  }

  customProducts.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const slug = resolveCustomProductSlug(item, index);
    if (!slug) {
      return;
    }

    const existingUrl = String(existingMap[slug] || "").trim();
    if (shouldKeepProvidedImageUrl(existingUrl)) {
      imageMap[slug] = existingUrl;
      return;
    }

    const providedUrl = String(item.imageUrl || item.image || "").trim();
    if (shouldKeepProvidedImageUrl(providedUrl)) {
      imageMap[slug] = providedUrl;
      return;
    }

    imageMap[slug] = buildRelevantImageUrl({
      query: String(item.imageQuery || "").trim(),
      name: String(item.name || item.title || slug).trim(),
      category: String(item.category || "").trim(),
      subcategory: String(item.subcategory || item.sourceCategory || "").trim(),
      brand: String(item.brand || "").trim(),
      slug
    });
  });

  const sortedMap = toSortedObject(imageMap);
  fs.writeFileSync(outputPath, `${JSON.stringify(sortedMap, null, 2)}\n`, "utf8");

  console.log(`Updated image map at ${outputPath}`);
  console.log(`Families processed: ${families.length}`);
  console.log(`Custom products processed: ${Array.isArray(customProducts) ? customProducts.length : 0}`);
  console.log(`Total image mappings: ${Object.keys(sortedMap).length}`);
}

try {
  main();
} catch (error) {
  console.error(`Failed to build product image map: ${error.message}`);
  process.exit(1);
}
