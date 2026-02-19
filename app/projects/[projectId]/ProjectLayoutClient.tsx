"use client";

import { ProjectCacheProvider } from "./ProjectCacheContext";
import type { ProjectCacheDocument } from "./project-cache-types";

export function ProjectLayoutClient({
  initialData,
  children,
}: {
  initialData: ProjectCacheDocument;
  children: React.ReactNode;
}) {
  return (
    <ProjectCacheProvider initialData={initialData}>
      {children}
    </ProjectCacheProvider>
  );
}
