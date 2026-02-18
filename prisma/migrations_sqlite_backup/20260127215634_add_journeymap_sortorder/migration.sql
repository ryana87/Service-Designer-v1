-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JourneyMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "persona" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JourneyMap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JourneyMap" ("createdAt", "id", "name", "persona", "projectId", "updatedAt") SELECT "createdAt", "id", "name", "persona", "projectId", "updatedAt" FROM "JourneyMap";
DROP TABLE "JourneyMap";
ALTER TABLE "new_JourneyMap" RENAME TO "JourneyMap";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
