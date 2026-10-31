# Setup: MongoDB Atlas + Cloudinary

## MongoDB Atlas (Week 1)
1. cloud.mongodb.com → **Create** → **M0 Free** cluster, region nearest to campus (e.g. AWS Mumbai `ap-south-1`).
2. **Database Access** → Add user `campuskart_app`, password auth, role **Read and write to any database**. One user per environment; don't share the admin login.
3. **Network Access** → add each teammate's IP (dev). `0.0.0.0/0` is allowed **only** temporarily for deployment hosts with dynamic IPs; remove it for production.
4. **Connect → Drivers** → copy the URI, insert the DB name `campuskart` before `?`, and put it in `.env` as `MONGODB_URI`.
5. `npm run db:ping` → should print `ping: { ok: 1 }`.

## Cloudinary (Week 1)
1. cloudinary.com → sign up (free). Dashboard → **API Keys**.
2. Copy into `.env`:

| Variable | Where to find it | Used by |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | Dashboard → Cloud name | `config/cloudinary.config.js` |
| `CLOUDINARY_API_KEY` | API Keys page | same |
| `CLOUDINARY_API_SECRET` | API Keys page (keep secret, backend only) | same |
| `CLOUDINARY_FOLDER` | optional, default `campuskart` | `services/cloudinary.js` |

Never expose the API secret to the frontend; all uploads go through the backend.

## Env vars owned by DB/Storage
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `DB_MAX_POOL` / `DB_MIN_POOL` | Mongoose pool size (default 10 / 2) |
| `CLOUDINARY_*` | see above |
