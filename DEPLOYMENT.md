# Deploying CampusKart

Target setup: **backend on Render**, **frontend on Vercel**, **database on MongoDB Atlas**, **images on Cloudinary**, and later the **ML service on Render**.

The backend and frontend can go live **before the ML service is ready**: the marketplace does not depend on it. Do steps 1–6 now and step 7 when Roshni's models are ready.

Secrets go into the Render and Vercel dashboards only, never into Git.

---

## 0. Before you start

1. **Rotate the development credentials.** The Atlas password and Cloudinary secret were shared in chat during development. Follow §2 of [backend/docs/PRODUCTION.md](backend/docs/PRODUCTION.md): create a dedicated Atlas user (`readWrite` on the `campuskart` database only) with a new 20+ character password, and generate new Cloudinary API keys.
2. Decide which database production uses. PRODUCTION.md recommends a separate cluster or project (`campuskart-prod`) so test scripts never touch real data.
3. Generate secrets on your computer (keep them in a password manager):
   ```bash
   openssl rand -hex 32   # JWT_SECRET
   openssl rand -hex 32   # ML_API_KEY (later, shared by backend and ML service)
   ```
4. Merge `complete-project` into `main` (via a pull request) so Render and Vercel deploy the finished code.

## 1. Atlas network access

Atlas → *Network Access*:
- Render's free plan has no fixed outbound IPs, so to start you have to allow `0.0.0.0/0` (any IP). Your strong, rotated password then protects the database.
- On a paid Render plan, add the service's outbound IPs instead (Render → service → *Connect* → *Outbound*) and remove `0.0.0.0/0`.

## 2. Backend on Render

**Until the ML service is ready (recommended now): create the backend on its own.**

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
   | `AI_SERVICE_URL`, `ML_API_KEY`, `HF_TOKEN` | leave empty until step 7 |
4. Deploy, then open `https://campuskart-backend.onrender.com/api/health` → `{"status":"ok",...}`.
5. Indexes: production has `autoIndex` off. Run `npm run db:indexes` once from your computer with `MONGODB_URI` pointing at the **production** database (and never run seed/restore/delete scripts against the shared development database).

**Later, with the Blueprint:** `render.yaml` describes both `campuskart-ml` and `campuskart-backend`. Render → **New** → **Blueprint** → pick the repo, and Render creates both services, asking you for every `sync: false` value. If you already created the backend by hand, delete that service first, or keep it and only create the ML service by hand. The Blueprint uses the same names and settings as above.

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

## 7. ML service (when Roshni's models are ready)

1. Package and upload the model artifacts as described in [ml-service/README.md](ml-service/README.md) and [ml-service/docs/TRAINING_RUNBOOK.md](ml-service/docs/TRAINING_RUNBOOK.md) (`MODEL_ARTIFACT_BUNDLE_URL` / `MODEL_ARTIFACT_BUNDLE_TOKEN`).
2. Create `campuskart-ml` from `render.yaml` (Blueprint), or by hand with root `ml-service`, Docker, health check `/health`, a 5 GB disk at `/var/data`, and the env vars listed in `render.yaml`. The ML service needs a paid plan for the disk.
3. Use **one** `ML_API_KEY` value on both services. Set `HF_TOKEN` (Hugging Face token with Inference Providers permission) on both.
4. On the backend set `AI_SERVICE_URL=https://campuskart-ml.onrender.com`, `ML_API_KEY`, `HF_TOKEN`.
5. Check `https://campuskart-ml.onrender.com/health`, then the AI features in the app once the backend AI endpoints are added.
