# Railway — do this now (9am presentation)

Code is on GitHub (`main`). Database seed already ran locally.

## Option A — one command (if you have a Project Token)

```powershell
cd "c:\Users\Dilac~Kay\Music\National Water Resources Management system"
$env:RAILWAY_TOKEN="PASTE_TOKEN_FROM_RAILWAY_SETTINGS"
npm run deploy:railway
```

Token: [Railway project → Settings → Tokens](https://railway.com/project/1bcb7582-9ac2-407e-a36c-bf70c42f7627)

Wait ~10–15 min for both Docker builds. Then open:

- API: `https://nwrma-api-production.up.railway.app/health`
- Web: `https://nwrma-web-production.up.railway.app/login`

---

## Option B — 3 clicks per service (no token)

For **nwrma-api** and **nwrma-web** separately:

1. Service → **Settings** → **Build** → **Builder: Dockerfile**
2. **Dockerfile path:** `Dockerfile.api` or `Dockerfile.web`
3. Clear **Build command** (remove `node scripts/render-build-*.mjs` or `yarn`)
4. **Deploy** → **Redeploy**

**Variables:** copy from `env/nwrma.env` (see [RAILWAY.md](./RAILWAY.md))

After both are live:

```powershell
node scripts/set-public-api-url.mjs https://YOUR-API.up.railway.app
npm run sync:env
```

---

## 9am fallback (if Railway still building)

On laptop:

```powershell
npm run dev:field:lan
```

Phones on same Wi‑Fi use existing APK + LAN API (`192.168.1.21:4000`).

Staff browser: Railway web URL when ready, or `http://localhost:3000`.

---

## Pre-warm (1 minute before presenting)

Open `/health` and `/login` in the browser so Railway wakes up.
