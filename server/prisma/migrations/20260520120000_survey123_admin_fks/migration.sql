-- Survey123 intake admin FKs, company match, and review audit fields.

ALTER TABLE "survey123_borehole_intakes"
  ADD COLUMN IF NOT EXISTS "region_id" TEXT,
  ADD COLUMN IF NOT EXISTS "district_id" TEXT,
  ADD COLUMN IF NOT EXISTS "chiefdom_id" TEXT,
  ADD COLUMN IF NOT EXISTS "settlement_type_id" TEXT,
  ADD COLUMN IF NOT EXISTS "drilling_company_id" TEXT,
  ADD COLUMN IF NOT EXISTS "region_name" TEXT,
  ADD COLUMN IF NOT EXISTS "district_name" TEXT,
  ADD COLUMN IF NOT EXISTS "chiefdom_name" TEXT,
  ADD COLUMN IF NOT EXISTS "settlement_type_label" TEXT,
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "survey123_borehole_intakes"
    ADD CONSTRAINT "survey123_borehole_intakes_region_id_fkey"
    FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "survey123_borehole_intakes"
    ADD CONSTRAINT "survey123_borehole_intakes_district_id_fkey"
    FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "survey123_borehole_intakes"
    ADD CONSTRAINT "survey123_borehole_intakes_chiefdom_id_fkey"
    FOREIGN KEY ("chiefdom_id") REFERENCES "chiefdoms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "survey123_borehole_intakes"
    ADD CONSTRAINT "survey123_borehole_intakes_settlement_type_id_fkey"
    FOREIGN KEY ("settlement_type_id") REFERENCES "settlement_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "survey123_borehole_intakes_drilling_company_id_idx"
  ON "survey123_borehole_intakes"("drilling_company_id");
