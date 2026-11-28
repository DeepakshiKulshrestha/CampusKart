# CampusKart API Reference

Backend: Node/Express in `backend/`. All routes start with `/api`.

## Getting started

| What | Value |
|---|---|
| Backend URL (local) | `http://localhost:5000/api` (`PORT` in `backend/.env`). **On macOS port 5000 is taken by AirPlay Receiver, so use `PORT=5001`.** |
| Frontend dev server | `http://localhost:5173` (Vite) |
| Frontend → backend | `VITE_API_URL` in `frontend/.env`, e.g. `VITE_API_URL=http://localhost:5001/api` |
| CORS | Only origins listed in `FRONTEND_URL` (comma-separated) get CORS headers. Default `http://localhost:5173`. Postman/curl (no `Origin` header) always work. |
| Auth | `Authorization: Bearer <token>` (token from register/login, valid 7 days by default) |
| Image upload | `multipart/form-data`, files in the field **`images`** (1–5 files, JPG/PNG/WEBP, max 5 MB each) |
| Health check | `GET /api/health` → `{ "status": "ok", ... }` |

### Conventions

- Every response has `success: true|false`. Errors look like `{ "success": false, "message": "..." }`.
- Validation errors (400) also list the fields:
  ```json
  { "success": false, "message": "Validation failed", "errors": [{ "field": "price", "message": "Price must be a number" }] }
  ```
- Lists are paginated: `?page=1&limit=12` (limit is capped at 50) and return
  ```json
  { "success": true, "items": [ ... ], "pagination": { "page": 1, "limit": 12, "total": 57, "totalPages": 5 } }
  ```
- Money values (`amount`, `commissionRate`, `commissionAmount`, `sellerAmount`) are always calculated by the backend from the database. Values sent by the client are ignored.
- People are shown to students by **name only**. Emails are only returned to the user themselves and to admins.

### Status codes

| Code | Meaning |
|---|---|
| 400 | Invalid input, invalid id (not a 24-character ObjectId), or a business rule (e.g. interest in your own listing) |
| 401 | Missing, invalid or expired token |
| 402 | Simulated payment failed (`POST /transactions/:id/pay` with `simulateFailure`) |
| 403 | Logged in but not allowed (not the owner / not an admin / account restricted) |
| 404 | Not found (removed listings count as not found) |
| 409 | Conflict: duplicate, wrong status for this action, product no longer available |
| 422 | Fair-price check impossible (listing price or original price is ₹0) |
| 429 | Rate limit hit: 300 requests per 15 min per IP on `/api`, 20 per 15 min on login + register |
| 502 | The ML service rejected the request (a backend/ML contract mismatch, not a user error) |
| 503 | `AI service unavailable`: the ML service is down, timed out, or misconfigured. Only AI endpoints return this; the marketplace keeps working |

### Enum values (from `src/models/constants.js`)

| Name | Values |
|---|---|
| category | `Books`, `Electronics`, `Furniture`, `Cycles`, `Stationery`, `Accessories`, `Appliances`, `Other` |
| condition | `New`, `Like New`, `Good`, `Fair`, `Poor` |
| product status | `AVAILABLE`, `SOLD`, `REMOVED` |
| interest status | `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED` |
| transaction status | `PENDING`, `COMPLETED`, `CANCELLED`, `REFUNDED` |
| payment status | `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED` |
| report reason | `Fake listing`, `Wrong description`, `Suspicious price`, `Inappropriate content`, `Duplicate`, `Other` |
| report status | `PENDING`, `REVIEWED`, `RESOLVED`, `DISMISSED` |
| role | `STUDENT`, `ADMIN` |
| analytics range | `today`, `week` (7 days), `month` (30 days, default), `year`, `all`, `custom` (+ `from`, `to` as `YYYY-MM-DD`) |

---

