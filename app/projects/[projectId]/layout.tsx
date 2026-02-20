import { notFound } from "next/navigation";
import { prisma } from "../../lib/db";
import { getSession } from "../../lib/session";
import { ProjectLayoutClient } from "./ProjectLayoutClient";
import type { ProjectCacheDocument } from "./project-cache-types";

type LayoutProps = {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
};

export default async function ProjectLayout({ params, children }: LayoutProps) {
  const { projectId } = await params;
  const session = await getSession();

  let project;
  try {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        journeyMaps: {
          include: {
            personaRef: true,
            phases: {
              include: {
                actions: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        serviceBlueprints: {
          include: {
            phases: {
              include: {
                columns: true,
              },
            },
            connections: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        personas: {
          orderBy: { name: "asc" },
        },
      },
    });
  } catch (err) {
    console.error("[ProjectLayout] Failed to load project:", projectId, err);
    throw err;
  }

  if (!project) notFound();

  // Only enforce owner when project has an owner set (e.g. after migration/backfill).
  // When ownerId is null, allow access so production works before/without backfill.
  if (project.ownerId != null) {
    if (!session) notFound();
    if (session.userId !== project.ownerId) notFound();
  }

  const journeyMapsWithCounts = project.journeyMaps.map((map) => ({
    id: map.id,
    name: map.name,
    personaName: map.personaRef?.name || null,
    createdAt: map.createdAt.toISOString(),
    updatedAt: map.updatedAt.toISOString(),
    phaseCount: map.phases.length,
    actionCount: map.phases.reduce((sum, p) => sum + p.actions.length, 0),
  }));

  const blueprintsWithCounts = project.serviceBlueprints.map((bp) => {
    const columnCount = bp.phases.reduce((sum, p) => sum + p.columns.length, 0);
    return {
      id: bp.id,
      name: bp.name,
      createdAt: bp.createdAt.toISOString(),
      updatedAt: bp.updatedAt.toISOString(),
      phaseCount: bp.phases.length,
      columnCount,
      connectionCount: bp.connections.length,
    };
  });

  const cacheInitialData: ProjectCacheDocument = {
    projectId: project.id,
    name: project.name,
    description: project.description,
    journeyMaps: journeyMapsWithCounts,
    blueprints: blueprintsWithCounts,
    personas: project.personas.map((p) => ({
      id: p.id,
      name: p.name,
      shortDescription: p.shortDescription,
      role: p.role,
      context: p.context,
      goals: p.goals,
      needs: p.needs,
      painPoints: p.painPoints,
      notes: p.notes,
      avatarUrl: p.avatarUrl,
      templateId: p.templateId,
    })),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };

  return (
    <ProjectLayoutClient initialData={cacheInitialData}>
      {children}
    </ProjectLayoutClient>
  );
}
