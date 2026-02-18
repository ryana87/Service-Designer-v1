-- CreateTable
CREATE TABLE "ServiceBlueprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceBlueprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintPhase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "timeframe" TEXT,
    "blueprintId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintPhase_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintActionCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "laneType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "painPoints" TEXT,
    "phaseId" TEXT NOT NULL,
    "teamId" TEXT,
    "tagIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintActionCard_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "BlueprintPhase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BlueprintActionCard_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "BlueprintTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'group',
    "colorHex" TEXT NOT NULL DEFAULT '#6366f1',
    "blueprintId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlueprintTeam_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#64748b',
    "blueprintId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlueprintTag_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
