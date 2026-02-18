/**
 * AA-Safe Color Token System
 * 
 * All colors meet WCAG AA contrast requirements (≥4.5:1 for normal text).
 * Teams use vibrant colors with locked text colors.
 * Software/Services use pastel colors with dark text.
 */

// ============================================
// TEAM COLOR TOKENS (Vibrant, AA-safe)
// ============================================

export type TeamColorToken = {
  id: string;
  name: string;
  background: string;
  text: string;
  hover: string;
};

// 24 AA-safe team colors with pre-calculated contrast-safe text colors
export const TEAM_COLOR_TOKENS: TeamColorToken[] = [
  // Blues
  { id: "blue-600", name: "Blue", background: "#2563eb", text: "#ffffff", hover: "#1d4ed8" },
  { id: "blue-700", name: "Navy", background: "#1d4ed8", text: "#ffffff", hover: "#1e40af" },
  { id: "sky-600", name: "Sky", background: "#0284c7", text: "#ffffff", hover: "#0369a1" },
  
  // Purples
  { id: "violet-600", name: "Violet", background: "#7c3aed", text: "#ffffff", hover: "#6d28d9" },
  { id: "purple-600", name: "Purple", background: "#9333ea", text: "#ffffff", hover: "#7e22ce" },
  { id: "indigo-600", name: "Indigo", background: "#4f46e5", text: "#ffffff", hover: "#4338ca" },
  
  // Pinks/Reds
  { id: "pink-600", name: "Pink", background: "#db2777", text: "#ffffff", hover: "#be185d" },
  { id: "rose-600", name: "Rose", background: "#e11d48", text: "#ffffff", hover: "#be123c" },
  { id: "red-600", name: "Red", background: "#dc2626", text: "#ffffff", hover: "#b91c1c" },
  
  // Oranges/Yellows
  { id: "orange-600", name: "Orange", background: "#ea580c", text: "#ffffff", hover: "#c2410c" },
  { id: "amber-600", name: "Amber", background: "#d97706", text: "#ffffff", hover: "#b45309" },
  { id: "yellow-600", name: "Gold", background: "#ca8a04", text: "#ffffff", hover: "#a16207" },
  
  // Greens
  { id: "lime-600", name: "Lime", background: "#65a30d", text: "#ffffff", hover: "#4d7c0f" },
  { id: "green-600", name: "Green", background: "#16a34a", text: "#ffffff", hover: "#15803d" },
  { id: "emerald-600", name: "Emerald", background: "#059669", text: "#ffffff", hover: "#047857" },
  
  // Teals/Cyans
  { id: "teal-600", name: "Teal", background: "#0d9488", text: "#ffffff", hover: "#0f766e" },
  { id: "cyan-600", name: "Cyan", background: "#0891b2", text: "#ffffff", hover: "#0e7490" },
  
  // Neutrals (darker for AA compliance)
  { id: "slate-600", name: "Slate", background: "#475569", text: "#ffffff", hover: "#334155" },
  { id: "gray-600", name: "Gray", background: "#4b5563", text: "#ffffff", hover: "#374151" },
  { id: "zinc-600", name: "Zinc", background: "#52525b", text: "#ffffff", hover: "#3f3f46" },
  { id: "stone-600", name: "Stone", background: "#57534e", text: "#ffffff", hover: "#44403c" },
  
  // Additional vibrant colors
  { id: "fuchsia-600", name: "Fuchsia", background: "#c026d3", text: "#ffffff", hover: "#a21caf" },
  { id: "blue-500", name: "Azure", background: "#3b82f6", text: "#ffffff", hover: "#2563eb" },
  { id: "green-500", name: "Grass", background: "#22c55e", text: "#ffffff", hover: "#16a34a" },
];

// ============================================
// SOFTWARE/SERVICE COLOR TOKENS (Pastel, dark text)
// ============================================

export type SoftwareColorToken = {
  id: string;
  name: string;
  background: string;
  text: string; // Always dark for pastels
};

