# NWRMA deployment (Render + field Android)

Deploy the **Express API** and **Next.js web** to Render, point field phones at the public API URL, rebuild the APK, and verify sync on any network.

## Architecture

| Service | Render name | Purpose |
|---------|-------------|---------|
| Express API | `nwrma-api` | Android login, `/health`, `/sync/offline-data` |
| Next.js ERP | `nwrma-web` | Staff dashboard, online forms, finance desk |
| Database | Supabase Postgres | Shared by both services (`DATABASE_URL`) |
| Uploads disk | on `nwrma-web` only | `web/data/*` (forms, receipts, documents) |

Field phones **never** call the Next.js app directly for sync—they use `NWRMA_API_URL` (HTTPS).

---

## 1. Deploy on Render

1. Push this repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → connect the repo (`render.yaml` at root).

   **If you already have a manual service (e.g. `NWRMA-1`)** instead of Blueprint services, open **Settings** and set:

   | Field | Web (ERP) | API (phones) |
   |-------|-----------|--------------|
   | Build Command | `node scripts/render-build-web.mjs` | `node scripts/render-build-api.mjs` |
   | Start Command | `npm run start:web` | `npm run start:api` |
   | Environment | `SKIP_INSTALL_DEPS=true`, `NODE_VERSION=20` | same |

   Do **not** leave Build Command as `yarn` — that causes Corepack / `packageManager` errors.

3. When prompted, set **sync: false** variables (use values from your local `env/nwrma.env` where noted):

### `nwrma-api`

| Variable | Example / notes |
|----------|-----------------|
| `DATABASE_URL` | Supabase connection string (same as local) |
| `JWT_SECRET` | Long random string — **set once**; changing it invalidates mobile JWTs |
| `FRONTEND_ORIGINS` | `https://nwrma-web.onrender.com` (your real web URL) |
| `SEED_MOBILE_OFFICER_PHONE` | e.g. `+232770000001` (optional, for docs only) |
| `SEED_MOBILE_OFFICER_PASSWORD` | e.g. `demo123` (optional) |

### `nwrma-web`

| Variable | Example / notes |
|----------|-----------------|
| `DATABASE_URL` | Same as API |
| `JWT_SECRET` | Can match API or use web session secret from local env |
| `PUBLIC_APP_URL` | `https://nwrma-web.onrender.com` |
| `NWRMA_SERVER_URL` | `https://nwrma-api.onrender.com` |
| `NEXT_PUBLIC_NWRMA_SERVER_URL` | Same as `NWRMA_SERVER_URL` |
| `INVITE_SECRET`, `SMTP_*` | Copy from `env/nwrma.env` if you use invite email |

4. Wait for both services to deploy. Note the public URLs (no trailing slash).

### One-time database seed (production)

From your PC (with prod `DATABASE_URL`):

```bash
npm run db:seed
```

Or set `DATABASE_URL` in the shell for one command. This upserts the dashboard admin and **field officer** (`SEED_MOBILE_OFFICER_*`).

### Pre-warm before demos (free tier)

Free services sleep when idle. Open `https://<api-host>/health` and `https://<web-host>/login` ~1 minute before presenting.

---

## 2. Configure local env and rebuild Android

After the API is live:

```bash
node scripts/set-public-api-url.mjs https://nwrma-api.onrender.com
npm run sync:env
npm run mobile:release
```

Install `mobile/HydroGauge-SL-release.apk` on each phone. **Uninstall** older APKs that still point at `192.168.x.x`.

Optional: set `PUBLIC_APP_URL` and `FRONTEND_ORIGINS` in `env/nwrma.env` to your Render web URL, then `npm run sync:env` again.

### On-device check

1. Phone on **mobile data** (Wi‑Fi off).
2. Open app → **Sync** → server URL should show `https://…onrender.com` and **reachable**.
3. Log in with seeded field officer phone + password.
4. Save a reading → **Sync** → confirm in ERP hydrological views.

---

## 3. Verify from your PC

```bash
set VERIFY_EXPRESS_URL=https://nwrma-api.onrender.com/health
set VERIFY_ERP_URL=https://nwrma-web.onrender.com
npm run deploy:verify
```

(PowerShell: `$env:VERIFY_EXPRESS_URL="..."; $env:VERIFY_ERP_URL="..."; npm run deploy:verify`)

---

## 4. LAN fallback (optional)

Keep `NWRMA_API_URL_LAN=http://<laptop-lan-ip>:4000` in `env/nwrma.env`. With `FIELD_API_PRIORITY=auto`, the APK tries the public URL first and can fall back to LAN in the office when the laptop API is running.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails: `packageManager` / Yarn 1.22 vs Corepack | Do **not** use Build Command `yarn`. Set **Build** to `node scripts/render-build-web.mjs` (web) or `node scripts/render-build-api.mjs` (API). Add env **`SKIP_INSTALL_DEPS=true`**. Set **Start** to `npm run start:web` or `npm run start:api`. |
| Build fails: `@tailwindcss/oxide-linux-x64-gnu` / native binding | Use latest `main` (web `optionalDependencies` + `render-build-web.mjs` installs Linux oxide). Redeploy with Build Command `node scripts/render-build-web.mjs`. |
| Deploy fails: `error Command "start" not found` (Render ran `yarn start`) | Set **Start Command** to `npm run start:web` or `npm run start:api` (not `yarn start`). |
| Sync “cannot reach server” off Wi‑Fi | Rebuild APK after setting `NWRMA_API_URL`; confirm `/health` on Render |
| Login fails on phone | Run `db:seed`; use `SEED_MOBILE_OFFICER_PHONE` / password |
| Web forms lose uploads after redeploy | Confirm **disk** is attached on `nwrma-web` (`render.yaml` → `web/data`) |
| CORS errors from web to API | Set `FRONTEND_ORIGINS` on API to exact web URL |
| Slow first click | Free-tier cold start — pre-warm or upgrade plan |

---

## Local development (unchanged)

```bash
npm run dev:field:lan    # laptop API + web on LAN
npm run dev:field        # + cloudflared tunnel → writes NWRMA_API_URL
```

See [README.md](../README.md) for full monorepo commands.
