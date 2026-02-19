import { prisma } from "../lib/db";
import { getSession } from "../lib/session";
import { AppShell } from "../components/AppShell";
import { ProjectsListCacheProvider } from "./ProjectsListCacheContext";
import ProjectsPageContent from "./ProjectsPageContent";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) {
    return null; // Layout already redirects; avoid double fetch
  }

  let projects;
  try {
    projects = await prisma.project.findMany({
      where: { ownerId: session.userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { journeyMaps: true, serviceBlueprints: true },
        },
      },
    });
  } catch (err) {
    console.error("[ProjectsPage] Database error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <AppShell showAiSidebar={false}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-lg font-medium text-[var(--text-primary)]">Database Error</h1>
          <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">{msg}</p>
          <p className="text-xs text-[var(--text-muted)]">
            Ensure DATABASE_URL is set in .env (e.g. file:./dev.db) and run: npx prisma migrate deploy
          </p>
        </div>
      </AppShell>
    );
  }

  const cacheInitialData = {
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      journeyMapCount: project._count.journeyMaps,
      blueprintCount: project._count.serviceBlueprints,
    })),
  };

  return (
    <AppShell showAiSidebar={false}>
      <ProjectsListCacheProvider initialData={cacheInitialData}>
        <ProjectsPageContent userDisplayName={session.userDisplayName} />
      </ProjectsListCacheProvider>
    </AppShell>
  );
}
