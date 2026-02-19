"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  journeyMapCount: number;
  blueprintCount: number;
};

type ProjectsListCacheDocument = {
  projects: ProjectListItem[];
};

type ProjectsListCacheValue = {
  data: ProjectsListCacheDocument;
  addProject: (project: ProjectListItem) => void;
  removeProject: (projectId: string) => void;
};

const ProjectsListCacheContext = createContext<ProjectsListCacheValue | null>(null);

export function ProjectsListCacheProvider({
  initialData,
  children,
}: {
  initialData: ProjectsListCacheDocument;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<ProjectsListCacheDocument>(initialData);

  const addProject = useCallback((project: ProjectListItem) => {
    setData((prev) => ({
      ...prev,
      projects: [project, ...prev.projects],
    }));
  }, []);

  const removeProject = useCallback((projectId: string) => {
    setData((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== projectId),
    }));
  }, []);

  const value = useMemo<ProjectsListCacheValue>(
    () => ({ data, addProject, removeProject }),
    [data, addProject, removeProject]
  );

  return (
    <ProjectsListCacheContext.Provider value={value}>
      {children}
    </ProjectsListCacheContext.Provider>
  );
}

export function useProjectsListCache(): ProjectsListCacheValue {
  const ctx = useContext(ProjectsListCacheContext);
  if (!ctx) throw new Error("useProjectsListCache must be used within ProjectsListCacheProvider");
  return ctx;
}
