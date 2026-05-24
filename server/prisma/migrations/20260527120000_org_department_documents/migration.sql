-- Cross-department document sharing (GIS-01).

CREATE TABLE IF NOT EXISTS "org_department_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "from_department" TEXT NOT NULL,
    "to_department" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT,
    "uploaded_by_name" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'general',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "org_department_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "org_department_documents_to_dept_idx"
    ON "org_department_documents"("to_department", "created_at" DESC)
    WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "org_department_documents_from_dept_idx"
    ON "org_department_documents"("from_department", "created_at" DESC)
    WHERE "deleted_at" IS NULL;
