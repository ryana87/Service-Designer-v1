// ============================================
// AUTO-TAGGING OF JOURNEY STEPS
// Rule-based keyword → tag suggestions (no LLM)
// ============================================

export type JourneyStepTagId =
  | "status_gap"
  | "silence_risk"
  | "recontact_risk"
  | "ownership_ambiguity";

export const JOURNEY_STEP_TAGS: { id: JourneyStepTagId; label: string }[] = [
  { id: "status_gap", label: "Status gap" },
  { id: "silence_risk", label: "Silence risk" },
  { id: "recontact_risk", label: "Recontact risk" },
  { id: "ownership_ambiguity", label: "Ownership ambiguity" },
];

// Keywords/phrases that suggest each tag (lowercase, minimal whitespace for matching)
const TAG_KEYWORDS: Record<JourneyStepTagId, string[]> = {
  status_gap: [
    "wait for response",
    "waiting for response",
    "no status",
    "no update",
    "no visibility",
    "waiting",
    "no progress",
    "don't know status",
    "can't see status",
  ],
  silence_risk: [
    "no update",
    "no response",
    "no communication",
    "radio silence",
    "waiting",
    "hear nothing",
    "no feedback",
    "no confirmation",
  ],
  recontact_risk: [
    "have to call back",
    "follow up",
    "repeat",
    "recontact",
    "chase",
    "call again",
    "contact again",
    "follow-up",
    "re-contact",
  ],
  ownership_ambiguity: [
    "who is responsible",
    "no owner",
    "unclear owner",
    "who handles",
    "no clear ownership",
    "who do i contact",
    "who's responsible",
    "no one owns",
    "passed around",
  ],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Suggest tag IDs based on action title, description, or pain point text.
 * Returns tag IDs that matched (rule-based keyword match).
 */
export function suggestTags(text: string | null | undefined): JourneyStepTagId[] {
  if (!text || typeof text !== "string") return [];
  const normalized = normalize(text);
  if (normalized.length === 0) return [];

  const matched = new Set<JourneyStepTagId>();
  for (const [tagId, keywords] of Object.entries(TAG_KEYWORDS) as [JourneyStepTagId, string[]][]) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        matched.add(tagId);
        break;
      }
    }
  }
  return Array.from(matched);
}

/**
 * Optional: default pain point text when user accepts a tag (for "Add as pain point" from tag).
 */
export const TAG_DEFAULT_PAIN_POINT: Record<
  JourneyStepTagId,
  { text: string; severity: "LOW" | "MEDIUM" | "HIGH" }
> = {
  status_gap: { text: "No visibility of progress or status", severity: "MEDIUM" },
  silence_risk: { text: "No updates while waiting; risk of perceived silence", severity: "HIGH" },
  recontact_risk: { text: "Customer may need to recontact or repeat context", severity: "MEDIUM" },
  ownership_ambiguity: { text: "Unclear who owns this step or outcome", severity: "MEDIUM" },
};
