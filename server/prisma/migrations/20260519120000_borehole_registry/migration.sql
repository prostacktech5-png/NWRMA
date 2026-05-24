-- Borehole administrative lookups, Survey123 intakes, serial counters, and registered boreholes.

CREATE TABLE IF NOT EXISTS "regions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "regions_code_key" ON "regions"("code");

CREATE TABLE IF NOT EXISTS "districts" (
    "id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "districts_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "districts_code_key" ON "districts"("code");

CREATE TABLE IF NOT EXISTS "chiefdoms" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "chiefdoms_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chiefdoms_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chiefdoms_district_id_idx" ON "chiefdoms"("district_id");

CREATE TABLE IF NOT EXISTS "settlement_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "settlement_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "settlement_types_code_key" ON "settlement_types"("code");

CREATE TABLE IF NOT EXISTS "survey123_borehole_intakes" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "source" TEXT NOT NULL DEFAULT 'survey123_webhook',
    "raw_payload" JSONB,
    "drilling_company_name" TEXT,
    "location_description" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "drilling_method" TEXT,
    "borehole_depth_m" DOUBLE PRECISION,
    "overburden_depth_m" DOUBLE PRECISION,
    "water_strike_depths_m" JSONB,
    "permanent_casing_type" TEXT,
    "yield_lps" DOUBLE PRECISION,
    "transmissivity" DOUBLE PRECISION,
    "hydraulic_conductivity" DOUBLE PRECISION,
    "water_quality_physical" JSONB,
    "registered_borehole_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey123_borehole_intakes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "survey123_borehole_intakes_status_idx" ON "survey123_borehole_intakes"("status");

CREATE TABLE IF NOT EXISTS "borehole_serial_counters" (
    "region_code" TEXT NOT NULL,
    "district_code" TEXT NOT NULL,
    "chiefdom_code" TEXT NOT NULL,
    "settlement_code" TEXT NOT NULL,
    "last_serial" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "borehole_serial_counters_pkey" PRIMARY KEY ("region_code", "district_code", "chiefdom_code", "settlement_code")
);

CREATE TABLE IF NOT EXISTS "boreholes" (
    "id" TEXT NOT NULL,
    "borehole_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "chiefdom_id" TEXT NOT NULL,
    "settlement_type_id" TEXT NOT NULL,
    "drilling_company_id" TEXT,
    "drilling_company_name" TEXT,
    "survey123_intake_id" TEXT,
    "location_description" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "drilling_method" TEXT,
    "borehole_depth_m" DOUBLE PRECISION,
    "overburden_depth_m" DOUBLE PRECISION,
    "water_strike_depths_m" JSONB,
    "permanent_casing_type" TEXT,
    "yield_lps" DOUBLE PRECISION,
    "transmissivity" DOUBLE PRECISION,
    "hydraulic_conductivity" DOUBLE PRECISION,
    "water_quality_physical" JSONB,
    "purpose" TEXT NOT NULL DEFAULT '',
    "owner_name" TEXT NOT NULL DEFAULT '',
    "registry_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boreholes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "boreholes_borehole_id_key" UNIQUE ("borehole_id"),
    CONSTRAINT "boreholes_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "boreholes_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "boreholes_chiefdom_id_fkey" FOREIGN KEY ("chiefdom_id") REFERENCES "chiefdoms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "boreholes_settlement_type_id_fkey" FOREIGN KEY ("settlement_type_id") REFERENCES "settlement_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "boreholes_survey123_intake_id_fkey" FOREIGN KEY ("survey123_intake_id") REFERENCES "survey123_borehole_intakes"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "boreholes_district_id_idx" ON "boreholes"("district_id");
CREATE INDEX IF NOT EXISTS "boreholes_survey123_intake_id_idx" ON "boreholes"("survey123_intake_id");

DO $$ BEGIN
  ALTER TABLE "survey123_borehole_intakes"
    ADD CONSTRAINT "survey123_borehole_intakes_registered_borehole_id_fkey"
    FOREIGN KEY ("registered_borehole_id") REFERENCES "boreholes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
