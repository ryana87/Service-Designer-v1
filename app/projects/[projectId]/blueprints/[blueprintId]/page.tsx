import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db";
import { AppShell, ProjectSidebar } from "../../../../components/AppShell";
import { SelectModeProvider } from "../../../../contexts/SelectModeContext";
import { ExportButton } from "../../../../components/ExportButton";
import { BlueprintEditor } from "./components";
import { BlueprintCacheProvider } from "./BlueprintCacheContext";
import { serverBlueprintToCacheDocument } from "./cache-types";

type PageProps = {
  params: Promise<{ projectId: string; blueprintId: string }>;
};

export default async function BlueprintPage({ params }: PageProps) {
  const { projectId, blueprintId } = await params;

  let blueprint;
  try {
    blueprint = await prisma.serviceBlueprint.findUnique({
      where: { id: blueprintId },
      include: {
        project: {
          include: {
            journeyMaps: {
              select: { id: true, name: true },
              orderBy: { sortOrder: "asc" },
            },
            serviceBlueprints: {
              select: { id: true, name: true },
              orderBy: { sortOrder: "asc" },
            },
            personas: {
              select: { id: true, name: true, shortDescription: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        phases: {
          orderBy: { order: "asc" },
          include: {
            columns: {
              orderBy: { order: "asc" },
              include: {
                basicCards: {
                  orderBy: { order: "asc" },
                },
                decisionCards: {
                  orderBy: { order: "asc" },
                },
                teamSections: {
                  orderBy: { order: "asc" },
                  include: {
                    team: true,
                    cards: {
                      orderBy: { order: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
        teams: {
          orderBy: { createdAt: "asc" },
        },
        softwareServices: {
          orderBy: { createdAt: "asc" },
        },
        connections: true,
      },
    });
  } catch (err) {
    console.error("[BlueprintPage] Failed to load blueprint:", blueprintId, err);
    throw err;
  }

  if (!blueprint) {
    notFound();
  }

  let cacheInitialData;
  try {
    cacheInitialData = serverBlueprintToCacheDocument(blueprint);
  } catch (err) {
    console.error("[BlueprintPage] serverBlueprintToCacheDocument failed:", blueprintId, err);
    throw err;
  }

  return (
    <SelectModeProvider>
    <AppShell
      projectSidebar={
        <ProjectSidebar
          projectId={projectId}
          projectName={blueprint.project.name}
          journeyMaps={blueprint.project.journeyMaps}
          blueprints={blueprint.project.serviceBlueprints}
          personas={blueprint.project.personas}
          currentItemId={blueprintId}
          currentItemType="blueprint"
        />
      }
    >
      <BlueprintCacheProvider initialData={cacheInitialData} blueprintId={blueprintId}>
        <BlueprintEditor
          projectId={projectId}
          journeyMaps={blueprint.project.journeyMaps}
          blueprints={blueprint.project.serviceBlueprints}
          personas={blueprint.project.personas.map((p) => ({
            id: p.id,
            name: p.name,
          }))}
        />
      </BlueprintCacheProvider>
    </AppShell>
    </SelectModeProvider>
  );
}
