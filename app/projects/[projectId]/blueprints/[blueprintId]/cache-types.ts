/**
 * Cache document types for blueprint editor.
 * Mirrors the shape used by the UI and sent to syncBlueprint.
 */

export type PainPoint = {
  text: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

export type BlueprintTeam = {
  id: string;
  name: string;
  iconName: string;
  colorHex: string;
};

export type BlueprintSoftwareService = {
  id: string;
  label: string;
  colorHex: string;
};

export type BlueprintBasicCard = {
  id: string;
  order: number;
  laneType: string;
  title: string;
  description: string | null;
  painPoints: string | null;
  isStart: boolean;
  isEnd: boolean;
};

export type BlueprintComplexCard = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  painPoints: string | null;
  softwareIds: string | null;
  isStart: boolean;
  isEnd: boolean;
};

export type BlueprintDecisionCard = {
  id: string;
  order: number;
  laneType: string;
  title: string;
  question: string;
  description: string | null;
  isStart: boolean;
  isEnd: boolean;
};

export type BlueprintTeamSection = {
  id: string;
  order: number;
  laneType: string;
  teamId: string;
  team: BlueprintTeam;
  cards: BlueprintComplexCard[];
};

export type BlueprintColumn = {
  id: string;
  order: number;
  basicCards: BlueprintBasicCard[];
  decisionCards: BlueprintDecisionCard[];
  teamSections: BlueprintTeamSection[];
};

export type BlueprintPhase = {
  id: string;
  order: number;
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
  arrowDirection: string;
  strokeWeight: string;
  strokePattern: string;
  strokeColor: string;
};

export type BlueprintCacheDocument = {
  id: string;
  name: string;
  phases: BlueprintPhase[];
  teams: BlueprintTeam[];
  softwareServices: BlueprintSoftwareService[];
  connections: BlueprintConnection[];
};

/** Server blueprint query result shape (from page.tsx include) */
type ServerBlueprint = {
  id: string;
  name: string;
  phases: Array<{
    id: string;
    order: number;
    title: string;
    timeframe: string | null;
    columns: Array<{
      id: string;
      order: number;
      basicCards: Array<{
        id: string;
        order: number;
        laneType: string;
        title: string;
        description: string | null;
        painPoints: string | null;
        isStart: boolean;
        isEnd: boolean;
      }>;
      decisionCards: Array<{
        id: string;
        order: number;
        laneType: string;
        title: string;
        question: string;
        description: string | null;
        isStart: boolean;
        isEnd: boolean;
      }>;
      teamSections: Array<{
        id: string;
        order: number;
        laneType: string;
        teamId: string;
        team: {
          id: string;
          name: string;
          iconName: string;
          colorHex: string;
        };
        cards: Array<{
          id: string;
          order: number;
          title: string;
          description: string | null;
          painPoints: string | null;
          softwareIds: string | null;
          isStart: boolean;
          isEnd: boolean;
        }>;
      }>;
    }>;
  }>;
  teams: Array<{
    id: string;
    name: string;
    iconName: string;
    colorHex: string;
  }>;
  softwareServices: Array<{
    id: string;
    label: string;
    colorHex: string;
  }>;
  connections: Array<{
    id: string;
    sourceCardId: string;
    sourceCardType: string;
    targetCardId: string;
    targetCardType: string;
    connectorType: string;
    label: string | null;
    arrowDirection: string;
    strokeWeight: string;
    strokePattern: string;
    strokeColor: string;
  }>;
};

export function serverBlueprintToCacheDocument(raw: ServerBlueprint): BlueprintCacheDocument {
  return {
    id: raw.id,
    name: raw.name,
    phases: raw.phases.map((p) => ({
      id: p.id,
      order: p.order,
      title: p.title,
      timeframe: p.timeframe,
      columns: p.columns.map((col) => ({
        id: col.id,
        order: col.order,
        basicCards: col.basicCards.map((c) => ({
          id: c.id,
          order: c.order,
          laneType: c.laneType,
          title: c.title,
          description: c.description,
          painPoints: c.painPoints,
          isStart: c.isStart,
          isEnd: c.isEnd,
        })),
        decisionCards: col.decisionCards.map((c) => ({
          id: c.id,
          order: c.order,
          laneType: c.laneType,
          title: c.title,
          question: c.question,
          description: c.description,
          isStart: c.isStart,
          isEnd: c.isEnd,
        })),
        teamSections: col.teamSections.map((ts) => ({
          id: ts.id,
          order: ts.order,
          laneType: ts.laneType,
          teamId: ts.teamId,
          team: {
            id: ts.team.id,
            name: ts.team.name,
            iconName: ts.team.iconName,
            colorHex: ts.team.colorHex,
          },
          cards: ts.cards.map((c) => ({
            id: c.id,
            order: c.order,
            title: c.title,
            description: c.description,
            painPoints: c.painPoints,
            softwareIds: c.softwareIds,
            isStart: c.isStart,
            isEnd: c.isEnd,
          })),
        })),
      })),
    })),
    teams: raw.teams.map((t) => ({
      id: t.id,
      name: t.name,
      iconName: t.iconName,
      colorHex: t.colorHex,
    })),
    softwareServices: raw.softwareServices.map((s) => ({
      id: s.id,
      label: s.label,
      colorHex: s.colorHex,
    })),
    connections: raw.connections.map((c) => ({
      id: c.id,
      sourceCardId: c.sourceCardId,
      sourceCardType: c.sourceCardType,
      targetCardId: c.targetCardId,
      targetCardType: c.targetCardType,
      connectorType: c.connectorType,
      label: c.label,
      arrowDirection: c.arrowDirection,
      strokeWeight: c.strokeWeight,
      strokePattern: c.strokePattern,
      strokeColor: c.strokeColor,
    })),
  };
}

/** Payload sent to syncBlueprint server action */
export type BlueprintSyncPayload = {
  name: string;
  phases: Array<{
    id: string;
    order: number;
    title: string;
    timeframe: string | null;
    columns: Array<{
      id: string;
      order: number;
      basicCards: Array<{
        id: string;
        order: number;
        laneType: string;
        title: string;
        description: string | null;
        painPoints: string | null;
        isStart: boolean;
        isEnd: boolean;
      }>;
      decisionCards: Array<{
        id: string;
        order: number;
        laneType: string;
        title: string;
        question: string;
        description: string | null;
        isStart: boolean;
        isEnd: boolean;
      }>;
      teamSections: Array<{
        id: string;
        order: number;
        laneType: string;
        teamId: string;
        cards: Array<{
          id: string;
          order: number;
          title: string;
          description: string | null;
          painPoints: string | null;
          softwareIds: string | null;
          isStart: boolean;
          isEnd: boolean;
        }>;
      }>;
    }>;
  }>;
  teams: Array<{ id: string; name: string; iconName: string; colorHex: string }>;
  softwareServices: Array<{ id: string; label: string; colorHex: string }>;
  connections: Array<{
    id: string;
    sourceCardId: string;
    sourceCardType: string;
    targetCardId: string;
    targetCardType: string;
    connectorType: string;
    label: string | null;
    arrowDirection: string;
    strokeWeight: string;
    strokePattern: string;
    strokeColor: string;
  }>;
};
