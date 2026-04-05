import { Router } from "express";
import { getDashboardOverview } from "../services/analyticsService.js";

const router = Router();

router.get("/overview", (req, res) => {
  res.json(getDashboardOverview(req.query));
});

export default router;
