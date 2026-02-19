import { redirect } from "next/navigation";
import { getSession } from "../lib/session";

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?from=/projects");
  }

  return <>{children}</>;
}
