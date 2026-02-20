import { AppShell } from "../../components/AppShell";
import { getSession } from "../../lib/session";
import { ProjectOverviewContent } from "./components";
import { ProjectSidebarFromCache } from "./ProjectSidebarFromCache";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  const session = await getSession();

  return (
    <AppShell
      projectSidebar={<ProjectSidebarFromCache />}
      user={session}
    >
      <ProjectOverviewContent projectId={projectId} />
    </AppShell>
  );
}
