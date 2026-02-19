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
  JourneyMapCacheDocument,
  JourneyMapPhase,
  JourneyMapAction,
  JourneyMapSyncPayload,
} from "./cache-types";
import { serverJourneyMapToCacheDocument } from "./cache-types";
import { syncJourneyMap } from "../actions";

// Re-export for consumers that import from this file
export { serverJourneyMapToCacheDocument } from "./cache-types";

function documentToSyncPayload(doc: JourneyMapCacheDocument): JourneyMapSyncPayload {
  return {
    name: doc.name,
    personaId: doc.personaId,
    phases: doc.phases.map((p) => ({
      id: p.id,
      order: p.order,
      title: p.title,
      timeframe: p.timeframe,
      actions: p.actions.map((a) => ({
        id: a.id,
        order: a.order,
        title: a.title,
        description: a.description,
        thought: a.thought,
        channel: a.channel,
        touchpoint: a.touchpoint,
        emotion: a.emotion,
        painPoints: a.painPoints,
        opportunities: a.opportunities,
        thumbnailUrl: a.thumbnailUrl,
        quotes: a.quotes.map((q) => ({ id: q.id, quoteText: q.quoteText, source: q.source })),
      })),
    })),
    customChannels: doc.customChannels.map((c) => ({ id: c.id, label: c.label, iconName: c.iconName })),
    customTouchpoints: doc.customTouchpoints.map((t) => ({ id: t.id, label: t.label, iconName: t.iconName })),
  };
}

type SetDataUpdater = (draft: JourneyMapCacheDocument) => void;

type JourneyMapCacheContextValue = {
  data: JourneyMapCacheDocument | null;
  setData: (updater: SetDataUpdater) => void;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  journeyMapId: string;
  syncNow: () => Promise<{ success: boolean; error?: string }>;
  syncStatus: "idle" | "saving" | "saved" | "error";
  // Cache updaters (no server calls)
  updatePhase: (phaseId: string, field: "title" | "timeframe", value: string) => void;
  updateActionField: (actionId: string, field: string, value: string | number | null) => void;
  createBlankPhase: () => { phaseId: string; actionId: string };
  insertBlankPhaseAt: (referencePhaseId: string, position: "before" | "after") => { phaseId: string; actionId: string };
  createBlankAction: (phaseId: string) => { actionId: string };
  insertBlankActionAt: (phaseId: string, referenceActionId: string | null, position: "before" | "after") => { actionId: string };
  deleteAction: (actionId: string) => void;
  duplicateAction: (actionId: string) => { actionId: string };
  updateActionPainPoints: (actionId: string, painPoints: Array<{ text: string; severity: "LOW" | "MEDIUM" | "HIGH" }>) => void;
  updateActionOpportunities: (actionId: string, opportunities: Array<{ text: string; impact: "LOW" | "MEDIUM" | "HIGH" }>) => void;
  createQuote: (actionId: string, quoteText: string, source: string | null) => string;
  createCustomChannel: (label: string, iconName?: string) => string;
  createCustomTouchpoint: (label: string, iconName?: string) => string;
  updatePersonaId: (personaId: string | null) => void;
  updateName: (name: string) => void;
};

const JourneyMapCacheContext = createContext<JourneyMapCacheContextValue | null>(null);

export function useJourneyMapCache() {
  const ctx = useContext(JourneyMapCacheContext);
  if (!ctx) throw new Error("useJourneyMapCache must be used within JourneyMapCacheProvider");
  return ctx;
}

const SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const RETRY_DELAYS = [1000, 2000];

