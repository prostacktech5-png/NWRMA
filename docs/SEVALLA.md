# NWRMA on Sevalla

Deploy **Express API** and **Next.js web** from GitHub using **Docker** (recommended). Do **not** use default Nixpacks on the full monorepo — the folder `android app` (with a space) breaks Nixpacks cache paths.

---

## Fix: `app/.next/cache: No such file or directory` (exit 127)

**Cause:** Sevalla used **Nixpacks** and generated a broken `RUN` line:

`target=/app/android app/.next/cache` — the space splits the path in bash.

**Fix (recommended):**

1. Sevalla → your app → **Settings** → **Build strategy** → **Dockerfile**
2. **Dockerfile path:**
   - **Web:** `Dockerfile` or `Dockerfile.web` (root `Dockerfile` includes the web build)
   - **API:** `Dockerfile.api` (required — do not use root `Dockerfile` for API)
3. **Docker context:** `.` (repo root)
4. Clear custom **Build command** / Nixpacks overrides
5. **Redeploy**

**Error `open Dockerfile: no such file or directory`:** Sevalla defaulted to `Dockerfile` at repo root. Use path `Dockerfile` (web) or `Dockerfile.api` (API) after pulling latest `main`.

**Error `mobile/package.json: not found` / CopyIgnoredFile:** `.dockerignore` excludes the mobile app tree; Dockerfiles create a minimal `mobile/package.json` stub for npm workspaces. Pull latest `main` and redeploy.

**Alternative:** Set **Config file** to `/nixpacks.toml` (web) or `/nixpacks.api.toml` (API) if you must stay on Nixpacks.

---

## Two applications

| App | Dockerfile | Start (in image) |
|-----|------------|------------------|
| **nwrma-api** | `Dockerfile.api` | `npm run start:api` |
| **nwrma-web** | `Dockerfile.web` | `next start` in `web/` |

Connect repo: `prostacktech5-png/NWRMA`, branch `main`.

---

## Environment variables

Copy from `env/nwrma.env` (never commit that file).

| App | Required |
|-----|----------|
| **API** | `NODE_ENV=production`, `HOST=0.0.0.0`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGINS` (= web URL) |
| **Web** | `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_APP_URL`, `NWRMA_SERVER_URL`, `NEXT_PUBLIC_NWRMA_SERVER_URL`, `FRONTEND_ORIGINS`, `INVITE_SECRET`, `SMTP_*` |

Sevalla sets `PORT` automatically.

---

## Web uploads

Attach **persistent storage** on the web app, mount path:

`/app/web/data`

---

## After deploy

```bash
npm run db:seed
node scripts/set-public-api-url.mjs https://YOUR-API-HOST
npm run sync:env
```

Test:

- `https://<api>/health`
- `https://<web>/login`

Pre-warm both ~1 minute before demos.

---

## One-command helper

```powershell
npm run deploy:sevalla
npm run deploy:sevalla -- --seed
```

Prints dashboard steps, validates `Dockerfile.*` and `nixpacks*.toml`. Optional `env/sevalla.env` with `SEVALLA_API_KEY` (never commit). See [DEPLOY-SEVALLA-DEMO.md](./DEPLOY-SEVALLA-DEMO.md).

---

## 9am fallback

```powershell
npm run dev:field:lan
```

Phones on same Wi‑Fi + laptop API; show Sevalla web URL when ready.
