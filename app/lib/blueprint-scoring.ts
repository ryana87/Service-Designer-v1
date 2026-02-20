// ============================================
// BLUEPRINT RISK SCORING
// Automation Opportunity, Risk of Rework, Handoff Density
// ============================================

import type {
  BlueprintData,
  BlueprintColumn,
  BlueprintConnection,
  BlueprintPhase,
} from "./validation";

export type BlueprintScores = {
  automationOpportunity: number;
  riskOfRework: "Low" | "Medium" | "High";
  handoffDensity: number;
  manualDecisionCount: number;
  feedbackLoopCount: number;
};

function getAllColumns(phases: BlueprintPhase[]): BlueprintColumn[] {
  return phases.flatMap((p) => p.columns);
}

/** Map cardId -> teamId for cards in teamSections (front/back only). */
function buildCardToTeamMap(columns: BlueprintColumn[]): Map<string, string> {
  const map = new Map<string, string>();
  columns.forEach((col) => {
    col.teamSections.forEach((section) => {
      section.cards.forEach((card) => map.set(card.id, section.teamId));
    });
  });
  return map;
}

export function scoreBlueprint(blueprint: BlueprintData): BlueprintScores {
  const allColumns = getAllColumns(blueprint.phases);
  const cardToTeam = buildCardToTeamMap(allColumns);

  // Manual decision nodes: count decision cards
  let manualDecisionCount = 0;
  allColumns.forEach((col) => {
    manualDecisionCount += col.decisionCards.length;
  });

  // Feedback loops: connections with connectorType === 'feedback'
  const feedbackLoopCount = blueprint.connections.filter(
    (c: BlueprintConnection) => c.connectorType === "feedback"
  ).length;

  // Handoff density: connections where source and target are in different teams (and both in teamSections)
  let handoffDensity = 0;
  blueprint.connections.forEach((conn) => {
    const srcTeam = cardToTeam.get(conn.sourceCardId);
    const tgtTeam = cardToTeam.get(conn.targetCardId);
    if (srcTeam != null && tgtTeam != null && srcTeam !== tgtTeam) {
      handoffDensity++;
    }
  });

  // Automation Opportunity: 0–100, higher = more opportunity (fewer manual decisions, fewer feedback loops, fewer handoffs)
  const decisionPenalty = Math.min(manualDecisionCount * 6, 40);
  const feedbackPenalty = Math.min(feedbackLoopCount * 12, 30);
  const handoffPenalty = Math.min(handoffDensity * 2, 30);
  const automationOpportunity = Math.max(
    0,
    Math.min(100, Math.round(100 - decisionPenalty - feedbackPenalty - handoffPenalty))
  );

  // Risk of Rework: High / Medium / Low
  let riskOfRework: "Low" | "Medium" | "High" = "Low";
  if (feedbackLoopCount > 0 || manualDecisionCount >= 4 || handoffDensity >= 10) {
    riskOfRework = "High";
  } else if (manualDecisionCount >= 2 || handoffDensity >= 5) {
    riskOfRework = "Medium";
  }

  return {
    automationOpportunity,
    riskOfRework,
    handoffDensity,
    manualDecisionCount,
    feedbackLoopCount,
  };
}
