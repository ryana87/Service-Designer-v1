/*
  Warnings:

  - You are about to drop the column `costEstimate` on the `BlueprintBasicCard` table. All the data in the column will be lost.
  - You are about to drop the column `timeEstimate` on the `BlueprintBasicCard` table. All the data in the column will be lost.
  - You are about to drop the column `costEstimate` on the `BlueprintComplexCard` table. All the data in the column will be lost.
  - You are about to drop the column `timeEstimate` on the `BlueprintComplexCard` table. All the data in the column will be lost.
  - You are about to drop the column `costEstimate` on the `JourneyAction` table. All the data in the column will be lost.
  - You are about to drop the column `timeEstimate` on the `JourneyAction` table. All the data in the column will be lost.

*/
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
INSERT INTO "new_BlueprintBasicCard" ("columnId", "createdAt", "description", "id", "isEnd", "isStart", "laneType", "order", "painPoints", "title", "updatedAt") SELECT "columnId", "createdAt", "description", "id", "isEnd", "isStart", "laneType", "order", "painPoints", "title", "updatedAt" FROM "BlueprintBasicCard";
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
INSERT INTO "new_BlueprintComplexCard" ("createdAt", "description", "id", "isEnd", "isStart", "order", "painPoints", "softwareIds", "teamSectionId", "title", "updatedAt") SELECT "createdAt", "description", "id", "isEnd", "isStart", "order", "painPoints", "softwareIds", "teamSectionId", "title", "updatedAt" FROM "BlueprintComplexCard";
DROP TABLE "BlueprintComplexCard";
ALTER TABLE "new_BlueprintComplexCard" RENAME TO "BlueprintComplexCard";
CREATE TABLE "new_JourneyAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thought" TEXT,
    "channel" TEXT,
    "touchpoint" TEXT,
    "emotion" INTEGER,
    "painPoints" TEXT,
    "opportunities" TEXT,
    "thumbnailUrl" TEXT,
    "phaseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JourneyAction_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "JourneyPhase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JourneyAction" ("channel", "createdAt", "description", "emotion", "id", "opportunities", "order", "painPoints", "phaseId", "thought", "thumbnailUrl", "title", "touchpoint", "updatedAt") SELECT "channel", "createdAt", "description", "emotion", "id", "opportunities", "order", "painPoints", "phaseId", "thought", "thumbnailUrl", "title", "touchpoint", "updatedAt" FROM "JourneyAction";
DROP TABLE "JourneyAction";
ALTER TABLE "new_JourneyAction" RENAME TO "JourneyAction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
