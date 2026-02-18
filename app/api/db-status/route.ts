import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(not set)";
  const isTurso = typeof dbUrl === "string" && dbUrl.startsWith("libsql://");
  try {
    await prisma.project.count();
    return NextResponse.json({
      ok: true,
      database: isTurso ? "Turso" : "SQLite file",
      urlHint: typeof dbUrl === "string" ? dbUrl.slice(0, 60) + (dbUrl.length > 60 ? "..." : "") : dbUrl,
      tablesExist: true,
      message: "Database connected and Project table exists.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        database: isTurso ? "Turso" : "SQLite file",
        urlHint: typeof dbUrl === "string" ? dbUrl.slice(0, 60) + (dbUrl.length > 60 ? "..." : "") : dbUrl,
        tablesExist: false,
        error: msg,
        hint: isTurso
          ? "Run: ./scripts/turso-migrate.sh sd4-demo (then verify DATABASE_URL in Vercel matches your Turso URL)"
          : "Run: npx prisma db push",
      },
      { status: 500 }
    );
  }
}
