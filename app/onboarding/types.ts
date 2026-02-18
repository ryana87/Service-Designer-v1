export type ArtifactType = "journeyMap" | "blueprint";

export type JourneyMapDraftSpec = {
  name: string;
  personaName?: string | null;
  phases: {
    title: string;
    timeframe?: string | null;
    actions: {
      title: string;
      description?: string | null;
      thought?: string | null;
      channel?: string | null;
      touchpoint?: string | null;
      emotion?: number | null;
      painPoints?: string | null;
      opportunities?: string | null;
      quotes?: { quoteText: string; source?: string | null }[];
      thumbnailUrl?: string | null;
    }[];
  }[];
};

export type BlueprintLaneType =
  | "PHYSICAL_EVIDENCE"
  | "CUSTOMER_ACTION"
  | "FRONTSTAGE_ACTION"
  | "BACKSTAGE_ACTION"
  | "SUPPORT_PROCESS";

export type BlueprintDraftSpec = {
  name: string;
  phases: {
    title: string;
    timeframe?: string | null;
    steps: {
      label?: string | null;
      lanes: Partial<
        Record<
          BlueprintLaneType,
          {
            title: string;
            description?: string | null;
            teamName?: string | null;
          }[]
        >
      >;
    }[];
  }[];
  teams?: { name: string }[]; // optional default teams for complex lanes
};

export type JourneyMapTemplate = {
  id: string;
  name: string;
  description: string;
  draft: JourneyMapDraftSpec;
};

export type BlueprintTemplate = {
  id: string;
  name: string;
  description: string;
  draft: BlueprintDraftSpec;
};

