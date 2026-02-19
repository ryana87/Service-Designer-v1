import { prisma } from "./db";

/**
 * Ensures the Project.ownerId column exists (for PostgreSQL).
 * Safe to call multiple times; uses IF NOT EXISTS.
 * Call this when findMany fails with "column does not exist" so the app can recover.
 */
export async function ensureProjectOwnerIdColumn(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ownerId" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Project" SET "ownerId" = 'ryan' WHERE "ownerId" IS NULL`
    );
  } catch (e) {
    console.error("[ensureProjectOwnerIdColumn]", e);
    throw e;
  }
}

export function isMissingColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("does not exist") ||
    msg.includes("column") ||
    msg.includes("(not available)")
  );
}
