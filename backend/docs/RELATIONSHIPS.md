# Data Relationships & Handoff Notes (for Deepakshi)

```
User 1──* Product        (Product.sellerId)
User 1──* Interest       (as buyer: Interest.buyerId · as seller: Interest.sellerId)
Product 1──* Interest    (Interest.productId)        unique (productId, buyerId)
User 1──* Transaction    (buyerId, sellerId)
Product 1──1 Transaction (productId)                 unique while PENDING/COMPLETED
User 1──* Report         (Report.reportedBy)
Product 1──* Report      (Report.productId)          unique (productId, reportedBy)
User 1──* Settings       (Settings.updatedBy, admin only)
```

All refs are `ObjectId` with `ref: '<Model>'`, so use `.populate()`:
```js
Product.findById(id).populate('sellerId', 'name email profileImage');
Interest.find({ sellerId: req.user.id }).populate('productId', 'title price images').populate('buyerId', 'name email');
```

## Rules the API must keep
- **Passwords**: store a bcrypt hash in `passwordHash`. It is `select: false`, so login needs `User.findOne({ email }).select('+passwordHash')`. `toJSON` strips it anyway.
- **Email** is lowercased and unique. On duplicate, catch `err.code === 11000` and return 409.
- **sellerId on Interest/Transaction**: copy it from the product (`product.sellerId`), never from the request body.
- **Commission**: create transactions with `commissionRate: await Settings.get('commissionRate', 5)`. The model computes `commissionAmount` and `sellerAmount` in `pre('validate')`. Don't send those from the client.
- **Images**: only Cloudinary `https://res.cloudinary.com/...` URLs are accepted (schema validator). 1–5 per product.
- **Soft delete**: set `status: 'REMOVED'`; don't hard-delete products (transactions/reports reference them).
- Enums live in `models/constants.js`. Share them with the frontend/Zod schemas so values stay in sync.

## Upload flow (Week 3)
```js
import { uploadProductImages, handleUploadErrors } from '../middleware/upload.js';
import { uploadImages } from '../services/cloudinary.js';

router.post('/products', protect, uploadProductImages, handleUploadErrors, async (req, res) => {
  const images = await uploadImages(req.files);               // → ['https://res.cloudinary.com/...']
  const product = await Product.create({ ...req.body, images, sellerId: req.user.id });
  res.status(201).json({ success: true, product });
});
```
Frontend must send `multipart/form-data` with field name **`images`** (max 5 files, 5MB each, jpg/png/webp).
On delete or image replace, call `deleteImages(oldUrls)` to free Cloudinary storage.

## Query patterns that hit the indexes (Week 3)
| Use case | Query shape | Index |
|---|---|---|
| Marketplace feed | `{status:'AVAILABLE'}` sort `{createdAt:-1}` | `status_1_createdAt_-1` |
| Category + price | `{status, category, price:{$gte,$lte}}` | `status_1_category_1_price_1` |
| Condition + location | `{status, condition, location}` | `status_1_condition_1_location_1` |
| Keyword search | `{$text:{$search:q}, status}` sort by `textScore` | `product_text_search` (title×10, brand×5, desc×1) |
| My Listings | `{sellerId}` sort `{createdAt:-1}` | `sellerId_1_status_1_createdAt_-1` |

Always include `status` in marketplace queries so they use these indexes. Paginate with `.skip((page-1)*limit).limit(limit)` (limit ≤ 50). That's fine at this scale; switch to cursor (`createdAt < lastSeen`) pagination if listings go past ~10k.

---

# Weeks 4–7 additions

## Collections (10)
```
users ─┬─< products ─┬─< interests >── users (buyer)
       │             ├─< transactions >── users (buyer)   (one active per product)
       │             ├─< reports >── users (reporter, reviewedBy)   + sellerId copy
       │             ├─1 product_embeddings   (vector + status/category/condition/price copies)
       │             ├─< ai_predictions       (productId optional: price asked before listing)
       │             └─< ai_flags             (one PENDING flag per product)
settings (key/value)      search_logs (TTL 180 days)
```