## Endpoint summary

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | public |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | public |
| GET | `/api/users/me` | logged in |
| PUT | `/api/users/me` | logged in |
| GET | `/api/products` | public |
| POST | `/api/products` | logged in |
| GET | `/api/products/mine` | logged in |
| GET | `/api/products/:id` | public |
| PUT | `/api/products/:id` | owner |
| DELETE | `/api/products/:id` | owner |
| PUT | `/api/products/:id/sold` | owner |
| POST | `/api/products/:id/interest` | logged in (not owner) |
| POST | `/api/products/:id/report` | logged in (not owner) |
| GET | `/api/interests` | logged in |
| PUT | `/api/interests/:id` | buyer or seller of that interest |
| POST | `/api/transactions` | buyer of an accepted interest |
| GET | `/api/transactions` | logged in |
| GET | `/api/transactions/:id` | buyer, seller or ADMIN |
| POST | `/api/transactions/:id/pay` | buyer |
| PUT | `/api/transactions/:id/cancel` | buyer or seller |
| POST | `/api/reports` | logged in (not owner) |
| GET | `/api/admin/dashboard` | ADMIN |
| GET | `/api/admin/analytics/summary` | ADMIN |
| GET | `/api/admin/analytics/sales-over-time` | ADMIN |
| GET | `/api/admin/analytics/transactions-by-status` | ADMIN |
| GET | `/api/admin/analytics/top-categories` | ADMIN |
| GET | `/api/admin/commission` | ADMIN |
| PUT | `/api/admin/commission` | ADMIN |
| GET | `/api/admin/transactions` | ADMIN |
| GET | `/api/admin/reports` | ADMIN |
| PUT | `/api/admin/reports/:id` | ADMIN |
| GET | `/api/admin/users` | ADMIN |
| PUT | `/api/admin/users/:id/restrict` | ADMIN |
| GET | `/api/admin/products` | ADMIN |
| PUT | `/api/admin/products/:id/remove` | ADMIN |
| GET | `/api/admin/ai-flags` | ADMIN |
| PUT | `/api/admin/ai-flags/:id/review` | ADMIN |
| GET | `/api/admin/analytics/ai` | ADMIN |
| GET | `/api/admin/model-metrics` | ADMIN |
| POST | `/api/ai/price-prediction` | logged in |
| POST | `/api/ai/price-fairness` | public |
| POST | `/api/ai/semantic-search` | public (a token only adds `userId` to the search log) |
| POST | `/api/ai/suspicion-score` | ADMIN |

---

## Auth and profile

### POST /api/auth/register
Body: `{ "name": "Asha Rao", "email": "asha@college.edu", "password": "at-least-8-chars" }`
- name 2–60 chars, password 8–72 chars, email is lowercased.
- `role` may be sent but only `STUDENT` is accepted; `ADMIN` → 403.
- Duplicate email → 409.

Response 201:
```json
{ "success": true, "token": "eyJ...", "user": { "_id": "...", "name": "Asha Rao", "email": "asha@college.edu", "role": "STUDENT", "profileImage": "", "isRestricted": false, "createdAt": "..." } }
```

### POST /api/auth/login
Body: `{ "email", "password" }` → 200 `{ success, token, user }`. Wrong email or password → 401 (same message for both). Restricted account → 403.

### POST /api/auth/logout
JWTs are stateless, so the server has nothing to clear: the client deletes its token. → 200.

### GET /api/users/me
→ `{ success, user }` (your own profile, including email).

### PUT /api/users/me
Body: `{ "name"?, "profileImage"? }`. Only these two fields can change (email and role are ignored). `profileImage` must be a `https://res.cloudinary.com/...` URL or `""`.

---

## Products

### GET /api/products (public)
Query: `search`, `category`, `condition`, `location` (exact match), `minPrice`, `maxPrice`, `sort` (`newest` default, `oldest`, `price_asc`, `price_desc`; with `search` and no `sort` results are ranked by relevance), `page`, `limit`.
Only `AVAILABLE` listings are returned.

