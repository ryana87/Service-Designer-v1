import { AppShell } from "../../components/AppShell";
import { ProjectOverviewContent } from "./components";
import { ProjectSidebarFromCache } from "./ProjectSidebarFromCache";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;

  return (
    <AppShell
      projectSidebar={<ProjectSidebarFromCache />}
    >
      <ProjectOverviewContent projectId={projectId} />
    </AppShell>
  );
}
