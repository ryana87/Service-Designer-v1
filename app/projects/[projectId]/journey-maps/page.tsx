import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/db";
import { AppShell, ProjectSidebar } from "../../../components/AppShell";
import { AppIcon } from "../../../components/Icon";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function JourneyMapsPage({ params }: PageProps) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      journeyMaps: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { phases: true },
          },
        },
      },
      serviceBlueprints: {
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <AppShell
      projectSidebar={
        <ProjectSidebar
          projectId={projectId}
          projectName={project.name}
          journeyMaps={project.journeyMaps}
          blueprints={project.serviceBlueprints}
        />
      }
    >
      <div className="flex h-full flex-col bg-[var(--bg-panel)]">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-6">
          <h1
            className="font-medium text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-action)" }}
          >
            Journey Maps
          </h1>
          <Link
            href={`/projects/${projectId}/journey-maps/new`}
            className="flex items-center gap-1 rounded bg-[var(--accent-primary)] px-3 py-1 font-medium text-white hover:bg-[var(--accent-primary-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            <AppIcon name="add" size="xs" />
            New Map
          </Link>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-lg">
            {project.journeyMaps.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)] p-8 text-center">
                <div className="mb-3 flex justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-sidebar)]">
                    <AppIcon name="journeyMap" className="text-[var(--text-muted)]" />
                  </div>
                </div>
                <p
                  className="mb-4 text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  No journey maps yet
                </p>
                <Link
                  href={`/projects/${projectId}/journey-maps/new`}
                  className="inline-block rounded bg-[var(--accent-primary)] px-4 py-1.5 font-medium text-white hover:bg-[var(--accent-primary-hover)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  Create First Map
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {project.journeyMaps.map((journeyMap) => (
                  <Link
                    key={journeyMap.id}
                    href={`/projects/${projectId}/journey-maps/${journeyMap.id}`}
                    className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <AppIcon
                          name="journeyMap"
                          size="sm"
                          className="text-[var(--text-muted)]"
                        />
                        <span
                          className="truncate font-medium text-[var(--text-primary)]"
                          style={{ fontSize: "var(--font-size-action)" }}
                        >
                          {journeyMap.name}
                        </span>
                      </div>
                      <div
                        className="mt-0.5 flex items-center gap-2 pl-6 text-[var(--text-muted)]"
                        style={{ fontSize: "var(--font-size-meta)" }}
                      >
                        {journeyMap.persona && (
                          <>
                            <span>👤 {journeyMap.persona}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{journeyMap._count.phases} phases</span>
                      </div>
                    </div>
                    <AppIcon
                      name="chevronRight"
                      size="sm"
                      className="ml-3 text-[var(--text-muted)]"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
