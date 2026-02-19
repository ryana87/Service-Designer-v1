import { cookies } from "next/headers";
import {
  DEMO_ACCESS_COOKIE,
  DEMO_USER_SESSION_COOKIE,
  computeDemoAccessToken,
  decodeUserSession,
} from "./demoAuth";
import { getDemoUserById } from "./demoUsers";

export type SessionUser = {
  userId: string;
  userDisplayName: string;
};

/**
 * Get current demo user session from cookies.
 * When DEMO_ACCESS_PASSWORD is not set (local dev), returns a default user so the app works without login.
 * Use in server components, layouts, and server actions.
 */
export async function getSession(): Promise<SessionUser | null> {
  const password = process.env.DEMO_ACCESS_PASSWORD;
  if (!password) {
    return { userId: "ryan", userDisplayName: "Ryan" };
  }

  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DEMO_ACCESS_COOKIE)?.value;
  const expectedToken = await computeDemoAccessToken(password);
  if (accessCookie !== expectedToken) return null;

  const sessionCookie = cookieStore.get(DEMO_USER_SESSION_COOKIE)?.value;
  const decoded = await decodeUserSession(password, sessionCookie);
  if (!decoded) return null;

  const user = getDemoUserById(decoded.userId);
  if (!user) return null;

  return {
    userId: user.id,
    userDisplayName: user.name,
  };
}
