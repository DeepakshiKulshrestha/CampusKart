# CampusKart — Database & Storage (Devansh) · Weeks 1–7

Lives in `backend/` alongside the Express app. ES modules (`import`/`export`), compatible with Mongoose 8 and 9.

## What's included

| Week | Task | File(s) |
|---|---|---|
| 1 | Atlas cluster setup steps | `docs/DB_SETUP.md` |
| 1 | Mongoose schemas: User, Product, Interest, Transaction, Report, Settings | `src/models/*` (import from `src/models/index.js`) |
| 1 | Seed script (realistic users + products + interests/txns/reports + commissionRate) | `src/scripts/seed.js` |
| 1 | Cloudinary config + env var docs (`npm run cloudinary:ping`) | `src/config/cloudinary.config.js`, `.env.example`, `docs/DB_SETUP.md` |
| 2 | User schema finalized: unique email, hidden `passwordHash` | `src/models/User.model.js` |
| 2 | Multer middleware (memory storage, 5×5MB, jpg/png/webp) | `src/middleware/upload.js` |
| 2 | Connection pooling, retries, graceful shutdown | `src/config/db.js` |
| 2 | Relationship docs for Deepakshi | `docs/RELATIONSHIPS.md` |
| 3 | Text index (title/description/brand) + compound filter indexes | `src/models/Product.model.js` |
| 3 | Load test at 200–500 products (latency + IXSCAN check) | `src/scripts/loadTest.js` |
| 3 | Multer → Cloudinary upload service, URL-only validation, audit script | `src/services/cloudinary.js`, `src/scripts/verifyImages.js` |
| 4 | Interest + Transaction finalized: commission snapshot is **immutable**, allowed status changes enforced | `src/models/Interest.model.js`, `Transaction.model.js`, `transitions.js` |
| 4 | Settings defaults (`commissionRate`) + safe change script | `src/models/Settings.model.js`, `npm run db:settings` |
| 4 | Aggregations: total sales, total commission, transactions by status | `src/services/analytics.service.js` |
| 5 | Report finalized (Product ↔ reporter ↔ seller ↔ reviewing admin) | `src/models/Report.model.js` |
| 5 | Dashboard + sales/commission over time (today / week / month / year / custom, IST) | `src/services/analytics.service.js`, `npm run db:analytics` |
| 5 | `ai_predictions` collection (log every price prediction) | `src/models/AiPrediction.model.js` |
| 6 | Vector storage: `product_embeddings` + Atlas Vector Search index + sync | `src/models/ProductEmbedding.model.js`, `src/services/embedding.service.js`, `vectorSearch.service.js` |
| 6 | `ai_flags` collection (listing, score, risk factors, model decision, admin decision) | `src/models/AiFlag.model.js` |
| 6 | Embedding pipeline is non-blocking (proved with a simulated slow API) | `src/scripts/embeddingNonBlockingTest.js` |
| 7 | Production cluster + connection security checklist and checker | `docs/PRODUCTION.md`, `npm run db:prod-check` |
| 7 | Backup strategy + backup / restore scripts | `docs/PRODUCTION.md`, `npm run db:backup`, `npm run db:restore` |
| 7 | Index review across all collections | `npm run db:index-review` |
| 7 | `docker-compose.yml` (frontend + backend + ml-service, optional local Mongo) | `../docker-compose.yml`, `Dockerfile`, `../frontend/Dockerfile.dev` |
| 7 | `search_logs` (search analytics) + AI analytics aggregation | `src/models/SearchLog.model.js`, `getAiAnalytics()` |

## Run it
```bash
npm install
cp .env.example .env        # fill MONGODB_URI + CLOUDINARY_*
npm run db:ping             # verify Atlas connection
npm run db:seed               # Week 1: 20 users, 60 products
npm run db:indexes          # create + list all indexes
npm run db:seed:large         # Week 3: 500 products
npm run db:loadtest         # every query should show "✓ index"
npm run db:verify-images    # confirms only Cloudinary URLs in Mongo
```
### Weeks 4–7
```bash
npm run db:seed:large       # re-seed: now also ai_predictions, ai_flags, search_logs; sales spread over 90 days
npm run db:settings         # Week 4: settings defaults (add -- --commission=6 to change the rate)
npm run db:embeddings       # Week 6: embed all products (needs HF_TOKEN in .env)
npm run db:vector-index     # Week 6: create the Atlas Vector Search index (run again until status=READY)
npm run db:verify           # ONE command: checks all Weeks 4–7 work (temporary data only, cleaned up)
npm run db:analytics        # print every admin aggregation (add -- --range=week | today | year | custom --from=YYYY-MM-DD --to=YYYY-MM-DD)
npm run db:embeddings:test  # Week 6: proves writes don't wait for the embedding API
npm run db:index-review     # Week 7
npm run db:prod-check       # Week 7 (set NODE_ENV=production to apply production rules)
npm run db:backup           # Week 7 → backups/<timestamp>/ (add -- --keep=7 to prune)
```

Demo login after seeding: `admin@campuskart.edu` / `Password@123` (every seeded user has the same password).

> Seed passwords are hashed with `bcrypt` (already a backend dependency), so login works with `bcrypt.compare`.
