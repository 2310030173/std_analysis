# Store Data Analysis

Professional multi-page e-commerce analytics platform with a plain HTML/CSS/JS frontend and Node.js + Express backend APIs.

## Project Structure

- `frontend/` - Multi-page website
  - `index.html` - Login page (first screen)
  - `dashboard.html` - Premium dashboard
  - `companies.html` - Company directory
  - `company-amazon.html`, `company-flipkart.html`, `company-myntra.html`, `company-ajio.html`, `company-nykaa.html`, `company-meesho.html` - Separate company pages
  - `products.html` - Product module entry (category-first flow)
  - `products-category.html` - Category -> subcategory navigation page
  - `products-amazon.html`, `products-flipkart.html`, `products-myntra.html`, `products-ajio.html`, `products-nykaa.html`, `products-meesho.html` - Dedicated company product sub-pages
  - `products-company.html` - Company product page
  - `products-all.html` - All-company products
  - `seasonal.html` - Seasonal module entry (season-first flow)
  - `season-summer.html`, `season-monsoon.html`, `season-winter.html`, `season-festive.html`, `season-spring.html` - Dedicated season sub-pages
  - `seasonal-companies.html` - Season -> company flow
  - `seasonal-report-amazon.html`, `seasonal-report-flipkart.html`, `seasonal-report-myntra.html`, `seasonal-report-ajio.html`, `seasonal-report-nykaa.html`, `seasonal-report-meesho.html` - Dedicated company seasonal report sub-pages
  - `seasonal-report.html` - Seasonal product report
  - `payments.html` - Order payment module entry
  - `payments-amazon.html`, `payments-flipkart.html`, `payments-myntra.html`, `payments-ajio.html`, `payments-nykaa.html`, `payments-meesho.html` - Dedicated payment summary sub-pages
  - `payments-company.html` - Order Payment Summary page
  - `analytics.html` - Analytics module entry
  - `analytics-amazon.html`, `analytics-flipkart.html`, `analytics-myntra.html`, `analytics-ajio.html`, `analytics-nykaa.html`, `analytics-meesho.html` - Dedicated company analytics sub-pages
  - `analytics-company.html` - Company live analytics
  - `analytics-compare.html` - Multi-company comparison analytics (1 to 6 companies)
  - `analytics-product.html` - Product live analytics
  - `css/styles.css` - Shared enterprise design system
  - `js/` - Shared API/auth/shell/ui utilities and page scripts

- `backend/` - API backend
  - `src/app.js` / `src/server.js` - Express app bootstrap
  - `src/routes/` - API route modules
  - `src/services/dataStore.js` - Structured sample data + synthetic metrics generation
  - `src/services/analyticsService.js` - Analytics computations and dynamic summaries
  - `src/utils/dateRange.js` - day/week/month/custom filter parsing and helpers
  - `data/companies.json` - company master data
  - `data/productFamilies.json` - product family templates and categories
  - `data/paymentProfiles.json` - customer/payment seed profiles
  - `data/productImages.json` - image URL overrides generated via Unsplash script
  - `data/customProducts.json` - optional custom product dataset (empty by default)
  - `data/customProducts.template.json` - template for your product + image URL uploads

- `scripts/`
  - `fillProductImages.js` - Build-time Unsplash image enrichment script
  - `importShopzenProducts.js` - Import exact products and image URLs from `shopzen_5000_products.html`

## Login Credentials

- Email: `2310030173@klh.edu.in`
- Password: `2310030173`

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000` by default.

## Run Full Project Locally (Recommended)

The backend now serves the entire frontend, so one process runs the full website and APIs together.

```bash
cd backend
npm install
npm start
```

Open:

- `http://localhost:4000`

## Frontend Run

Open the `frontend/` folder with a static server (for example VS Code Live Server) and start at:

- `frontend/index.html`

If you run frontend and backend separately in local development, frontend automatically uses `http://localhost:4000/api`.

