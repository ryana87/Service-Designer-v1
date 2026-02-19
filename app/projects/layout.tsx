import { redirect } from "next/navigation";
import { getSession } from "../lib/session";
import { ProjectsTopBar } from "./ProjectsTopBar";

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?from=/projects");
  }

  return (
    <div className="flex h-screen flex-col">
      <ProjectsTopBar user={session} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
