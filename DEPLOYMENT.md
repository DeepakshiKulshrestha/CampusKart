# Deploying CampusKart

Target setup: **backend on Render**, **frontend on Vercel**, **database on MongoDB Atlas**, **images on Cloudinary**, and the **ML service on Render**.

The backend and frontend don't depend on the ML service: if it is down, only the AI features switch off (the backend's AI endpoints answer 503). The ML service is self-contained: the trained models are in Git and its Docker image also bakes in the free search model, so it needs no disk, no model download and no `HF_TOKEN`.

Secrets go into the Render and Vercel dashboards only, never into Git.

---

## 0. Before you start

1. **Rotate the development credentials.** The Atlas password and Cloudinary secret were shared in chat during development. Follow §2 of [backend/docs/PRODUCTION.md](backend/docs/PRODUCTION.md): create a dedicated Atlas user (`readWrite` on the `campuskart` database only) with a new 20+ character password, and generate new Cloudinary API keys.
2. Decide which database production uses. PRODUCTION.md recommends a separate cluster or project (`campuskart-prod`) so test scripts never touch real data.
3. Generate secrets on your computer (keep them in a password manager):
   ```bash
   openssl rand -hex 32   # JWT_SECRET
   openssl rand -hex 32   # ML_API_KEY (shared by the backend and the ML service)
   ```
4. Merge `complete-project` into `main` (via a pull request) so Render and Vercel deploy the finished code.

## 1. Atlas network access

Atlas → *Network Access*:
- Render's free plan has no fixed outbound IPs, so to start you have to allow `0.0.0.0/0` (any IP). Your strong, rotated password then protects the database.
- On a paid Render plan, add the service's outbound IPs instead (Render → service → *Connect* → *Outbound*) and remove `0.0.0.0/0`.

## 2. Backend on Render

**Option A: create the backend on its own** (simplest; add the ML service later in step 7).

1. Render → **New** → **Web Service** → connect the GitHub repo.
2. Settings:
   | Field | Value |
   |---|---|
   | Name | `campuskart-backend` |
   | Branch | `main` |
   | Root directory | `backend` |
   | Runtime / Language | **Docker** (uses `backend/Dockerfile`) |
   | Instance type | Free to try it; **Starter** for the final demo (free instances sleep after ~15 min, so the first request takes ~1 min) |
   | Health check path | `/api/health` |
3. Environment variables:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` (this also turns on `trust proxy` so the rate limiter sees real client IPs) |
   | `PORT` | `10000` |
   | `MONGODB_URI` | your production connection string (`mongodb+srv://campuskart_app:...@.../campuskart?retryWrites=true&w=majority`) |
   | `JWT_SECRET` | the random value from step 0 |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary (new keys) |
   | `CLOUDINARY_FOLDER` | `campuskart` |
   | `ANALYTICS_TZ` | `Asia/Kolkata` |
   | `FRONTEND_URL` | leave for now; set it in step 4 |
   | `AI_SERVICE_URL`, `ML_API_KEY` | set in step 7 (until then the AI features answer 503 and hide themselves) |
   | `HF_TOKEN` | optional, leave empty: only needed if Devansh's Atlas vector-search embeddings are enabled (step 7.6) |
4. Deploy, then open `https://campuskart-backend.onrender.com/api/health` → `{"status":"ok",...}`.
5. Indexes: production has `autoIndex` off. Run `npm run db:indexes` once from your computer with `MONGODB_URI` pointing at the **production** database (and never run seed/restore/delete scripts against the shared development database).

**Option B: Blueprint (backend + ML service together, recommended):** `render.yaml` describes both `campuskart-ml` and `campuskart-backend`. Render → **New** → **Blueprint** → pick the repo, and Render creates both services, asking you for every `sync: false` value (for the ML service only `ML_API_KEY`). If you already created the backend by hand, delete that service first, or keep it and only create the ML service by hand. The Blueprint uses the same names and settings as above.

## 3. Frontend on Vercel

1. Vercel → **Add New** → **Project** → import the GitHub repo.
2. Settings:
   | Field | Value |
   |---|---|
   | Root Directory | `frontend` |
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Output directory | `dist` |
   | Environment variable | `VITE_API_URL` = `https://campuskart-backend.onrender.com/api` |
3. Deploy. `frontend/vercel.json` sends every route to `index.html`, so refreshing `/marketplace` or `/product/<id>` works.
4. `VITE_API_URL` is baked in at build time: after changing it, redeploy.

## 4. Connect the two (CORS)

