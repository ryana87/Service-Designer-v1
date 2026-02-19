/**
 * Cache document types for journey map editor.
 * Mirrors the shape used by the UI and sent to syncJourneyMap.
 */

export type JourneyMapQuote = {
  id: string;
  quoteText: string;
  source: string | null;
};

export type JourneyMapAction = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  thought: string | null;
  channel: string | null;
  touchpoint: string | null;
  emotion: number | null;
  painPoints: string | null;
  opportunities: string | null;
  thumbnailUrl: string | null;
  quotes: JourneyMapQuote[];
};

export type JourneyMapPhase = {
  id: string;
  order: number;
  title: string;
  timeframe: string | null;
  actions: JourneyMapAction[];
};

export type JourneyMapCustomChannel = {
  id: string;
  label: string;
  iconName: string;
};

export type JourneyMapCustomTouchpoint = {
  id: string;
  label: string;
  iconName: string;
};

export type JourneyMapCacheDocument = {
  id: string;
  name: string;
  personaId: string | null;
  personaRef: { id: string; name: string; shortDescription: string | null } | null;
  phases: JourneyMapPhase[];
  customChannels: JourneyMapCustomChannel[];
  customTouchpoints: JourneyMapCustomTouchpoint[];
};

/** Convert server-fetched journey map to cache document (call from server or client) */
export function serverJourneyMapToCacheDocument(raw: {
  id: string;
  name: string;
  personaId: string | null;
  personaRef: { id: string; name: string; shortDescription: string | null } | null;
  phases: Array<{
    id: string;
    order: number;
    title: string;
    timeframe: string | null;
    actions: Array<{
      id: string;
      order: number;
      title: string;
      description: string | null;
      thought: string | null;
      channel: string | null;
      touchpoint: string | null;
      emotion: number | null;
      painPoints: string | null;
      opportunities: string | null;
      thumbnailUrl: string | null;
      quotes: Array<{ id: string; quoteText: string; source: string | null }>;
    }>;
  }>;
  customChannels: Array<{ id: string; label: string; iconName: string }>;
  customTouchpoints: Array<{ id: string; label: string; iconName: string }>;
}): JourneyMapCacheDocument {
  return {
    id: raw.id,
    name: raw.name,
    personaId: raw.personaId,
    personaRef: raw.personaRef,
    phases: raw.phases.map((p) => ({
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
    customChannels: raw.customChannels.map((c) => ({ id: c.id, label: c.label, iconName: c.iconName })),
    customTouchpoints: raw.customTouchpoints.map((t) => ({ id: t.id, label: t.label, iconName: t.iconName })),
  };
}

/** Payload sent to syncJourneyMap server action */
export type JourneyMapSyncPayload = {
  name: string;
  personaId: string | null;
  phases: Array<{
    id: string;
    order: number;
    title: string;
    timeframe: string | null;
    actions: Array<{
      id: string;
      order: number;
      title: string;
      description: string | null;
      thought: string | null;
      channel: string | null;
      touchpoint: string | null;
      emotion: number | null;
      painPoints: string | null;
      opportunities: string | null;
      thumbnailUrl: string | null;
      quotes: Array<{ id: string; quoteText: string; source: string | null }>;
    }>;
  }>;
  customChannels: Array<{ id: string; label: string; iconName: string }>;
  customTouchpoints: Array<{ id: string; label: string; iconName: string }>;
};
