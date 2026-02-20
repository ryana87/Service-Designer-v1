// ============================================
// WHAT CHANGED NARRATIVE
// Structured diff + template-based executive summary (no LLM for Phase 1)
// ============================================

export type WhatChangedNarrative = {
  beforeLabel: string;
  afterLabel: string;
  operationalDelta: string;
  experienceDelta: string;
  automationDelta: string;
  riskDelta: string;
  bullets: string[];
};

// Minimal shapes for diff (journey)
export type JourneyForDiff = {
  name: string;
  phases: {
    title: string;
    actions: {
      title: string;
      description: string | null;
      emotion: number | null;
      painPoints: string | null;
      opportunities: string | null;
    }[];
  }[];
};

// Minimal shapes for diff (blueprint)
export type BlueprintForDiff = {
  name: string;
  phases: {
    title: string;
    columns: {
      basicCards: { laneType: string }[];
      teamSections: { laneType: string; cards: unknown[] }[];
      decisionCards: unknown[];
    }[];
  }[];
};

function countPainPoints(painPointsJson: string | null): number {
  if (!painPointsJson) return 0;
  try {
    const arr = JSON.parse(painPointsJson);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

function countOpportunities(opportunitiesJson: string | null): number {
  if (!opportunitiesJson) return 0;
  try {
    const arr = JSON.parse(opportunitiesJson);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

export function buildJourneyDiff(left: JourneyForDiff, right: JourneyForDiff) {
  const leftPhases = left.phases.length;
  const rightPhases = right.phases.length;
  const leftActions = left.phases.reduce((s, p) => s + p.actions.length, 0);
  const rightActions = right.phases.reduce((s, p) => s + p.actions.length, 0);
  const leftPainTotal = left.phases.reduce(
    (s, p) => s + p.actions.reduce((a, ac) => a + countPainPoints(ac.painPoints), 0),
    0
  );
  const rightPainTotal = right.phases.reduce(
    (s, p) => s + p.actions.reduce((a, ac) => a + countPainPoints(ac.painPoints), 0),
    0
  );
  const leftOppTotal = left.phases.reduce(
    (s, p) => s + p.actions.reduce((a, ac) => a + countOpportunities(ac.opportunities), 0),
    0
  );
  const rightOppTotal = right.phases.reduce(
    (s, p) => s + p.actions.reduce((a, ac) => a + countOpportunities(ac.opportunities), 0),
    0
  );
  const leftEmotions = left.phases.flatMap((p) => p.actions.map((a) => a.emotion).filter((e): e is number => e != null));
  const rightEmotions = right.phases.flatMap((p) => p.actions.map((a) => a.emotion).filter((e): e is number => e != null));
  const leftAvgEmotion = leftEmotions.length ? leftEmotions.reduce((a, b) => a + b, 0) / leftEmotions.length : 0;
  const rightAvgEmotion = rightEmotions.length ? rightEmotions.reduce((a, b) => a + b, 0) / rightEmotions.length : 0;

  return {
    phaseCountDelta: rightPhases - leftPhases,
    leftPhases,
    rightPhases,
    actionCountDelta: rightActions - leftActions,
    leftActions,
    rightActions,
    painPointsDelta: rightPainTotal - leftPainTotal,
    leftPainTotal,
    rightPainTotal,
    opportunitiesDelta: rightOppTotal - leftOppTotal,
    leftOppTotal,
    rightOppTotal,
    avgEmotionDelta: rightAvgEmotion - leftAvgEmotion,
    leftAvgEmotion,
    rightAvgEmotion,
    phaseTitlesLeft: left.phases.map((p) => p.title),
    phaseTitlesRight: right.phases.map((p) => p.title),
  };
}

export function buildBlueprintDiff(left: BlueprintForDiff, right: BlueprintForDiff) {
  const leftPhases = left.phases.length;
  const rightPhases = right.phases.length;
  const leftColumns = left.phases.reduce((s, p) => s + p.columns.length, 0);
  const rightColumns = right.phases.reduce((s, p) => s + p.columns.length, 0);

  const countCards = (bp: BlueprintForDiff) => {
    let n = 0;
    for (const phase of bp.phases) {
      for (const col of phase.columns) {
        n += col.basicCards.length;
        n += col.decisionCards.length;
        for (const ts of col.teamSections) n += ts.cards.length;
      }
    }
    return n;
  };
  const leftCards = countCards(left);
  const rightCards = countCards(right);

  const countBackstage = (bp: BlueprintForDiff) => {
    let n = 0;
    for (const phase of bp.phases) {
      for (const col of phase.columns) {
        for (const ts of col.teamSections) {
          if (ts.laneType === "BACKSTAGE_ACTION") n += ts.cards.length;
        }
      }
    }
    return n;
  };
  const leftBackstage = countBackstage(left);
  const rightBackstage = countBackstage(right);

  const countDecisions = (bp: BlueprintForDiff) => {
    let n = 0;
    for (const phase of bp.phases) {
      for (const col of phase.columns) n += col.decisionCards.length;
    }
    return n;
  };
  const leftDecisions = countDecisions(left);
  const rightDecisions = countDecisions(right);

  return {
    phaseCountDelta: rightPhases - leftPhases,
    leftPhases,
    rightPhases,
    columnCountDelta: rightColumns - leftColumns,
    leftColumns,
    rightColumns,
    cardCountDelta: rightCards - leftCards,
    leftCards,
    rightCards,
    backstageDelta: rightBackstage - leftBackstage,
    leftBackstage,
    rightBackstage,
    decisionCountDelta: rightDecisions - leftDecisions,
    leftDecisions,
    rightDecisions,
    phaseTitlesLeft: left.phases.map((p) => p.title),
    phaseTitlesRight: right.phases.map((p) => p.title),
  };
}

export function buildNarrativeFromJourneyDiff(
  leftName: string,
  rightName: string,
  leftLabel: string,
  rightLabel: string,
  diff: ReturnType<typeof buildJourneyDiff>
): WhatChangedNarrative {
  const bullets: string[] = [];
  if (diff.phaseCountDelta !== 0) {
    bullets.push(`Phases: ${diff.leftPhases} → ${diff.rightPhases} (${diff.phaseCountDelta > 0 ? "+" : ""}${diff.phaseCountDelta}).`);
  }
  if (diff.actionCountDelta !== 0) {
    bullets.push(`Actions: ${diff.leftActions} → ${diff.rightActions} (${diff.actionCountDelta > 0 ? "+" : ""}${diff.actionCountDelta}).`);
  }
  if (diff.painPointsDelta !== 0) {
    bullets.push(`Pain points: ${diff.leftPainTotal} → ${diff.rightPainTotal} (${diff.painPointsDelta > 0 ? "+" : ""}${diff.painPointsDelta}).`);
  }
  if (diff.opportunitiesDelta !== 0) {
    bullets.push(`Opportunities: ${diff.leftOppTotal} → ${diff.rightOppTotal} (${diff.opportunitiesDelta > 0 ? "+" : ""}${diff.opportunitiesDelta}).`);
  }
  if (diff.avgEmotionDelta !== 0) {
    bullets.push(`Average emotion: ${diff.leftAvgEmotion.toFixed(1)} → ${diff.rightAvgEmotion.toFixed(1)}.`);
  }

  let operationalDelta = "No structural change.";
  if (diff.phaseCountDelta !== 0 || diff.actionCountDelta !== 0) {
    operationalDelta = `Phase count ${diff.phaseCountDelta !== 0 ? `changed (${diff.leftPhases} → ${diff.rightPhases})` : "unchanged"}. Action count ${diff.actionCountDelta !== 0 ? `changed (${diff.leftActions} → ${diff.rightActions})` : "unchanged"}.`;
  }

  let experienceDelta = "Experience metrics unchanged.";
  if (diff.painPointsDelta < 0 || diff.avgEmotionDelta > 0) {
    const parts: string[] = [];
    if (diff.painPointsDelta < 0) parts.push("Pain points reduced.");
    if (diff.avgEmotionDelta > 0) parts.push("Emotion score improved.");
    experienceDelta = parts.join(" ");
  } else if (diff.painPointsDelta > 0 || diff.avgEmotionDelta < 0) {
    const parts: string[] = [];
    if (diff.painPointsDelta > 0) parts.push("Pain points increased.");
    if (diff.avgEmotionDelta < 0) parts.push("Emotion score decreased.");
    experienceDelta = parts.join(" ");
  }

  let automationDelta = "No automation delta inferred from journey alone.";
  if (diff.opportunitiesDelta > 0) {
    automationDelta = `More improvement opportunities captured (${diff.leftOppTotal} → ${diff.rightOppTotal}), suggesting automation or process improvements.`;
  }

  let riskDelta = "Risk unchanged or not inferred.";
  if (diff.painPointsDelta < 0) {
    riskDelta = "Fewer pain points may indicate reduced customer and operational risk.";
  } else if (diff.painPointsDelta > 0) {
    riskDelta = "More pain points may indicate higher risk or better visibility of issues.";
  }

  return {
    beforeLabel: leftLabel,
    afterLabel: rightLabel,
    operationalDelta,
    experienceDelta,
    automationDelta,
    riskDelta,
    bullets: bullets.length ? bullets : ["No structural or metric changes detected."],
  };
}

export function buildNarrativeFromBlueprintDiff(
  leftName: string,
  rightName: string,
  leftLabel: string,
  rightLabel: string,
  diff: ReturnType<typeof buildBlueprintDiff>
): WhatChangedNarrative {
  const bullets: string[] = [];
  if (diff.phaseCountDelta !== 0) {
    bullets.push(`Phases: ${diff.leftPhases} → ${diff.rightPhases} (${diff.phaseCountDelta > 0 ? "+" : ""}${diff.phaseCountDelta}).`);
  }
  if (diff.columnCountDelta !== 0) {
    bullets.push(`Steps (columns): ${diff.leftColumns} → ${diff.rightColumns} (${diff.columnCountDelta > 0 ? "+" : ""}${diff.columnCountDelta}).`);
  }
  if (diff.cardCountDelta !== 0) {
    bullets.push(`Total cards: ${diff.leftCards} → ${diff.rightCards} (${diff.cardCountDelta > 0 ? "+" : ""}${diff.cardCountDelta}).`);
  }
  if (diff.backstageDelta !== 0) {
    bullets.push(`Backstage actions: ${diff.leftBackstage} → ${diff.rightBackstage} (${diff.backstageDelta > 0 ? "+" : ""}${diff.backstageDelta}).`);
  }
  if (diff.decisionCountDelta !== 0) {
    bullets.push(`Decision points: ${diff.leftDecisions} → ${diff.rightDecisions} (${diff.decisionCountDelta > 0 ? "+" : ""}${diff.decisionCountDelta}).`);
  }

  let operationalDelta = "No structural change.";
  if (diff.phaseCountDelta !== 0 || diff.columnCountDelta !== 0 || diff.backstageDelta !== 0) {
    const parts: string[] = [];
    if (diff.phaseCountDelta !== 0) parts.push(`Phases ${diff.leftPhases} → ${diff.rightPhases}.`);
    if (diff.backstageDelta !== 0) parts.push(`Backstage steps ${diff.leftBackstage} → ${diff.rightBackstage}.`);
    operationalDelta = parts.length ? parts.join(" ") : operationalDelta;
  }

  let experienceDelta = "Blueprint comparison focuses on operations; experience delta is inferred from structure (e.g. more steps may mean clearer customer-facing flow).";
  if (diff.columnCountDelta > 0) {
    experienceDelta = "More steps in the blueprint may reflect a more detailed or guided experience.";
  }

  let automationDelta = "No automation delta inferred.";
  if (diff.decisionCountDelta !== 0) {
    automationDelta = `Decision points changed (${diff.leftDecisions} → ${diff.rightDecisions}); may reflect routing or automation changes.`;
  }
  if (diff.backstageDelta > 0) {
    automationDelta = (automationDelta === "No automation delta inferred." ? "" : automationDelta + " ") + `More backstage actions (${diff.leftBackstage} → ${diff.rightBackstage}) may indicate new automation or support processes.`;
  }

  let riskDelta = "Risk unchanged or not inferred.";
  if (diff.decisionCountDelta < 0) {
    riskDelta = "Fewer decision points may reduce rework or routing risk.";
  } else if (diff.decisionCountDelta > 0) {
    riskDelta = "More decision points may increase clarity or add routing complexity.";
  }

  return {
    beforeLabel: leftLabel,
    afterLabel: rightLabel,
    operationalDelta,
    experienceDelta,
    automationDelta,
    riskDelta,
    bullets: bullets.length ? bullets : ["No structural changes detected."],
  };
}

/** Produce a single markdown string for the executive summary. */
export function narrativeToMarkdown(n: WhatChangedNarrative, beforeName: string, afterName: string): string {
  const lines: string[] = [
    "# What Changed",
    "",
    `**Before (${n.beforeLabel}):** ${beforeName}`,
    `**After (${n.afterLabel}):** ${afterName}`,
    "",
    "## Operational delta",
    n.operationalDelta,
    "",
    "## Experience delta",
    n.experienceDelta,
    "",
    "## Automation delta",
    n.automationDelta,
    "",
    "## Risk delta",
    n.riskDelta,
    "",
    "## Summary",
    ...n.bullets.map((b) => `- ${b}`),
  ];
  return lines.join("\n");
}
