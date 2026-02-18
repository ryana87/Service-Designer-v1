"use server";

import { prisma } from "../lib/db";
import { seedDemo as seedDemoImpl, generateFutureState as generateFutureStateImpl, type FutureStateType } from "./seed";
import { DEMO_ASSETS, getDemoThumbnailForIndex, DEMO_JOURNEY_MAP_IDS } from "./assets";
import { revalidatePath } from "next/cache";

// ============================================
// SERVER ACTIONS FOR DEMO
// These can be called from client components
// ============================================

export async function seedDemo(): Promise<{ projectId: string }> {
  return seedDemoImpl();
}

export async function generateFutureState(type: FutureStateType = "both"): Promise<void> {
  const { DEMO_PROJECT_ID } = await import("./constants");

  await generateFutureStateImpl(type);

  // Verify generated artifacts exist and belong to demo project (avoids 404 on navigation)
  if (type === "journeyMap" || type === "both") {
    const jm = await prisma.journeyMap.findUnique({
      where: { id: "demo_jm_future" },
      select: { projectId: true },
    });
    if (!jm || jm.projectId !== DEMO_PROJECT_ID) {
      throw new Error("Future state journey map was not created correctly");
    }
  }
  if (type === "blueprint" || type === "both") {
    const bp = await prisma.serviceBlueprint.findUnique({
      where: { id: "demo_bp_future" },
      select: { projectId: true },
    });
    if (!bp || bp.projectId !== DEMO_PROJECT_ID) {
      throw new Error("Future state blueprint was not created correctly");
    }
  }

  // Revalidate new artifact paths first so they resolve before sidebar refresh
  if (type === "journeyMap" || type === "both") {
    revalidatePath(`/projects/${DEMO_PROJECT_ID}/journey-maps/demo_jm_future`);
  }
  if (type === "blueprint" || type === "both") {
    revalidatePath(`/projects/${DEMO_PROJECT_ID}/blueprints/demo_bp_future`);
  }
  // Revalidate project last so sidebar shows new items (does not invalidate current artifact route)
  revalidatePath(`/projects/${DEMO_PROJECT_ID}`);
}

// Generate thumbnails for all empty slots in the journey map (uses public/demo images)
export async function generateDemoThumbnails(journeyMapIdParam?: string | null): Promise<{ generated: number; total: number }> {
  const journeyMapId = journeyMapIdParam ?? DEMO_JOURNEY_MAP_IDS.currentState;
  
  // Get all phases and actions for this journey map
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          actions: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
  
  if (!journeyMap) {
    return { generated: 0, total: 0 };
  }
  
  // Flatten actions in display order (phases left-to-right, actions within phase top-to-bottom)
  const allActions = journeyMap.phases.flatMap(phase => phase.actions);
  
  // Find actions with empty thumbnails and update them
  let generated = 0;
  for (let i = 0; i < allActions.length; i++) {
    const action = allActions[i];
    if (!action.thumbnailUrl) {
      const thumbnailUrl = getDemoThumbnailForIndex(i);
      await prisma.journeyAction.update({
        where: { id: action.id },
        data: { thumbnailUrl },
      });
      generated++;
    }
  }
  
  // Revalidate the journey map page
  if (generated > 0) {
    const jm = await prisma.journeyMap.findUnique({
      where: { id: journeyMapId },
      select: { projectId: true },
    });
    if (jm) {
      revalidatePath(`/projects/${jm.projectId}/journey-maps/${journeyMapId}`);
    }
  }
  
  return { generated, total: allActions.length };
}
