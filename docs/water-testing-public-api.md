# Water testing public API

External websites submit water testing requests to NWRMA ERP. Staff manage the queue at **Hydrological Services → Water testing** (`/hydrological/water-testing`).

## Authentication

Set on the server:

```bash
WATER_TESTING_API_KEY=your-long-random-secret
```

Send on every request (choose one):

- Header: `X-Water-Testing-Api-Key: <secret>`
- Header: `X-Api-Key: <secret>`
- Header: `Authorization: Bearer <secret>`

In production, requests without a valid key are rejected with `401`.

If `WATER_TESTING_API_KEY` is unset, POST is allowed only in non-production (local development).

## Create request

`POST /api/public/water-testing/requests`

`Content-Type: application/json`

### Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requesterName` | string | yes | Contact name |
| `requesterEmail` | string | yes | Valid email for notifications |
| `organisation` | string | yes | Organisation or applicant name |
| `siteAddress` | string | yes | Sample site / collection address |
| `testsRequested` | string[] | yes | At least one test name (e.g. `pH`, `E. coli`) |
| `priority` | `normal` \| `urgent` \| `critical` | no | Default `normal` |
| `phone` | string | no | Contact phone |
| `notes` | string | no | Extra instructions |
| `publicCaseId` | string | no | Your external case or form id |

### Example

```bash
curl -X POST "https://your-erp-host/api/public/water-testing/requests" \
  -H "Content-Type: application/json" \
  -H "X-Water-Testing-Api-Key: YOUR_SECRET" \
  -d '{
    "requesterName": "Jane Doe",
    "requesterEmail": "jane@example.com",
    "organisation": "ABC Ltd",
    "siteAddress": "12 Main Road, Freetown",
    "testsRequested": ["pH", "Turbidity", "E. coli"],
    "priority": "normal",
    "phone": "+232 76 0000000",
    "notes": "Gate opens at 8am"
  }'
```

### Response `201`

```json
{
  "ok": true,
  "id": "uuid",
  "reference": "WT-2026-00001",
  "status": "received",
  "emailWarning": null
}
```

`emailWarning` is set if the row was saved but SMTP could not send the confirmation email.

## Track request (optional)

`GET /api/public/water-testing/requests/{reference}`

Same API key headers as POST.

### Example

```bash
curl "https://your-erp-host/api/public/water-testing/requests/WT-2026-00001" \
  -H "X-Water-Testing-Api-Key: YOUR_SECRET"
```

### Response `200`

```json
{
  "ok": true,
  "reference": "WT-2026-00001",
  "status": "in_progress",
  "requesterName": "Jane Doe",
  "organisation": "ABC Ltd",
  "siteAddress": "12 Main Road, Freetown",
  "testsRequested": ["pH", "Turbidity", "E. coli"],
  "sampleCollectionScheduledAt": "2026-05-20T10:00:00.000Z",
  "completedAt": null,
  "results": null,
  "receivedAt": "2026-05-18T14:30:00.000Z"
}
```

When `status` is `completed`, `results` contains the laboratory result object.

## Status lifecycle

| Status | Meaning |
|--------|---------|
| `received` | Submitted via API; client receives “request received” email |
| `in_progress` | Staff scheduled sample collection; client receives scheduling email |
| `completed` | Staff entered results; client receives results email |

Staff actions are only available inside the ERP (authenticated), not via this public API.

## Email (server configuration)

Requires SMTP in `.env.local`:

```bash
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
SMTP_NOTIFY_TO=...   # optional: staff alert on each new submission
```

Automated client emails: received → collection scheduled → results completed.

## Demo data (development)

Until the external public form is live, staff can load sample requests to test the pipeline inside the ERP.

### UI

On **Hydrological Services → Water testing**, click **Add demo submissions**. This creates four realistic Sierra Leone sample rows (hospital, private, NGO, company), all in **Received** status.

### API

`POST /api/hydrological/water-testing/requests/seed-demo`

Requires the same ERP session as other staff routes (`X-Acting-User-Id` / demo cookie). Hydrological staff or administrators only.

### Behavior

- **Recreate:** each run deletes prior demo rows (`demo-wt-001` … `demo-wt-004`) and inserts four fresh **Received** requests with new references.
- **Emails:** sends four “request received” notifications (demo inbox: `jamesgobiophilip@gmail.com`) when SMTP is configured.
- Response: `{ ok, created, deleted, skipped, references, emailWarnings }`
