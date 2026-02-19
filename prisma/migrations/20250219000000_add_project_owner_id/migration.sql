-- AlterTable
ALTER TABLE "Project" ADD COLUMN "ownerId" TEXT;

-- Backfill: assign existing projects to demo user ryan
UPDATE "Project" SET "ownerId" = 'ryan' WHERE "ownerId" IS NULL;
