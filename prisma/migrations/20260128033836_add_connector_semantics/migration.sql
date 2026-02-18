/*
  Warnings:

  - You are about to drop the `BlueprintActionCard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BlueprintTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BlueprintActionCard";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BlueprintTag";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "BlueprintColumn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL,
    "phaseId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintColumn_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "BlueprintPhase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BlueprintColumn_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "laneType" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamSection_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BlueprintColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamSection_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "BlueprintTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamSection_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintBasicCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "laneType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "painPoints" TEXT,
    "columnId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintBasicCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BlueprintColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintComplexCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "painPoints" TEXT,
    "softwareIds" TEXT,
    "teamSectionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintComplexCard_teamSectionId_fkey" FOREIGN KEY ("teamSectionId") REFERENCES "TeamSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SoftwareService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#cbd5e1',
    "blueprintId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SoftwareService_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blueprintId" TEXT NOT NULL,
    "sourceCardId" TEXT NOT NULL,
    "sourceCardType" TEXT NOT NULL,
    "targetCardId" TEXT NOT NULL,
    "targetCardType" TEXT NOT NULL,
    "connectorType" TEXT NOT NULL DEFAULT 'standard',
    "label" TEXT,
    "arrowDirection" TEXT NOT NULL DEFAULT 'forward',
    "strokeWeight" TEXT NOT NULL DEFAULT 'normal',
    "strokePattern" TEXT NOT NULL DEFAULT 'solid',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintConnection_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintConnection_sourceCardId_targetCardId_key" ON "BlueprintConnection"("sourceCardId", "targetCardId");