Example: `GET /api/products?search=calculator&category=Electronics&minPrice=500&maxPrice=1500&sort=price_asc&page=1`

```json
{ "success": true,
  "items": [{ "_id": "...", "title": "Casio FX-991EX", "price": 900, "originalPrice": 1500, "age": 12, "condition": "Good",
              "category": "Electronics", "brand": "Casio", "location": "Hostel B", "status": "AVAILABLE",
              "images": ["https://res.cloudinary.com/..."], "sellerId": { "_id": "...", "name": "Asha Rao" }, "createdAt": "..." }],
  "pagination": { "page": 1, "limit": 12, "total": 1, "totalPages": 1 } }
```

### POST /api/products (logged in, multipart/form-data)
Fields: `title` (3–100), `description` (1–2000), `category`, `brand`? (≤50, default `Generic`), `originalPrice` (≥0), `price` (≥0, at most 3 × originalPrice), `age` (whole months, 0–240), `condition`, `location`, `images` (1–5 files).
`sellerId` comes from the token; `status` starts as `AVAILABLE`. → 201 `{ success, product }`.

### GET /api/products/mine (logged in)
Your listings in any status except `REMOVED`, newest first, paginated.

### GET /api/products/:id (public)
`SOLD` listings are still visible; `REMOVED` → 404. `sellerId` is `{ _id, name }`.

### PUT /api/products/:id (owner)
JSON body with any of the create fields except images. `sellerId`, `status` and `images` cannot be changed here. Not owner → 403, `SOLD` listing → 409.

### DELETE /api/products/:id (owner)
Soft delete: sets `status: REMOVED` (the document stays for transactions/reports).

### PUT /api/products/:id/sold (owner)
Marks a listing `SOLD` by hand (e.g. sold outside the app). Already sold → 409.

---

## Interests

### POST /api/products/:id/interest (logged in)
Body: `{ "message"?: "max 500 chars" }`.
- Own listing → 400. Listing not `AVAILABLE` → 409. Already sent for this product → 409.

Response 201:
```json
{ "success": true, "interest": { "_id": "...", "status": "PENDING", "message": "Is it available?",
  "productId": { "_id": "...", "title": "...", "price": 900, "status": "AVAILABLE", "images": ["..."] },
  "buyerId": { "_id": "...", "name": "Buyer" }, "sellerId": { "_id": "...", "name": "Seller" }, "createdAt": "..." } }
```

### GET /api/interests (logged in)
Query: `role` (`buyer` = interests you sent, `seller` = interests you received, omitted = both), `status`, `page`, `limit`.
Each item has the product (title, price, status, first image) and both people's names.

### PUT /api/interests/:id (logged in)
Body: `{ "status": "ACCEPTED" | "REJECTED" | "CANCELLED" }`
- Seller may `ACCEPTED` / `REJECTED`. Buyer may `CANCELLED`. Anyone else → 403.
- Allowed changes: `PENDING → ACCEPTED | REJECTED | CANCELLED`, `ACCEPTED → CANCELLED`. Anything else → 409.
- Accepting needs the product to still be `AVAILABLE` (409 otherwise).
- An interest with an active transaction can't be cancelled (cancel the transaction instead) → 409.

---

## Transactions (simulated payment)

### POST /api/transactions (buyer)
Body: `{ "interestId": "..." }`. The interest must be yours and `ACCEPTED`, and the product `AVAILABLE`.
- `amount` = the product's current price from the database.
- `commissionRate` = the current platform rate, **snapshotted** into the transaction (changing the rate later never changes this transaction).
- `commissionAmount = amount × commissionRate / 100`, `sellerAmount = amount − commissionAmount` (rounded to 2 decimals).
- A transaction already exists for this interest → 409 with `transactionId` so the client can open it. Another active transaction for the product → 409.

