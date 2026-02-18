-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BlueprintConnection" (
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
    "strokeColor" TEXT NOT NULL DEFAULT 'grey',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintConnection_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BlueprintConnection" ("arrowDirection", "blueprintId", "connectorType", "createdAt", "id", "label", "sourceCardId", "sourceCardType", "strokePattern", "strokeWeight", "targetCardId", "targetCardType", "updatedAt") SELECT "arrowDirection", "blueprintId", "connectorType", "createdAt", "id", "label", "sourceCardId", "sourceCardType", "strokePattern", "strokeWeight", "targetCardId", "targetCardType", "updatedAt" FROM "BlueprintConnection";
DROP TABLE "BlueprintConnection";
ALTER TABLE "new_BlueprintConnection" RENAME TO "BlueprintConnection";
CREATE UNIQUE INDEX "BlueprintConnection_sourceCardId_targetCardId_key" ON "BlueprintConnection"("sourceCardId", "targetCardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
