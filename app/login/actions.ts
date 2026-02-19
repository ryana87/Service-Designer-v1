"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  DEMO_ACCESS_COOKIE,
  DEMO_USER_SESSION_COOKIE,
  computeDemoAccessToken,
  encodeUserSession,
} from "../lib/demoAuth";
import { getDemoUserById, getDemoUserByName, isValidDemoUserId } from "../lib/demoUsers";

const DEMO_PASSWORD = "demo"; // Fixed fake password for demo user sign-in

export type LoginResult =
  | { success: true }
  | { success: false; error: string };

export async function loginWithUser(
  usernameOrId: string,
  password: string
): Promise<LoginResult> {
  const envPassword = process.env.DEMO_ACCESS_PASSWORD;
  if (!envPassword) {
    return { success: false, error: "Demo access is not configured." };
  }

  // Must have passed first gate (demo_access cookie set by demo-login)
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DEMO_ACCESS_COOKIE)?.value;
  const expectedToken = await computeDemoAccessToken(envPassword);
  if (accessCookie !== expectedToken) {
    return { success: false, error: "Please complete the first login step." };
  }

  if (password !== DEMO_PASSWORD) {
    return { success: false, error: "Invalid password." };
  }

  const user =
    getDemoUserByName(usernameOrId) ?? (isValidDemoUserId(usernameOrId) ? getDemoUserById(usernameOrId) : null);
  if (!user) {
    return { success: false, error: "Please select a user from the list." };
  }

  const sessionValue = await encodeUserSession(envPassword, user.id);
  cookieStore.set(DEMO_USER_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_USER_SESSION_COOKIE);
  redirect("/login");
}
