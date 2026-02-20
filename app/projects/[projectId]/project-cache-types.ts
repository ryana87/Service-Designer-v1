/**
 * Cache types for project dashboard (project meta + lists + personas).
 */

export type ProjectCacheJourneyMapItem = {
  id: string;
  name: string;
  personaName: string | null;
  createdAt: string;
  updatedAt: string;
  phaseCount: number;
  actionCount: number;
};

export type ProjectCacheBlueprintItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  phaseCount: number;
  columnCount: number;
  connectionCount: number;
};

export type ProjectCachePersonaItem = {
  id: string;
  name: string;
  shortDescription: string | null;
  role: string | null;
  context: string | null;
  goals: string | null;
  needs: string | null;
  painPoints: string | null;
  notes: string | null;
  avatarUrl: string | null;
  templateId: string | null;
};

export type ProjectCacheDocument = {
  projectId: string;
  name: string;
  description: string | null;
  journeyMaps: ProjectCacheJourneyMapItem[];
  blueprints: ProjectCacheBlueprintItem[];
  personas: ProjectCachePersonaItem[];
  createdAt: string;
  updatedAt: string;
};