Response 201:
```json
{ "success": true, "transaction": { "_id": "...", "amount": 300, "commissionRate": 5, "commissionAmount": 15, "sellerAmount": 285,
  "paymentStatus": "PENDING", "transactionStatus": "PENDING", "productId": { "title": "...", ... },
  "buyerId": { "name": "..." }, "sellerId": { "name": "..." }, "createdAt": "..." } }
```

### POST /api/transactions/:id/pay (buyer)
Body: `{ "simulateFailure"?: true }` (testing only).
- The **backend** decides the result; the client can never mark a payment as successful.
- Success (all in one database transaction): `paymentStatus: SUCCESS`, `paymentRef: "SIM-..."`, `transactionStatus: COMPLETED`, product → `SOLD`, every other `PENDING` interest on the product → `REJECTED`. → 200 `{ success: true, message, transaction }`.
- `simulateFailure: true` → 402 `{ success: false, message, transaction }` with `paymentStatus: FAILED`; the transaction stays `PENDING`, so the buyer can pay again.
- Already completed or cancelled → 409. Not the buyer → 403.

### PUT /api/transactions/:id/cancel (buyer or seller)
Only `PENDING` transactions (409 otherwise). The buyer can start a new transaction from the same accepted interest afterwards.

### GET /api/transactions (logged in)
Query: `role` (`buyer` | `seller` | omitted = both), `status`, `page`, `limit`.

### GET /api/transactions/:id (buyer, seller or ADMIN)
Anyone else → 403.

---

## Reports

### POST /api/reports (logged in) — also `POST /api/products/:id/report`
Body: `{ "productId": "...", "reason": "Suspicious price", "details"?: "max 1000 chars" }` (with the product route, `productId` comes from the URL).
Own listing → 400, already reported by you → 409, unknown/removed product → 404. → 201 `{ success, report: { _id, productId, reason, details, status: "PENDING", createdAt } }`.

---

## Admin (every route needs an ADMIN token; students get 403)

### GET /api/admin/dashboard
```json
{ "success": true, "metrics": { "totalUsers": 51, "restrictedUsers": 0, "activeListings": 416, "soldListings": 40,
  "pendingReports": 3, "pendingFlags": 0, "totalTransactions": 84, "totalSalesVolume": 125000, "totalCommission": 6250,
  "completedTransactions": 40, "commissionRate": 5 } }
```
Sales and commission only count `COMPLETED` transactions.

### Analytics: `?range=&from=&to=`
| Path | Response |
|---|---|
| `/api/admin/analytics/summary` | `{ success, summary: { totalSales, totalCommission, sellerPayouts, completedTransactions, averageSale, range, from, to } }` |
| `/api/admin/analytics/sales-over-time` (+ `granularity=hour\|day\|month`) | `{ success, range, granularity, timezone, series: [{ period: "2026-11-28", sales, commission, transactions }] }` (zero-filled, ready for Recharts) |
| `/api/admin/analytics/transactions-by-status` | `{ success, items: [{ status: "PENDING", count, amount }, ...] }` (every status present) |
| `/api/admin/analytics/top-categories` (+ `limit` ≤ 20) | `{ success, items: [{ category, sales, transactions }] }` |

Unknown range, `custom` without `from`/`to`, or `from` after `to` → 400. Days follow `ANALYTICS_TZ` (default Asia/Kolkata).

### GET /api/admin/commission
`{ success, commissionRate: 5, isDefault: false, updatedAt, updatedBy: { name, email } }` (`isDefault: true` = never set, the default 5 % applies).

### PUT /api/admin/commission
Body: `{ "commissionRate": 6 }` (number 0–100). Applies to transactions created from now on only.

### GET /api/admin/transactions
Query: `range` (default `all`), `from`, `to`, `status`, `page`, `limit`. Includes product title/category and buyer/seller name + email. Use `status=COMPLETED` for the commission history (each item has `amount`, `commissionRate`, `commissionAmount`, `completedAt`).

### GET /api/admin/reports
Query: `status`, `page`, `limit`. Items include the product, reporter, seller and reviewing admin.

