### NWRMA REST API

Base URL: `http://localhost:4000` (default).

#### Auth (`/auth`)

| Method | Path | Body | Notes |
|--------|------|------|------|
| `POST` | `/auth/register` | `{ "password", "name", "email?" \| "phone?" }` | Exactly **one** of `email` or `phone`. |
| `POST` | `/auth/login` | `{ "password", "email?" \| "phone?" }` | Exactly **one** identifier. |

**Response:** `{ "token": "<JWT>", "user": { "id","email","phone","fullName","role","department" } }`

#### Reports (`Authorization: Bearer <JWT>`)

| Method | Path | Notes |
|--------|------|------|
| `POST` | `/reports` | Create one field report (JSON body matches `ReportBodyPayload`). |
| `GET` | `/reports` | List reports. `?band=low|medium|high` optional. Admins & DG see all rows. |
| `GET` | `/reports/:id` | Single report. |

Each report includes a derived `band` (`low \| medium \| high`) from water depth in metres.

#### Offline sync batch

| Method | Path | Body |
|--------|------|------|
| `POST` | `/sync/offline-data` | `{ "reports": ReportBodyPayload[] }` |

Returns `200` on full success; `207` when some rows fail (see `errors[]` with `{ index, message }`).

#### Health

`GET /health` → `{ ok: true }`
