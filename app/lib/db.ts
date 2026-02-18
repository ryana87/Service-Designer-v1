import path from "path";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Resolve file: URLs to absolute paths so they work regardless of cwd (Next.js, serverless, etc.)
function resolveDbUrl(url: string): string {
  if (url.startsWith("file:")) {
    const p = url.slice(5); // strip "file:"
    if (!path.isAbsolute(p)) {
      const abs = path.join(process.cwd(), p);
      return `file:${abs.replace(/\\/g, "/")}`;
    }
  }
  return url;
}

const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const isTurso = rawUrl.startsWith("libsql://");

const adapter = isTurso
  ? new PrismaLibSql({
      url: rawUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  : new PrismaLibSql({ url: resolveDbUrl(rawUrl) });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
