import {
  getCategoryTaxonomy,
  getCompanies,
  getDailyMetrics,
  getPaymentOrders,
  getProducts,
  getSeasonConfig
} from "./dataStore.js";
import { isInRange, parseDateRange, previousWindow } from "../utils/dateRange.js";

const companies = getCompanies();
const products = getProducts();
const metrics = getDailyMetrics();
const paymentOrders = getPaymentOrders();
const seasonConfig = getSeasonConfig();

const companyMap = new Map(companies.map((company) => [company.id, company]));
const productMap = new Map(products.map((product) => [product.id, product]));

const metricsByDate = new Map();
const metricsByDateCompany = new Map();

for (const row of metrics) {
  if (!metricsByDate.has(row.date)) {
    metricsByDate.set(row.date, []);
  }
  metricsByDate.get(row.date).push(row);

  const companyDateKey = `${row.date}|${row.companyId}`;
  if (!metricsByDateCompany.has(companyDateKey)) {
    metricsByDateCompany.set(companyDateKey, []);
  }
  metricsByDateCompany.get(companyDateKey).push(row);
}

const metricDates = [...metricsByDate.keys()].sort((a, b) => a.localeCompare(b));

const dashboardCache = new Map();
const companySummaryCache = new Map();
const companiesOverviewCache = new Map();
const productsOverviewCache = new Map();
const seasonCompaniesCache = new Map();
const seasonCompanyReportCache = new Map();
const offersOverviewCache = new Map();

function buildRangeKey(rangeObj) {
  return `${rangeObj.range}|${rangeObj.fromISO}|${rangeObj.toISO}`;
}

function appendRows(target, rows) {
  if (!rows?.length) {
    return;
  }

  for (const row of rows) {
    target.push(row);
  }
}

function setBoundedCache(cache, key, value, maxSize = 140) {
  cache.set(key, value);
  if (cache.size <= maxSize) {
    return;
  }

  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) {
    cache.delete(firstKey);
  }
}

function safeRound(value) {
  return Math.round((value || 0) * 100) / 100;
}

function summarize(records) {
  const totals = records.reduce(
    (acc, row) => {
      acc.revenue += row.revenue;
      acc.profit += row.profit;
      acc.loss += row.loss;
      acc.units += row.units;
      acc.orders += row.orders;
      return acc;
    },
    { revenue: 0, profit: 0, loss: 0, units: 0, orders: 0 }
  );

  const avgOrderValue = totals.orders ? totals.revenue / totals.orders : 0;
  const profitRatio = totals.revenue ? (totals.profit / totals.revenue) * 100 : 0;
  const lossRatio = totals.revenue ? (totals.loss / totals.revenue) * 100 : 0;

  return {
    revenue: Math.round(totals.revenue),
    profit: Math.round(totals.profit),
    loss: Math.round(totals.loss),
    units: Math.round(totals.units),
    orders: Math.round(totals.orders),
    avgOrderValue: Math.round(avgOrderValue),
    profitRatio: safeRound(profitRatio),
    lossRatio: safeRound(lossRatio)
  };
}

function pickTop(list, metric, size = 5) {
  return [...list].sort((a, b) => (b[metric] || 0) - (a[metric] || 0)).slice(0, size);
}

function groupMetricsBy(records, selector) {
  const map = new Map();

  records.forEach((row) => {
    const key = selector(row);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(row);
  });

  return map;
}

function normalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveSubcategory(product) {
  return String(product?.subcategory || product?.sourceCategory || product?.category || "General").trim();
}

function hasImageUrl(value) {
  return String(value || "").trim().length > 0;
}

function hasProductImage(product) {
  return hasImageUrl(product?.imageUrl);
}

const blockedSeasonProductKeywords = ["broccoli", "cauliflower", "cabbage", "spinach", "lettuce"];

const seasonKeywordHints = {
  summer: ["summer", "cool", "cooling", "sunglass", "sunscreen", "fan", "hydration", "bottle"],
  monsoon: ["monsoon", "rain", "rainy", "raincoat", "umbrella", "waterproof", "quick dry", "rain boot", "dry bag"],
  winter: ["winter", "heater", "thermal", "warm", "wool", "blanket", "jacket", "hoodie", "moisturizer"],
  festive: ["festive", "ethnic", "party", "saree", "kurti", "perfume", "smartphone", "smartwatch", "lights"],
  spring: ["spring", "running", "yoga", "fitness", "keyboard", "laptop", "travel", "backpack", "outdoor"]
};

