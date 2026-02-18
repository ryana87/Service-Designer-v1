"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../lib/db";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

  if (!name || name.trim() === "") {
    throw new Error("Project name is required");
  }

  await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  revalidatePath("/projects");
}

export async function deleteProject(projectId: string) {
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

  // Note: JourneyMaps referencing this persona will have personaId set to null
  // due to onDelete: SetNull in the schema
  await prisma.persona.delete({
    where: { id: personaId },
  });

  revalidatePath(`/projects/${persona.projectId}`);
}

export async function getProjectPersonas(projectId: string) {
  return prisma.persona.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}
