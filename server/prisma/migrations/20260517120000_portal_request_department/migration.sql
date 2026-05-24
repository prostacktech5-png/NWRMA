-- Route public portal submissions to department HoD by department + budget code.
ALTER TABLE "hydro_portal_requests"
  ADD COLUMN IF NOT EXISTS "department" TEXT NOT NULL DEFAULT 'hydrological',
  ADD COLUMN IF NOT EXISTS "budget_code" TEXT NOT NULL DEFAULT '';