function normalizeSeasonToken(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function exampleKeywordsForSeason(season) {
  return (season?.productExamples || [])
    .flatMap((item) => normalizeSeasonToken(item).split(" "))
    .filter(Boolean);
}

const seasonKeywordIndex = new Map(
  seasonConfig.map((season) => {
    const explicitKeywords = seasonKeywordHints[season.id] || [];
    const exampleKeywords = exampleKeywordsForSeason(season);
    return [season.id, [...new Set([...explicitKeywords, ...exampleKeywords])]];
  })
);

function productSeasonSearchText(product) {
  return normalizeSeasonToken(
    `${product?.name || ""} ${product?.category || ""} ${resolveSubcategory(product)} ${product?.sourceCategory || ""} ${product?.brand || ""}`
  );
}

function isSeasonRelevantProduct(product, seasonId) {
  if (!product || !seasonId) {
    return false;
  }

  const season = seasonConfig.find((item) => item.id === seasonId);
  if (!season) {
    return false;
  }

  const searchText = productSeasonSearchText(product);
  if (!searchText) {
    return false;
  }

  if (blockedSeasonProductKeywords.some((keyword) => searchText.includes(keyword))) {
    return false;
  }

  const preferredSeasonMatch = normalizedText(product.preferredSeason) === seasonId;
  if (!preferredSeasonMatch) {
    return false;
  }

  const focusCategoryMatch = season.focusCategories.includes(product.category);
  const keywords = seasonKeywordIndex.get(seasonId) || [];
  const keywordMatch = keywords.some((keyword) => searchText.includes(keyword));

  return keywordMatch || focusCategoryMatch;
}

const comboKeywordMap = {
  electronics: ["earbud", "phone", "smartphone", "watch", "keyboard", "bag", "stand"],
  fashion: ["watch", "perfume", "bag", "saree", "kurti", "jeans", "shoe"],
  "home & kitchen": ["bottle", "cookware", "organizer", "bag", "watch"],
  beauty: ["perfume", "watch", "bag", "kurti", "saree"],
  "sports, fitness & outdoors": ["shoe", "watch", "bottle", "bag", "earbud"],
  "office products": ["laptop", "keyboard", "phone", "watch", "bag"],
  default: ["earbud", "watch", "bag", "bundle", "set"]
};

const comboRelationRules = [
  {
    id: "phone",
    label: "Phone Accessory Upsell",
    primaryKeywords: ["phone", "smartphone"],
    secondaryKeywords: ["earbud", "watch", "bag", "perfume"]
  },
  {
    id: "earbud",
    label: "Audio Companion Upsell",
    primaryKeywords: ["earbud", "audio"],
    secondaryKeywords: ["phone", "watch", "bag"]
  },
  {
    id: "fashion",
    label: "Fashion Cross-Sell",
    primaryKeywords: ["saree", "kurti", "jeans", "shoe", "fashion"],
    secondaryKeywords: ["watch", "perfume", "bag", "earbud"]
  },
  {
    id: "beauty",
    label: "Beauty Lifestyle Bundle",
    primaryKeywords: ["perfume", "beauty"],
    secondaryKeywords: ["watch", "bag", "kurti", "saree"]
  },
  {
    id: "home",
    label: "Home Utility Bundle",
    primaryKeywords: ["kitchen", "cookware", "bottle", "home"],
    secondaryKeywords: ["bag", "watch", "perfume"]
  },
  {
    id: "laptop",
    label: "Laptop Upsell",
    primaryKeywords: ["laptop", "notebook"],
    secondaryKeywords: ["keyboard", "earbud", "watch", "bag"]
  }
];

function includesAnyKeyword(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword));
}

function comboSearchText(product) {
  return `${product?.name || ""} ${product?.subcategory || ""} ${product?.category || ""} ${product?.brand || ""}`.toLowerCase();
}

function relationRuleForProduct(product) {
  const text = comboSearchText(product);
  return comboRelationRules.find((rule) => includesAnyKeyword(text, rule.primaryKeywords)) || null;
}

function uniqueProductsById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (item && !map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return [...map.values()];
}

function relationSeedPrimaries(companyProducts, perRuleLimit = 3) {
  return comboRelationRules.flatMap((rule) => {
    const matches = companyProducts.filter((product) => includesAnyKeyword(comboSearchText(product), rule.primaryKeywords));
    return byProfitAndSalesDesc(matches).slice(0, perRuleLimit);
  });
}

function byProfitAndSalesDesc(items) {
  return [...items].sort((a, b) => b.profit - a.profit || b.sales - a.sales);
}

function buildCategoryBuckets(companyProducts) {
  const byCategory = new Map();

  byProfitAndSalesDesc(companyProducts).forEach((product) => {
    if (!byCategory.has(product.category)) {
      byCategory.set(product.category, []);
    }
    byCategory.get(product.category).push(product);
  });

  return byCategory;
}

function orderedCategoriesByTopProfit(byCategory) {
  return [...byCategory.keys()].sort((a, b) => {
    const aTop = byCategory.get(a)?.[0]?.profit || 0;
    const bTop = byCategory.get(b)?.[0]?.profit || 0;
    return bTop - aTop;
  });
}

function pickRoundRobinProducts(byCategory, categories, limit) {
  const selected = [];
  const selectedIds = new Set();
  let round = 0;

  while (selected.length < limit) {
    const roundItems = categories
      .map((category) => byCategory.get(category)?.[round])
      .filter((item) => item && !selectedIds.has(item.id));

    if (!roundItems.length) {
      break;
    }

    for (const item of roundItems) {
      if (selected.length >= limit) {
        break;
      }
      selected.push(item);
      selectedIds.add(item.id);
    }

    round += 1;
  }

  return { selected, selectedIds };
}

