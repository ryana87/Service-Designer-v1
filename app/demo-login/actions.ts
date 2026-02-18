"use server";

import { cookies } from "next/headers";
import { computeDemoAccessToken, DEMO_ACCESS_COOKIE } from "../lib/demoAuth";

export async function loginDemo(password: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const expected = process.env.DEMO_ACCESS_PASSWORD;
  if (!expected) {
    return { success: false, error: "Demo access is not configured." };
  }

  if (password !== expected) {
    return { success: false, error: "Invalid password." };
  }

  const token = await computeDemoAccessToken(password);
  const cookieStore = await cookies();
  cookieStore.set(DEMO_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return { success: true };
}
