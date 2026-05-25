# Sevalla demo deploy (9am checklist)

**No app code changes** — use Dockerfiles on `main`.

## 1. Two Sevalla apps from GitHub

| App | Dockerfile | Start |
|-----|------------|-------|
| API | `Dockerfile.api` | `npm run start:api` |
| Web | `Dockerfile.web` | `next start` in image |

**Settings → Build strategy → Dockerfile** (not Nixpacks auto-detect).

If you must use Nixpacks: **Config file** = `/nixpacks.toml` (web) or `/nixpacks.api.toml` (API).

## 2. Fix `android app/.next/cache` error

Default Nixpacks on the full repo breaks because of the folder `android app` (space in path). Use **Dockerfile** paths above.

## 3. Environment

Copy variables from `env/nwrma.env` into each Sevalla app (never commit `nwrma.env`).

Web: attach volume **`/app/web/data`**.

## 4. After URLs are live

```powershell
node scripts/set-public-api-url.mjs https://YOUR-API-HOST
npm run sync:env
npm run deploy:sevalla -- --seed
```

## 5. Verify (~1 min before demo)

- `https://<api>/health`
- `https://<web>/login`

## 6. Fallback (phones on Wi‑Fi)

```powershell
npm run dev:field:lan
```

See also [SEVALLA.md](./SEVALLA.md).