## Week 4: interests & transactions
- **Status changes are enforced by the models** (save the document with `doc.save()`; `findByIdAndUpdate` skips the checks):
  - Interest: `PENDING → ACCEPTED | REJECTED | CANCELLED`, `ACCEPTED → CANCELLED`. `respondedAt` is set automatically.
  - Transaction: `PENDING → COMPLETED | CANCELLED`, `COMPLETED → REFUNDED`. COMPLETED needs `paymentStatus: 'SUCCESS'` first.
  - Report: `PENDING → REVIEWED | RESOLVED | DISMISSED`, `REVIEWED → RESOLVED | DISMISSED`. `reviewedAt` set automatically.
- **Create transactions like this** (snapshots the current rate; `amount`, `commissionRate`, `commissionAmount`, `sellerAmount` can never change afterwards):
```js
const tx = await Transaction.createWithCurrentRate({ productId, buyerId, sellerId: product.sellerId, amount: product.price, interestId });
// on payment success:
tx.paymentStatus = 'SUCCESS'; tx.paymentRef = gatewayPaymentId; tx.transactionStatus = 'COMPLETED'; await tx.save();
await AiPrediction.recordSale(productId, tx.amount); // feeds real-world MAE in AI analytics
```
- Admin changes the rate with `await Settings.set('commissionRate', 6, req.user._id)` (rejects values outside 0–100).

## Weeks 4–5: admin APIs → one call each
```js
import * as A from '../services/analytics.service.js';
// query: ?range=today|week|month|year|all|custom&from=YYYY-MM-DD&to=YYYY-MM-DD  (invalid input throws err.status = 400)
router.get('/admin/dashboard', protect, adminOnly, async (req, res) => res.json(await A.getDashboardMetrics()));
router.get('/admin/analytics/summary', ..., async (req, res) => res.json(await A.getSalesSummary(req.query)));
router.get('/admin/analytics/sales-over-time', ..., async (req, res) => res.json(await A.getSalesOverTime(req.query))); // Recharts-ready series, zero-filled
router.get('/admin/analytics/transactions-by-status', ..., async (req, res) => res.json(await A.getTransactionsByStatus(req.query)));
router.get('/admin/analytics/top-categories', ..., async (req, res) => res.json(await A.getTopCategories(req.query)));
router.get('/admin/analytics/ai', ..., async (req, res) => res.json(await A.getAiAnalytics(req.query)));
```
Revenue only counts `COMPLETED` transactions (blueprint rule). Days are IST (`ANALYTICS_TZ`).

## Week 5: log every price prediction
```js
const t = Date.now();
const ai = await callMl('/predict-price', features);
AiPrediction.log({ productId, sellerId: req.user._id, endpoint: 'predict-price', inputFeatures: features,
  predictedPrice: ai.predictedPrice, fairPriceRange: ai.fairPriceRange, modelVersion: ai.modelVersion, latencyMs: Date.now() - t }); // no await needed, never throws
```

## Week 6: fraud flags
```js
const score = await callMl('/suspicion-score', { listingId: String(product._id), listedPrice: product.price, predictedFairPrice, accountAgeInDays,
  totalListings, listingsLast7Days, previousReports: await Report.countForSeller(product.sellerId), completedSalesCount, rejectedListingsCount });
await AiFlag.recordScore(product._id, product.sellerId, score); // updates product.suspicionScore; opens/updates a flag only if decision = FLAG_FOR_REVIEW
// admin review: flag.adminDecision = 'CONFIRMED' | 'DISMISSED'; flag.reviewedBy = req.user._id; flag.adminNote = '...'; await flag.save();
```

## Week 6: semantic search
- Every `Product.create` / `product.save()` queues an embedding update **after** the save returns (no extra code needed in controllers). Text edits re-embed; status/price edits only update the copied filter fields.
- Search:
```js
import { semanticProductSearch, toMlCandidates } from '../services/vectorSearch.service.js';
const { engine, products } = await semanticProductSearch({ query: q, filters: { category, condition, minPrice, maxPrice }, limit: 20 });
SearchLog.log({ query: q, mode: 'semantic', category, resultCount: products.length, userId: req.user?._id });
// optional re-rank by Roshni's service: POST /semantic-search { query, products: toMlCandidates(products) }
```
- `engine` is `atlas-vector-search` when the index is READY, otherwise `in-memory-cosine` (same results, slower at large scale).
- Needs `HF_TOKEN` in `backend/.env` (same token as ml-service). Without it, saves still work; embeddings are just skipped until `npm run db:embeddings` is run with a token.