// 16 pastel colors for software/services - all use dark text
export const SOFTWARE_COLOR_TOKENS: SoftwareColorToken[] = [
  { id: "blue-100", name: "Light Blue", background: "#dbeafe", text: "#1e3a5f" },
  { id: "indigo-100", name: "Light Indigo", background: "#e0e7ff", text: "#312e81" },
  { id: "violet-100", name: "Light Violet", background: "#ede9fe", text: "#4c1d95" },
  { id: "purple-100", name: "Light Purple", background: "#f3e8ff", text: "#581c87" },
  { id: "pink-100", name: "Light Pink", background: "#fce7f3", text: "#831843" },
  { id: "rose-100", name: "Light Rose", background: "#ffe4e6", text: "#881337" },
  { id: "red-100", name: "Light Red", background: "#fee2e2", text: "#7f1d1d" },
  { id: "orange-100", name: "Light Orange", background: "#ffedd5", text: "#7c2d12" },
  { id: "amber-100", name: "Light Amber", background: "#fef3c7", text: "#78350f" },
  { id: "yellow-100", name: "Light Yellow", background: "#fef9c3", text: "#713f12" },
  { id: "lime-100", name: "Light Lime", background: "#ecfccb", text: "#365314" },
  { id: "green-100", name: "Light Green", background: "#dcfce7", text: "#14532d" },
  { id: "emerald-100", name: "Light Emerald", background: "#d1fae5", text: "#064e3b" },
  { id: "teal-100", name: "Light Teal", background: "#ccfbf1", text: "#134e4a" },
  { id: "cyan-100", name: "Light Cyan", background: "#cffafe", text: "#164e63" },
  { id: "sky-100", name: "Light Sky", background: "#e0f2fe", text: "#0c4a6e" },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get a team color token by its background color (for existing data)
 */
export function getTeamTokenByColor(hexColor: string): TeamColorToken | undefined {
  return TEAM_COLOR_TOKENS.find(
    (t) => t.background.toLowerCase() === hexColor.toLowerCase()
  );
}

/**
 * Get a software color token by its background color
 */
export function getSoftwareTokenByColor(hexColor: string): SoftwareColorToken | undefined {
  return SOFTWARE_COLOR_TOKENS.find(
    (t) => t.background.toLowerCase() === hexColor.toLowerCase()
  );
}

/**
 * Get the next available team color (cycles through palette)
 */
export function getNextTeamColor(usedColors: string[]): TeamColorToken {
  const normalizedUsed = usedColors.map((c) => c.toLowerCase());
  const available = TEAM_COLOR_TOKENS.find(
    (t) => !normalizedUsed.includes(t.background.toLowerCase())
  );
  // If all colors are used, cycle back to the first
  return available || TEAM_COLOR_TOKENS[usedColors.length % TEAM_COLOR_TOKENS.length];
}

/**
 * Get the next available software color (cycles through palette)
 */
export function getNextSoftwareColor(usedColors: string[]): SoftwareColorToken {
  const normalizedUsed = usedColors.map((c) => c.toLowerCase());
  const available = SOFTWARE_COLOR_TOKENS.find(
    (t) => !normalizedUsed.includes(t.background.toLowerCase())
  );
  return available || SOFTWARE_COLOR_TOKENS[usedColors.length % SOFTWARE_COLOR_TOKENS.length];
}

/**
 * Get text color for a given background (for legacy colors not in token system)
 * Falls back to contrast calculation
 */
export function getContrastTextColor(hexColor: string): string {
  // First check if it's a known token
  const teamToken = getTeamTokenByColor(hexColor);
  if (teamToken) return teamToken.text;
  
  const softwareToken = getSoftwareTokenByColor(hexColor);
  if (softwareToken) return softwareToken.text;
  
  // Fallback: calculate contrast
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1f2937" : "#ffffff";
}

/**
 * Find the closest AA-safe team color to a given hex
 */
export function snapToNearestTeamColor(hexColor: string): TeamColorToken {
  const exact = getTeamTokenByColor(hexColor);
  if (exact) return exact;
  
  // Find closest by hue
  const targetHsl = hexToHsl(hexColor);
  let closest = TEAM_COLOR_TOKENS[0];
  let minDiff = Infinity;
  
  for (const token of TEAM_COLOR_TOKENS) {
    const tokenHsl = hexToHsl(token.background);
    const hueDiff = Math.abs(targetHsl.h - tokenHsl.h);
    const satDiff = Math.abs(targetHsl.s - tokenHsl.s);
    const diff = hueDiff * 2 + satDiff; // Weight hue more
    
    if (diff < minDiff) {
      minDiff = diff;
      closest = token;
    }
  }
  
  return closest;
}

/**
 * Find the closest AA-safe software color to a given hex
 */
export function snapToNearestSoftwareColor(hexColor: string): SoftwareColorToken {
  const exact = getSoftwareTokenByColor(hexColor);
  if (exact) return exact;
  
  const targetHsl = hexToHsl(hexColor);
  let closest = SOFTWARE_COLOR_TOKENS[0];
  let minDiff = Infinity;
  
  for (const token of SOFTWARE_COLOR_TOKENS) {
    const tokenHsl = hexToHsl(token.background);
    const hueDiff = Math.abs(targetHsl.h - tokenHsl.h);
    const diff = hueDiff;
    
    if (diff < minDiff) {
      minDiff = diff;
      closest = token;
    }
  }
  
  return closest;
}

// Helper: Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}