export function JourneyMapCacheProvider({
  children,
  initialData,
  journeyMapId,
}: {
  children: React.ReactNode;
  initialData: JourneyMapCacheDocument;
  journeyMapId: string;
}) {
  const [data, setDataState] = useState<JourneyMapCacheDocument | null>(initialData);
  const [dirty, setDirty] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initialDataRef = useRef(initialData);
  const journeyMapIdRef = useRef(journeyMapId);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    initialDataRef.current = initialData;
    journeyMapIdRef.current = journeyMapId;
    setDataState(initialData);
  }, [journeyMapId, initialData.id]);

  const setData = useCallback((updater: SetDataUpdater) => {
    setDataState((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as JourneyMapCacheDocument;
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
        await syncJourneyMap(journeyMapIdRef.current, payload);
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

  // Periodic sync (use ref so interval is stable and always sends latest data)
  useEffect(() => {
    if (!dirty) return;
    const id = setInterval(async () => {
      const doc = dataRef.current;
      if (!doc) return;
      setSyncStatus("saving");
      const payload = documentToSyncPayload(doc);
      try {
        await syncJourneyMap(journeyMapIdRef.current, payload);
        setDirty(false);
        setSyncStatus("saved");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch {
        setSyncStatus("error");
      }
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dirty]);

  // beforeunload: try to sync if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const updatePhase = useCallback((phaseId: string, field: "title" | "timeframe", value: string) => {
    setData((draft) => {
      const phase = draft.phases.find((p) => p.id === phaseId);
      if (phase) {
        if (field === "title") phase.title = value.trim() || "Untitled";
        else phase.timeframe = value.trim() || null;
      }
    });
  }, [setData]);

  const updateActionField = useCallback((actionId: string, field: string, value: string | number | null) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        const action = phase.actions.find((a) => a.id === actionId);
        if (action) {
          if (field === "emotion") {
            action.emotion = value === "" || value === null ? null : (typeof value === "number" ? value : parseInt(String(value), 10));
            if (action.emotion !== null && (action.emotion < 1 || action.emotion > 5)) action.emotion = null;
          } else if (field === "thumbnailUrl") {
            action.thumbnailUrl = value as string | null;
          } else if (field === "title") {
            action.title = (value === null || value === "" ? "Untitled" : String(value).trim()) || "Untitled";
          } else {
            const v = value === null || value === "" ? null : (typeof value === "string" ? value.trim() : value);
            (action as Record<string, unknown>)[field] = v;
          }
          return;
        }
      }
    });
  }, [setData]);

  const createBlankPhase = useCallback((): { phaseId: string; actionId: string } => {
    const phaseId = nanoid();
    const actionId = nanoid();
    setData((draft) => {
      const maxOrder = draft.phases.length === 0 ? -1 : Math.max(...draft.phases.map((p) => p.order));
      draft.phases.push({
        id: phaseId,
        order: maxOrder + 1,
        title: "New Phase",
        timeframe: null,
        actions: [{ id: actionId, order: 0, title: "New Action", description: null, thought: null, channel: null, touchpoint: null, emotion: null, painPoints: null, opportunities: null, thumbnailUrl: null, quotes: [] }],
      });
      draft.phases.sort((a, b) => a.order - b.order);
    });
    return { phaseId, actionId };
  }, [setData]);

  const insertBlankPhaseAt = useCallback((referencePhaseId: string, position: "before" | "after"): { phaseId: string; actionId: string } => {
    const phaseId = nanoid();
    const actionId = nanoid();
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
        actions: [{ id: actionId, order: 0, title: "New Action", description: null, thought: null, channel: null, touchpoint: null, emotion: null, painPoints: null, opportunities: null, thumbnailUrl: null, quotes: [] }],
      });
      draft.phases.sort((a, b) => a.order - b.order);
    });
    return { phaseId, actionId };
  }, [setData]);

  const createBlankAction = useCallback((phaseId: string): { actionId: string } => {
    const actionId = nanoid();
    setData((draft) => {
      const phase = draft.phases.find((p) => p.id === phaseId);
      if (!phase) return;
      const maxOrder = phase.actions.length === 0 ? -1 : Math.max(...phase.actions.map((a) => a.order));
      phase.actions.push({
        id: actionId,
        order: maxOrder + 1,
        title: "New Action",
        description: null,
        thought: null,
        channel: null,
        touchpoint: null,
        emotion: null,
        painPoints: null,
        opportunities: null,
        thumbnailUrl: null,
        quotes: [],
      });
      phase.actions.sort((a, b) => a.order - b.order);
    });
    return { actionId };
  }, [setData]);

  const insertBlankActionAt = useCallback((phaseId: string, referenceActionId: string | null, position: "before" | "after"): { actionId: string } => {
    const actionId = nanoid();
    setData((draft) => {
      const phase = draft.phases.find((p) => p.id === phaseId);
      if (!phase) return;
      let targetOrder = 0;
      if (referenceActionId) {
        const ref = phase.actions.find((a) => a.id === referenceActionId);
        if (ref) targetOrder = position === "before" ? ref.order : ref.order + 1;
        else targetOrder = (phase.actions[phase.actions.length - 1]?.order ?? -1) + 1;
      } else {
        targetOrder = (phase.actions[phase.actions.length - 1]?.order ?? -1) + 1;
      }
      for (const a of phase.actions) {
        if (a.order >= targetOrder) a.order += 1;
      }
      phase.actions.push({
        id: actionId,
        order: targetOrder,
        title: "New Action",
        description: null,
        thought: null,
        channel: null,
        touchpoint: null,
        emotion: null,
        painPoints: null,
        opportunities: null,
        thumbnailUrl: null,
        quotes: [],
      });
      phase.actions.sort((a, b) => a.order - b.order);
    });
    return { actionId };
  }, [setData]);

  const deleteAction = useCallback((actionId: string) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        const i = phase.actions.findIndex((a) => a.id === actionId);
        if (i !== -1) {
          phase.actions.splice(i, 1);
          return;
        }
      }
    });
  }, [setData]);

  const duplicateAction = useCallback((actionId: string): { actionId: string } => {
    const newId = nanoid();
    setData((draft) => {
      for (const phase of draft.phases) {
        const action = phase.actions.find((a) => a.id === actionId);
        if (action) {
          const maxOrder = Math.max(...phase.actions.map((a) => a.order), -1);
          const newAction: JourneyMapAction = {
            id: newId,
            order: maxOrder + 1,
            title: `${action.title} (copy)`,
            description: action.description,
            thought: action.thought,
            channel: action.channel,
            touchpoint: action.touchpoint,
            emotion: action.emotion,
            painPoints: action.painPoints,
            opportunities: action.opportunities,
            thumbnailUrl: action.thumbnailUrl,
            quotes: action.quotes.map((q) => ({ id: nanoid(), quoteText: q.quoteText, source: q.source })),
          };
          phase.actions.push(newAction);
          phase.actions.sort((a, b) => a.order - b.order);
          return;
        }
      }
    });
    return { actionId: newId };
  }, [setData]);

  const updateActionPainPoints = useCallback((actionId: string, painPoints: Array<{ text: string; severity: "LOW" | "MEDIUM" | "HIGH" }>) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        const action = phase.actions.find((a) => a.id === actionId);
        if (action) {
          action.painPoints = JSON.stringify(painPoints);
          return;
        }
      }
    });
  }, [setData]);

  const updateActionOpportunities = useCallback((actionId: string, opportunities: Array<{ text: string; impact: "LOW" | "MEDIUM" | "HIGH" }>) => {
    setData((draft) => {
      for (const phase of draft.phases) {
        const action = phase.actions.find((a) => a.id === actionId);
        if (action) {
          action.opportunities = JSON.stringify(opportunities);
          return;
        }
      }
    });
  }, [setData]);

  const createQuote = useCallback((actionId: string, quoteText: string, source: string | null): string => {
    const id = nanoid();
    setData((draft) => {
      for (const phase of draft.phases) {
        const action = phase.actions.find((a) => a.id === actionId);
        if (action) {
          action.quotes.push({ id, quoteText: quoteText.trim(), source: source?.trim() || null });
          return;
        }
      }
    });
    return id;
  }, [setData]);

  const createCustomChannel = useCallback((label: string, iconName = "label"): string => {
    const id = nanoid();
    setData((draft) => {
      draft.customChannels.push({ id, label: label.trim(), iconName });
    });
    return id;
  }, [setData]);

  const createCustomTouchpoint = useCallback((label: string, iconName = "label"): string => {
    const id = nanoid();
    setData((draft) => {
      draft.customTouchpoints.push({ id, label: label.trim(), iconName });
    });
    return id;
  }, [setData]);

  const updatePersonaId = useCallback((personaId: string | null) => {
    setData((draft) => {
      draft.personaId = personaId;
    });
  }, [setData]);

  const updateName = useCallback((name: string) => {
    setData((draft) => {
      draft.name = name.trim() || "Untitled";
    });
  }, [setData]);

  const value: JourneyMapCacheContextValue = {
    data,
    setData,
    dirty,
    setDirty,
    journeyMapId,
    syncNow,
    syncStatus,
    updatePhase,
    updateActionField,
    createBlankPhase,
    insertBlankPhaseAt,
    createBlankAction,
    insertBlankActionAt,
    deleteAction,
    duplicateAction,
    updateActionPainPoints,
    updateActionOpportunities,
    createQuote,
    createCustomChannel,
    createCustomTouchpoint,
    updatePersonaId,
    updateName,
  };

  return (
    <JourneyMapCacheContext.Provider value={value}>
      {children}
    </JourneyMapCacheContext.Provider>
  );
}
