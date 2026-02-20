// ============================================
// JOURNEY → BLUEPRINT AUTO-DERIVATION
// From journey map (phases, actions, pain points, opportunities) → BlueprintDraftSpec
// ============================================

import type { BlueprintDraftSpec, BlueprintLaneType } from "../onboarding/types";
import type { JourneyMapData } from "./validation";

function parsePainPoints(painPointsJson: string | null): { text: string }[] {
  if (!painPointsJson) return [];
  try {
    const arr = JSON.parse(painPointsJson);
    if (!Array.isArray(arr)) return [];
    return arr.map((p: { text?: string }) => ({ text: typeof p?.text === "string" ? p.text : "" })).filter((p) => p.text);
  } catch {
    return [];
  }
}

function parseOpportunities(opportunitiesJson: string | null): { text: string }[] {
  if (!opportunitiesJson) return [];
  try {
    const arr = JSON.parse(opportunitiesJson);
    if (!Array.isArray(arr)) return [];
    return arr.map((o: { text?: string }) => ({ text: typeof o?.text === "string" ? o.text : "" })).filter((o) => o.text);
  } catch {
    return [];
  }
}

/** Titles that indicate the customer is passive/waiting; no customer-action card (implied). */
const PASSIVE_CUSTOMER_PHRASES = /^(wait(\s+for\s+(response|reply|update))?|waiting|no\s+action|—)$/i;

/**
 * Derive a suggested BlueprintDraftSpec from a journey map.
 * Maps phases → phases, actions → steps; infers backstage/support from pain points and opportunities.
 */
export function deriveBlueprintFromJourney(journey: JourneyMapData): BlueprintDraftSpec {
  const teams = [{ name: "Frontstage Team" }, { name: "Backstage Team" }];

  const phases = journey.phases.map((phase) => {
    const steps = phase.actions.map((action) => {
      const painPoints = parsePainPoints(action.painPoints);
      const opportunities = parseOpportunities(action.opportunities);

      const isPassive = PASSIVE_CUSTOMER_PHRASES.test(action.title?.trim() ?? "");
      const customerAction = isPassive ? [] : [{ title: action.title, description: action.description ?? undefined }];
      const physicalEvidence = action.channel || action.touchpoint
        ? [{ title: [action.channel, action.touchpoint].filter(Boolean).join(" / ") || "—", description: undefined }]
        : [];

      const supportItems = [
        ...painPoints.slice(0, 2).map((p) => ({ title: `Pain: ${p.text.slice(0, 60)}${p.text.length > 60 ? "…" : ""}`, description: undefined })),
        ...opportunities.slice(0, 2).map((o) => ({ title: `Opportunity: ${o.text.slice(0, 50)}${o.text.length > 50 ? "…" : ""}`, description: undefined })),
      ];
      const supportProcess = supportItems.length > 0 ? supportItems : [{ title: "System rules apply", description: undefined }];

      const frontstage = [{ title: "Support responds", description: action.thought ?? undefined, teamName: "Frontstage Team" }];
      const backstageTitles: string[] = [];
      if (painPoints.some((p) => /wait|status|update|visibility/i.test(p.text))) {
        backstageTitles.push("Send status update");
      }
      if (painPoints.some((p) => /manual|triage|interpret|route/i.test(p.text))) {
        backstageTitles.push("Triage and route");
      }
      if (opportunities.some((o) => /routing|route|intent/i.test(o.text))) {
        backstageTitles.push("Auto-route by intent");
      }
      if (backstageTitles.length === 0) backstageTitles.push("Process request");
      const backstage = backstageTitles.map((title) => ({ title, description: undefined, teamName: "Backstage Team" }));

      const lanes: Partial<Record<BlueprintLaneType, { title: string; description?: string | null; teamName?: string | null }[]>> = {
        PHYSICAL_EVIDENCE: physicalEvidence.length ? physicalEvidence : [{ title: "—", description: undefined }],
        ...(customerAction.length > 0 && { CUSTOMER_ACTION: customerAction }),
        FRONTSTAGE_ACTION: frontstage,
        BACKSTAGE_ACTION: backstage,
        SUPPORT_PROCESS: supportProcess,
      };

      return { label: action.title, lanes };
    });

    return {
      title: phase.title,
      timeframe: phase.timeframe ?? undefined,
      steps,
    };
  });

  return {
    name: `${journey.name} (Blueprint)`,
    teams,
    phases,
  };
}
