/**
 * Fixed list of demo users for the login picker.
 * No DB table; used for display and session lookup.
 */
export const DEMO_USERS = [
  { id: "ryan", name: "Ryan" },
  { id: "fleur", name: "Fleur" },
  { id: "liam", name: "Liam" },
  { id: "riley", name: "Riley" },
  { id: "zoe", name: "Zoe" },
  { id: "sam", name: "Sam" },
] as const;

export type DemoUserId = (typeof DEMO_USERS)[number]["id"];

export function getDemoUserById(id: string): { id: string; name: string } | null {
  return DEMO_USERS.find((u) => u.id === id) ?? null;
}

export function getDemoUserByName(name: string): { id: string; name: string } | null {
  const lower = name.trim().toLowerCase();
  return DEMO_USERS.find((u) => u.name.toLowerCase() === lower) ?? null;
}

export function isValidDemoUserId(id: string): boolean {
  return DEMO_USERS.some((u) => u.id === id);
}