## Deployment (Single Service)

You can deploy everything (frontend + backend) as one Node service.

### Option 1: Docker

From project root:

```bash
docker build -t store-data-analysis .
docker run -p 4000:4000 store-data-analysis
```

Then open:

- `http://localhost:4000`

### Option 2: Render/Railway/Fly (Node Service)

Use these settings:

- Build command: `npm --prefix backend install`
- Start command: `npm --prefix backend start`
- Environment: `NODE_ENV=production`

Optional environment variables:

- `PORT` (default `4000`)
- `SERVE_FRONTEND` (default `true`)
- `FRONTEND_ORIGIN` (needed only if frontend is hosted on a different domain)

### Option 3: Netlify (Frontend Only)

If you deploy to Netlify and see **Page not found**, it usually means Netlify is publishing the project root instead of `frontend/`.

Use either method below:

1. Netlify from Git:
  - Keep `netlify.toml` in project root (already added)
  - Netlify will publish from `frontend`
2. Netlify drag-and-drop:
  - Upload the `frontend` folder directly (not the whole project root)

Important:

- Netlify hosts static frontend only.
- Deploy backend separately (Render/Railway/Fly) and point API base to that backend if required.

### Option 4: Netlify Full Stack (Frontend + API Functions)

This repository now includes Netlify Functions wiring so `/api/*` works in Netlify deployment.

Required files already included:

- `netlify.toml` with functions + `/api/*` rewrite
- `netlify/functions/api.mjs` function entry
- root `package.json` with `serverless-http` and backend postinstall

Deploy steps:

1. Deploy from repository root (not only `frontend/`).
2. Netlify will publish `frontend` and build functions from `netlify/functions`.
3. Login/API requests will resolve through `/.netlify/functions/api/...`.

If you still see `Unexpected end of JSON input` in browser, confirm Netlify is using repository root and that functions build passed successfully.

## Unsplash Product Image Fill

Run from the project root:

```bash
UNSPLASH_ACCESS_KEY=<your_key> node scripts/fillProductImages.js
```

Example keys can be used through environment variable only. Do not hardcode keys in frontend files.

After running the script, restart backend so updated URLs from `backend/data/productImages.json` are picked up.

## API Coverage

- Auth: `/api/auth/login`
- Dashboard: `/api/dashboard/overview`
- Companies: `/api/companies`, `/api/companies/:companyId`
- Products: `/api/products/companies`, `/api/products`, `/api/products/top`, `/api/products/search`
  - Category hierarchy: `/api/products/hierarchy`
  - Live website data: `/api/products/live`
- Seasonal: `/api/seasonal/seasons`, `/api/seasonal/:seasonId/companies`, `/api/seasonal/:seasonId/:companyId`
- Payments: `/api/payments/companies`, `/api/payments/:companyId`
- Analytics:
  - `/api/analytics/company/:companyId`
  - `/api/analytics/compare`
  - `/api/analytics/product`

## Notes

- Date filters (`day`, `week`, `month`, `custom from-to`) are shared across pages.
- KPI cards and summaries are API-driven and update dynamically after filter changes.
- Every protected page includes a back button in the topbar.
- The old `index (3).html` is left untouched and separate from this new multi-file implementation.

## Real Data And Custom Product Upload

1. For live website product feed, use the Products page and switch source to **Live Website Data** (uses external web catalog endpoint).
2. To load your own product dataset with image URLs:
  - Copy `backend/data/customProducts.template.json` to `backend/data/customProducts.json`
  - Replace sample rows with your full dataset
  - Restart backend (`npm run dev`)
3. Once custom data is present, analytics and product modules automatically use your provided product rows.
4. To import the exact ShopZen 5000 product dataset with exact image URLs:
  - Run from the project root:
    - `node scripts/importShopzenProducts.js "c:\Users\B KARTHIK\Downloads\shopzen_5000_products.html"`
  - Restart backend (`npm run dev`) after import.
