"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../lib/db";
import { getSession } from "../lib/session";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/** Use in server actions that take projectId; throws if not owner. */
export async function requireProjectOwner(projectId: string) {
  const session = await requireSession();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) throw new Error("Project not found or access denied");
  // When ownerId is null (e.g. demo project), allow any authenticated user (matches layout behavior).
  if (project.ownerId != null && project.ownerId !== session.userId) {
    throw new Error("Project not found or access denied");
  }
  return session;
}

export async function createProject(formData: FormData) {
  const session = await requireSession();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

  if (!name || name.trim() === "") {
    throw new Error("Project name is required");
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      ownerId: session.userId,
    },
  });

  revalidatePath("/projects");

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    journeyMapCount: 0,
    blueprintCount: 0,
  };
}

export async function deleteProject(projectId: string) {
  await requireProjectOwner(projectId);
  await prisma.project.delete({
    where: { id: projectId },
  });
  revalidatePath("/projects");
}

// ============================================
// PERSONA ACTIONS (Project-level)
// ============================================

export async function createPersonaLegacy(
  projectId: string,
  data: {
    name: string;
    shortDescription: string;
    avatarUrl?: string;
  }
) {
  await requireProjectOwner(projectId);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) return null;

  const persona = await prisma.persona.create({
    data: {
      name: data.name.trim() || "New Persona",
      shortDescription: data.shortDescription.trim() || "A user of the service",
      avatarUrl: data.avatarUrl || null,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return persona;
}

export async function updatePersonaLegacy(
  personaId: string,
  updates: {
    name?: string;
    shortDescription?: string;
    avatarUrl?: string | null;
  }
) {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: { projectId: true },
  });
  if (!persona) return null;
  await requireProjectOwner(persona.projectId);

  const updated = await prisma.persona.update({
    where: { id: personaId },
    data: updates,
  });

  revalidatePath(`/projects/${persona.projectId}`);
  return updated;
}

export async function deletePersona(personaId: string) {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: { projectId: true },
  });
  if (!persona) return;
  await requireProjectOwner(persona.projectId);

  // Note: JourneyMaps referencing this persona will have personaId set to null
  // due to onDelete: SetNull in the schema
  await prisma.persona.delete({
    where: { id: personaId },
  });

  revalidatePath(`/projects/${persona.projectId}`);
}

export async function getProjectPersonas(projectId: string) {
  await requireProjectOwner(projectId);
  return prisma.persona.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}
