import { notFound } from "next/navigation";
import { prisma } from "../../../lib/db";
import { AppShell, ProjectSidebar } from "../../../components/AppShell";
import { CompareJourneyMapsView } from "./CompareJourneyMapsView";
import { CompareBlueprintsView } from "./CompareBlueprintsView";
import { DEMO_JOURNEY_MAP_IDS, DEMO_BLUEPRINT_IDS } from "../../../demo/assets";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ left?: string; right?: string; type?: string }>;
};

export default async function ComparePage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const { left, right, type = "journeyMap" } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      journeyMaps: { select: { id: true, name: true }, orderBy: { sortOrder: "asc" } },
      serviceBlueprints: { select: { id: true, name: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) notFound();

  // Use project's first two items when no left/right params; fall back to demo IDs for demo project
  const items = type === "journeyMap" ? project.journeyMaps : project.serviceBlueprints;
  const defaultLeft = items[0]?.id ?? (type === "journeyMap" ? DEMO_JOURNEY_MAP_IDS.currentState : DEMO_BLUEPRINT_IDS.currentState);
  const defaultRight = items[1]?.id ?? (type === "journeyMap" ? DEMO_JOURNEY_MAP_IDS.futureState : DEMO_BLUEPRINT_IDS.futureState);
  const leftId = left || defaultLeft;
  const rightId = right || defaultRight;

  if (type === "blueprint") {
    const [leftBp, rightBp] = await Promise.all([
      prisma.serviceBlueprint.findUnique({
        where: { id: leftId, projectId },
        include: {
          phases: {
            orderBy: { order: "asc" },
            include: {
              columns: {
                orderBy: { order: "asc" },
                include: {
                  basicCards: true,
                  teamSections: { include: { team: true, cards: true } },
                  decisionCards: true,
                },
              },
            },
          },
          teams: true,
        },
      }),
      prisma.serviceBlueprint.findUnique({
        where: { id: rightId, projectId },
        include: {
          phases: {
            orderBy: { order: "asc" },
            include: {
              columns: {
                orderBy: { order: "asc" },
                include: {
                  basicCards: true,
                  teamSections: { include: { team: true, cards: true } },
                  decisionCards: true,
                },
              },
            },
          },
          teams: true,
        },
      }),
    ]);

    if (!leftBp || !rightBp) notFound();

    return (
      <AppShell
        projectSidebar={
          <ProjectSidebar
            projectId={projectId}
            projectName={project.name}
            journeyMaps={project.journeyMaps}
            blueprints={project.serviceBlueprints}
            personas={[]}
            currentItemId={leftId}
            currentItemType="blueprint"
          />
        }
      >
        <CompareBlueprintsView
          projectId={projectId}
          left={leftBp}
          right={rightBp}
          leftLabel="Current State"
          rightLabel="Future State"
        />
      </AppShell>
    );
  }

  const [leftMap, rightMap] = await Promise.all([
    prisma.journeyMap.findUnique({
      where: { id: leftId, projectId },
      include: {
        personaRef: true,
        phases: {
          orderBy: { order: "asc" },
          include: {
            actions: {
              orderBy: { order: "asc" },
              include: { quotes: true },
            },
          },
        },
      },
    }),
    prisma.journeyMap.findUnique({
      where: { id: rightId, projectId },
      include: {
        personaRef: true,
        phases: {
          orderBy: { order: "asc" },
          include: {
            actions: {
              orderBy: { order: "asc" },
              include: { quotes: true },
            },
          },
        },
      },
    }),
  ]);

  if (!leftMap || !rightMap) notFound();

  return (
    <AppShell
      projectSidebar={
        <ProjectSidebar
          projectId={projectId}
          projectName={project.name}
          journeyMaps={project.journeyMaps}
          blueprints={project.serviceBlueprints}
          personas={[]}
          currentItemId={leftId}
          currentItemType="journeyMap"
        />
      }
    >
      <CompareJourneyMapsView
        projectId={projectId}
        left={leftMap}
        right={rightMap}
        leftLabel="Current State"
        rightLabel="Future State"
      />
    </AppShell>
  );
}
