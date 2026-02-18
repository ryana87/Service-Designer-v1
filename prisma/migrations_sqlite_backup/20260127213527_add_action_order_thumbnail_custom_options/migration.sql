-- CreateTable
CREATE TABLE "CustomChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'label',
    "journeyMapId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomChannel_journeyMapId_fkey" FOREIGN KEY ("journeyMapId") REFERENCES "JourneyMap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomTouchpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'label',
    "journeyMapId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomTouchpoint_journeyMapId_fkey" FOREIGN KEY ("journeyMapId") REFERENCES "JourneyMap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_JourneyAction" ("channel", "createdAt", "description", "emotion", "id", "opportunities", "painPoints", "phaseId", "thought", "title", "touchpoint", "updatedAt") SELECT "channel", "createdAt", "description", "emotion", "id", "opportunities", "painPoints", "phaseId", "thought", "title", "touchpoint", "updatedAt" FROM "JourneyAction";
DROP TABLE "JourneyAction";
ALTER TABLE "new_JourneyAction" RENAME TO "JourneyAction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