function fillRemainingPrimaryProducts(selected, selectedIds, companyProducts, limit) {
  if (selected.length >= limit) {
    return selected;
  }

  for (const product of byProfitAndSalesDesc(companyProducts)) {
    if (selectedIds.has(product.id)) {
      continue;
    }

    selected.push(product);
    selectedIds.add(product.id);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function buildDiversePrimaryProducts(companyProducts, limit = 24) {
  const byCategory = buildCategoryBuckets(companyProducts);
  const categories = orderedCategoriesByTopProfit(byCategory);
  const { selected, selectedIds } = pickRoundRobinProducts(byCategory, categories, limit);
  return fillRemainingPrimaryProducts(selected, selectedIds, companyProducts, limit);
}

function categoryAndKeywordBonus(primary, secondary, relatedKeywords) {
  const primaryCategoryKey = normalizedText(primary.category);
  const categoryKeywords = comboKeywordMap[primaryCategoryKey] || comboKeywordMap.default;
  const secondaryText = comboSearchText(secondary);

  let score = 0;
  if (primary.category === secondary.category) {
    score += 2;
  }
  if (includesAnyKeyword(secondaryText, categoryKeywords)) {
    score += 2;
  }
  if (includesAnyKeyword(secondaryText, relatedKeywords)) {
    score += 4;
  }
  return score;
}

function performanceBonus(primary, secondary) {
  let score = 0;
  if (secondary.sales < primary.sales) {
    score += 1;
  }
  if (secondary.profit < primary.profit) {
    score += 1;
  }
  if (secondary.price <= primary.price) {
    score += 1;
  }
  return score;
}

function relationPatternBonus(primary, secondary) {
  const secondaryText = comboSearchText(secondary);
  const primaryText = comboSearchText(primary);

  let score = 0;
  if (secondaryText.includes("accessory") || secondaryText.includes("case") || secondaryText.includes("mouse")) {
    score += 1;
  }
  if (primaryText.includes("laptop") && (secondaryText.includes("mouse") || secondaryText.includes("keyboard"))) {
    score += 1;
  }
  if ((primaryText.includes("phone") || primaryText.includes("smartphone")) && secondaryText.includes("earbud")) {
    score += 5;
  }
  if ((primaryText.includes("phone") || primaryText.includes("smartphone")) && secondaryText.includes("watch")) {
    score += 3;
  }
  if ((primaryText.includes("phone") || primaryText.includes("smartphone")) && secondaryText.includes("bag")) {
    score += 2;
  }
  if (includesAnyKeyword(primaryText, ["saree", "kurti", "jeans", "shoe"]) && secondaryText.includes("perfume")) {
    score += 2;
  }
  return score;
}

function comboCompatibilityScore(primary, secondary, relatedKeywords = []) {
  return (
    categoryAndKeywordBonus(primary, secondary, relatedKeywords) +
    performanceBonus(primary, secondary) +
    relationPatternBonus(primary, secondary)
  );
}

function comboReason(primary, secondary, relationRule) {
  if (relationRule) {
    return `${relationRule.label}: pairing a high-demand product with a related complementary item.`;
  }

  if (secondary.sales < primary.sales * 0.5) {
    return "Boosting lower-selling item with a high-performing anchor product.";
  }

  return "High cross-sell relevance based on category and product affinity.";
}

function getAccessoryProducts(companyProducts) {
  return companyProducts.filter((item) => {
    const text = comboSearchText(item);
    return includesAnyKeyword(text, [
      "mouse",
      "keyboard",
      "earbud",
      "headphone",
      "backpack",
      "bag",
      "stand",
      "watch",
      "phone",
      "perfume",
      "saree",
      "kurti",
      "shoe"
    ]);
  });
}

function getSecondaryPool(companyProducts, primary, lowProducts, accessoryProducts, relationKeywords) {
  const relatedProducts = companyProducts.filter((item) => {
    if (item.id === primary.id) {
      return false;
    }
    return includesAnyKeyword(comboSearchText(item), relationKeywords);
  });

  return [...new Map([...relatedProducts, ...lowProducts, ...accessoryProducts].map((item) => [item.id, item])).values()];
}

function getRankedSecondaries(primary, secondaryPool, relationKeywords) {
  return secondaryPool
    .filter((secondary) => secondary.id !== primary.id)
    .map((secondary) => ({
      secondary,
      score: comboCompatibilityScore(primary, secondary, relationKeywords)
    }))
    .sort((a, b) => b.score - a.score || a.secondary.sales - b.secondary.sales);
}

function buildComboOffer(company, primary, secondary, score, relationRule) {
  const bundlePrice = Math.max(1, Math.round((primary.price || 0) + (secondary.price || 0)));
  const demandGapRatio = Math.max(0, (primary.sales - secondary.sales) / Math.max(1, primary.sales));
  const discountPercent = Math.min(40, Math.max(10, 12 + Math.round(score * 3 + demandGapRatio * 10)));
  const offerPrice = Math.max(1, Math.round(bundlePrice * (1 - discountPercent / 100)));
  const estimatedUnitsLift = Math.max(8, Math.round((secondary.sales || 0) * 0.12 + score * 4));

  const combinedUnits = Math.max(1, (primary.sales || 0) + (secondary.sales || 0));
  const perUnitProfit = Math.max(1, ((primary.profit || 0) + (secondary.profit || 0)) / combinedUnits);
  const estimatedProfitGain = Math.round(estimatedUnitsLift * perUnitProfit * (1 - discountPercent / 120));

  return {
    id: `${company.id}-${primary.id}-${secondary.id}`,
    companyId: company.id,
    companyName: company.name,
    comboType: relationRule?.id || normalizedText(primary.category),
    recommendedDiscount: discountPercent,
    bundlePrice,
    offerPrice,
    estimatedUnitsLift,
    estimatedProfitGain,
    reason: comboReason(primary, secondary, relationRule),
    primaryProduct: {
      id: primary.id,
      name: primary.name,
      imageUrl: primary.imageUrl,
      category: primary.category,
      brand: primary.brand,
      price: primary.price,
      sales: primary.sales,
      profit: primary.profit
    },
    secondaryProduct: {
      id: secondary.id,
      name: secondary.name,
      imageUrl: secondary.imageUrl,
      category: secondary.category,
      brand: secondary.brand,
      price: secondary.price,
      sales: secondary.sales,
      profit: secondary.profit
    }
  };
}

function selectDiverseCombos(rawCombos, limit) {
  if (rawCombos.length <= limit) {
    return rawCombos;
  }

  const grouped = new Map();
  rawCombos.forEach((combo) => {
    const key = combo.comboType || "general";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(combo);
  });

  const types = [...grouped.keys()].sort((a, b) => {
    return (grouped.get(b)?.length || 0) - (grouped.get(a)?.length || 0);
  });

  const selected = [];
  let round = 0;

  while (selected.length < limit) {
    let addedInRound = false;

    for (const type of types) {
      const candidate = grouped.get(type)?.[round];
      if (!candidate) {
        continue;
      }

      selected.push(candidate);
      addedInRound = true;

      if (selected.length >= limit) {
        break;
      }
    }

    if (!addedInRound) {
      break;
    }

    round += 1;
  }

  return selected;
}

function buildCompanyComboOffers(company, companyProducts, perCompanyLimit = 14) {
  if (!company || !companyProducts.length) {
    return [];
  }

  const primaryLimit = Math.max(24, perCompanyLimit * 2);
  const topProducts = uniqueProductsById([
    ...relationSeedPrimaries(companyProducts, 3),
    ...buildDiversePrimaryProducts(companyProducts, primaryLimit)
  ]).slice(0, primaryLimit);

  const lowProducts = [...companyProducts]
    .sort((a, b) => a.sales - b.sales || a.profit - b.profit)
    .slice(0, 34);

  const accessoryProducts = getAccessoryProducts(companyProducts);

  const combos = [];
  const seenPairs = new Set();

  for (const primary of topProducts) {
    const relationRule = relationRuleForProduct(primary);
    const relationKeywords = relationRule?.secondaryKeywords || [];

    const secondaryPool = getSecondaryPool(companyProducts, primary, lowProducts, accessoryProducts, relationKeywords);
    const rankedSecondary = getRankedSecondaries(primary, secondaryPool, relationKeywords);

    for (const item of rankedSecondary.slice(0, 3)) {
      const secondary = item.secondary;
      const pairKey = `${primary.id}|${secondary.id}`;
      if (seenPairs.has(pairKey)) {
        continue;
      }
      seenPairs.add(pairKey);

      combos.push(buildComboOffer(company, primary, secondary, item.score, relationRule));
    }
  }

  return selectDiverseCombos(combos, perCompanyLimit);
}

function matchesProductFilters(row, categoryFilter, subcategoryFilter) {
  const product = productMap.get(row.productId);
  const rowCategory = normalizedText(row.category || product?.category);
  const rowSubcategory = normalizedText(resolveSubcategory(product));
  const rowSourceCategory = normalizedText(product?.sourceCategory);

  if (categoryFilter && rowCategory !== categoryFilter) {
    return false;
  }

  if (subcategoryFilter) {
    return rowSubcategory === subcategoryFilter || rowSourceCategory === subcategoryFilter;
  }

  return true;
}

function filterMetricsByRange(query, selectedCompanyIds = null, rangeObjInput = null) {
  const rangeObj = rangeObjInput || parseDateRange(query);
  const selectedDates = metricDates.filter((date) => date >= rangeObj.fromISO && date <= rangeObj.toISO);

  if (!selectedDates.length) {
    return { selected: [], rangeObj };
  }

  const selected = [];
  if (selectedCompanyIds?.length) {
    const allowedCompanyIds = selectedCompanyIds.filter((companyId) => companyMap.has(companyId));

    for (const date of selectedDates) {
      for (const companyId of allowedCompanyIds) {
        appendRows(selected, metricsByDateCompany.get(`${date}|${companyId}`));
      }
    }
  } else {
    for (const date of selectedDates) {
      appendRows(selected, metricsByDate.get(date));
    }
  }

  return { selected, rangeObj };
}

function filterSeasonRecords(records, seasonId) {
  if (!seasonId) {
    return records;
  }

  return records.filter((row) => {
    if ((row.productSeasonId || "") !== seasonId) {
      return false;
    }

    const product = productMap.get(row.productId);
    if (!hasProductImage(product)) {
      return false;
    }

    return isSeasonRelevantProduct(product, seasonId);
  });
}

function normalizeProductNameKey(name) {
  return normalizeSeasonToken(name);
}

function mergeProductTotals(target, source) {
  target.sales += Number(source.sales || 0);
  target.orders += Number(source.orders || 0);
  target.revenue += Number(source.revenue || 0);
  target.profit += Number(source.profit || 0);
  target.loss += Number(source.loss || 0);
  target.avgOrderValue = target.orders ? Math.round(target.revenue / target.orders) : 0;
  target.profitRatio = target.revenue ? safeRound((target.profit / target.revenue) * 100) : 0;
  target.lossRatio = target.revenue ? safeRound((target.loss / target.revenue) * 100) : 0;
}

function mergeProductTrendAndImage(target, source) {
  if (Number(source.trendGrowthPercent || 0) > Number(target.trendGrowthPercent || 0)) {
    target.trendGrowthPercent = source.trendGrowthPercent;
    target.trendDirection = source.trendDirection;
  }

  if (!target.imageUrl && source.imageUrl) {
    target.imageUrl = source.imageUrl;
  }
}

function productMergeKey(item) {
  return normalizeProductNameKey(item?.name) || String(item?.id || "");
}

function addOrMergeProductByName(merged, item) {
  const key = productMergeKey(item);
  if (!key) {
    return;
  }

  if (!merged.has(key)) {
    merged.set(key, { ...item });
    return;
  }

  const current = merged.get(key);
  mergeProductTotals(current, item);
  mergeProductTrendAndImage(current, item);
}

function mergeDuplicateProductsByName(items) {
  const merged = new Map();

  (items || []).forEach((item) => addOrMergeProductByName(merged, item));

  return [...merged.values()];
}

function aggregateProducts(records) {
  const grouped = groupMetricsBy(records, (row) => row.productId);

  return [...grouped.entries()]
    .map(([productId, rows]) => {
      const product = productMap.get(productId);
      const totals = summarize(rows);

      return {
        id: productId,
        productFamily: product?.productFamily || "",
        name: product?.name || "Unknown Product",
        category: product?.category || "Unknown",
        subcategory: resolveSubcategory(product),
        sourceCategory: String(product?.sourceCategory || resolveSubcategory(product)),
        brand: product?.brand || "Unknown",
        sourceCompany: product?.sourceCompany || "Unknown",
        sourceCompanyId: product?.companyId || "",
        price: product?.price || 0,
        rating: product?.rating || 0,
        imageUrl: product?.imageUrl || "",
        model: product?.model || "",
        color: product?.color || "",
        spec: product?.spec || "",
        preferredSeason: product?.preferredSeason || "",
        mrp: product?.mrp || null,
        discount: product?.discount ?? null,
        inStock: product?.inStock ?? true,
        sales: totals.units,
        orders: totals.orders,
        revenue: totals.revenue,
        profit: totals.profit,
        loss: totals.loss,
        avgOrderValue: totals.avgOrderValue,
        profitRatio: totals.profitRatio,
        lossRatio: totals.lossRatio
      };
    })
    .filter((item) => hasImageUrl(item.imageUrl));
}

function buildTrend(records) {
  const grouped = groupMetricsBy(records, (row) => row.date);

  return [...grouped.entries()]
    .map(([date, rows]) => {
      const totals = summarize(rows);
      return {
        date,
        revenue: totals.revenue,
        profit: totals.profit,
        orders: totals.orders,
        sales: totals.units
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildCategoryInsights(records) {
  const grouped = groupMetricsBy(records, (row) => row.category);
  return [...grouped.entries()]
    .map(([category, rows]) => ({
      category,
      ...summarize(rows)
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function growthPercent(currentValue, previousValue) {
  if (!previousValue) {
    return currentValue > 0 ? 100 : 0;
  }
  return safeRound(((currentValue - previousValue) / previousValue) * 100);
}

function companySummary(companyId, query) {
  const rangeObj = parseDateRange(query);
  const categoryFilter = normalizedText(query.category);
  const subcategoryFilter = normalizedText(query.subcategory);
  const topMetric = normalizedText(query.topMetric) === "sales" ? "sales" : "profit";
  const topLimit = Math.min(20, Math.max(3, Number(query.topLimit || 10)));

  const cacheKey = JSON.stringify({
    company: companyId,
    range: buildRangeKey(rangeObj),
    category: categoryFilter,
    subcategory: subcategoryFilter,
    topMetric,
    topLimit
  });
  const cached = companySummaryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { selected } = filterMetricsByRange(query, [companyId], rangeObj);
  const availableCategories = [...new Set(selected.map((row) => String(row.category || "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  const filteredSelected = selected.filter((row) => matchesProductFilters(row, categoryFilter, subcategoryFilter));
  const current = summarize(filteredSelected);

  const prev = previousWindow(rangeObj);
  const previousRecords = metrics.filter((row) => {
    if (row.companyId !== companyId) {
      return false;
    }
    if (!isInRange(row.date, { from: prev.from, to: prev.to })) {
      return false;
    }

    return matchesProductFilters(row, categoryFilter, subcategoryFilter);
  });
  const previousTotals = summarize(previousRecords);

  const topProducts = pickTop(aggregateProducts(filteredSelected), topMetric, topLimit);

  const response = {
    company: companyMap.get(companyId),
    range: {
      range: rangeObj.range,
      from: rangeObj.fromISO,
      to: rangeObj.toISO
    },
    availableCategories,
    topProductConfig: {
      category: categoryFilter || "",
      subcategory: subcategoryFilter || "",
      metric: topMetric,
      limit: topLimit
    },
    summary: {
      ...current,
      revenueGrowth: growthPercent(current.revenue, previousTotals.revenue),
      profitGrowth: growthPercent(current.profit, previousTotals.profit)
    },
    trend: buildTrend(filteredSelected),
    categoryBreakdown: buildCategoryInsights(filteredSelected),
    topProducts
  };

  setBoundedCache(companySummaryCache, cacheKey, response, 180);
  return response;
}

export function getDashboardOverview(query = {}) {
  const rangeObj = parseDateRange(query);
  const cacheKey = buildRangeKey(rangeObj);
  const cached = dashboardCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { selected } = filterMetricsByRange(query, null, rangeObj);
  const totals = summarize(selected);

  const companyRows = companies.map((company) => {
    const rows = selected.filter((row) => row.companyId === company.id);
    const companyTotals = summarize(rows);
    return {
      companyId: company.id,
      companyName: company.name,
      color: company.color,
      ...companyTotals
    };
  });

  const productRows = aggregateProducts(selected);

  const response = {
    range: {
      range: rangeObj.range,
      from: rangeObj.fromISO,
      to: rangeObj.toISO
    },
    kpis: {
      totalRevenue: totals.revenue,
      totalProfit: totals.profit,
      totalLoss: totals.loss,
      totalOrders: totals.orders,
      totalSales: totals.units,
      avgOrderValue: totals.avgOrderValue,
      profitRatio: totals.profitRatio,
      lossRatio: totals.lossRatio
    },
    trend: buildTrend(selected).slice(-30),
    companyPerformance: companyRows,
    categoryPerformance: buildCategoryInsights(selected).slice(0, 12),
    topSellingProducts: pickTop(productRows, "sales", 8),
    topProfitProducts: pickTop(productRows, "profit", 8),
    highlights: {
      highestSellingProduct: pickTop(productRows, "sales", 1)[0] || null,
      highestProfitProduct: pickTop(productRows, "profit", 1)[0] || null
    }
  };

  setBoundedCache(dashboardCache, cacheKey, response, 40);
  return response;
}

export function getCompaniesOverview(query = {}) {
  const rangeObj = parseDateRange(query);
  const cacheKey = buildRangeKey(rangeObj);
  const cached = companiesOverviewCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { selected } = filterMetricsByRange(query, null, rangeObj);
  const byCompany = groupMetricsBy(selected, (row) => row.companyId);

  const response = {
    companies: companies.map((company) => {
      const rows = byCompany.get(company.id) || [];
      const summary = summarize(rows);
      const companyProducts = aggregateProducts(rows);

      return {
        ...company,
        summary: {
          ...summary,
          revenueGrowth: 0,
          profitGrowth: 0
        },
        topProduct: pickTop(companyProducts, "profit", 1)[0] || null,
        topCategory: buildCategoryInsights(rows)[0]?.category || "-"
      };
    })
  };

  setBoundedCache(companiesOverviewCache, cacheKey, response, 40);
  return response;
}

export function getCompanyOverview(companyId, query = {}) {
  if (!companyMap.has(companyId)) {
    return null;
  }
  return companySummary(companyId, query);
}

export function getProductsOverview(query = {}) {
  const companyId = query.company || "";
  const search = String(query.search || "").trim().toLowerCase();
  const categoryFilter = normalizedText(query.category);
  const subcategoryFilter = normalizedText(query.subcategory);
  const rangeObj = parseDateRange(query);

  const cacheKey = JSON.stringify({
    range: buildRangeKey(rangeObj),
    company: companyId || "all",
    search,
    category: categoryFilter,
    subcategory: subcategoryFilter
  });
  const cached = productsOverviewCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Company pages should display the same imported master catalog for each company.
  const selectedCompanyIds = null;
  const { selected } = filterMetricsByRange(query, selectedCompanyIds, rangeObj);

  let items = aggregateProducts(selected);

  if (search) {
    items = items.filter((item) => {
      return (
        item.name.toLowerCase().includes(search) ||
        item.brand.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        item.subcategory.toLowerCase().includes(search) ||
        item.sourceCompany.toLowerCase().includes(search)
      );
    });
  }

  if (categoryFilter) {
    items = items.filter((item) => normalizedText(item.category) === categoryFilter);
  }

  if (subcategoryFilter) {
    items = items.filter((item) => {
      return (
        normalizedText(item.subcategory) === subcategoryFilter ||
        normalizedText(item.sourceCategory) === subcategoryFilter
      );
    });
  }

  items.sort((a, b) => b.sales - a.sales);

  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = items.reduce((sum, item) => sum + item.profit, 0);

  const response = {
    range: {
      range: rangeObj.range,
      from: rangeObj.fromISO,
      to: rangeObj.toISO
    },
    company: companyId ? companyMap.get(companyId) : null,
    summary: {
      totalProducts: items.length,
      totalRevenue: Math.round(totalRevenue),
      totalProfit: Math.round(totalProfit),
      highestSellingProduct: pickTop(items, "sales", 1)[0] || null,
      highestProfitProduct: pickTop(items, "profit", 1)[0] || null
    },
    products: items
  };

  setBoundedCache(productsOverviewCache, cacheKey, response, 220);
  return response;
}

export function getProductHierarchy(query = {}) {
  const data = getProductsOverview(query);
  const categoryMap = new Map();

  data.products.forEach((item) => {
    const categoryName = item.category || "General";
    const subcategoryName = resolveSubcategory(item);

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        category: categoryName,
        totalProducts: 0,
        totalRevenue: 0,
        totalProfit: 0,
        subcategories: new Map()
      });
    }

    const categoryEntry = categoryMap.get(categoryName);
    categoryEntry.totalProducts += 1;
    categoryEntry.totalRevenue += item.revenue;
    categoryEntry.totalProfit += item.profit;

    if (!categoryEntry.subcategories.has(subcategoryName)) {
      categoryEntry.subcategories.set(subcategoryName, {
        subcategory: subcategoryName,
        totalProducts: 0,
        totalRevenue: 0,
        totalProfit: 0,
        topProduct: null
      });
    }

    const subEntry = categoryEntry.subcategories.get(subcategoryName);
    subEntry.totalProducts += 1;
    subEntry.totalRevenue += item.revenue;
    subEntry.totalProfit += item.profit;

    if (!subEntry.topProduct || item.profit > subEntry.topProduct.profit) {
      subEntry.topProduct = {
        id: item.id,
        name: item.name,
        sourceCompany: item.sourceCompany,
        imageUrl: item.imageUrl,
        revenue: item.revenue,
        profit: item.profit,
        sales: item.sales
      };
    }
  });

  const categories = [...categoryMap.values()]
    .map((entry) => {
      const subcategories = [...entry.subcategories.values()]
        .map((sub) => ({
          ...sub,
          totalRevenue: Math.round(sub.totalRevenue),
          totalProfit: Math.round(sub.totalProfit)
        }))
        .sort((a, b) => b.totalProducts - a.totalProducts || b.totalProfit - a.totalProfit);

      return {
        category: entry.category,
        totalProducts: entry.totalProducts,
        totalRevenue: Math.round(entry.totalRevenue),
        totalProfit: Math.round(entry.totalProfit),
        totalSubcategories: subcategories.length,
        subcategories
      };
    })
    .sort((a, b) => b.totalProducts - a.totalProducts || b.totalProfit - a.totalProfit);

  const totalSubcategories = categories.reduce((sum, item) => sum + item.totalSubcategories, 0);

  return {
    range: data.range,
    company: data.company,
    summary: {
      totalCategories: categories.length,
      totalSubcategories,
      totalProducts: data.summary.totalProducts
    },
    categories
  };
}

export function getTopProducts(query = {}) {
  const metric = query.metric === "profit" ? "profit" : "sales";
  const size = Math.min(15, Math.max(1, Number(query.limit || 10)));
  const data = getProductsOverview(query);

  return {
    metric,
    products: pickTop(data.products, metric, size)
  };
}

export function getProductSuggestions(query = {}) {
  const q = String(query.q || "").trim().toLowerCase();
  if (!q) {
    return [];
  }

  return products
    .filter((product) => {
      return (
        product.name.toLowerCase().includes(q) ||
        String(product.subcategory || "").toLowerCase().includes(q) ||
        String(product.sourceCategory || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 20)
    .map((product) => ({
      id: product.id,
      name: product.name,
      companyId: product.companyId,
      sourceCompany: product.sourceCompany,
      category: product.category,
      subcategory: product.subcategory || product.category
    }));
}

export function getSeasonList() {
  return seasonConfig;
}

export function getSeasonCompanies(seasonId, query = {}) {
  const rangeObj = parseDateRange(query);
  const cacheKey = `${seasonId}|${buildRangeKey(rangeObj)}`;
  const cached = seasonCompaniesCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { selected } = filterMetricsByRange(query, null, rangeObj);
  const seasonalRecords = filterSeasonRecords(selected, seasonId);

  const response = companies.map((company) => {
    const rows = seasonalRecords.filter((row) => row.companyId === company.id);
    const uniqueProducts = mergeDuplicateProductsByName(aggregateProducts(rows));
    const totals = summarize(rows);
    const topProduct = pickTop(uniqueProducts, "profit", 1)[0] || null;
    const featuredProducts = pickTop(uniqueProducts, "sales", 8).map((item) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      category: item.category,
      sales: item.sales
    }));

    return {
      companyId: company.id,
      companyName: company.name,
      color: company.color,
      seasonId,
      productCount: uniqueProducts.length,
      featuredProducts,
      topProduct,
      ...totals
    };
  });

  setBoundedCache(seasonCompaniesCache, cacheKey, response, 60);
  return response;
}

function trendDirection(value) {
  if (value > 14) {
    return "Rising";
  }
  if (value < -8) {
    return "Declining";
  }
  return "Stable";
}

export function getSeasonCompanyReport(seasonId, companyId, query = {}) {
  if (!companyMap.has(companyId)) {
    return null;
  }

  const rangeObj = parseDateRange(query);
  const cacheKey = `${seasonId}|${companyId}|${buildRangeKey(rangeObj)}`;
  const cached = seasonCompanyReportCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { selected } = filterMetricsByRange(query, [companyId], rangeObj);
  const seasonalRecords = filterSeasonRecords(selected, seasonId);
  const seasonalProductIds = new Set(seasonalRecords.map((row) => row.productId));
  const nonSeasonalRecords = selected.filter((row) => {
    if (!seasonalProductIds.has(row.productId)) {
      return false;
    }
    return (row.productSeasonId || row.seasonId) !== seasonId;
  });

  const productRows = aggregateProducts(seasonalRecords);
  const nonSeasonByProduct = groupMetricsBy(nonSeasonalRecords, (row) => row.productId);

  const enrichedById = productRows.map((item) => {
    const baseline = summarize(nonSeasonByProduct.get(item.id) || []);
    const growth = growthPercent(item.revenue, baseline.revenue);

    return {
      ...item,
      trendGrowthPercent: growth,
      trendDirection: trendDirection(growth)
    };
  });

  const enriched = mergeDuplicateProductsByName(enrichedById);

  const totals = summarize(seasonalRecords);
  const seasonMeta = seasonConfig.find((item) => item.id === seasonId) || null;
  const sortedProducts = [...enriched].sort((a, b) => {
    return Number(b.sales || 0) - Number(a.sales || 0) || Number(b.profit || 0) - Number(a.profit || 0);
  });

  const response = {
    season: seasonMeta,
    company: companyMap.get(companyId),
    summary: totals,
    products: sortedProducts,
    insights: [
      `Top seasonal category: ${buildCategoryInsights(seasonalRecords)[0]?.category || "N/A"}`,
      `Highest seasonal product by profit: ${pickTop(enriched, "profit", 1)[0]?.name || "N/A"}`,
      `Top seasonal subcategory: ${pickTop(enriched, "sales", 1)[0]?.subcategory || "N/A"}`,
      `Seasonal profit ratio: ${totals.profitRatio}%`,
      `Seasonal products covered: ${sortedProducts.length}`,
      `Reference seasonal products: ${(seasonMeta?.productExamples || []).join(", ") || "N/A"}`
    ]
  };

  setBoundedCache(seasonCompanyReportCache, cacheKey, response, 120);
  return response;
}

export function getPaymentCompanies() {
  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    color: company.color,
    headquarters: company.headquarters
  }));
}

export function getCompanyPaymentSummary(companyId, query = {}) {
  if (!companyMap.has(companyId)) {
    return null;
  }

  const rangeObj = parseDateRange(query);

  const rows = paymentOrders.filter((order) => {
    if (order.companyId !== companyId) {
      return false;
    }
    return isInRange(order.orderDate, rangeObj);
  });

  const totalAmount = rows.reduce((sum, row) => sum + row.totalPrice, 0);
  const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);

  const methodMap = new Map();
  rows.forEach((row) => {
    methodMap.set(row.paymentMethod, (methodMap.get(row.paymentMethod) || 0) + row.totalPrice);
  });

  const paymentMethodSplit = [...methodMap.entries()].map(([method, value]) => ({
    method,
    amount: value
  }));

  return {
    company: companyMap.get(companyId),
    summary: {
      totalOrders: rows.length,
      totalAmount: Math.round(totalAmount),
      totalQuantity: quantity,
      avgTicketSize: rows.length ? Math.round(totalAmount / rows.length) : 0
    },
    paymentMethodSplit,
    records: rows
  };
}

export function getCompanyAnalytics(companyId, query = {}) {
  if (!companyMap.has(companyId)) {
    return null;
  }

  const payload = companySummary(companyId, query);

  return {
    ...payload,
    companyWiseInsights: [
      `${payload.company.name} profit ratio is ${payload.summary.profitRatio}% for the selected range.`,
      `${payload.company.name} top category by revenue is ${payload.categoryBreakdown[0]?.category || "N/A"}.`,
      `${payload.company.name} best performing product is ${payload.topProducts[0]?.name || "N/A"}.`
    ],
    productWiseInsights: payload.topProducts.slice(0, 4).map((item) => {
      return `${item.name} generated ${item.profit} profit and ${item.sales} units.`;
    })
  };
}

export function getComparisonAnalytics(query = {}) {
  const rawCompanyIds = String(query.companies || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const selectedIds = rawCompanyIds.length ? rawCompanyIds : companies.map((company) => company.id);
  const selectedUnique = [...new Set(selectedIds)].slice(0, 6);

  const companyRows = selectedUnique
    .map((companyId) => getCompanyAnalytics(companyId, query))
    .filter(Boolean)
    .map((payload) => ({
      companyId: payload.company.id,
      companyName: payload.company.name,
      revenue: payload.summary.revenue,
      profit: payload.summary.profit,
      loss: payload.summary.loss,
      orders: payload.summary.orders,
      sales: payload.summary.units,
      profitRatio: payload.summary.profitRatio,
      lossRatio: payload.summary.lossRatio,
      topProduct: payload.topProducts[0] || null
    }));

  const highestProfitCompany = pickTop(companyRows, "profit", 1)[0] || null;
  const lowestProfitCompany = [...companyRows].sort((a, b) => a.profit - b.profit)[0] || null;

  const overall = summarize(
    metrics.filter((row) => selectedUnique.includes(row.companyId) && isInRange(row.date, parseDateRange(query)))
  );

  const productRows = getProductsOverview({ ...query, company: "" }).products.filter((item) =>
    selectedUnique.includes(item.sourceCompanyId)
  );

  const topPerformingProducts = pickTop(productRows, "profit", 12);

  return {
    selectedCompanies: companyRows,
    selectedCompanyCount: companyRows.length,
    highestProfitCompany,
    lowestProfitCompany,
    revenueComparison: companyRows.map((item) => ({
      companyName: item.companyName,
      revenue: item.revenue
    })),
    profitRatio: overall.profitRatio,
    lossRatio: overall.lossRatio,
    topPerformingProducts,
    companyWiseInsights: companyRows.map((item) => {
      return `${item.companyName} delivered ${item.profitRatio}% profit ratio with ${item.revenue} revenue.`;
    }),
    productWiseInsights: companyRows
      .filter((item) => item.topProduct)
      .map((item) => `${item.companyName} top product: ${item.topProduct.name} (${item.topProduct.profit} profit).`)
  };
}

export function getOffersOverview(query = {}) {
  const rangeObj = parseDateRange(query);
  const comboLimit = Math.max(50, Math.min(120, Number(query.comboLimit || 60)));

  const cacheKey = `${buildRangeKey(rangeObj)}|${comboLimit}`;
  const cached = offersOverviewCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { selected } = filterMetricsByRange(query, null, rangeObj);
  const byCompany = groupMetricsBy(selected, (row) => row.companyId);
  const companyProductsMap = new Map();

  const companyProfitLoss = companies
    .map((company) => {
      const rows = byCompany.get(company.id) || [];
      const summary = summarize(rows);
      const companyProducts = aggregateProducts(rows);
      companyProductsMap.set(company.id, companyProducts);

      const topProduct = pickTop(companyProducts, "profit", 1)[0] || null;
      const lowProduct = [...companyProducts].sort((a, b) => a.sales - b.sales || a.profit - b.profit)[0] || null;

      return {
        companyId: company.id,
        companyName: company.name,
        color: company.color,
        ...summary,
        topProduct: topProduct
          ? {
              id: topProduct.id,
              name: topProduct.name,
              imageUrl: topProduct.imageUrl,
              category: topProduct.category,
              sales: topProduct.sales,
              profit: topProduct.profit
            }
          : null,
        lowProduct: lowProduct
          ? {
              id: lowProduct.id,
              name: lowProduct.name,
              imageUrl: lowProduct.imageUrl,
              category: lowProduct.category,
              sales: lowProduct.sales,
              profit: lowProduct.profit
            }
          : null
      };
    })
    .sort((a, b) => b.profit - a.profit);

  const comboOffers = companyProfitLoss
    .flatMap((item) => {
      const company = companyMap.get(item.companyId);
      const rows = companyProductsMap.get(item.companyId) || [];
      return buildCompanyComboOffers(company, rows, 16);
    })
    .sort((a, b) => b.estimatedProfitGain - a.estimatedProfitGain || b.offerPrice - a.offerPrice)
    .slice(0, comboLimit);

  const comboOffersByCompany = companyProfitLoss
    .map((item) => ({
      companyId: item.companyId,
      companyName: item.companyName,
      offers: comboOffers.filter((offer) => offer.companyId === item.companyId)
    }))
    .filter((item) => item.offers.length > 0);

  const totals = companyProfitLoss.reduce(
    (acc, item) => {
      acc.revenue += item.revenue;
      acc.profit += item.profit;
      acc.loss += item.loss;
      return acc;
    },
    { revenue: 0, profit: 0, loss: 0 }
  );

  const response = {
    range: {
      range: rangeObj.range,
      from: rangeObj.fromISO,
      to: rangeObj.toISO
    },
    summary: {
      companyCount: companyProfitLoss.length,
      comboCount: comboOffers.length,
      totalRevenue: Math.round(totals.revenue),
      totalProfit: Math.round(totals.profit),
      totalLoss: Math.round(totals.loss),
      topCompany: companyProfitLoss[0]
        ? {
            companyId: companyProfitLoss[0].companyId,
            companyName: companyProfitLoss[0].companyName,
            profit: companyProfitLoss[0].profit
          }
        : null
    },
    companyProfitLoss,
    comboOffers,
    comboOffersByCompany
  };

  setBoundedCache(offersOverviewCache, cacheKey, response, 30);
  return response;
}

export function getProductLiveAnalytics(query = {}) {
  const searchValue = String(query.product || query.q || query.productId || "").trim().toLowerCase();

  if (!searchValue) {
    return {
      query: "",
      message: "Search a product to view live analytics.",
      matches: [],
      companyPerformance: []
    };
  }

  const matchedProducts = products
    .filter((product) => {
      return (
        product.id.toLowerCase().includes(searchValue) ||
        product.name.toLowerCase().includes(searchValue) ||
        product.productFamily.toLowerCase().includes(searchValue)
      );
    })
    .filter((product) => hasProductImage(product));

  if (!matchedProducts.length) {
    return {
      query: searchValue,
      message: "No product matched this search.",
      matches: [],
      companyPerformance: []
    };
  }

  const rangeObj = parseDateRange(query);
  const matchedIds = new Set(matchedProducts.map((item) => item.id));

  const matchedRecords = metrics.filter((row) => matchedIds.has(row.productId) && isInRange(row.date, rangeObj));

  const companyPerformance = companies
    .map((company) => {
      const rows = matchedRecords.filter((row) => row.companyId === company.id);
      const totals = summarize(rows);
      return {
        companyId: company.id,
        companyName: company.name,
        ...totals
      };
    })
    .sort((a, b) => b.profit - a.profit);

  const topCompanies = companyPerformance.filter((item) => item.revenue > 0).slice(0, 6);
  const bestCompany = topCompanies[0] || companyPerformance[0] || null;

  const brandPerformance = [...groupMetricsBy(matchedRecords, (row) => productMap.get(row.productId)?.brand || "Unknown").entries()]
    .map(([brand, rows]) => ({
      brand,
      ...summarize(rows)
    }))
    .filter((row) => row.revenue > 0)
    .sort((a, b) => b.profit - a.profit);

  const topBrands = brandPerformance.slice(0, 6);

  const seasonPerformance = seasonConfig.map((season) => {
    const rows = matchedRecords.filter((row) => (row.productSeasonId || row.seasonId) === season.id);
    return {
      seasonId: season.id,
      season: season.label,
      ...summarize(rows)
    };
  });

  return {
    query: searchValue,
    matches: matchedProducts.map((item) => ({
      id: item.id,
      name: item.name,
      sourceCompany: item.sourceCompany,
      brand: item.brand,
      category: item.category,
      imageUrl: item.imageUrl,
      price: item.price,
      rating: item.rating
    })),
    bestCompany,
    companyPerformance,
    topCompanies,
    topBrands,
    seasonPerformance,
    relatedInsights: [
      `Best company for this product search: ${bestCompany?.companyName || "N/A"}`,
      `Highest product search profit observed: ${bestCompany?.profit || 0}`,
      `Top brand for this search: ${topBrands[0]?.brand || "N/A"}`,
      `Peak seasonal revenue: ${pickTop(seasonPerformance, "revenue", 1)[0]?.season || "N/A"}`
    ]
  };
}

export function getTaxonomy() {
  return getCategoryTaxonomy();
}
