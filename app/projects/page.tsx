import { prisma } from "../lib/db";
import { getSession } from "../lib/session";
import {
  ensureProjectOwnerIdColumn,
  isMissingColumnError,
} from "../lib/ensureOwnerIdColumn";
import { AppShell } from "../components/AppShell";
import { ProjectsListCacheProvider } from "./ProjectsListCacheContext";
import ProjectsPageContent from "./ProjectsPageContent";

async function fetchProjects(userId: string) {
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { journeyMaps: true, serviceBlueprints: true },
      },
    },
  });
}

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) {
    return null; // Layout already redirects; avoid double fetch
  }

  let projects;
  try {
    projects = await fetchProjects(session.userId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isTenantError =
      errMsg.includes("Tenant or user not found") ||
      errMsg.includes("DriverAdapterError");

    if (isTenantError) {
      return (
        <AppShell showAiSidebar={false} user={session}>
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Database connection failed</h1>
            <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
              &quot;Tenant or user not found&quot; means the database URL is wrong or the pooler can&apos;t find your project.
            </p>
            <ul className="max-w-md list-inside list-disc text-left text-sm text-[var(--text-muted)] space-y-1">
              <li>Use the exact connection string from Supabase: Settings → Database → Connection string (URI).</li>
              <li>Username must be <code className="rounded bg-[var(--bg-sidebar)] px-1">postgres.[project-ref]</code> or <code className="rounded bg-[var(--bg-sidebar)] px-1">prisma.[project-ref]</code>.</li>
              <li>Use the pooler host for your region (e.g. <code className="rounded bg-[var(--bg-sidebar)] px-1">aws-0-ap-southeast-2.pooler.supabase.com</code> or the one shown in the dashboard).</li>
              <li>Port 6543 = transaction pooler (for app). Port 5432 = direct (for migrations).</li>
            </ul>
            <p className="text-xs text-[var(--text-muted)]">
              Update <code className="rounded bg-[var(--bg-sidebar)] px-1">.env</code> with correct DATABASE_URL and DIRECT_URL, then restart the dev server.
            </p>
          </div>
        </AppShell>
      );
    }

    if (isMissingColumnError(err)) {
      try {
        await ensureProjectOwnerIdColumn();
        projects = await fetchProjects(session.userId);
      } catch (retryErr) {
        console.error("[ProjectsPage] Database error after ensuring ownerId:", retryErr);
        const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        return (
          <AppShell showAiSidebar={false} user={session}>
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
              <h1 className="text-lg font-medium text-[var(--text-primary)]">Database Error</h1>
              <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">{msg}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Ensure DATABASE_URL is set in .env and run: npx prisma migrate deploy
              </p>
            </div>
          </AppShell>
        );
      }
    } else {
      console.error("[ProjectsPage] Database error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return (
        <AppShell showAiSidebar={false} user={session}>
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
  }

  if (!projects) {
    return null;
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
    <AppShell showAiSidebar={false} user={session}>
      <ProjectsListCacheProvider initialData={cacheInitialData}>
        <ProjectsPageContent userDisplayName={session.userDisplayName} />
      </ProjectsListCacheProvider>
    </AppShell>
  );
}
