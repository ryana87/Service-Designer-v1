"use client";

import { usePathname } from "next/navigation";
import { ProjectSidebar } from "../../components/AppShell";
import { useProjectCache } from "./ProjectCacheContext";

/**
 * Renders ProjectSidebar using project cache (for use when inside ProjectCacheProvider at layout).
 * Derives currentItemId and currentItemType from pathname.
 */
export function ProjectSidebarFromCache() {
  const cache = useProjectCache();
  const pathname = usePathname() ?? "";

  const projectId = cache.data.projectId;
  const projectName = cache.data.name;
  const journeyMaps = cache.data.journeyMaps.map((m) => ({ id: m.id, name: m.name }));
  const blueprints = cache.data.blueprints.map((b) => ({ id: b.id, name: b.name }));
  const personas = cache.data.personas.map((p) => ({
    id: p.id,
    name: p.name,
    shortDescription: p.shortDescription,
  }));

  let currentItemId: string | undefined;
  let currentItemType: "journeyMap" | "blueprint" | undefined;
  const jmMatch = pathname.match(/\/projects\/[^/]+\/journey-maps\/([^/]+)/);
  const bpMatch = pathname.match(/\/projects\/[^/]+\/blueprints\/([^/]+)/);
  if (jmMatch) {
    currentItemId = jmMatch[1];
    currentItemType = "journeyMap";
  } else if (bpMatch) {
    currentItemId = bpMatch[1];
    currentItemType = "blueprint";
  }

  return (
    <ProjectSidebar
      projectId={projectId}
      projectName={projectName}
      journeyMaps={journeyMaps}
      blueprints={blueprints}
      personas={personas}
      currentItemId={currentItemId}
      currentItemType={currentItemType}
    />
  );
}
