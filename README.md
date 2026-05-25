# NWRMA monorepo

Production-oriented layout for Sierra Leone National Water Resources Management (**NWRMA**):

| Package | Purpose |
|---------|---------|
| `web/` | Existing Next.js dashboard (UI unchanged; optional integration with REST API). |
| `mobile/` | Expo/React Native hydro gauge application (SQLite offline cache + REST sync). |
| `server/` | Node **Express** + **Prisma** REST API (**JWT**, bcrypt). Postgres targets **Supabase**. |
| `shared/` | Shared TypeScript helpers (e.g. water-level band classification). |

## Prerequisites

- Node.js **18+** and npm (**9+** recommended for workspaces).
- A **Supabase** PostgreSQL connection string (**Transaction pooler** URL works with Prisma Serverless setups; use the pooled string from the Supabase dashboard).

## Configure Supabase (`nwrma` project)

- **Project ID / ref:** `zsjkyenjjgihkqsgthfz`  
- **API URL:** https://zsjkyenjjgihkqsgthfz.supabase.co  

Set secrets in **`server/.env`** (never commit real credentials):

```
DATABASE_URL=postgresql://postgres:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_URL=https://zsjkyenjjgihkqsgthfz.supabase.co
SUPABASE_ANON_KEY=<your_anon_key>
JWT_SECRET=<long_random_string>
PORT=4000
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` are available for future Supabase client features (auth RLS, storage). The Express API currently uses `DATABASE_URL` + Prisma.

## Database

Create **`server/.env`** before any Prisma command (copy **`server/.env.example`** → **`server/.env`** and paste a real **`DATABASE_URL`**). The server also merges **`server/.env.local`** if present.

Then from **`server/`** (or repo root via `npm run ... -w @nwrma/server`):

```bash
cd server
npm run prisma:migrate
npm run prisma:seed
```

Or use **`npm run prisma:migrate:dev`** when developing migrations interactively (`prisma migrate dev`).

Prisma **`npm run prisma:seed`** (in **`server/`**) creates or updates seed users—see **`server/.env.example`** for **`SEED_WEB_ADMIN_*`** / **`SEED_MOBILE_*`** overrides. That affects the **`User`** table the **web** app uses for login when **`DATABASE_URL`** is shared; it is separate from the optional Next.js **`POST /api/admin/seed-database`** SQL demo bundle.

## Run the API

```bash
npm run dev:server
```

Health check: `GET http://localhost:4000/health`

## Run the web dashboard

```bash
npm run dev:web
```

### Public website + online forms (single Next.js app)

Marketing pages are rendered by Next.js App Router in **`web/app/(marketing)/`** (components in **`web/components/marketing/`**, copy in **`web/content/marketing-pages/`**). Media still comes from **`tst/wp-content/uploads`**, linked into **`web/public/assets/uploads`** by **`npm run prepare:public -w web`**.

**`/online-forms`**, **`/login`**, **`/dashboard`**, and other ERP routes stay in the existing App Router tree.

Field / LAN dev (API + web together):

```bash
npm run dev:field:lan
```

- Public site: http://localhost:3000/
- Online forms: http://localhost:3000/online-forms
- Staff ERP: http://localhost:3000/login

After editing marketing UI or page JSON, restart dev (or run `npm run prepare:public -w web` if you only changed uploads under **`tst/wp-content/`**).

Set **`web/.env.local`** from **`web/.env.example`**. Required for the ERP shell:

- **`DATABASE_URL`** — same Supabase Postgres URI as **`server/.env`** (Session pooler on port **5432** is recommended). Next.js API routes read users and module data from this database.

Optional:

- **`NWRMA_SERVER_URL`** — Express API base URL if you use upstream login or merge field reports into **Hydrological → Readings**.
- **`SEED_SECRET`** — only if you intentionally call **`POST /api/admin/seed-database`** with header **`x-seed-secret`** to load the optional demo SQL bundle (avoid for real UAT).

### Sign-in (live users only)

The Next.js app does **not** use pretend in-browser mock accounts. Users must exist in the Prisma **`User`** table with a bcrypt **`passwordHash`**.

- **Local dev shortcut:** after `npm run prisma:seed` in **`server/`**, a default admin (`admin@nwrma.gov.sl` / `admin123` unless overridden by **`SEED_WEB_ADMIN_*`**) exists in Postgres; sign in with that email/password on **`/login`** when **`web/.env.local`** uses the same **`DATABASE_URL`**.
- **Production / UAT:** create accounts via **invite / set-password** (Settings → Users when SMTP is configured), or insert rows in Supabase—use strong passwords and env-driven seed secrets only on private environments.
- Each tester needs the correct **`role`** (`admin`, `dg`, `hod`, `staff`) and, for HoD/staff, **`department`** (`hydrological`, `boreholes`, `water_quality`, `financial`, `hr`).
- Open **`/login`**, sign in, then navigate by department. Scoped lists show only what Postgres returns—new databases often look empty until you add real rows.
- After login, the app uses **HttpOnly cookies** for session (not demo mock users in the browser).

Theme/branding preferences may still use browser **localStorage**; that is UI-only and not your authority data.

## Run the mobile app

```bash
cd mobile
npx expo start
```

Development API base defaults to **`http://10.0.2.2:4000`** (Android emulator) / **`127.0.0.1:4000`** (others). Override with **`EXPO_PUBLIC_NWRMA_SERVER_URL`**.

SQLite stores readings offline; **`POST /sync/offline-data`** uploads pending rows when connectivity returns.

### Production (Render + any-network APK)

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for Render Blueprint (`render.yaml`) or **[docs/RAILWAY.md](docs/RAILWAY.md)** for Railway Docker deploy (`Dockerfile.api` / `Dockerfile.web`), public **`NWRMA_API_URL`**, and **`npm run mobile:release`**.

```bash
node scripts/set-public-api-url.mjs https://your-api.onrender.com
npm run sync:env
npm run mobile:release
```

## Water level classification

Centralized in **`shared/`**:

- **Low:** below 3 m  
- **Medium:** ≥3 m and <6 m  
- **High:** ≥6 m  

## Lint & format

```bash
npm run lint
npm run format
```

---

**Note:** A legacy **`android app/`** Next prototype remains alongside this monorepo; the supported mobile surface is **`mobile/`** (Expo).
