# NWRMA on Railway

Deploy **Express API** (`nwrma-api`) and **Next.js web** (`nwrma-web`) from one GitHub repo using **Docker** (not Railpack). No application code changes—only [`Dockerfile.api`](../Dockerfile.api), [`Dockerfile.web`](../Dockerfile.web), and [`.dockerignore`](../.dockerignore).

Project: [Railway dashboard](https://railway.com/project/1bcb7582-9ac2-407e-a36c-bf70c42f7627)

---

## One-command deploy (fastest)

1. Railway → Project → **Settings** → **Tokens** → create **Project Token**
2. PowerShell from repo root:

```powershell
$env:RAILWAY_TOKEN="paste-your-project-token-here"
npm run deploy:railway
```

This script ([`scripts/railway-deploy.mjs`](../scripts/railway-deploy.mjs)) will:

- Link project `1bcb7582-9ac2-407e-a36c-bf70c42f7627`
- Push variables from `env/nwrma.env` (never committed)
- Deploy `nwrma-api` with [`railway.api.toml`](../railway.api.toml) + `Dockerfile.api`
- Deploy `nwrma-web` with [`railway.web.toml`](../railway.web.toml) + `Dockerfile.web`
- Run `db:seed`, `set-public-api-url`, and `sync:env`

Optional: `$env:RAILWAY_PROJECT_ID="1bcb7582-9ac2-407e-a36c-bf70c42f7627"` if linking fails.

---

## Why Docker (not Railpack)

Railpack was uploading **~1.5 GB** (whole repo including `mobile/`, `android app/`) and running **`npm ci` twice** via `render-build-*.mjs`. Switch each service to **Builder: Dockerfile** with the paths below.

---

## 1. Service: `nwrma-api`

| Setting | Value |
|---------|--------|
| **Builder** | Dockerfile |
| **Dockerfile path** | `Dockerfile.api` |
| **Root directory** | `/` (repository root) |
| **Build command** | *(leave empty)* |
| **Start command** | *(leave empty — uses Dockerfile `CMD`)* |
| **Watch paths** | `server/**`, `shared/**`, `Dockerfile.api` |

### Variables

| Name | Notes |
|------|--------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | Supabase URL (from `env/nwrma.env`) |
| `JWT_SECRET` | Same as local — do not rotate after phones are deployed |
| `FRONTEND_ORIGINS` | Web service URL, e.g. `https://nwrma-web-production.up.railway.app` |

**Networking:** Generate domain → test `https://<api-host>/health`

---

## 2. Service: `nwrma-web`

| Setting | Value |
|---------|--------|
| **Builder** | Dockerfile |
| **Dockerfile path** | `Dockerfile.web` |
| **Root directory** | `/` |
| **Watch paths** | `web/**`, `shared/**`, `tst/**`, `Dockerfile.web` |

### Variables

| Name | Notes |
|------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Same Supabase as API |
| `JWT_SECRET` | Match API if using shared auth |
| `PUBLIC_APP_URL` | This service’s Railway URL |
| `NWRMA_SERVER_URL` | API service URL |
| `NEXT_PUBLIC_NWRMA_SERVER_URL` | Same as API URL |
| `FRONTEND_ORIGINS` | Web URL (+ `http://localhost:3000` if needed) |
| `INVITE_SECRET`, `SMTP_*` | From `env/nwrma.env` if using invite email |

### Volume (uploads)

Attach volume **`nwrma-web-nwrma-uploads`** (or create one):

| Mount path | Purpose |
|------------|---------|
| `/app/web/data` | Form PDFs, receipts, HR images (`web/lib/*-file-store.ts`) |

**Networking:** Generate domain → test `https://<web-host>/login`

Redeploy **API** after web URL is known so `FRONTEND_ORIGINS` is correct.

---

## 3. After both services deploy

### One-time database seed (from your PC)

```bash
# Set DATABASE_URL to production Supabase, or use env/nwrma.env via sync
npm run db:seed
```

### Android (any network)

```bash
node scripts/set-public-api-url.mjs https://nwrma-api-production.up.railway.app
npm run sync:env
npm run mobile:release
```

Install the new APK. Phones use the **API** URL only.

### Pre-warm before demos

Railway may scale to zero when idle. Open `/health` and `/login` ~1 minute before presenting.

---

## 4. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build failed during “Build image” with Railpack | Set **Builder** to **Dockerfile** and correct Dockerfile path |
| Upload still huge | Confirm `.dockerignore` is on `main`; redeploy |
| Web build: Tailwind oxide | `Dockerfile.web` installs `@tailwindcss/oxide-linux-x64-gnu` |
| `next build` fails | Run `npm run build -w web` locally first |
| CORS from web to API | Set `FRONTEND_ORIGINS` on API to exact web URL |
| Uploads lost after redeploy | Mount volume at `/app/web/data` on `nwrma-web` |

---

## 5. Local Docker smoke test (optional)

```bash
docker build -f Dockerfile.api -t nwrma-api .
docker build -f Dockerfile.web -t nwrma-web .
```

Run with `-e DATABASE_URL=...` and other env vars.

---

See also [DEPLOYMENT.md](./DEPLOYMENT.md) (Render blueprint) and [env/nwrma.env.example](../env/nwrma.env.example).
