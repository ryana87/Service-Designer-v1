// ============================================
// PATTERN RECOGNITION (within project or across projects)
// Recurring pain points, blueprint structure signatures, manual triage pattern
// ============================================

export type RecurringPainPoint = {
  normalisedText: string;
  displayText: string;
  count: number;
  sourceLabels: string[];
};

export type BlueprintSignature = {
  phaseCount: number;
  decisionCount: number;
  handoffDensity: number;
  count: number;
  blueprintNames: string[];
};

export type ProjectPatternsResult = {
  recurringPainPoints: RecurringPainPoint[];
  manualTriagePatternCount: number;
  manualTriageSources: string[];
  blueprintSignatures: BlueprintSignature[];
};

function normaliseText(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/** Extract pain point texts from journey maps. */
export function collectPainPointsFromJourneys(
  journeyMaps: { name: string; phases: { actions: { painPoints: string | null }[] }[] }[]
): { text: string; normalised: string; sourceName: string }[] {
  const items: { text: string; normalised: string; sourceName: string }[] = [];
  journeyMaps.forEach((jm) => {
    jm.phases.forEach((phase) => {
      phase.actions.forEach((action) => {
        if (!action.painPoints) return;
        try {
          const arr = JSON.parse(action.painPoints) as { text?: string }[];
          if (!Array.isArray(arr)) return;
          arr.forEach((p) => {
            if (typeof p?.text === "string" && p.text.trim().length >= 5) {
              items.push({
                text: p.text.trim(),
                normalised: normaliseText(p.text),
                sourceName: jm.name,
              });
            }
          });
        } catch {
          // ignore
        }
      });
    });
  });
  return items;
}

/** Group pain points by normalised text and count. */
export function findRecurringPainPoints(
  items: { text: string; normalised: string; sourceName: string }[],
  minCount = 2
): RecurringPainPoint[] {
  const byNorm = new Map<string, { displayText: string; count: number; sources: Set<string> }>();
  items.forEach((item) => {
    if (item.normalised.length < 10) return;
    const existing = byNorm.get(item.normalised);
    if (!existing) {
      byNorm.set(item.normalised, {
        displayText: item.text.slice(0, 80) + (item.text.length > 80 ? "…" : ""),
        count: 1,
        sources: new Set([item.sourceName]),
      });
    } else {
      existing.count++;
      existing.sources.add(item.sourceName);
    }
  });
  return Array.from(byNorm.entries())
    .filter(([, v]) => v.count >= minCount)
    .map(([normalisedText, v]) => ({
      normalisedText,
      displayText: v.displayText,
      count: v.count,
      sourceLabels: Array.from(v.sources),
    }))
    .sort((a, b) => b.count - a.count);
}

const MANUAL_TRIAGE_PATTERNS = /manual|triage|interpret|route|routing|figure out|decide where/i;

/** Check if text suggests manual triage. */
export function suggestsManualTriage(text: string | null): boolean {
  return text != null && MANUAL_TRIAGE_PATTERNS.test(text);
}

/** Count blueprints (or journeys) that exhibit manual triage pattern. */
export function countManualTriagePattern(
  journeyMaps: { name: string; phases: { actions: { painPoints: string | null; title: string; description: string | null }[] }[] }[],
  blueprints: { name: string; phases: { columns: { decisionCards: { title: string; question: string }[] }[] }[] }[]
): { count: number; sources: string[] } {
  const sources: string[] = [];
  journeyMaps.forEach((jm) => {
    let found = false;
    jm.phases.forEach((p) => {
      p.actions.forEach((a) => {
        if (suggestsManualTriage(a.painPoints) || suggestsManualTriage(a.title) || suggestsManualTriage(a.description)) {
          found = true;
        }
      });
    });
    if (found) sources.push(jm.name);
  });
  blueprints.forEach((bp) => {
    let found = false;
    bp.phases.forEach((phase) => {
      phase.columns.forEach((col) => {
        col.decisionCards.forEach((d) => {
          if (suggestsManualTriage(d.title) || suggestsManualTriage(d.question)) found = true;
        });
      });
    });
    if (found) sources.push(bp.name);
  });
  return { count: sources.length, sources };
}

/** Build blueprint signature (phase count, decision count, handoff density bucket). */
export function getBlueprintSignature(
  blueprint: {
    phases: {
      columns: {
        decisionCards: unknown[];
        teamSections: { teamId: string; cards: unknown[] }[];
      }[];
    }[];
  }
): { phaseCount: number; decisionCount: number; handoffDensity: number } {
  const phaseCount = blueprint.phases.length;
  let decisionCount = 0;
  const teamIdsByColumn: string[][] = [];
  blueprint.phases.forEach((phase) => {
    phase.columns.forEach((col) => {
      decisionCount += col.decisionCards.length;
      const teamIds = new Set<string>();
      col.teamSections.forEach((ts) => teamIds.add(ts.teamId));
      teamIdsByColumn.push(Array.from(teamIds));
    });
  });
  let handoffDensity = 0;
  for (let i = 1; i < teamIdsByColumn.length; i++) {
    const prev = new Set(teamIdsByColumn[i - 1]);
    const curr = new Set(teamIdsByColumn[i]);
    if (prev.size && curr.size && [...prev].some((t) => curr.has(t))) {
      handoffDensity += Math.max(prev.size, curr.size);
    }
  }
  return { phaseCount, decisionCount, handoffDensity };
}

/** Group blueprints by signature and count. */
export function findBlueprintSignatures(
  blueprints: { name: string; phases: { columns: { decisionCards: unknown[]; teamSections: { teamId: string; cards: unknown[] }[] }[] }[] }[]
): BlueprintSignature[] {
  const byKey = new Map<string, { count: number; names: Set<string> }>();
  blueprints.forEach((bp) => {
    const sig = getBlueprintSignature(bp);
    const key = `${sig.phaseCount}-${sig.decisionCount}-${sig.handoffDensity}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { count: 1, names: new Set([bp.name]) });
    } else {
      existing.count++;
      existing.names.add(bp.name);
    }
  });
  return Array.from(byKey.entries())
    .filter(([, v]) => v.count >= 2)
    .map(([key, v]) => {
      const [phaseCount, decisionCount, handoffDensity] = key.split("-").map(Number);
      return {
        phaseCount,
        decisionCount,
        handoffDensity,
        count: v.count,
        blueprintNames: Array.from(v.names),
      };
    })
    .sort((a, b) => b.count - a.count);
}
