-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Persona" (
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

-- CreateTable
CREATE TABLE "JourneyMap" (
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

-- CreateTable
CREATE TABLE "JourneyPhase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "timeframe" TEXT,
    "journeyMapId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JourneyPhase_journeyMapId_fkey" FOREIGN KEY ("journeyMapId") REFERENCES "JourneyMap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JourneyAction" (
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

-- CreateTable
CREATE TABLE "JourneyQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteText" TEXT NOT NULL,
    "source" TEXT,
    "actionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JourneyQuote_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "JourneyAction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "columnId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintBasicCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BlueprintColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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

-- CreateTable
CREATE TABLE "BlueprintComplexCard" (
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
    "strokeColor" TEXT NOT NULL DEFAULT 'grey',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BlueprintConnection_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VersionSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "snapshotData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VersionSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "actionId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "positionX" REAL,
    "positionY" REAL,
    "rowKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "JourneyAction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
CREATE UNIQUE INDEX "BlueprintConnection_sourceCardId_targetCardId_key" ON "BlueprintConnection"("sourceCardId", "targetCardId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_slug_key" ON "ShareLink"("slug");

