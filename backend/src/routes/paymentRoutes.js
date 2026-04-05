import { Router } from "express";
import { getCompanyPaymentSummary, getPaymentCompanies } from "../services/analyticsService.js";

const router = Router();

router.get("/companies", (_req, res) => {
  res.json({ companies: getPaymentCompanies() });
});

router.get("/:companyId", (req, res) => {
  const result = getCompanyPaymentSummary(req.params.companyId, req.query);

  if (!result) {
    return res.status(404).json({ message: "Company payment summary not found" });
  }

  return res.json(result);
});

export default router;
