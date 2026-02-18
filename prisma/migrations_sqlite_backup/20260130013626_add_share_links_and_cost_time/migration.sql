-- AlterTable
ALTER TABLE "BlueprintBasicCard" ADD COLUMN "costEstimate" REAL;
ALTER TABLE "BlueprintBasicCard" ADD COLUMN "timeEstimate" TEXT;

-- AlterTable
ALTER TABLE "BlueprintComplexCard" ADD COLUMN "costEstimate" REAL;
ALTER TABLE "BlueprintComplexCard" ADD COLUMN "timeEstimate" TEXT;

-- AlterTable
ALTER TABLE "JourneyAction" ADD COLUMN "costEstimate" REAL;
ALTER TABLE "JourneyAction" ADD COLUMN "timeEstimate" TEXT;

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "journeyMapId" TEXT,
    "blueprintId" TEXT,
    "personaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ShareLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_slug_key" ON "ShareLink"("slug");
