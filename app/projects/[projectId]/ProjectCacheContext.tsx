"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  ProjectCacheDocument,
  ProjectCacheJourneyMapItem,
  ProjectCacheBlueprintItem,
  ProjectCachePersonaItem,
} from "./project-cache-types";

type ProjectCacheContextValue = {
  data: ProjectCacheDocument;
  updateProjectName: (name: string) => void;
  updateProjectDescription: (description: string | null) => void;
  addJourneyMap: (item: ProjectCacheJourneyMapItem) => void;
  updateJourneyMapName: (id: string, name: string) => void;
  removeJourneyMap: (id: string) => void;
  addJourneyMapFromDuplicate: (item: ProjectCacheJourneyMapItem) => void;
  addBlueprint: (item: ProjectCacheBlueprintItem) => void;
  updateBlueprintName: (id: string, name: string) => void;
  removeBlueprint: (id: string) => void;
  addBlueprintFromDuplicate: (item: ProjectCacheBlueprintItem) => void;
  addPersona: (persona: ProjectCachePersonaItem) => void;
  updatePersona: (id: string, data: Partial<ProjectCachePersonaItem>) => void;
  removePersona: (id: string) => void;
};

const ProjectCacheContext = createContext<ProjectCacheContextValue | null>(null);

export function useProjectCache() {
  const ctx = useContext(ProjectCacheContext);
  if (!ctx) throw new Error("useProjectCache must be used within ProjectCacheProvider");
  return ctx;
}

/** Returns null when not inside ProjectCacheProvider (e.g. on journey map page before layout provider). */
export function useOptionalProjectCache(): ProjectCacheContextValue | null {
  return useContext(ProjectCacheContext);
}

export function ProjectCacheProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData: ProjectCacheDocument;
}) {
  const [data, setData] = useState<ProjectCacheDocument>(initialData);

  const updateProjectName = useCallback((name: string) => {
    setData((prev) => ({
      ...prev,
      name: name.trim() || "Untitled Project",
    }));
  }, []);

  const updateProjectDescription = useCallback((description: string | null) => {
    setData((prev) => ({
      ...prev,
      description: description?.trim() || null,
    }));
  }, []);

  const addJourneyMap = useCallback((item: ProjectCacheJourneyMapItem) => {
    setData((prev) => ({
      ...prev,
      journeyMaps: [...prev.journeyMaps, item],
    }));
  }, []);

  const updateJourneyMapName = useCallback((id: string, name: string) => {
    setData((prev) => ({
      ...prev,
      journeyMaps: prev.journeyMaps.map((m) =>
        m.id === id ? { ...m, name: name.trim() || "Untitled Journey Map" } : m
      ),
    }));
  }, []);

  const removeJourneyMap = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      journeyMaps: prev.journeyMaps.filter((m) => m.id !== id),
    }));
  }, []);

  const addJourneyMapFromDuplicate = useCallback((item: ProjectCacheJourneyMapItem) => {
    setData((prev) => ({
      ...prev,
      journeyMaps: [...prev.journeyMaps, item],
    }));
  }, []);

  const addBlueprint = useCallback((item: ProjectCacheBlueprintItem) => {
    setData((prev) => ({
      ...prev,
      blueprints: [...prev.blueprints, item],
    }));
  }, []);

  const updateBlueprintName = useCallback((id: string, name: string) => {
    setData((prev) => ({
      ...prev,
      blueprints: prev.blueprints.map((b) =>
        b.id === id ? { ...b, name: name.trim() || "Untitled Blueprint" } : b
      ),
    }));
  }, []);

  const removeBlueprint = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      blueprints: prev.blueprints.filter((b) => b.id !== id),
    }));
  }, []);

  const addBlueprintFromDuplicate = useCallback((item: ProjectCacheBlueprintItem) => {
    setData((prev) => ({
      ...prev,
      blueprints: [...prev.blueprints, item],
    }));
  }, []);

  const addPersona = useCallback((persona: ProjectCachePersonaItem) => {
    setData((prev) => ({
      ...prev,
      personas: [...prev.personas, persona],
    }));
  }, []);

  const updatePersona = useCallback((id: string, updates: Partial<ProjectCachePersonaItem>) => {
    setData((prev) => ({
      ...prev,
      personas: prev.personas.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  }, []);

  const removePersona = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      personas: prev.personas.filter((p) => p.id !== id),
    }));
  }, []);

  const value: ProjectCacheContextValue = {
    data,
    updateProjectName,
    updateProjectDescription,
    addJourneyMap,
    updateJourneyMapName,
    removeJourneyMap,
    addJourneyMapFromDuplicate,
    addBlueprint,
    updateBlueprintName,
    removeBlueprint,
    addBlueprintFromDuplicate,
    addPersona,
    updatePersona,
    removePersona,
  };

  return (
    <ProjectCacheContext.Provider value={value}>
      {children}
    </ProjectCacheContext.Provider>
  );
}
