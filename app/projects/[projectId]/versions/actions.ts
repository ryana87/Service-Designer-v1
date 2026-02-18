"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/db";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createSnapshotFromJourneyMap(
  projectId: string,
  journeyMapId: string,
  name: string
): Promise<ActionResult> {
  try {
    const journeyMap = await prisma.journeyMap.findUnique({
      where: { id: journeyMapId, projectId },
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: {
            actions: {
              orderBy: { order: "asc" },
              include: { quotes: true },
            },
          },
        },
        personaRef: true,
      },
    });
    if (!journeyMap) return { ok: false, error: "Journey map not found" };
    const snapshotData = JSON.stringify(journeyMap);
    await prisma.versionSnapshot.create({
      data: {
        projectId,
        name,
        snapshotType: "journeyMap",
        snapshotId: journeyMapId,
        snapshotData,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    console.error("[createSnapshotFromJourneyMap]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create snapshot" };
  }
}

export async function createSnapshotFromBlueprint(
  projectId: string,
  blueprintId: string,
  name: string
): Promise<ActionResult> {
  try {
    const blueprint = await prisma.serviceBlueprint.findUnique({
      where: { id: blueprintId, projectId },
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: {
            columns: {
              orderBy: { order: "asc" },
              include: {
                basicCards: true,
                decisionCards: true,
                teamSections: { include: { team: true, cards: true } },
              },
            },
          },
        },
        teams: true,
        softwareServices: true,
        connections: true,
      },
    });
    if (!blueprint) return { ok: false, error: "Blueprint not found" };
    const snapshotData = JSON.stringify(blueprint);
    await prisma.versionSnapshot.create({
      data: {
        projectId,
        name,
        snapshotType: "blueprint",
        snapshotId: blueprintId,
        snapshotData,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    console.error("[createSnapshotFromBlueprint]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create snapshot" };
  }
}

export async function createSnapshot(
  projectId: string,
  name: string,
  snapshotType: "journeyMap" | "blueprint",
  snapshotId: string,
  snapshotData: string
) {
  await prisma.versionSnapshot.create({
    data: {
      projectId,
      name,
      snapshotType,
      snapshotId,
      snapshotData,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function getSnapshots(
  projectId: string,
  snapshotType?: "journeyMap" | "blueprint",
  snapshotId?: string
): Promise<Awaited<ReturnType<typeof prisma.versionSnapshot.findMany>> | { error: string }> {
  try {
    const where: { projectId: string; snapshotType?: string; snapshotId?: string } = {
      projectId,
    };
    if (snapshotType) where.snapshotType = snapshotType;
    if (snapshotId) where.snapshotId = snapshotId;

    return prisma.versionSnapshot.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (err) {
    console.error("[getSnapshots]", err);
    return { error: err instanceof Error ? err.message : "Failed to load snapshots" };
  }
}

export async function deleteSnapshot(snapshotId: string): Promise<ActionResult> {
  try {
    const snap = await prisma.versionSnapshot.findUnique({
      where: { id: snapshotId },
      select: { projectId: true },
    });
    if (!snap) return { ok: true };
    await prisma.versionSnapshot.delete({ where: { id: snapshotId } });
    revalidatePath(`/projects/${snap.projectId}`);
    return { ok: true };
  } catch (err) {
    console.error("[deleteSnapshot]", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete snapshot" };
  }
}
