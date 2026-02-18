/**
 * Demo access token computation for password gate.
 * Used by middleware (Edge) and login server action (Node).
 */
export const DEMO_ACCESS_COOKIE = "demo_access";

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
