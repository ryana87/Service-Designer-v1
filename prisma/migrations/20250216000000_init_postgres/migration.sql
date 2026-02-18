-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyMap" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "persona" TEXT,
    "personaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyPhase" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "timeframe" TEXT,
    "journeyMapId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyAction" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyQuote" (
    "id" TEXT NOT NULL,
    "quoteText" TEXT NOT NULL,
    "source" TEXT,
    "actionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomChannel" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'label',
    "journeyMapId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomTouchpoint" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'label',
    "journeyMapId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomTouchpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBlueprint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintPhase" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "timeframe" TEXT,
    "blueprintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintColumn" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "phaseId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSection" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "laneType" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintBasicCard" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "laneType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "painPoints" TEXT,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "columnId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintBasicCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintDecisionCard" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "laneType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "columnId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintDecisionCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintComplexCard" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "painPoints" TEXT,
    "softwareIds" TEXT,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "teamSectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintComplexCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'group',
    "colorHex" TEXT NOT NULL DEFAULT '#6366f1',
    "blueprintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlueprintTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareService" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#cbd5e1',
    "blueprintId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoftwareService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintConnection" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "snapshotData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "actionId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "rowKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "journeyMapId" TEXT,
    "blueprintId" TEXT,
    "personaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintConnection_sourceCardId_targetCardId_key" ON "BlueprintConnection"("sourceCardId", "targetCardId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_slug_key" ON "ShareLink"("slug");

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyMap" ADD CONSTRAINT "JourneyMap_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyMap" ADD CONSTRAINT "JourneyMap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyPhase" ADD CONSTRAINT "JourneyPhase_journeyMapId_fkey" FOREIGN KEY ("journeyMapId") REFERENCES "JourneyMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyAction" ADD CONSTRAINT "JourneyAction_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "JourneyPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyQuote" ADD CONSTRAINT "JourneyQuote_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "JourneyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomChannel" ADD CONSTRAINT "CustomChannel_journeyMapId_fkey" FOREIGN KEY ("journeyMapId") REFERENCES "JourneyMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomTouchpoint" ADD CONSTRAINT "CustomTouchpoint_journeyMapId_fkey" FOREIGN KEY ("journeyMapId") REFERENCES "JourneyMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBlueprint" ADD CONSTRAINT "ServiceBlueprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintPhase" ADD CONSTRAINT "BlueprintPhase_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintColumn" ADD CONSTRAINT "BlueprintColumn_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "BlueprintPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintColumn" ADD CONSTRAINT "BlueprintColumn_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSection" ADD CONSTRAINT "TeamSection_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BlueprintColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSection" ADD CONSTRAINT "TeamSection_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "BlueprintTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSection" ADD CONSTRAINT "TeamSection_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintBasicCard" ADD CONSTRAINT "BlueprintBasicCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BlueprintColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintDecisionCard" ADD CONSTRAINT "BlueprintDecisionCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "BlueprintColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintDecisionCard" ADD CONSTRAINT "BlueprintDecisionCard_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintComplexCard" ADD CONSTRAINT "BlueprintComplexCard_teamSectionId_fkey" FOREIGN KEY ("teamSectionId") REFERENCES "TeamSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintTeam" ADD CONSTRAINT "BlueprintTeam_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareService" ADD CONSTRAINT "SoftwareService_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlueprintConnection" ADD CONSTRAINT "BlueprintConnection_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ServiceBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionSnapshot" ADD CONSTRAINT "VersionSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "JourneyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

