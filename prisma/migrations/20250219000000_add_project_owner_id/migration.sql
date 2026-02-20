-- AlterTable (idempotent: safe if column already exists)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- Backfill: assign existing projects to demo user ryan
UPDATE "Project" SET "ownerId" = 'ryan' WHERE "ownerId" IS NULL;
