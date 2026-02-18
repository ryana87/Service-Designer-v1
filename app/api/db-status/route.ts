import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(not set)";
  const isSupabase = typeof dbUrl === "string" && dbUrl.includes("supabase");
  try {
    await prisma.project.count();
    return NextResponse.json({
      ok: true,
      database: isSupabase ? "Supabase" : "PostgreSQL",
      urlHint: typeof dbUrl === "string" ? dbUrl.slice(0, 60) + (dbUrl.length > 60 ? "..." : "") : dbUrl,
      tablesExist: true,
      message: "Database connected and Project table exists.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        database: isSupabase ? "Supabase" : "PostgreSQL",
        urlHint: typeof dbUrl === "string" ? dbUrl.slice(0, 60) + (dbUrl.length > 60 ? "..." : "") : dbUrl,
        tablesExist: false,
        error: msg,
        hint: "Run: npx prisma migrate deploy (ensure DATABASE_URL and DIRECT_URL are set)",
      },
      { status: 500 }
    );
  }
}
