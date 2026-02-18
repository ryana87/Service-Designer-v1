-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "iconName" TEXT,
    "avatarUrl" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Persona_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlueprintDecisionCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "laneType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "columnId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintDecisionCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BlueprintColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BlueprintDecisionCard_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BlueprintBasicCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "laneType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "painPoints" TEXT,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "columnId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintBasicCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BlueprintColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BlueprintBasicCard" ("columnId", "createdAt", "description", "id", "laneType", "order", "painPoints", "title", "updatedAt") SELECT "columnId", "createdAt", "description", "id", "laneType", "order", "painPoints", "title", "updatedAt" FROM "BlueprintBasicCard";
DROP TABLE "BlueprintBasicCard";
ALTER TABLE "new_BlueprintBasicCard" RENAME TO "BlueprintBasicCard";
CREATE TABLE "new_BlueprintComplexCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "painPoints" TEXT,
    "softwareIds" TEXT,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "teamSectionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintComplexCard_teamSectionId_fkey" FOREIGN KEY ("teamSectionId") REFERENCES "TeamSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BlueprintComplexCard" ("createdAt", "description", "id", "order", "painPoints", "softwareIds", "teamSectionId", "title", "updatedAt") SELECT "createdAt", "description", "id", "order", "painPoints", "softwareIds", "teamSectionId", "title", "updatedAt" FROM "BlueprintComplexCard";
DROP TABLE "BlueprintComplexCard";
ALTER TABLE "new_BlueprintComplexCard" RENAME TO "BlueprintComplexCard";
CREATE TABLE "new_JourneyMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "persona" TEXT,
    "personaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JourneyMap_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JourneyMap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JourneyMap" ("createdAt", "id", "name", "persona", "projectId", "sortOrder", "updatedAt") SELECT "createdAt", "id", "name", "persona", "projectId", "sortOrder", "updatedAt" FROM "JourneyMap";
DROP TABLE "JourneyMap";
ALTER TABLE "new_JourneyMap" RENAME TO "JourneyMap";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
