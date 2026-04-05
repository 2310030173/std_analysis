import { Router } from "express";
import { getCompaniesOverview, getCompanyOverview } from "../services/analyticsService.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(getCompaniesOverview(req.query));
});

router.get("/:companyId", (req, res) => {
  const result = getCompanyOverview(req.params.companyId, req.query);

  if (!result) {
    return res.status(404).json({ message: "Company not found" });
  }

  return res.json(result);
});

export default router;
