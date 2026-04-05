import { Router } from "express";
import {
  getCompanyAnalytics,
  getComparisonAnalytics,
  getOffersOverview,
  getProductLiveAnalytics
} from "../services/analyticsService.js";

const router = Router();

router.get("/company/:companyId", (req, res) => {
  const result = getCompanyAnalytics(req.params.companyId, req.query);

  if (!result) {
    return res.status(404).json({ message: "Company analytics not found" });
  }

  return res.json(result);
});

router.get("/compare", (req, res) => {
  res.json(getComparisonAnalytics(req.query));
});

router.get("/offers", (req, res) => {
  res.json(getOffersOverview(req.query));
});

router.get("/product", (req, res) => {
  res.json(getProductLiveAnalytics(req.query));
});

export default router;
