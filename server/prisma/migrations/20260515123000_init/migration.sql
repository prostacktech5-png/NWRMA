-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldReport" (
    "id" TEXT NOT NULL,
    "clientLocalId" TEXT,
    "userId" TEXT NOT NULL,
    "officerName" TEXT NOT NULL,
    "officerPhone" TEXT NOT NULL,
    "riverName" TEXT,
    "location" TEXT NOT NULL,
    "waterLevel" DECIMAL(14,4) NOT NULL,
    "readingTime" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "photoBase64" TEXT,
    "remarks" TEXT,
    "hodValidation" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "FieldReport_clientLocalId_key" ON "FieldReport"("clientLocalId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "FieldReport_userId_idx" ON "FieldReport"("userId");

-- CreateIndex
CREATE INDEX "FieldReport_dateTime_idx" ON "FieldReport"("dateTime");

-- AddForeignKey
ALTER TABLE "FieldReport" ADD CONSTRAINT "FieldReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
