import { notFound } from "next/navigation";
import { prisma } from "../../../lib/db";
import { AppShell, ProjectSidebar } from "../../../components/AppShell";
import { FacilitationFlow } from "./ui";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ type?: "journeyMap" | "blueprint" }>;
};

export default async function FacilitatePage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const { type = "journeyMap" } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      journeyMaps: { select: { id: true, name: true }, orderBy: { sortOrder: "asc" } },
      serviceBlueprints: { select: { id: true, name: true }, orderBy: { sortOrder: "asc" } },
      personas: { select: { id: true, name: true, shortDescription: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!project) notFound();

  return (
    <AppShell
      projectSidebar={
        <ProjectSidebar
          projectId={projectId}
          projectName={project.name}
          journeyMaps={project.journeyMaps}
          blueprints={project.serviceBlueprints}
          personas={project.personas}
          currentItemId={undefined}
          currentItemType={type}
        />
      }
      showAiSidebar={false}
    >
      <FacilitationFlow projectId={projectId} initialType={type} />
    </AppShell>
  );
}

