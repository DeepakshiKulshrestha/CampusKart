# Production Database, Security & Backups (Week 7)

## 1. Production cluster
| | Development (now) | Production (final demo / deploy) |
|---|---|---|
| Tier | M0 Free | **M10** (dedicated, cloud backups, no throttling). M0 is acceptable for a college demo if cost is an issue: then the manual backups in §3 are **required**. |
| Region | AWS Mumbai `ap-south-1` | Same region as the Render/Railway backend, to keep queries fast |
| Project | `Project 0` | A separate Atlas project (or at least a separate cluster) named `campuskart-prod`, so test scripts never touch real data |

Steps: Atlas → **Create** → M10 → region → name `campuskart-prod` → create. Then run the seed **only** if you want demo data (`npm run db:seed:large`), and run `npm run db:indexes` and `npm run db:vector-index` once.

## 2. Connection string security
1. **Separate database user for the app**: Database Access → Add user `campuskart_app` → *Built-in role* → **Read and write to any database** is too broad; choose *Specific privileges* → `readWrite` on database `campuskart`. Use a **20+ character random password** (Atlas "Autogenerate").
2. **Rotate the development credentials**: the old Atlas password and Cloudinary secret were shared in chat during development. Delete/replace them: Atlas → Database Users → Edit → new password; Cloudinary → API Keys → Generate new → deactivate the old one.
3. **Network access**: remove `0.0.0.0/0` before going live. Add the backend host's outbound IPs (Render: service → *Connect* → *Outbound*; Railway: enable static IP) and your own IP for maintenance.
4. **Secrets live only in the host's environment settings** (Render/Railway dashboard), never in Git. `.env` is in `.gitignore`; `backups/` is too.
5. Set `NODE_ENV=production` on the host: Mongoose `autoIndex` turns off (indexes are created deliberately with `npm run db:indexes`, not on every boot).
6. Check everything: `NODE_ENV=production npm run db:prod-check` (on Windows cmd: `set NODE_ENV=production&& npm run db:prod-check`). It verifies TLS (`mongodb+srv`), DB name, password length, least-privilege role, JWT secret, Cloudinary keys, `.env` in `.gitignore`, server version and replica set.

## 3. Backup strategy
| Layer | What | When | Keeps |
|---|---|---|---|
| Atlas Cloud Backup (M10+) | Automatic snapshots + point-in-time restore | Continuous | Atlas default policy (daily, weekly and monthly snapshots; adjust under Backup → Backup Policy) |
| `npm run db:backup -- --keep=7` | Full logical export (every collection, Extended JSON) | Daily during the final weeks + **before every seed, migration or demo** | Newest 7 folders |
| Off-site copy | Zip the newest `backups/<timestamp>` folder to a private Google Drive folder owned by the team lead | Weekly | 4 weeks |

- Backups contain emails and password hashes: **private storage only**, never Git or public links.
- **Restore drill (do it once before the final demo):** restore into a *separate* database, e.g. set `MONGODB_URI=.../campuskart_restore_test`, run `npm run db:restore -- --dir=backups/<timestamp>`, then `npm run db:indexes` and `npm run db:verify`. Delete the test database afterwards.
- Restore over live data only with `--drop --yes`, after taking a fresh backup.
- Embeddings can always be rebuilt (`npm run db:embeddings`), so `product_embeddings` is the least critical collection.

## 4. Index review (results)
Run `npm run db:index-review`. Every collection's indexes are listed with usage counts; redundant-prefix and schema-vs-database differences are flagged.

| Collection | Indexes (besides `_id`) | Serves |
|---|---|---|
| users | `email` (unique), `role+createdAt` | login, admin user list |
| products | text(title×10, brand×5, description), `status+createdAt`, `status+category+price`, `status+condition+location`, `sellerId+status+createdAt` | feed, search, filters, My Listings |
| interests | `productId+buyerId` (unique), `sellerId+status+createdAt`, `buyerId+createdAt`, `productId+status` | inboxes, one interest per buyer |
| transactions | `productId` (unique while PENDING/COMPLETED), `transactionStatus+completedAt`, `createdAt+transactionStatus`, `buyerId+createdAt`, `sellerId+createdAt`, `paymentRef` (unique, partial) | revenue analytics, history, payment webhooks |
| reports | `productId+reportedBy` (unique), `status+createdAt`, `sellerId+status` | moderation queue, fraud signal |
| settings | `key` (unique) | config lookups |
| ai_predictions | `createdAt`, `productId+createdAt`, `modelVersion+createdAt` | AI analytics |
| ai_flags | `productId` (unique while PENDING), `adminDecision+suspicionScore`, `productId+createdAt`, `createdAt` | review queue, safety analytics |
| product_embeddings | `productId` (unique), `status` + **Atlas Vector Search** `product_embedding_vector` (384-dim cosine, filters status/category/condition/price) | semantic search |
| search_logs | `createdAt` (TTL 180 days), `mode+createdAt` | search analytics |

Atlas M0 allows at most 3 search indexes; this project uses 1.

## 5. Local reproducibility (docker-compose)
From the repository root:
```bash
cp backend/.env.example backend/.env        # fill in
cp ml-service/.env.example ml-service/.env  # fill in HF_TOKEN
# train models once (ml-service/docs/TRAINING_RUNBOOK.md) so ml-service/model_artifacts/ exists
docker compose up --build                   # http://localhost:5173  ·  API :5000  ·  ML :8000/docs
docker compose --profile local-db up --build   # + local MongoDB (set MONGODB_URI=mongodb://mongo:27017/campuskart)
```
Inside Docker the backend reaches the ML service at `http://ml-service:8000` (set automatically); the browser reaches the backend at `http://localhost:5000/api`.