### PUT /api/admin/reports/:id
Body: `{ "status": "REVIEWED" | "RESOLVED" | "DISMISSED", "adminNote"?: "...", "removeListing"?: true }`
- Allowed: `PENDING → REVIEWED | RESOLVED | DISMISSED`, `REVIEWED → RESOLVED | DISMISSED` (else 409).
- Sets `reviewedBy` and `reviewedAt`. `removeListing: true` soft-deletes the listing. Response: `{ success, report, listingRemoved }`.

### GET /api/admin/users
Query: `search` (name or email), `role`, `page`, `limit`. Never includes password hashes.

### PUT /api/admin/users/:id/restrict
Body: `{ "isRestricted": true | false }`. A restricted user's existing token stops working (403) and they can't log in. Restricting yourself or another admin → 403.

### GET /api/admin/products
Query: `search` (title), `status` (any, including `SOLD` and `REMOVED`), `page`, `limit`. Includes seller name + email and `suspicionScore`.

### PUT /api/admin/products/:id/remove
Body: `{ "reason"?: "..." }` → soft delete (`REMOVED`). Already removed → 409.

---

## Purchase flow

```
Buyer                                   Seller                         Backend
POST /products/:id/interest  ───────▶                                  interest PENDING
                                        GET /interests?role=seller
                                        PUT /interests/:id ACCEPTED ─▶ interest ACCEPTED
POST /transactions { interestId } ─────────────────────────────────▶   transaction PENDING, rate snapshotted
POST /transactions/:id/pay  ───────────────────────────────────────▶   payment SUCCESS, transaction COMPLETED,
                                                                       product SOLD, other pending interests REJECTED
GET /transactions?role=buyer            GET /transactions?role=seller  (seller sees sellerAmount = amount − commission)
```

Either side can `PUT /transactions/:id/cancel` while it is `PENDING`.

---

## AI endpoints (Node → ML service)

The backend calls Roshni's FastAPI service at `AI_SERVICE_URL` (default `http://localhost:8000`), sending `x-ml-api-key: ML_API_KEY` when that variable is set (required when the ML service runs with `APP_ENV=production`). The browser never calls the ML service directly. Requests time out after 8 s. **Any ML failure gives `503 AI service unavailable` on the AI endpoints only**; listings, search, purchases and admin pages keep working.

The ML model was trained on its own product catalogue, so the backend maps marketplace categories before calling it: `Cycles` → `Cycles & Transport`, `Accessories` → `Electronics`, `Furniture` / `Appliances` / `Other` → `Daily Essentials` (`Books`, `Electronics`, `Stationery` unchanged). Predictions come from a model trained on **synthetic** data: treat them as suggestions.

### POST /api/ai/price-prediction (logged in)
Body: `{ "category", "brand"?, "originalPrice" (> 0), "age" (whole months 0–240), "condition", "location"? }`

```json
{ "success": true, "predictedPrice": 706.13, "fairPriceRange": { "min": 635.52, "max": 776.75 }, "currency": "INR",
  "modelVersion": "synthetic-v2-20261020T092258Z", "dataNote": "Baseline trained on synthetic data; ..." }
```
Every prediction is logged to `ai_predictions` (with `latencyMs`); when the item later sells, the real price is attached so the admin can see real-world accuracy.

### POST /api/ai/price-fairness (public)
Body: `{ "productId" }`. The price and features are read from the database (any `listedPrice` in the body is ignored).

```json
{ "success": true, "productId": "...", "label": "GOOD DEAL", "listedPrice": 600, "predictedPrice": 755.26,
  "deviationPercent": -20.56, "fairPriceRange": { "min": 679.73, "max": 830.78 }, "modelVersion": "..." }
```
`label`: `GOOD DEAL` (≥ 15 % below the estimate), `FAIR` (within ±15 %), `SLIGHTLY HIGH` (15–30 % above), `OVERPRICED` (> 30 % above). Removed listing → 404; price or original price ₹0 → 422.

