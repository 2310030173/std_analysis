import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/authRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import seasonalRoutes from "./routes/seasonalRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { getCategoryTaxonomy } from "./services/dataStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "../../frontend");

export const app = express();

const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "store-data-analysis-api" });
});

app.get("/api/meta/categories", (_req, res) => {
  res.json({ categories: getCategoryTaxonomy() });
});

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/seasonal", seasonalRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);

if (process.env.SERVE_FRONTEND !== "false") {
  app.use(express.static(frontendDir));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    // Let real static files (png, css, js, html) fall through to static handler.
    if (path.extname(req.path)) {
      return next();
    }

    return res.sendFile(path.join(frontendDir, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message || "Unexpected backend failure"
  });
});
