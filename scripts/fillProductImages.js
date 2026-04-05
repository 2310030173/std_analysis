const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const familiesPath = path.join(ROOT, "backend", "data", "productFamilies.json");
const outputPath = path.join(ROOT, "backend", "data", "productImages.json");

const accessKey = process.env.UNSPLASH_ACCESS_KEY;

if (!accessKey) {
  console.error("UNSPLASH_ACCESS_KEY is missing. Example:");
  console.error("UNSPLASH_ACCESS_KEY=<key> node scripts/fillProductImages.js");
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchImage(query) {
  const endpoint = new URL("https://api.unsplash.com/search/photos");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("orientation", "landscape");
  endpoint.searchParams.set("per_page", "12");
  endpoint.searchParams.set("content_filter", "high");
  endpoint.searchParams.set("order_by", "relevant");

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Client-ID ${accessKey}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Unsplash API failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const first = data.results && data.results[0];
  if (!first) {
    return null;
  }

  return `${first.urls.regular}&auto=format&fit=crop&w=1200&q=80`;
}

async function main() {
  const families = readJson(familiesPath);
  const imageMap = {};

  console.log(`Fetching images for ${families.length} product families...`);

  for (let i = 0; i < families.length; i += 1) {
    const family = families[i];
    const query = family.imageQuery || family.name;

    try {
      const imageUrl = await searchImage(query);
      if (imageUrl) {
        imageMap[family.slug] = imageUrl;
        console.log(`[${i + 1}/${families.length}] ${family.slug} -> success`);
      } else {
        console.log(`[${i + 1}/${families.length}] ${family.slug} -> no result`);
      }
    } catch (error) {
      console.log(`[${i + 1}/${families.length}] ${family.slug} -> failed: ${error.message}`);
    }

    await sleep(220);
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(imageMap, null, 2)}\n`, "utf8");
  console.log(`Saved ${Object.keys(imageMap).length} image URLs to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
