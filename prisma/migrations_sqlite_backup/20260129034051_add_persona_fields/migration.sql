/*
  Warnings:

  - You are about to drop the column `iconName` on the `Persona` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "role" TEXT,
    "context" TEXT,
    "goals" TEXT,
    "needs" TEXT,
    "painPoints" TEXT,
    "notes" TEXT,
    "avatarUrl" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Persona_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Persona" ("avatarUrl", "createdAt", "id", "name", "projectId", "shortDescription", "updatedAt") SELECT "avatarUrl", "createdAt", "id", "name", "projectId", "shortDescription", "updatedAt" FROM "Persona";
DROP TABLE "Persona";
ALTER TABLE "new_Persona" RENAME TO "Persona";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
