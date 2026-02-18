import { notFound } from "next/navigation";
import { prisma } from "../../lib/db";
import { AppShell, ProjectSidebar } from "../../components/AppShell";
import { ProjectOverviewContent } from "./components";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
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

  if (!project) {
    notFound();
  }

  // Transform journey maps with counts
  const journeyMapsWithCounts = project.journeyMaps.map((map) => ({
    id: map.id,
    name: map.name,
    personaName: map.personaRef?.name || null,
    createdAt: map.createdAt.toISOString(),
    updatedAt: map.updatedAt.toISOString(),
    phaseCount: map.phases.length,
    actionCount: map.phases.reduce((sum, p) => sum + p.actions.length, 0),
  }));

  // Transform blueprints with counts
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

  return (
    <AppShell
      projectSidebar={
        <ProjectSidebar
          projectId={projectId}
          projectName={project.name}
          journeyMaps={project.journeyMaps}
          blueprints={project.serviceBlueprints}
          personas={project.personas.map(p => ({
            id: p.id,
            name: p.name,
            shortDescription: p.shortDescription,
          }))}
        />
      }
    >
      <ProjectOverviewContent
        projectId={project.id}
        projectName={project.name}
        projectDescription={project.description}
        journeyMaps={journeyMapsWithCounts}
        blueprints={blueprintsWithCounts}
        personas={project.personas.map(p => ({
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
        }))}
        createdAt={project.createdAt.toISOString()}
        updatedAt={project.updatedAt.toISOString()}
      />
    </AppShell>
  );
}
