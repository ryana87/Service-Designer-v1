// ============================================
// SCRIPTED PERSONA CHAT — Frontline Service Specialist only
// No LLM; deterministic responses. Archetypes: Sage, Connector, Pragmatist.
// ============================================

import { PERSONA_TEMPLATE_ID_FRONTLINE } from "./persona-library";

export const DEMO_CHAT_ALLOWED_TEMPLATE_ID = PERSONA_TEMPLATE_ID_FRONTLINE;

export type PersonaChatArchetype = "pragmatist" | "connector" | "sage";

export const ARCHETYPE_OPTIONS: { value: PersonaChatArchetype; label: string }[] = [
  { value: "pragmatist", label: "The Pragmatist" },
  { value: "connector", label: "The Connector" },
  { value: "sage", label: "The Office Sage" },
];

// Suggested chips per archetype (exact text from spec)
export const SUGGESTED_CHIPS: Record<PersonaChatArchetype, string[]> = {
  pragmatist: [
    "Where do you waste the most time in this process?",
    "What feels unnecessarily manual or repetitive?",
    "What would make the biggest practical difference tomorrow?",
  ],
  connector: [
    "Where do handoffs break down between teams?",
    "What information is missing at key transitions?",
    "Where does misunderstanding create rework?",
  ],
  sage: [
    "What risks do you see in this journey?",
    "What recurring issues does this remind you of?",
    "Where could governance or accountability fail?",
  ],
};

// Scripted responses: prompt text (normalized) -> response
// Keys are normalized (lowercase, trim) for matching.
const PRAGMATIST_RESPONSES: Record<string, string> = {
  "where do you waste the most time in this process?":
    "The biggest time drain is reading through free-text submissions and trying to interpret what the customer actually needs. If key details are missing, I have to email them back. That back-and-forth slows everything down.",
  "what feels unnecessarily manual or repetitive?":
    "We often re-enter information that's already in the form. There's no structured tagging or automatic routing, so we're manually deciding where everything goes.",
  "what would make the biggest practical difference tomorrow?":
    "Structured intake fields and automatic routing. If the system could categorise the enquiry properly upfront, I wouldn't need to manually interpret and redirect it.",
};

const CONNECTOR_RESPONSES: Record<string, string> = {
  "where do handoffs break down between teams?":
    "They break down during triage. When I pass something to another team, they don't always get the full context, so they either send it back or ask the customer for more information.",
  "what information is missing at key transitions?":
    "There's no shared summary of what's already happened. The receiving team doesn't always know if we've clarified details or what the customer's urgency is.",
  "where does misunderstanding create rework?":
    "When intent isn't clear in the original submission. Different teams interpret the request differently, and that creates unnecessary bouncing between areas.",
};

const SAGE_RESPONSES: Record<string, string> = {
  "what risks do you see in this journey?":
    "The lack of reference numbers and status updates increases follow-up contacts. That inflates workload and creates reputational risk if customers feel ignored.",
  "what recurring issues does this remind you of?":
    "We've seen this before — when intake isn't structured, we rely on individual judgement. Over time, that creates inconsistency and workarounds.",
  "where could governance or accountability fail?":
    "If an enquiry sits unassigned during triage, there's no clear visibility of ownership. Without traceability, issues can escalate quietly.",
};

function normalizePrompt(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getScriptedResponse(
  prompt: string,
  archetype: PersonaChatArchetype
): string | null {
  const key = normalizePrompt(prompt);
  const pragmatist = PRAGMATIST_RESPONSES[key];
  if (pragmatist) return pragmatist;
  const connector = CONNECTOR_RESPONSES[key];
  if (connector) return connector;
  const sage = SAGE_RESPONSES[key];
  if (sage) return sage;
  return null;
}

export function getAllScriptedChips(): string[] {
  const set = new Set<string>();
  for (const arr of Object.values(SUGGESTED_CHIPS)) {
    arr.forEach((c) => set.add(c));
  }
  return Array.from(set);
}
