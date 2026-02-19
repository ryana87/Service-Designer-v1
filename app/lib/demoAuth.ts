/**
 * Demo access token computation for password gate.
 * Used by middleware (Edge) and login server action (Node).
 */
export const DEMO_ACCESS_COOKIE = "demo_access";

/**
 * Cookie for user session (userId) after second-step login.
 * Value is signed so middleware can verify without Node APIs.
 */
export const DEMO_USER_SESSION_COOKIE = "demo_user_session";

export async function computeDemoAccessToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("sd4_demo_access")
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

const SESSION_PREFIX = "sd4_user_";

/**
 * Encode a signed user session value for the cookie.
 * Uses HMAC-SHA256 so Edge middleware can verify.
 */
export async function encodeUserSession(
  password: string,
  userId: string
): Promise<string> {
  const encoder = new TextEncoder();
  const payload = SESSION_PREFIX + userId;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return payload + "." + sigB64;
}

/**
 * Decode and verify user session cookie. Returns userId or null.
 * Safe to call from Edge (middleware) and Node (server components/actions).
 */
export async function decodeUserSession(
  password: string,
  cookieValue: string | undefined
): Promise<{ userId: string } | null> {
  if (!cookieValue || !cookieValue.includes(".")) return null;
  const [payload, sigB64] = cookieValue.split(".");
  if (!payload.startsWith(SESSION_PREFIX)) return null;
  const userId = payload.slice(SESSION_PREFIX.length);
  const expected = await encodeUserSession(password, userId);
  if (cookieValue !== expected) return null;
  return { userId };
}
