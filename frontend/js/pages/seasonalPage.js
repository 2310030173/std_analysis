import { api } from "../api.js";
import { seasonSubPage } from "../config.js";
import { initShell } from "../shell.js";
import { showToast } from "../ui.js";

const seasonImageMap = {
  summer: "./assets/seasons/summer.jpg",
  monsoon: "./assets/seasons/rainy.jpg",
  winter: "./assets/seasons/winter.jpg",
  festive: "./assets/seasons/festive.jpg",
  spring: "./assets/seasons/spring.jpg"
};

const shell = initShell({
  pageId: "seasonal",
  title: "Seasonal Trends",
  subtitle: "Season-first product intelligence with curated seasonal product discovery"
});

const root = shell.contentEl;
root.innerHTML = `
  <section class="hero">
    <h2>Seasonal Product Navigator</h2>
    <p>Select a season to open product-focused insights, trend behavior, and marketplace-wise seasonal reports.</p>
  </section>
  <section id="season-grid" class="selector-grid"></section>
`;

async function loadSeasons() {
  const data = await api.seasons();

  document.getElementById("season-grid").innerHTML = data.seasons
    .map((season, index) => {
      const examples = Array.isArray(season.productExamples) && season.productExamples.length
        ? season.productExamples.join(", ")
        : "Season-specific products";
      const seasonImage = seasonImageMap[season.id] || "./assets/seasons/spring.jpg";
      const seasonImageText = `${season.label} Image`;

      return `
      <a class="selector-card season-image-card animate-stagger" style="animation-delay:${index * 70}ms; background-image:url('${seasonImage}');" href="${seasonSubPage(season.id)}">
        <div class="season-image-overlay">
          <span class="pill">${seasonImageText}</span>
          <h3 class="section-title season-image-title">${season.label}</h3>
          <p class="section-note season-image-note">Focus categories: ${season.focusCategories.join(", ")}</p>
          <p class="section-note season-image-note" style="margin-bottom:0;">Suggested products: ${examples}</p>
          <span class="card-cta season-image-cta">View ${season.label} Seasonal Products</span>
        </div>
      </a>
    `;
    })
    .join("");

  showToast("Season list loaded", "success", 1500);
}

try {
  await loadSeasons();
} catch (error) {
  showToast(error.message || "Unable to load seasons", "error", 3200);
}
