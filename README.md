# CampusKart

A college-only, second-hand marketplace. Students list things they no longer need (books, electronics, furniture, cycles…), other students on the same campus express interest, the seller accepts, and the buyer pays through CampusKart. The platform keeps a small commission on every completed sale, and admins moderate listings, users and reports from a dashboard.

> **Real college marketplace first, meaningful AI on top.** Three AI features run in `ml-service/` and are reached through the backend: price suggestions with a fair-price badge, smart (semantic) search, and suspicious-listing detection for admin review. The marketplace works fully even when the ML service is down; the AI parts just switch off quietly.

## Architecture

```
Browser ──▶ React + Vite + Tailwind (frontend/, port 5173)
              │  Axios, Bearer token
              ▼
           Node.js + Express (backend/, port 5000; 5001 on macOS)
              │            │                │
              ▼            ▼                ▼
        MongoDB Atlas   Cloudinary    FastAPI ML service (ml-service/, port 8000)
        (all data)      (images)      AI inference only: no auth, no database writes
```

- The browser only ever talks to the Node backend. Node calls the ML service when it needs an AI result.
- Payments are **simulated**: the backend decides whether a payment succeeds; the browser can never mark a payment as paid.
- Commission is snapshotted into each transaction when it is created, and only counts once the transaction is COMPLETED.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router, Axios, Recharts |
| Backend | Node.js 22, Express 5, Mongoose (MongoDB Atlas), JWT, bcrypt, Zod, Multer + Cloudinary, Helmet, express-rate-limit |
| ML service | Python 3.11+ (3.13/3.14 tested), FastAPI, scikit-learn, XGBoost, Isolation Forest, Sentence Transformers via Hugging Face |
| Deployment | Vercel (frontend), Render (backend + ML service), Docker |

## Team

| Member | Area |
|---|---|
| Vinayak | Frontend (UI, pages, components) |
| Deepakshi | Backend (APIs, auth, transactions, admin) |
| Devansh | Database & storage (schemas, indexes, analytics, backups, Cloudinary) |
| Roshni | AI/ML (price model, semantic search, fraud detection) |

## Run it locally

You need Node.js 22+, a MongoDB connection string and Cloudinary keys. Ask the team lead for the development values, and never commit `.env` files.

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, CLOUDINARY_* (and PORT=5001 on macOS)
npm install
npm run dev               # → "Server running on http://localhost:5001" and "[db] connected"
```
Check: `curl http://localhost:5001/api/health`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:5001/api (use :5000 if your backend runs there)
npm install
npm run dev               # → http://localhost:5173
```
The dev server must run on `http://localhost:5173`: that is the only browser origin the backend allows by default (`FRONTEND_URL`). If you open the app from another address, add it to `FRONTEND_URL` in `backend/.env` (comma-separated).

### 3. ML service (for the AI features)

The trained models are not in Git. Get Roshni's model bundle zip, unpack it into `ml-service/model_artifacts/`, create a Python venv and start the service on port 8000. Exact macOS steps (including the XGBoost `libomp` fix): [ml-service/docs/LOCAL_SETUP_MAC.md](ml-service/docs/LOCAL_SETUP_MAC.md). Background and retraining: [ml-service/README.md](ml-service/README.md), [ml-service/docs/TRAINING_RUNBOOK.md](ml-service/docs/TRAINING_RUNBOOK.md).

```bash
cd ml-service
python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt "scikit-learn==1.9.1" "numpy==2.5.4"
.venv/bin/python -m uvicorn main:app --port 8000      # see LOCAL_SETUP_MAC.md if XGBoost can't find libomp
```
With `AI_SERVICE_URL=http://localhost:8000` in `backend/.env`, the backend uses it automatically. Smart search re-ranking also needs `HF_TOKEN` (see the env table below); without it, smart search falls back to keyword retrieval.

### Docker (optional)

```bash
cp ml-service/.env.example ml-service/.env   # compose reads this file even if you skip the ML service
docker compose up --build backend frontend   # backend on :5001, frontend on :5173
docker compose up --build                    # everything, once ml-service/model_artifacts/ has the models
```

## Environment files

| File | Variables | Template |
|---|---|---|
| `backend/.env` | `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`, `PORT`, `NODE_ENV`, `FRONTEND_URL`, `AI_SERVICE_URL`, `ML_API_KEY`, `HF_TOKEN`, `ANALYTICS_TZ` (+ optional ones) | [backend/.env.example](backend/.env.example) |
| `frontend/.env` | `VITE_API_URL` | [frontend/.env.example](frontend/.env.example) |
| `ml-service/.env` | `PORT`, `APP_ENV`, `ML_API_KEY`, `HF_TOKEN`, model paths | [ml-service/.env.example](ml-service/.env.example) |

## Test accounts

- Anyone can register a STUDENT account from the Register page. Admin accounts can't be created through the API.
- The seed script (`npm run db:seed`) creates demo users, including `admin@campuskart.edu`; see [backend/DATABASE.md](backend/DATABASE.md). **The development database is shared by the whole team: do not run the seed, restore or any delete script against it.** Use a separate database (e.g. a local MongoDB) if you need fresh demo data.
- When testing against the shared database, only create data with "TEST" in the title and fake emails like `ck.test.buyer@campuskart.edu`.

## Main features

- **Students:** register/login, profile, create listings with up to 5 photos, browse with keyword search, filters (category, price, condition, location), sorting and pagination, express interest, accept/reject requests as a seller, simulated payment with a commission breakdown, transaction history, report listings, save items (stored on the device).
- **Admins:** dashboard metrics and charts (sales, commission, transactions by status, top categories, any date range), report moderation, user restriction, listing removal, commission rate settings with history.
- **AI (via the ML service):** price suggestion while listing, GOOD DEAL / FAIR / SLIGHTLY HIGH / OVERPRICED badge on listings, smart search by meaning, automatic suspicious-listing scoring with an admin review queue (the AI only suggests; admins decide), AI analytics and model metrics for admins.

## Documentation

| Document | What's inside |
|---|---|
| [backend/API_REFERENCE.md](backend/API_REFERENCE.md) | Every endpoint, inputs, enum values, responses, error codes, purchase flow |
| [backend/DATABASE.md](backend/DATABASE.md) | Database scripts and what each week added |
| [backend/docs/RELATIONSHIPS.md](backend/docs/RELATIONSHIPS.md) | Collections, references and rules the API must follow |
| [backend/docs/PRODUCTION.md](backend/docs/PRODUCTION.md) | Production database, credential rotation, backups, indexes |
| [ml-service/README.md](ml-service/README.md) | ML service: dataset, training and running it |
| [ml-service/docs/LOCAL_SETUP_MAC.md](ml-service/docs/LOCAL_SETUP_MAC.md) | Running the ML service on a Mac with the trained model bundle |
| [ml-service/docs/API_AND_MODEL_REFERENCE.md](ml-service/docs/API_AND_MODEL_REFERENCE.md) | ML endpoints and models |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Step-by-step deployment to Render and Vercel |
