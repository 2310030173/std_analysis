import { Router } from "express";
import {
  getSeasonCompanies,
  getSeasonCompanyReport,
  getSeasonList
} from "../services/analyticsService.js";

const router = Router();

router.get("/seasons", (_req, res) => {
  res.json({ seasons: getSeasonList() });
});

router.get("/:seasonId/companies", (req, res) => {
  res.json({
    seasonId: req.params.seasonId,
    companies: getSeasonCompanies(req.params.seasonId, req.query)
  });
});

router.get("/:seasonId/:companyId", (req, res) => {
  const result = getSeasonCompanyReport(req.params.seasonId, req.params.companyId, req.query);

  if (!result) {
    return res.status(404).json({ message: "Seasonal report not found" });
  }

  return res.json(result);
});

export default router;
