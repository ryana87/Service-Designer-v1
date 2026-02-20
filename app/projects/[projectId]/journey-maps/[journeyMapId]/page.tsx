import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db";
import { getSession } from "../../../../lib/session";
import { AppShell, ProjectSidebar } from "../../../../components/AppShell";
import { ExportButton } from "../../../../components/ExportButton";
import ShareButton from "../../../../components/ShareButton";
import { CommentProvider } from "../../../../contexts/CommentContext";
import { CommentMenuRenderer } from "../../../../components/CommentMenuRenderer";
import { HideCommentsButton } from "../../../../components/HideCommentsButton";
import { CommentableCell } from "../../../../components/CommentableCell";
import { CommentableGridHandler } from "../../../../components/CommentableGridHandler";
import { CanvasWithMinimap } from "./CanvasWithMinimap";
import { HeaderZoomControls } from "./HeaderZoomControls";
import { JourneyMapCanvasContent } from "./JourneyMapCanvasContent";
import { OverlayProvider } from "./components";
import { JourneyMapEditorContent } from "./JourneyMapEditorContent";
import { serverJourneyMapToCacheDocument } from "./cache-types";
import { DEMO_PROJECT_ID } from "../../../../demo/constants";
import { SelectModeProvider } from "../../../../contexts/SelectModeContext";

type PageProps = {
  params: Promise<{ projectId: string; journeyMapId: string }>;
};

export default async function JourneyMapDetailPage({ params }: PageProps) {
  const { projectId, journeyMapId } = await params;
  const session = await getSession();

  // Check if this is the demo project
  const isDemo = projectId === DEMO_PROJECT_ID;

  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
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
            orderBy: { createdAt: "asc" },
          },
        },
      },
      personaRef: true,
      phases: {
        orderBy: { order: "asc" },
        include: {
          actions: {
            orderBy: { order: "asc" },
            include: {
              quotes: {
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
      customChannels: {
        orderBy: { createdAt: "asc" },
      },
      customTouchpoints: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!journeyMap || journeyMap.projectId !== projectId) {
    notFound();
  }

  const initialCache = serverJourneyMapToCacheDocument(journeyMap);

  return (
    <OverlayProvider journeyMapId={journeyMapId} cacheInitialData={initialCache}>
      <SelectModeProvider>
        <AppShell
          user={session}
          projectSidebar={
            <ProjectSidebar
              projectId={projectId}
              projectName={journeyMap.project.name}
              journeyMaps={journeyMap.project.journeyMaps}
              blueprints={journeyMap.project.serviceBlueprints}
              personas={journeyMap.project.personas.map((p) => ({
                id: p.id,
                name: p.name,
                shortDescription: p.shortDescription,
                templateId: p.templateId ?? undefined,
              }))}
              currentItemId={journeyMapId}
              currentItemType="journeyMap"
            />
          }
        >
          <CanvasWithMinimap>
            <CommentProvider>
              <CommentMenuRenderer />
              <JourneyMapEditorContent
                projectId={projectId}
                journeyMapId={journeyMapId}
                project={{
                  name: journeyMap.project.name,
                  journeyMaps: journeyMap.project.journeyMaps,
                  serviceBlueprints: journeyMap.project.serviceBlueprints,
                  personas: journeyMap.project.personas.map((p) => ({
                    id: p.id,
                    name: p.name,
                    shortDescription: p.shortDescription,
                    avatarUrl: p.avatarUrl ?? null,
                    templateId: p.templateId ?? null,
                  })),
                }}
                isDemo={isDemo}
              />
            </CommentProvider>
          </CanvasWithMinimap>
        </AppShell>
      </SelectModeProvider>
    </OverlayProvider>
  );
}
