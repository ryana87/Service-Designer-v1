// ============================================
// VALIDATION UTILITIES - Phase 9.1
// Model Validation, Integrity & Insight
// ============================================

// ============================================
// TYPES
// ============================================

export type InsightSeverity = "info" | "warning";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  message: string;
  category: "structure" | "flow" | "content";
  elementId?: string;
  elementType?: "phase" | "action" | "column" | "card" | "connection";
  dismissed?: boolean;
};

// Pain Point type (shared)
export type PainPoint = {
  text: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

// Journey Map Types
export type JourneyMapAction = {
  id: string;
  title: string;
  description: string | null;
  thought: string | null;
  channel: string | null;
  touchpoint: string | null;
  emotion: number | null;
  painPoints: string | null;
  opportunities: string | null;
  quotes: { id: string; quoteText: string; source: string | null }[];
};

export type JourneyMapPhase = {
  id: string;
  title: string;
  timeframe: string | null;
  actions: JourneyMapAction[];
};

export type JourneyMapData = {
  id: string;
  name: string;
  phases: JourneyMapPhase[];
};

// Blueprint Types
export type BasicCard = {
  id: string;
  laneType: string;
  title: string;
  description: string | null;
  painPoints: string | null;
};

export type ComplexCard = {
  id: string;
  title: string;
  description: string | null;
  painPoints: string | null;
  softwareIds: string | null;
};

export type TeamSection = {
  id: string;
  laneType: string;
  teamId: string;
  team: { id: string; name: string };
  cards: ComplexCard[];
};

export type DecisionCard = {
  id: string;
  laneType: string;
  title: string;
  question: string;
  description: string | null;
};

export type BlueprintColumn = {
  id: string;
  order: number;
  basicCards: BasicCard[];
  decisionCards: DecisionCard[];
  teamSections: TeamSection[];
};

export type BlueprintPhase = {
  id: string;
  title: string;
  timeframe: string | null;
  columns: BlueprintColumn[];
};

export type BlueprintConnection = {
  id: string;
  sourceCardId: string;
  sourceCardType: string;
  targetCardId: string;
  targetCardType: string;
  connectorType: string;
  label: string | null;
};

export type BlueprintData = {
  id: string;
  name: string;
  phases: BlueprintPhase[];
  connections: BlueprintConnection[];
};

// ============================================
// HELPER: Parse pain points JSON
// ============================================

function parsePainPoints(painPointsJson: string | null): PainPoint[] {
  if (!painPointsJson) return [];
  try {
    const parsed = JSON.parse(painPointsJson);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    // Old plain text format - treat as no structured pain points
    return [];
  }
}

// ============================================
// JOURNEY MAP VALIDATION
// Phase 9.1: Simplified, no nagging
// ============================================

export function validateJourneyMap(journeyMap: JourneyMapData): Insight[] {
  const insights: Insight[] = [];
  let insightIndex = 0;

  // Flatten all actions for analysis
  const allActions = journeyMap.phases.flatMap(p => p.actions);
  
  // Check if there's any content to the right of each phase
  const hasContentToRight = (phaseIndex: number): boolean => {
    for (let i = phaseIndex + 1; i < journeyMap.phases.length; i++) {
      if (journeyMap.phases[i].actions.length > 0) {
        return true;
      }
    }
    return false;
  };
  
  // 1. Check for empty phases - only warn if content exists to the right
  journeyMap.phases.forEach((phase, phaseIndex) => {
    if (phase.actions.length === 0 && hasContentToRight(phaseIndex)) {
      insights.push({
        id: `jm-${insightIndex++}`,
        severity: "warning",
        message: `Phase "${phase.title}" has no actions.`,
        category: "structure",
        elementId: phase.id,
        elementType: "phase",
      });
    }
  });

  // 2. Check for actions without descriptions (INFO only)
  allActions.forEach(action => {
    if (!action.description || action.description.trim() === "") {
      insights.push({
        id: `jm-${insightIndex++}`,
        severity: "info",
        message: `Action "${action.title}" has no description.`,
        category: "content",
        elementId: action.id,
        elementType: "action",
      });
    }
  });

  // 3. Check for pain points without severity (INFO only)
  // This validates the new structured pain point format
  allActions.forEach(action => {
    if (action.painPoints) {
      const painPoints = parsePainPoints(action.painPoints);
      const hasMissingSeverity = painPoints.some(pp => !pp.severity);
      
      if (hasMissingSeverity) {
        insights.push({
          id: `jm-${insightIndex++}`,
          severity: "info",
          message: `Action "${action.title}" has pain points without severity set.`,
          category: "content",
          elementId: action.id,
          elementType: "action",
        });
      }
    }
  });

  // 4. Experience Gap Detection: systemic risks (structured insights, category: content)
  const normalizeForMatch = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const statusGapPhrases = ["wait for response", "no status", "no update", "no visibility", "waiting", "no progress", "don't know status"];
  const manualTriagePhrases = ["manual", "triage", "interpret", "figure out what", "decide where", "manually decide", "manual interpretation"];

  allActions.forEach((action) => {
    const titleDesc = [action.title, action.description].filter(Boolean).join(" ");
    const norm = normalizeForMatch(titleDesc);
    const painPoints = parsePainPoints(action.painPoints);
    const painTexts = painPoints.map((pp) => pp.text).join(" ");
    const combined = normalizeForMatch(painTexts + " " + norm);

    // Low emotion (1 or 2) + waiting/no update language → No status visibility
    const hasStatusGapLanguage = statusGapPhrases.some((p) => combined.includes(p));
    if (hasStatusGapLanguage && action.emotion !== null && action.emotion <= 2) {
      insights.push({
        id: `jm-${insightIndex++}`,
        severity: "warning",
        message: "No status visibility: low emotion and waiting/update language suggest customers lack progress visibility.",
        category: "content",
        elementId: action.id,
        elementType: "action",
      });
    }

    // Manual interpretation / triage language → Manual interpretation step
    const hasManualTriageLanguage = manualTriagePhrases.some((p) => combined.includes(p));
    if (hasManualTriageLanguage) {
      insights.push({
        id: `jm-${insightIndex++}`,
        severity: "warning",
        message: "Manual interpretation step: text suggests staff manually triage or interpret requests.",
        category: "content",
        elementId: action.id,
        elementType: "action",
      });
    }
  });

  // Repetition risk: same pain point text (normalized) across 3+ actions
  const painTextCounts = new Map<string, { count: number; actionIds: string[] }>();
  allActions.forEach((action) => {
    const painPoints = parsePainPoints(action.painPoints);
    painPoints.forEach((pp) => {
      const key = normalizeForMatch(pp.text);
      if (key.length < 10) return;
      const existing = painTextCounts.get(key);
      if (!existing) {
        painTextCounts.set(key, { count: 1, actionIds: [action.id] });
      } else {
        existing.count++;
        if (!existing.actionIds.includes(action.id)) existing.actionIds.push(action.id);
      }
    });
  });
  painTextCounts.forEach((v, text) => {
    if (v.count >= 3 && v.actionIds.length >= 3) {
      insights.push({
        id: `jm-${insightIndex++}`,
        severity: "warning",
        message: `Repetition risk: the same or similar pain point appears in ${v.actionIds.length} steps.`,
        category: "content",
        elementId: v.actionIds[0],
        elementType: "action",
      });
    }
  });

  // Phase with high pain but no opportunity: "Phase X has no clear ownership" (info)
  journeyMap.phases.forEach((phase) => {
    const phaseActions = phase.actions;
    const hasHighPain = phaseActions.some((a) => {
      const pps = parsePainPoints(a.painPoints);
      return pps.some((pp) => pp.severity === "HIGH");
    });
    const hasAnyOpportunity = phaseActions.some((a) => {
      if (!a.opportunities) return false;
      try {
        const arr = JSON.parse(a.opportunities);
        return Array.isArray(arr) && arr.length > 0;
      } catch {
        return false;
      }
    });
    if (hasHighPain && !hasAnyOpportunity && phaseActions.length > 0) {
      insights.push({
        id: `jm-${insightIndex++}`,
        severity: "info",
        message: `Phase "${phase.title}" has high pain but no improvement opportunities captured; ownership or next steps may be unclear.`,
        category: "content",
        elementId: phase.id,
        elementType: "phase",
      });
    }
  });

  // REMOVED: Emotion continuity checks (per Phase 9.1)
  // REMOVED: Quote-without-emotion checks (per Phase 9.1)
  // REMOVED: Pain points with positive emotion check (per Phase 9.1)

  return insights;
}

// ============================================
// SERVICE BLUEPRINT VALIDATION
// Phase 9.1: Refined rules, loop support
// ============================================

export function validateBlueprint(blueprint: BlueprintData): Insight[] {
  const insights: Insight[] = [];
  let insightIndex = 0;

  // Flatten all columns
  const allColumns = blueprint.phases.flatMap(p => p.columns);
  
  // Helper: Check if a column has any content
  const columnHasContent = (column: BlueprintColumn): boolean => {
    return column.basicCards.length > 0 || 
           column.decisionCards.length > 0 ||
           column.teamSections.some(s => s.cards.length > 0);
  };
  
  // Helper: Check if there's content to the right of a column
  const hasContentToRight = (columnIndex: number): boolean => {
    for (let i = columnIndex + 1; i < allColumns.length; i++) {
      if (columnHasContent(allColumns[i])) {
        return true;
      }
    }
    return false;
  };
  
  // Helper: Check if there's content to the right of a phase
  const phaseHasContentToRight = (phaseIndex: number): boolean => {
    let columnIdx = 0;
    for (let i = 0; i < blueprint.phases.length; i++) {
      if (i <= phaseIndex) {
        columnIdx += blueprint.phases[i].columns.length;
      } else {
        // Check remaining columns
        for (let j = columnIdx; j < allColumns.length; j++) {
          if (columnHasContent(allColumns[j])) {
            return true;
          }
        }
        break;
      }
    }
    return false;
  };

  // Collect all card IDs for connection analysis
  const allCardIds = new Set<string>();
  const cardInfo = new Map<string, { columnIndex: number; laneType: string; title: string; isDecision?: boolean }>();
  const decisionCardIds = new Set<string>();
  
  let columnIndex = 0;
  allColumns.forEach(column => {
    column.basicCards.forEach(card => {
      allCardIds.add(card.id);
      cardInfo.set(card.id, { columnIndex, laneType: card.laneType, title: card.title });
    });
    column.decisionCards.forEach(card => {
      allCardIds.add(card.id);
      decisionCardIds.add(card.id);
      cardInfo.set(card.id, { columnIndex, laneType: card.laneType, title: card.title, isDecision: true });
    });
    column.teamSections.forEach(section => {
      section.cards.forEach(card => {
        allCardIds.add(card.id);
        cardInfo.set(card.id, { columnIndex, laneType: section.laneType, title: card.title });
      });
    });
    columnIndex++;
  });

  // Same-column connections: arrows within one column violate implied order (customer → frontstage → backstage)
  blueprint.connections.forEach((conn) => {
    const sourceInfo = cardInfo.get(conn.sourceCardId);
    const targetInfo = cardInfo.get(conn.targetCardId);
    if (sourceInfo === undefined || targetInfo === undefined) return;
    if (sourceInfo.columnIndex === targetInfo.columnIndex) {
      insights.push({
        id: `bp-${insightIndex++}`,
        severity: "warning",
        message:
          "Connection within the same column: arrows overlap cards. Use column order (customer → frontstage → backstage) for sequence, or add a new column for cross-stage flow.",
        category: "flow",
        elementId: conn.id,
        elementType: "connection",
      });
    }
  });

  // 1. Check for empty phases - only warn if content exists to the right
  blueprint.phases.forEach((phase, phaseIndex) => {
    const phaseHasContent = phase.columns.some(columnHasContent);
    if (!phaseHasContent && phaseHasContentToRight(phaseIndex)) {
      insights.push({
        id: `bp-${insightIndex++}`,
        severity: "warning",
        message: `Phase "${phase.title}" has no content.`,
        category: "structure",
        elementId: phase.id,
        elementType: "phase",
      });
    }
  });

  // 2. Check for empty columns - only warn if content exists to the right
  allColumns.forEach((column, colIdx) => {
    if (!columnHasContent(column) && hasContentToRight(colIdx)) {
      insights.push({
        id: `bp-${insightIndex++}`,
        severity: "warning",
        message: `Column ${colIdx + 1} is empty but there's content after it.`,
        category: "structure",
        elementId: column.id,
        elementType: "column",
      });
    }
  });

  // 2b. Phase backstage (Smart Blueprint Validator): every phase with content must have at least one backstage action
  blueprint.phases.forEach((phase) => {
    const phaseHasContent = phase.columns.some(columnHasContent);
    if (!phaseHasContent) return;
    const hasBackstageInPhase = phase.columns.some((col) =>
      col.teamSections.some(
        (s) => s.laneType === "BACKSTAGE_ACTION" && s.cards.length > 0
      )
    );
    if (!hasBackstageInPhase) {
      insights.push({
        id: `bp-${insightIndex++}`,
        severity: "warning",
        message: `Phase "${phase.title}" has no backstage actions.`,
        category: "structure",
        elementId: phase.id,
        elementType: "phase",
      });
    }
  });

  // REMOVED: Missing team ownership validation (per Phase 9.1)
  // REMOVED: Orphan cards validation (per Phase 9.1)

  // Card -> team name for handoff ownership (only for cards in teamSections)
  const cardToTeamName = new Map<string, string>();
  allColumns.forEach((column) => {
    column.teamSections.forEach((section) => {
      const name = section.team?.name?.trim() ?? "";
      section.cards.forEach((card) => cardToTeamName.set(card.id, name));
    });
  });

  // 2c. Handoff ownership (Smart Blueprint Validator): connections between team cards must have clear owner on both sides
  blueprint.connections.forEach((conn) => {
    const sourceTeam = cardToTeamName.get(conn.sourceCardId);
    const targetTeam = cardToTeamName.get(conn.targetCardId);
    if (sourceTeam === undefined && targetTeam === undefined) return;
    if (sourceTeam !== undefined && targetTeam !== undefined) {
      if (sourceTeam === "" || targetTeam === "") {
        insights.push({
          id: `bp-${insightIndex++}`,
          severity: "warning",
          message: "Handoff without clear owner: ensure both sides have a team assigned.",
          category: "flow",
          elementId: conn.id,
          elementType: "connection",
        });
      }
    }
  });

  // Build connection maps
  const incomingConnections = new Map<string, string[]>();
  const outgoingConnections = new Map<string, string[]>();
  
  blueprint.connections.forEach(conn => {
    // Track outgoing
    const outgoing = outgoingConnections.get(conn.sourceCardId) || [];
    outgoing.push(conn.targetCardId);
    outgoingConnections.set(conn.sourceCardId, outgoing);
    
    // Track incoming
    const incoming = incomingConnections.get(conn.targetCardId) || [];
    incoming.push(conn.sourceCardId);
    incomingConnections.set(conn.targetCardId, incoming);
  });

  // Helper: Check if there's a connected column to the right
  const hasConnectedColumnToRight = (fromColumnIndex: number): boolean => {
    for (let targetColIdx = fromColumnIndex + 1; targetColIdx < allColumns.length; targetColIdx++) {
      const targetColumnCardIds = new Set<string>();
      allColumns[targetColIdx].basicCards.forEach(c => targetColumnCardIds.add(c.id));
      allColumns[targetColIdx].decisionCards.forEach(c => targetColumnCardIds.add(c.id));
      allColumns[targetColIdx].teamSections.forEach(s => s.cards.forEach(c => targetColumnCardIds.add(c.id)));
      
      // Check if any connection goes to this column
      for (const [_, targets] of outgoingConnections) {
        for (const targetId of targets) {
          if (targetColumnCardIds.has(targetId)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // 3. Starting points (INFO only - neutral phrasing)
  const startingPoints: string[] = [];
  allCardIds.forEach(cardId => {
    const hasIncoming = incomingConnections.has(cardId);
    const hasOutgoing = outgoingConnections.has(cardId);
    
    if (!hasIncoming && hasOutgoing) {
      startingPoints.push(cardId);
    }
  });

  // Only show starting points if there are multiple (helps identify flow entry points)
  if (startingPoints.length > 1) {
    startingPoints.forEach(cardId => {
      const info = cardInfo.get(cardId);
      if (info) {
        insights.push({
          id: `bp-${insightIndex++}`,
          severity: "info",
          message: `"${info.title}" is a flow starting point.`,
          category: "flow",
          elementId: cardId,
          elementType: "card",
        });
      }
    });
  }

  // 4. Dead ends - only warn if genuinely interrupted
  // Conditions: has incoming, no outgoing, not in rightmost column, AND there's a connected column to the right
  const maxColumnIndex = allColumns.length - 1;
  allCardIds.forEach(cardId => {
    const hasIncoming = incomingConnections.has(cardId);
    const hasOutgoing = outgoingConnections.has(cardId);
    const info = cardInfo.get(cardId);
    
    if (hasIncoming && !hasOutgoing && info && info.columnIndex < maxColumnIndex) {
      // Only warn if there's actually a connected column to the right
      if (hasConnectedColumnToRight(info.columnIndex)) {
        insights.push({
          id: `bp-${insightIndex++}`,
          severity: "warning",
          message: `"${info.title}" appears to be a dead end - flow stops here.`,
          category: "flow",
          elementId: cardId,
          elementType: "card",
        });
      }
    }
  });

  // 5. End points (INFO only - neutral phrasing)
  allCardIds.forEach(cardId => {
    const hasIncoming = incomingConnections.has(cardId);
    const hasOutgoing = outgoingConnections.has(cardId);
    const info = cardInfo.get(cardId);
    
    if (hasIncoming && !hasOutgoing && info && info.columnIndex >= maxColumnIndex - 1) {
      insights.push({
        id: `bp-${insightIndex++}`,
        severity: "info",
        message: `"${info.title}" is a flow endpoint.`,
        category: "flow",
        elementId: cardId,
        elementType: "card",
      });
    }
  });

  // 6. Loop detection - DISABLED
  // Loops/backward connections are no longer supported, so no validation needed.

  // 7. Decision Card validation: promote to WARNING when 0 or 1 outgoing (Smart Blueprint Validator - every decision has outcome(s))
  decisionCardIds.forEach(cardId => {
    const info = cardInfo.get(cardId);
    if (!info) return;

    const outgoing = outgoingConnections.get(cardId) || [];
    const labeledOutgoing = blueprint.connections.filter(
      (c) => c.sourceCardId === cardId && c.label && c.label.trim() !== ""
    );

    if (outgoing.length < 2) {
      insights.push({
        id: `bp-${insightIndex++}`,
        severity: "warning",
        message: `Decision "${info.title}" has ${outgoing.length === 0 ? "no" : "only one"} outgoing connector. Add multiple outcomes.`,
        category: "flow",
        elementId: cardId,
        elementType: "card",
      });
    } else if (labeledOutgoing.length < 2) {
      insights.push({
        id: `bp-${insightIndex++}`,
        severity: "warning",
        message: `Decision "${info.title}" has multiple paths but fewer than 2 labeled outcomes. Labels like "Yes"/"No" improve clarity.`,
        category: "flow",
        elementId: cardId,
        elementType: "card",
      });
    }
  });

  return insights;
}

// ============================================
// INSIGHT HELPERS
// ============================================

export function getInsightsByCategory(insights: Insight[], category: Insight["category"]): Insight[] {
  return insights.filter(i => i.category === category && !i.dismissed);
}

export function getInsightsBySeverity(insights: Insight[], severity: InsightSeverity): Insight[] {
  return insights.filter(i => i.severity === severity && !i.dismissed);
}

export function getInsightsForElement(insights: Insight[], elementId: string): Insight[] {
  return insights.filter(i => i.elementId === elementId && !i.dismissed);
}

export function hasWarnings(insights: Insight[]): boolean {
  return insights.some(i => i.severity === "warning" && !i.dismissed);
}

export function getInsightCounts(insights: Insight[]): { info: number; warning: number; total: number } {
  const activeInsights = insights.filter(i => !i.dismissed);
  return {
    info: activeInsights.filter(i => i.severity === "info").length,
    warning: activeInsights.filter(i => i.severity === "warning").length,
    total: activeInsights.length,
  };
}