Render → `campuskart-backend` → Environment → set `FRONTEND_URL` to your Vercel URL, for example `https://campuskart.vercel.app` (no trailing slash; several URLs can be comma-separated, e.g. your custom domain too). Save, and Render redeploys.

Only these origins get CORS headers; any other website calling the API from a browser is blocked.

## 5. Post-deploy checks

| Check | How | Expected |
|---|---|---|
| Health | open `https://<backend>/api/health` | `{"status":"ok"}` |
| CORS | open the Vercel site, open DevTools → Network | API calls succeed, no CORS errors |
| Register / login | create a test student account | redirected to the dashboard |
| Create listing | add a listing with a photo | photo URL starts with `https://res.cloudinary.com/` |
| Marketplace | search and filter | the new listing appears |
| Purchase flow | second account: interest → seller accepts → pay | product shows SOLD, both accounts see the transaction |
| Admin | log in as an admin | dashboard numbers include the sale |
| Refresh | reload `/marketplace` on Vercel | page loads (no 404) |
| Security | `curl https://<backend>/api/admin/dashboard` | 401 |

Create the first production admin directly in the database (registration can't create admins): set `role: "ADMIN"` on your own user in Atlas → Browse Collections → `users`.

## 6. After going live

- Keep `NODE_ENV=production` (rate limiting per real IP, no automatic index builds).
- Backups: see §3 of [backend/docs/PRODUCTION.md](backend/docs/PRODUCTION.md) (Atlas snapshots on M10+, or `npm run db:backup` regularly).
- Check `npm audit` in `backend/` and `frontend/` and update dependencies before the final demo.

## 7. ML service (AI features)

1. Nothing to upload: the models (`ml-service/model_artifacts/*/current/`, version `marketplace-v3-r2`) are in Git and copied into the Docker image, and the Dockerfile downloads the free `all-MiniLM-L6-v2` search model at build time.
2. Create `campuskart-ml` from `render.yaml` (Blueprint), or by hand:
   | Field | Value |
   |---|---|
   | Root directory / Docker context | `ml-service` (Dockerfile `ml-service/Dockerfile`) |
   | Runtime | Docker |
   | Instance type | **Starter** (512 MB, see the warning below) or bigger |
   | Health check path | `/health` |
   | Environment | `APP_ENV=production`, `PORT=10000`, `ML_API_KEY=<the value from step 0>` |
   | Disk | none (the old 5 GB disk, `MODEL_ARTIFACT_BUNDLE_URL`/`_TOKEN`, `MODEL_STORAGE_ROOT`, `PRICE_MODEL_PATH`, `FRAUD_MODEL_PATH` and `HF_TOKEN` are no longer used; delete them if an older setup has them) |
3. Use **one** `ML_API_KEY` value on both services. In production mode the ML service rejects every call except `/health` without it.
4. On the backend set `AI_SERVICE_URL=https://campuskart-ml.onrender.com` and `ML_API_KEY` (same value).

> **512 MB memory warning.** Render's Free and Starter instances have 512 MB of RAM. The ML service needs roughly 320 MB once XGBoost, the fraud model and the ONNX search model are loaded, plus spikes while a search embeds up to 100 listings, so it runs close to the limit. Keep a single uvicorn worker (the Dockerfile's default), and watch the Render logs and Metrics after deploying: if you see *"Ran out of memory (used over 512MB)"* or unexplained restarts, move the ML service to the **Standard** plan (2 GB). The Free plan also sleeps after 15 minutes idle, so the first AI call after a pause can take about a minute; the backend's 8-second timeout then answers 503 for that request.
5. Check `https://campuskart-ml.onrender.com/health`, then in the app: Create Listing → "Suggest a price"; a product page shows the fair-price badge; Marketplace → "Smart search (AI)"; Admin → AI Flags / AI Analytics. With `APP_ENV=production` the ML service rejects calls without the right `x-ml-api-key`, so a wrong `ML_API_KEY` shows up as 503 on the AI endpoints.
6. **Optional, catalogue-wide vector search:** smart search already works without it: the backend sends keyword hits plus the newest matching listings, and the ML service ranks them by meaning (`engine: keyword+recent-candidates+ml-rerank`). Vector retrieval over *all* listings only helps once the catalogue is large (thousands of listings, where a relevant item may be neither a keyword match nor recent). It needs `HF_TOKEN` (paid Hugging Face Inference credits) in the backend and a one-time `npm run db:embeddings` + `npm run db:vector-index` against the production database (Devansh owns these scripts).