### POST /api/ai/semantic-search (public)
Body: `{ "query" (2–500 chars), "category"?, "condition"?, "location"? (exact), "minPrice"?, "maxPrice"?, "limit"? (1–50, default 20) }`

1. **Candidates (up to 100 AVAILABLE listings):** vector search over `product_embeddings` (Atlas Vector Search, or in-memory cosine) when `HF_TOKEN` is set **and** embeddings exist; otherwise MongoDB `$text` keyword search with the same filters.
2. **Re-ranking:** the ML service's `/semantic-search` re-orders the candidates by meaning (needs `HF_TOKEN` in the ML service). If that fails, the retrieval order is kept.
3. Logged to `search_logs` (`mode: "semantic"`).

```json
{ "success": true, "engine": "keyword-fallback", "query": "engineering calculator for maths",
  "results": [{ "_id": "...", "title": "Casio FX-991EX Scientific Calculator", "price": 900, "images": ["https://res.cloudinary.com/..."],
                "sellerId": { "_id": "...", "name": "Asha Rao" }, "...": "same fields as GET /api/products items" }] }
```
`engine` names the path actually used: `atlas-vector-search`, `in-memory-cosine` or `keyword-fallback`, plus `+ml-rerank` when the ML service re-ranked.

### POST /api/ai/suspicion-score (ADMIN)
Body: `{ "productId" }`. Runs the fraud check now and returns `{ success, score, flagged, flagId, features }`, where `score` is the ML response: `suspicionScore` (0–100), `riskLevel` (`LOW`/`MEDIUM`/`HIGH`), `riskFactors` (`[{ feature, value, reason }]`), `decision` (`FLAG_FOR_REVIEW`/`NO_FLAG`), `modelVersion`.

**Automatic check:** after `POST /api/products` returns 201, the same check runs in the background (`setImmediate`), using the predicted fair price, seller account age, total listings, listings in the last 7 days, reports against the seller, completed sales and the seller's confirmed flags. If the ML service is down it is skipped with a warning. The score is stored on the product (`suspicionScore`, visible to admins only) and a PENDING flag is opened when the decision is `FLAG_FOR_REVIEW`. **The AI never removes listings or restricts users.**

### GET /api/admin/ai-flags (ADMIN)
Query: `adminDecision` (`PENDING` | `CONFIRMED` | `DISMISSED`), `page`, `limit`. Sorted riskiest first; includes the product (title, price, original price, category, status, first image) and the seller (name, email, account creation date).

### PUT /api/admin/ai-flags/:id/review (ADMIN)
Body: `{ "adminDecision": "CONFIRMED" | "DISMISSED", "adminNote"?, "removeListing"?: true }`. Only PENDING flags can be reviewed (409 otherwise). Sets `reviewedBy` / `reviewedAt`; `removeListing` soft-deletes the listing. Confirmed flags count against the seller in future checks. → `{ success, flag, listingRemoved }`.

### GET /api/admin/analytics/ai (ADMIN)
Query: `range`, `from`, `to` (same as the other analytics). → `{ success, ai: { priceIntelligence: { predictionsServed, averagePredictedPrice, byModelVersion, evaluatedOnSales, mae, rmse, r2 }, safety: { flagsRaised, flagsPending, flagsConfirmed, flagsDismissed, reportsFiled, ... }, search: { totalSearches, semanticSearches, keywordSearches, zeroResultSearches, topCategories, topQueries } } }`. `mae`/`rmse`/`r2` are measured against **real completed sales** and are `null` until there is enough data (never invented).

### GET /api/admin/model-metrics (ADMIN)
The price model's validation report from the ML service (`selectedEstimator`, `modelVersion`, `finalHoldoutMetrics: { maeInr, rmseInr, r2 }`, `candidateMetrics`, `caveat`, ...). 503 when the ML service is down.
