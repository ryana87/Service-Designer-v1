"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { nanoid } from "nanoid";
import type {
  BlueprintCacheDocument,
  BlueprintPhase,
  BlueprintColumn,
  BlueprintBasicCard,
  BlueprintDecisionCard,
  BlueprintComplexCard,
  BlueprintTeamSection,
  BlueprintTeam,
  BlueprintSoftwareService,
  BlueprintConnection,
  BlueprintSyncPayload,
  PainPoint,
} from "./cache-types";
import { serverBlueprintToCacheDocument } from "./cache-types";
import { syncBlueprint } from "../actions";
import { TEAM_COLOR_TOKENS, SOFTWARE_COLOR_TOKENS } from "../../../../lib/colorTokens";

export { serverBlueprintToCacheDocument } from "./cache-types";

function documentToSyncPayload(doc: BlueprintCacheDocument): BlueprintSyncPayload {
  return {
    name: doc.name,
    phases: doc.phases.map((p) => ({
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
    teams: doc.teams.map((t) => ({
      id: t.id,
      name: t.name,
      iconName: t.iconName,
      colorHex: t.colorHex,
    })),
    softwareServices: doc.softwareServices.map((s) => ({
      id: s.id,
      label: s.label,
      colorHex: s.colorHex,
    })),
    connections: doc.connections.map((c) => ({
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

type SetDataUpdater = (draft: BlueprintCacheDocument) => void;

export type BlueprintCacheContextValue = {
  data: BlueprintCacheDocument | null;
  setData: (updater: SetDataUpdater) => void;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  blueprintId: string;
  syncNow: () => Promise<{ success: boolean; error?: string }>;
  syncStatus: "idle" | "saving" | "saved" | "error";
  updateName: (name: string) => void;
  updatePhase: (phaseId: string, field: "title" | "timeframe", value: string) => void;
  createBlankPhase: () => { phaseId: string };
  insertPhaseAt: (referencePhaseId: string, position: "before" | "after") => { phaseId: string };
  deletePhase: (phaseId: string) => void;
  insertColumnAt: (columnId: string, position: "before" | "after") => { columnId: string };
  deleteColumn: (columnId: string) => void;
  createBasicCard: (columnId: string, laneType: string) => { cardId: string };
  updateBasicCard: (cardId: string, field: string, value: string | boolean | null) => void;
  duplicateBasicCard: (cardId: string) => { cardId: string };
  deleteBasicCard: (cardId: string) => void;
  updateBasicCardPainPoints: (cardId: string, painPoints: PainPoint[]) => void;
  updateBasicCardMarkers: (cardId: string, markers: { isStart?: boolean; isEnd?: boolean }) => void;
  updateBasicCardOrder: (cardId: string, newOrder: number) => void;
  insertBasicCardAt: (columnId: string, laneType: string, insertAtOrder: number) => { cardId: string };
  createTeamSection: (columnId: string, laneType: string, teamId: string) => { sectionId: string };
  deleteTeamSection: (sectionId: string) => void;
  duplicateTeamSection: (sectionId: string) => { sectionId: string };
  createComplexCard: (teamSectionId: string) => { cardId: string };
  updateComplexCard: (cardId: string, field: string, value: string | null) => void;
  duplicateComplexCard: (cardId: string) => { cardId: string };
  deleteComplexCard: (cardId: string) => void;
  updateComplexCardPainPoints: (cardId: string, painPoints: PainPoint[]) => void;
  updateComplexCardSoftware: (cardId: string, softwareIds: string[]) => void;
  updateComplexCardMarkers: (cardId: string, markers: { isStart?: boolean; isEnd?: boolean }) => void;
  updateComplexCardOrder: (cardId: string, newOrder: number) => void;
  insertComplexCardAt: (teamSectionId: string, insertAtOrder: number) => { cardId: string };
  createDecisionCard: (columnId: string, laneType: string, insertAtOrder?: number) => { cardId: string };
  updateDecisionCard: (cardId: string, field: string, value: string | boolean | null) => void;
  duplicateDecisionCard: (cardId: string) => { cardId: string };
  deleteDecisionCard: (cardId: string) => void;
  updateDecisionCardOrder: (cardId: string, newOrder: number) => void;
  createTeam: () => { teamId: string };
  updateTeam: (teamId: string, field: "name" | "iconName" | "colorHex", value: string) => void;
  deleteTeam: (teamId: string) => void;
  createSoftwareService: (label: string) => { softwareId: string };
  updateSoftwareService: (softwareId: string, field: "label" | "colorHex", value: string) => void;
  deleteSoftwareService: (softwareId: string) => void;
  createConnection: (
    sourceCardId: string,
    sourceCardType: string,
    targetCardId: string,
    targetCardType: string
  ) => { connectionId: string };
  updateConnection: (
    connectionId: string,
    updates: Partial<{
      connectorType: string;
      label: string | null;
      arrowDirection: string;
      strokeWeight: string;
      strokePattern: string;
      strokeColor: string;
    }>
  ) => void;
  duplicateConnection: (connectionId: string) => { connectionId: string } | null;
  deleteConnection: (connectionId: string) => void;
};

const BlueprintCacheContext = createContext<BlueprintCacheContextValue | null>(null);

export function useBlueprintCache() {
  const ctx = useContext(BlueprintCacheContext);
  if (!ctx) throw new Error("useBlueprintCache must be used within BlueprintCacheProvider");
  return ctx;
}

const SYNC_INTERVAL_MS = 3 * 60 * 1000;
const RETRY_DELAYS = [1000, 2000];

export function BlueprintCacheProvider({
  children,
  initialData,
  blueprintId,
}: {
  children: React.ReactNode;
  initialData: BlueprintCacheDocument;
  blueprintId: string;
}) {
  const [data, setDataState] = useState<BlueprintCacheDocument | null>(initialData);
  const [dirty, setDirty] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initialDataRef = useRef(initialData);
  const blueprintIdRef = useRef(blueprintId);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    initialDataRef.current = initialData;
    blueprintIdRef.current = blueprintId;
    setDataState(initialData);
  }, [blueprintId, initialData.id]);

  const setData = useCallback((updater: SetDataUpdater) => {
    setDataState((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as BlueprintCacheDocument;
      updater(next);
      return next;
    });
    setDirty(true);
  }, []);

  const syncNow = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const doc = data;
    if (!doc || !dirty) return { success: true };
    setSyncStatus("saving");
    const payload = documentToSyncPayload(doc);
    let lastError: string | undefined;
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        await syncBlueprint(blueprintIdRef.current, payload);
        setDirty(false);
        setSyncStatus("saved");
        setTimeout(() => setSyncStatus("idle"), 2000);
        return { success: true };
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (attempt < RETRY_DELAYS.length) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        } else {
          setSyncStatus("error");
          return { success: false, error: lastError };
        }
      }
    }
    return { success: false, error: lastError };
  }, [data, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const id = setInterval(async () => {
      const doc = dataRef.current;
      if (!doc) return;
      setSyncStatus("saving");
      const payload = documentToSyncPayload(doc);
      try {
        await syncBlueprint(blueprintIdRef.current, payload);
        setDirty(false);
        setSyncStatus("saved");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch {
        setSyncStatus("error");
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dirty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const updateName = useCallback((name: string) => {
    setData((draft) => {
      draft.name = name.trim() || "Untitled Blueprint";
    });
  }, [setData]);

  const updatePhase = useCallback((phaseId: string, field: "title" | "timeframe", value: string) => {
    setData((draft) => {
      const phase = draft.phases.find((p) => p.id === phaseId);
      if (phase) {
        if (field === "title") phase.title = value.trim() || "Untitled";
        else phase.timeframe = value.trim() || null;
      }
    });
  }, [setData]);

  const createBlankPhase = useCallback((): { phaseId: string } => {
    const phaseId = nanoid();
    setData((draft) => {
      const maxOrder = draft.phases.length === 0 ? -1 : Math.max(...draft.phases.map((p) => p.order));
      draft.phases.push({
        id: phaseId,
        order: maxOrder + 1,
        title: "New Phase",
        timeframe: null,
        columns: [
          {
            id: nanoid(),
            order: 0,
            basicCards: [],
            decisionCards: [],
            teamSections: [],
          },
        ],
      });
      draft.phases.sort((a, b) => a.order - b.order);
    });
    return { phaseId };
  }, [setData]);

  const insertPhaseAt = useCallback(
    (referencePhaseId: string, position: "before" | "after"): { phaseId: string } => {
      const phaseId = nanoid();
      setData((draft) => {
        const idx = draft.phases.findIndex((p) => p.id === referencePhaseId);
        if (idx === -1) return;
        const ref = draft.phases[idx];
        const targetOrder = position === "before" ? ref.order : ref.order + 1;
        for (const p of draft.phases) {
          if (p.order >= targetOrder) p.order += 1;
        }
        draft.phases.push({
          id: phaseId,
          order: targetOrder,
          title: "New Phase",
          timeframe: null,
          columns: [
            {
              id: nanoid(),
              order: 0,
              basicCards: [],
              decisionCards: [],
              teamSections: [],
            },
          ],
        });
        draft.phases.sort((a, b) => a.order - b.order);
      });
      return { phaseId };
    },
    [setData]
  );

  const deletePhase = useCallback((phaseId: string) => {
    setData((draft) => {
      const i = draft.phases.findIndex((p) => p.id === phaseId);
      if (i !== -1) draft.phases.splice(i, 1);
    });
  }, [setData]);

  const insertColumnAt = useCallback(
    (columnId: string, position: "before" | "after"): { columnId: string } => {
      const newColumnId = nanoid();
      setData((draft) => {
        for (const phase of draft.phases) {
          const colIdx = phase.columns.findIndex((c) => c.id === columnId);
          if (colIdx === -1) continue;
          const col = phase.columns[colIdx];
          const targetOrder = position === "before" ? col.order : col.order + 1;
          for (const c of phase.columns) {
            if (c.order >= targetOrder) c.order += 1;
          }
          phase.columns.splice(colIdx + (position === "after" ? 1 : 0), 0, {
            id: newColumnId,
            order: targetOrder,
            basicCards: [],
            decisionCards: [],
            teamSections: [],
          });
          phase.columns.sort((a, b) => a.order - b.order);
          return;
        }
      });
      return { columnId: newColumnId };
    },
    [setData]
  );

  const deleteColumn = useCallback((columnId: string) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        if (phase.columns.length <= 1) continue;
        const i = phase.columns.findIndex((c) => c.id === columnId);
        if (i !== -1) {
          phase.columns.splice(i, 1);
          return;
        }
      }
    });
  }, [setData]);

  const createBasicCard = useCallback(
    (columnId: string, laneType: string): { cardId: string } => {
      const cardId = nanoid();
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            if (col.id !== columnId) continue;
            const sameLane = col.basicCards.filter((c) => c.laneType === laneType);
            const maxOrder = sameLane.length === 0 ? -1 : Math.max(...sameLane.map((c) => c.order));
            col.basicCards.push({
              id: cardId,
              order: maxOrder + 1,
              laneType,
              title: "New Action",
              description: null,
              painPoints: null,
              isStart: false,
              isEnd: false,
            });
            col.basicCards.sort((a, b) => a.order - b.order);
            return;
          }
        }
      });
      return { cardId };
    },
    [setData]
  );

  const updateBasicCard = useCallback(
    (cardId: string, field: string, value: string | boolean | null) => {
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            const card = col.basicCards.find((c) => c.id === cardId);
            if (card) {
              if (field === "isStart" || field === "isEnd") {
                (card as Record<string, unknown>)[field] = value === true;
              } else if (field === "title") {
                card.title = (value as string)?.trim() || "Untitled";
              } else {
                (card as Record<string, unknown>)[field] = value;
              }
              return;
            }
          }
        }
      });
    },
    [setData]
  );

  const duplicateBasicCard = useCallback((cardId: string): { cardId: string } => {
    const newId = nanoid();
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const card = col.basicCards.find((c) => c.id === cardId);
          if (card) {
            const maxOrder = col.basicCards.length === 0 ? -1 : Math.max(...col.basicCards.map((c) => c.order));
            col.basicCards.push({
              ...card,
              id: newId,
              order: maxOrder + 1,
              title: `${card.title} (copy)`,
            });
            col.basicCards.sort((a, b) => a.order - b.order);
            return;
          }
        }
      }
    });
    return { cardId: newId };
  }, [setData]);

  const deleteBasicCard = useCallback((cardId: string) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const i = col.basicCards.findIndex((c) => c.id === cardId);
          if (i !== -1) {
            col.basicCards.splice(i, 1);
            return;
          }
        }
      }
    });
  }, [setData]);

  const updateBasicCardPainPoints = useCallback((cardId: string, painPoints: PainPoint[]) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const card = col.basicCards.find((c) => c.id === cardId);
          if (card) {
            card.painPoints = JSON.stringify(painPoints);
            return;
          }
        }
      }
    });
  }, [setData]);

  const updateBasicCardMarkers = useCallback(
    (cardId: string, markers: { isStart?: boolean; isEnd?: boolean }) => {
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            const card = col.basicCards.find((c) => c.id === cardId);
            if (card) {
              if (markers.isStart !== undefined) card.isStart = markers.isStart;
              if (markers.isEnd !== undefined) card.isEnd = markers.isEnd;
              return;
            }
          }
        }
      });
    },
    [setData]
  );

  const updateBasicCardOrder = useCallback((cardId: string, newOrder: number) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const card = col.basicCards.find((c) => c.id === cardId);
          if (card) {
            card.order = newOrder;
            col.basicCards.sort((a, b) => a.order - b.order);
            return;
          }
        }
      }
    });
  }, [setData]);

  const insertBasicCardAt = useCallback(
    (columnId: string, laneType: string, insertAtOrder: number): { cardId: string } => {
      const cardId = nanoid();
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            if (col.id !== columnId) continue;
            for (const c of col.basicCards) {
              if (c.order >= insertAtOrder) c.order += 1;
            }
            col.basicCards.push({
              id: cardId,
              order: insertAtOrder,
              laneType,
              title: "New Action",
              description: null,
              painPoints: null,
              isStart: false,
              isEnd: false,
            });
            col.basicCards.sort((a, b) => a.order - b.order);
            return;
          }
        }
      });
      return { cardId };
    },
    [setData]
  );

  const createTeamSection = useCallback(
    (columnId: string, laneType: string, teamId: string): { sectionId: string } => {
      const sectionId = nanoid();
      setData((draft) => {
        const team = draft.teams.find((t) => t.id === teamId);
        if (!team) return;
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            if (col.id !== columnId) continue;
            const sameLane = col.teamSections.filter((s) => s.laneType === laneType);
            const maxOrder = sameLane.length === 0 ? -1 : Math.max(...sameLane.map((s) => s.order));
            col.teamSections.push({
              id: sectionId,
              order: maxOrder + 1,
              laneType,
              teamId,
              team: { ...team },
              cards: [],
            });
            col.teamSections.sort((a, b) => a.order - b.order);
            return;
          }
        }
      });
      return { sectionId };
    },
    [setData]
  );

  const deleteTeamSection = useCallback((sectionId: string) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const i = col.teamSections.findIndex((s) => s.id === sectionId);
          if (i !== -1) {
            col.teamSections.splice(i, 1);
            return;
          }
        }
      }
    });
  }, [setData]);

  const duplicateTeamSection = useCallback((sectionId: string): { sectionId: string } => {
    const newSectionId = nanoid();
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const section = col.teamSections.find((s) => s.id === sectionId);
          if (section) {
            const maxOrder =
              col.teamSections.length === 0 ? -1 : Math.max(...col.teamSections.map((s) => s.order));
            col.teamSections.push({
              id: newSectionId,
              order: maxOrder + 1,
              laneType: section.laneType,
              teamId: section.teamId,
              team: { ...section.team },
              cards: section.cards.map((c) => ({
                ...c,
                id: nanoid(),
                order: c.order,
                title: `${c.title} (copy)`,
              })),
            });
            col.teamSections.sort((a, b) => a.order - b.order);
            return;
          }
        }
      }
    });
    return { sectionId: newSectionId };
  }, [setData]);

  const createComplexCard = useCallback((teamSectionId: string): { cardId: string } => {
    const cardId = nanoid();
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          for (const section of col.teamSections) {
            if (section.id !== teamSectionId) continue;
            const maxOrder = section.cards.length === 0 ? -1 : Math.max(...section.cards.map((c) => c.order));
            section.cards.push({
              id: cardId,
              order: maxOrder + 1,
              title: "New Action",
              description: null,
              painPoints: null,
              softwareIds: null,
              isStart: false,
              isEnd: false,
            });
            section.cards.sort((a, b) => a.order - b.order);
            return;
          }
        }
      }
    });
    return { cardId };
  }, [setData]);

  const updateComplexCard = useCallback(
    (cardId: string, field: string, value: string | null) => {
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            for (const section of col.teamSections) {
              const card = section.cards.find((c) => c.id === cardId);
              if (card) {
                if (field === "title") card.title = value?.trim() || "Untitled";
                else (card as Record<string, unknown>)[field] = value;
                return;
              }
            }
          }
        }
      });
    },
    [setData]
  );

  const duplicateComplexCard = useCallback((cardId: string): { cardId: string } => {
    const newId = nanoid();
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          for (const section of col.teamSections) {
            const card = section.cards.find((c) => c.id === cardId);
            if (card) {
              const maxOrder = section.cards.length === 0 ? -1 : Math.max(...section.cards.map((c) => c.order));
              section.cards.push({
                ...card,
                id: newId,
                order: maxOrder + 1,
                title: `${card.title} (copy)`,
              });
              section.cards.sort((a, b) => a.order - b.order);
              return;
            }
          }
        }
      }
    });
    return { cardId: newId };
  }, [setData]);

  const deleteComplexCard = useCallback((cardId: string) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          for (const section of col.teamSections) {
            const i = section.cards.findIndex((c) => c.id === cardId);
            if (i !== -1) {
              section.cards.splice(i, 1);
              return;
            }
          }
        }
      }
    });
  }, [setData]);

  const updateComplexCardPainPoints = useCallback((cardId: string, painPoints: PainPoint[]) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          for (const section of col.teamSections) {
            const card = section.cards.find((c) => c.id === cardId);
            if (card) {
              card.painPoints = JSON.stringify(painPoints);
              return;
            }
          }
        }
      }
    });
  }, [setData]);

  const updateComplexCardSoftware = useCallback((cardId: string, softwareIds: string[]) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          for (const section of col.teamSections) {
            const card = section.cards.find((c) => c.id === cardId);
            if (card) {
              card.softwareIds = softwareIds.length > 0 ? JSON.stringify(softwareIds) : null;
              return;
            }
          }
        }
      }
    });
  }, [setData]);

  const updateComplexCardMarkers = useCallback(
    (cardId: string, markers: { isStart?: boolean; isEnd?: boolean }) => {
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            for (const section of col.teamSections) {
              const card = section.cards.find((c) => c.id === cardId);
              if (card) {
                if (markers.isStart !== undefined) card.isStart = markers.isStart;
                if (markers.isEnd !== undefined) card.isEnd = markers.isEnd;
                return;
              }
            }
          }
        }
      });
    },
    [setData]
  );

  const updateComplexCardOrder = useCallback((cardId: string, newOrder: number) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          for (const section of col.teamSections) {
            const card = section.cards.find((c) => c.id === cardId);
            if (card) {
              card.order = newOrder;
              section.cards.sort((a, b) => a.order - b.order);
              return;
            }
          }
        }
      }
    });
  }, [setData]);

  const insertComplexCardAt = useCallback(
    (teamSectionId: string, insertAtOrder: number): { cardId: string } => {
      const cardId = nanoid();
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            for (const section of col.teamSections) {
              if (section.id !== teamSectionId) continue;
              for (const c of section.cards) {
                if (c.order >= insertAtOrder) c.order += 1;
              }
              section.cards.push({
                id: cardId,
                order: insertAtOrder,
                title: "New Action",
                description: null,
                painPoints: null,
                softwareIds: null,
                isStart: false,
                isEnd: false,
              });
              section.cards.sort((a, b) => a.order - b.order);
              return;
            }
          }
        }
      });
      return { cardId };
    },
    [setData]
  );

  const createDecisionCard = useCallback(
    (columnId: string, laneType: string, insertAtOrder?: number): { cardId: string } => {
      const cardId = nanoid();
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            if (col.id !== columnId) continue;
            const sameLane = col.decisionCards.filter((c) => c.laneType === laneType);
            const order =
              insertAtOrder ?? (sameLane.length === 0 ? 0 : Math.max(...sameLane.map((c) => c.order)) + 1);
            if (insertAtOrder === undefined) {
              col.decisionCards.push({
                id: cardId,
                order,
                laneType,
                title: "Decision",
                question: "?",
                description: null,
                isStart: false,
                isEnd: false,
              });
            } else {
              for (const c of col.decisionCards) {
                if (c.order >= insertAtOrder) c.order += 1;
              }
              col.decisionCards.push({
                id: cardId,
                order: insertAtOrder,
                laneType,
                title: "Decision",
                question: "?",
                description: null,
                isStart: false,
                isEnd: false,
              });
            }
            col.decisionCards.sort((a, b) => a.order - b.order);
            return;
          }
        }
      });
      return { cardId };
    },
    [setData]
  );

  const updateDecisionCard = useCallback(
    (cardId: string, field: string, value: string | boolean | null) => {
      setData((draft) => {
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            const card = col.decisionCards.find((c) => c.id === cardId);
            if (card) {
              if (field === "isStart" || field === "isEnd") {
                (card as Record<string, unknown>)[field] = value === true;
              } else if (field === "title" || field === "question") {
                (card as Record<string, unknown>)[field] = (value as string)?.trim() || (field === "title" ? "Untitled" : "?");
              } else {
                (card as Record<string, unknown>)[field] = value;
              }
              return;
            }
          }
        }
      });
    },
    [setData]
  );

  const duplicateDecisionCard = useCallback((cardId: string): { cardId: string } => {
    const newId = nanoid();
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const card = col.decisionCards.find((c) => c.id === cardId);
          if (card) {
            const maxOrder =
              col.decisionCards.length === 0 ? -1 : Math.max(...col.decisionCards.map((c) => c.order));
            col.decisionCards.push({
              ...card,
              id: newId,
              order: maxOrder + 1,
              title: `${card.title} (copy)`,
            });
            col.decisionCards.sort((a, b) => a.order - b.order);
            return;
          }
        }
      }
    });
    return { cardId: newId };
  }, [setData]);

  const deleteDecisionCard = useCallback((cardId: string) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const i = col.decisionCards.findIndex((c) => c.id === cardId);
          if (i !== -1) {
            col.decisionCards.splice(i, 1);
            return;
          }
        }
      }
    });
  }, [setData]);

  const updateDecisionCardOrder = useCallback((cardId: string, newOrder: number) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          const card = col.decisionCards.find((c) => c.id === cardId);
          if (card) {
            card.order = newOrder;
            col.decisionCards.sort((a, b) => a.order - b.order);
            return;
          }
        }
      }
    });
  }, [setData]);

  const createTeam = useCallback((): { teamId: string } => {
    const teamId = nanoid();
    setData((draft) => {
      const idx = draft.teams.length % TEAM_COLOR_TOKENS.length;
      const token = TEAM_COLOR_TOKENS[idx];
      draft.teams.push({
        id: teamId,
        name: `Team ${draft.teams.length + 1}`,
        iconName: "group",
        colorHex: token?.background ?? "#6366f1",
      });
    });
    return { teamId };
  }, [setData]);

  const updateTeam = useCallback(
    (teamId: string, field: "name" | "iconName" | "colorHex", value: string) => {
      setData((draft) => {
        const team = draft.teams.find((t) => t.id === teamId);
        if (team) {
          team[field] = value;
          for (const phase of draft.phases) {
            for (const col of phase.columns) {
              for (const section of col.teamSections) {
                if (section.teamId === teamId) section.team = { ...team };
              }
            }
          }
        }
      });
    },
    [setData]
  );

  const deleteTeam = useCallback((teamId: string) => {
    setData((draft) => {
      const i = draft.teams.findIndex((t) => t.id === teamId);
      if (i !== -1) {
        draft.teams.splice(i, 1);
        for (const phase of draft.phases) {
          for (const col of phase.columns) {
            col.teamSections = col.teamSections.filter((s) => s.teamId !== teamId);
          }
        }
      }
    });
  }, [setData]);

  const createSoftwareService = useCallback((): { softwareId: string } => {
    const softwareId = nanoid();
    setData((draft) => {
      const idx = draft.softwareServices.length % SOFTWARE_COLOR_TOKENS.length;
      const token = SOFTWARE_COLOR_TOKENS[idx];
      draft.softwareServices.push({
        id: softwareId,
        label: "Software",
        colorHex: token?.background ?? "#cbd5e1",
      });
    });
    return { softwareId };
  }, [setData]);

  const updateSoftwareService = useCallback((softwareId: string, field: "label" | "colorHex", value: string) => {
    setData((draft) => {
      const s = draft.softwareServices.find((x) => x.id === softwareId);
      if (s) {
        if (field === "label") s.label = value.trim() || "Software";
        else s.colorHex = value;
      }
    });
  }, [setData]);

  const deleteSoftwareService = useCallback((softwareId: string) => {
    setData((draft) => {
      const i = draft.softwareServices.findIndex((s) => s.id === softwareId);
      if (i !== -1) draft.softwareServices.splice(i, 1);
      for (const phase of draft.phases) {
        for (const col of phase.columns) {
          for (const section of col.teamSections) {
            for (const card of section.cards) {
              if (card.softwareIds) {
                const ids = JSON.parse(card.softwareIds) as string[];
                const next = ids.filter((id) => id !== softwareId);
                card.softwareIds = next.length > 0 ? JSON.stringify(next) : null;
              }
            }
          }
        }
      }
    });
  }, [setData]);

  const createConnection = useCallback(
    (
      sourceCardId: string,
      sourceCardType: string,
      targetCardId: string,
      targetCardType: string
    ): { connectionId: string } => {
      const connectionId = nanoid();
      setData((draft) => {
        const exists = draft.connections.some(
          (c) => c.sourceCardId === sourceCardId && c.targetCardId === targetCardId
        );
        if (exists) return;
        draft.connections.push({
          id: connectionId,
          sourceCardId,
          sourceCardType,
          targetCardId,
          targetCardType,
          connectorType: "standard",
          label: null,
          arrowDirection: "forward",
          strokeWeight: "normal",
          strokePattern: "solid",
          strokeColor: "grey",
        });
      });
      return { connectionId };
    },
    [setData]
  );

  const updateConnection = useCallback(
    (
      connectionId: string,
      updates: Partial<{
        connectorType: string;
        label: string | null;
        arrowDirection: string;
        strokeWeight: string;
        strokePattern: string;
        strokeColor: string;
      }>
    ) => {
      setData((draft) => {
        const c = draft.connections.find((x) => x.id === connectionId);
        if (c) Object.assign(c, updates);
      });
    },
    [setData]
  );

  const duplicateConnection = useCallback((connectionId: string): { connectionId: string } | null => {
    const conn = data?.connections.find((c) => c.id === connectionId);
    if (!conn) return null;
    return createConnection(
      conn.sourceCardId,
      conn.sourceCardType,
      conn.targetCardId,
      conn.targetCardType
    );
  }, [data, createConnection]);

  const deleteConnection = useCallback((connectionId: string) => {
    setData((draft) => {
      const i = draft.connections.findIndex((c) => c.id === connectionId);
      if (i !== -1) draft.connections.splice(i, 1);
    });
  }, [setData]);

  const createSoftwareServiceWithLabel = useCallback((label: string): { softwareId: string } => {
    const softwareId = nanoid();
    setData((draft) => {
      const idx = draft.softwareServices.length % SOFTWARE_COLOR_TOKENS.length;
      const token = SOFTWARE_COLOR_TOKENS[idx];
      draft.softwareServices.push({
        id: softwareId,
        label: label.trim() || "Software",
        colorHex: (token as { background?: string })?.background ?? "#cbd5e1",
      });
    });
    return { softwareId };
  }, [setData]);

  const value: BlueprintCacheContextValue = {
    data,
    setData,
    dirty,
    setDirty,
    blueprintId,
    syncNow,
    syncStatus,
    updateName,
    updatePhase,
    createBlankPhase,
    insertPhaseAt,
    deletePhase,
    insertColumnAt,
    deleteColumn,
    createBasicCard,
    updateBasicCard,
    duplicateBasicCard,
    deleteBasicCard,
    updateBasicCardPainPoints,
    updateBasicCardMarkers,
    updateBasicCardOrder,
    insertBasicCardAt,
    createTeamSection,
    deleteTeamSection,
    duplicateTeamSection,
    createComplexCard,
    updateComplexCard,
    duplicateComplexCard,
    deleteComplexCard,
    updateComplexCardPainPoints,
    updateComplexCardSoftware,
    updateComplexCardMarkers,
    updateComplexCardOrder,
    insertComplexCardAt,
    createDecisionCard,
    updateDecisionCard,
    duplicateDecisionCard,
    deleteDecisionCard,
    updateDecisionCardOrder,
    createTeam,
    updateTeam,
    deleteTeam,
    createSoftwareService: createSoftwareServiceWithLabel,
    updateSoftwareService,
    deleteSoftwareService,
    createConnection,
    updateConnection,
    duplicateConnection,
    deleteConnection,
  };

  return (
    <BlueprintCacheContext.Provider value={value}>
      {children}
    </BlueprintCacheContext.Provider>
  );
}
