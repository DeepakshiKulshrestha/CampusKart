# CampusKart — Database & Storage (Devansh) · Weeks 1–3

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
Demo login after seeding: `admin@campuskart.edu` / `Password@123` (every seeded user has the same password).

> Seed passwords are hashed with `bcrypt` (already a backend dependency), so login works with `bcrypt.compare`.
