import { Router } from "express";
import { getCompanies } from "../services/dataStore.js";
import {
  getProductHierarchy,
  getProductsOverview,
  getProductSuggestions,
  getTopProducts
} from "../services/analyticsService.js";
import { getLiveProductsOverview } from "../services/liveDataService.js";

const router = Router();

router.get("/companies", (_req, res) => {
  const companies = getCompanies().map((item) => ({
    id: item.id,
    name: item.name,
    color: item.color
  }));
  res.json({ companies });
});

router.get("/search", (req, res) => {
  res.json({ products: getProductSuggestions(req.query) });
});

router.get("/top", (req, res) => {
  res.json(getTopProducts(req.query));
});

router.get("/hierarchy", (req, res) => {
  res.json(getProductHierarchy(req.query));
});

router.get("/live", async (req, res, next) => {
  try {
    res.json(await getLiveProductsOverview(req.query));
  } catch (error) {
    next(error);
  }
});

router.get("/", (req, res) => {
  res.json(getProductsOverview(req.query));
});

export default router;
