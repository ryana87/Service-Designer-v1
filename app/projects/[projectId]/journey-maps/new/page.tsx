import { notFound, redirect } from "next/navigation";
import { prisma } from "../../../../lib/db";
import { createJourneyMap } from "../actions";
import { AppShell, ProjectSidebar } from "../../../../components/AppShell";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function NewJourneyMapPage({ params }: PageProps) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      journeyMaps: {
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
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

  async function handleCreate(formData: FormData) {
    "use server";
    const journeyMap = await createJourneyMap(projectId, formData);
    redirect(`/projects/${projectId}/journey-maps/${journeyMap.id}`);
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
        <header className="flex h-12 shrink-0 items-center border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-6">
          <h1
            className="font-medium text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-action)" }}
          >
            New Journey Map
          </h1>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-sm">
            <form action={handleCreate}>
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1 block font-medium text-[var(--text-muted)]"
                      style={{ fontSize: "var(--font-size-meta)" }}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      autoFocus
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                      style={{ fontSize: "var(--font-size-cell)" }}
                      placeholder="e.g., Customer Onboarding Journey"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="persona"
                      className="mb-1 block font-medium text-[var(--text-muted)]"
                      style={{ fontSize: "var(--font-size-meta)" }}
                    >
                      Persona
                    </label>
                    <input
                      type="text"
                      id="persona"
                      name="persona"
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                      style={{ fontSize: "var(--font-size-cell)" }}
                      placeholder="e.g., New Customer, Enterprise Admin"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-[var(--accent-primary)] px-3 py-1.5 font-medium text-white hover:bg-[var(--accent-primary-hover)]"
                    style={{ fontSize: "var(--font-size-cell)" }}
                  >
                    Create Journey Map
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
