"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/db";
import { requireProjectOwner } from "../../actions";

// ============================================
// TYPES
// ============================================

export type PainPoint = {
  text: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

export type Opportunity = {
  text: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
};

export async function createJourneyMap(projectId: string, formData: FormData) {
  await requireProjectOwner(projectId);
  const name = formData.get("name") as string;
  const persona = formData.get("persona") as string | null;
  if (!name || name.trim() === "") {
    throw new Error("Journey map name is required");
  }
  const maxSort = await prisma.journeyMap.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const journeyMap = await prisma.journeyMap.create({
    data: {
      name: name.trim(),
      persona: persona?.trim() || null,
      sortOrder: nextSortOrder,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}/journey-maps`);
  return journeyMap;
}

// Update journey map persona reference
export async function updateJourneyMapPersona(
  journeyMapId: string,
  personaId: string | null
) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });
  if (!journeyMap) return null;
  await requireProjectOwner(journeyMap.projectId);

  const updated = await prisma.journeyMap.update({
    where: { id: journeyMapId },
    data: { personaId },
  });

  revalidatePath(`/projects/${journeyMap.projectId}/journey-maps/${journeyMapId}`);
  return updated;
}

// Create blank phase at end WITH a default action
export async function createBlankPhase(journeyMapId: string) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });
  if (!journeyMap) return null;
  await requireProjectOwner(journeyMap.projectId);
  const maxOrder = await prisma.journeyPhase.aggregate({
    where: { journeyMapId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  // Create phase with a default action
  const phase = await prisma.journeyPhase.create({
    data: {
      title: "New Phase",
      order: nextOrder,
      journeyMapId,
      actions: {
        create: {
          title: "New Action",
          order: 0,
        },
      },
    },
    include: {
      actions: true,
    },
  });

  revalidatePath(`/projects/${journeyMap.projectId}/journey-maps/${journeyMapId}`);
  
  // Return the new action ID for focusing
  return { phaseId: phase.id, actionId: phase.actions[0]?.id };
}

// Insert blank phase at specific position WITH a default action
export async function insertBlankPhaseAt(
  journeyMapId: string,
  referencePhaseId: string,
  position: "before" | "after"
) {
  const journeyMapForAuth = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });
  if (!journeyMapForAuth) return null;
  await requireProjectOwner(journeyMapForAuth.projectId);
  const referencePhase = await prisma.journeyPhase.findUnique({
    where: { id: referencePhaseId },
    select: { order: true },
  });

  if (!referencePhase) {
    throw new Error("Reference phase not found");
  }

  const targetOrder =
    position === "before" ? referencePhase.order : referencePhase.order + 1;

  await prisma.journeyPhase.updateMany({
    where: {
      journeyMapId,
      order: { gte: targetOrder },
    },
    data: {
      order: { increment: 1 },
    },
  });

  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });
  if (!journeyMap) return null;
  // Create phase with a default action
  const phase = await prisma.journeyPhase.create({
    data: {
      title: "New Phase",
      order: targetOrder,
      journeyMapId,
      actions: {
        create: {
          title: "New Action",
          order: 0,
        },
      },
    },
    include: {
      actions: true,
    },
  });

  revalidatePath(`/projects/${journeyMap.projectId}/journey-maps/${journeyMapId}`);
  
  // Return the new action ID for focusing
  return { phaseId: phase.id, actionId: phase.actions[0]?.id };
}

// Update phase fields
export async function updatePhase(
  phaseId: string,
  field: "title" | "timeframe",
  value: string
) {
  const phase = await prisma.journeyPhase.findUnique({
    where: { id: phaseId },
    include: { journeyMap: { select: { projectId: true, id: true } } },
  });

  if (!phase) return;

  await prisma.journeyPhase.update({
    where: { id: phaseId },
    data: {
      [field]: value.trim() || (field === "title" ? "Untitled" : null),
    },
  });

  revalidatePath(
    `/projects/${phase.journeyMap.projectId}/journey-maps/${phase.journeyMap.id}`
  );
}

// Create blank action in a phase (at end)
export async function createBlankAction(phaseId: string) {
  const phase = await prisma.journeyPhase.findUnique({
    where: { id: phaseId },
    include: {
      journeyMap: { select: { projectId: true, id: true } },
      actions: { select: { order: true }, orderBy: { order: "desc" }, take: 1 },
    },
  });

  if (!phase) return null;

  const nextOrder = (phase.actions[0]?.order ?? -1) + 1;

  const action = await prisma.journeyAction.create({
    data: {
      title: "New Action",
      order: nextOrder,
      phaseId,
    },
  });

  revalidatePath(
    `/projects/${phase.journeyMap.projectId}/journey-maps/${phase.journeyMap.id}`
  );

  return { actionId: action.id };
}

// Insert blank action at specific position relative to another action
export async function insertBlankActionAt(
  phaseId: string,
  referenceActionId: string | null,
  position: "before" | "after"
) {
  const phase = await prisma.journeyPhase.findUnique({
    where: { id: phaseId },
    include: {
      journeyMap: { select: { projectId: true, id: true } },
      actions: { orderBy: { order: "asc" }, select: { id: true, order: true } },
    },
  });

  if (!phase) return null;

  let targetOrder = 0;

  if (referenceActionId) {
    const refAction = phase.actions.find((a) => a.id === referenceActionId);
    if (refAction) {
      targetOrder = position === "before" ? refAction.order : refAction.order + 1;
    } else {
      // Reference not found, append to end
      targetOrder = (phase.actions[phase.actions.length - 1]?.order ?? -1) + 1;
    }
  } else {
    // No reference, append to end
    targetOrder = (phase.actions[phase.actions.length - 1]?.order ?? -1) + 1;
  }

  // Shift existing actions with order >= targetOrder
  await prisma.journeyAction.updateMany({
    where: {
      phaseId,
      order: { gte: targetOrder },
    },
    data: {
      order: { increment: 1 },
    },
  });

  // Create the new action at the target order
  const newAction = await prisma.journeyAction.create({
    data: {
      title: "New Action",
      order: targetOrder,
      phaseId,
    },
  });

  revalidatePath(
    `/projects/${phase.journeyMap.projectId}/journey-maps/${phase.journeyMap.id}`
  );

  return { actionId: newAction.id };
}

// Delete a journey action
export async function deleteAction(actionId: string) {
  const action = await prisma.journeyAction.findUnique({
    where: { id: actionId },
    include: {
      phase: {
        include: { journeyMap: { select: { projectId: true, id: true } } },
      },
    },
  });

  if (!action) return;

  await prisma.journeyAction.delete({
    where: { id: actionId },
  });

  revalidatePath(
    `/projects/${action.phase.journeyMap.projectId}/journey-maps/${action.phase.journeyMap.id}`
  );
}

// Duplicate a journey action (with quotes)
export async function duplicateAction(actionId: string) {
  const action = await prisma.journeyAction.findUnique({
    where: { id: actionId },
    include: {
      phase: {
        include: { journeyMap: { select: { projectId: true, id: true } } },
      },
      quotes: true,
    },
  });

  if (!action) return null;

  const maxOrder = await prisma.journeyAction.aggregate({
    where: { phaseId: action.phaseId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const newAction = await prisma.journeyAction.create({
    data: {
      title: `${action.title} (copy)`,
      order: nextOrder,
      description: action.description,
      thought: action.thought,
      channel: action.channel,
      touchpoint: action.touchpoint,
      emotion: action.emotion,
      painPoints: action.painPoints,
      opportunities: action.opportunities,
      thumbnailUrl: action.thumbnailUrl,
      phaseId: action.phaseId,
      quotes: action.quotes.length
        ? {
            create: action.quotes.map((q) => ({
              quoteText: q.quoteText,
              source: q.source,
            })),
          }
        : undefined,
    },
  });

  revalidatePath(
    `/projects/${action.phase.journeyMap.projectId}/journey-maps/${action.phase.journeyMap.id}`
  );
  return { actionId: newAction.id };
}

// Update a single action field
export async function updateActionField(
  actionId: string,
  field: string,
  value: string | number | null
) {
  const action = await prisma.journeyAction.findUnique({
    where: { id: actionId },
    include: {
      phase: {
        include: { journeyMap: { select: { projectId: true, id: true } } },
      },
    },
  });

  if (!action) return;

  let processedValue = value;

  // Handle emotion as integer
  if (field === "emotion") {
    if (value === "" || value === null) {
      processedValue = null;
    } else {
      const num = typeof value === "string" ? parseInt(value, 10) : value;
      processedValue = num >= 1 && num <= 5 ? num : null;
    }
  }
  // Handle thumbnailUrl - allow storing data URLs as-is
  else if (field === "thumbnailUrl") {
    processedValue = value || null;
  }
  // Handle text fields
  else if (typeof value === "string") {
    processedValue = value.trim() || null;
    // Title should never be null
    if (field === "title" && !processedValue) {
      processedValue = "Untitled";
    }
  }

  await prisma.journeyAction.update({
    where: { id: actionId },
    data: {
      [field]: processedValue,
    },
  });

  revalidatePath(
    `/projects/${action.phase.journeyMap.projectId}/journey-maps/${action.phase.journeyMap.id}`
  );
}

export async function createQuote(actionId: string, formData: FormData) {
  const quoteText = formData.get("quoteText") as string;
  const source = formData.get("source") as string | null;

  if (!quoteText || quoteText.trim() === "") {
    throw new Error("Quote text is required");
  }

  const action = await prisma.journeyAction.findUnique({
    where: { id: actionId },
    include: {
      phase: {
        include: {
          journeyMap: { select: { projectId: true, id: true } },
        },
      },
    },
  });

  if (!action) {
    throw new Error("Action not found");
  }

  await prisma.journeyQuote.create({
    data: {
      quoteText: quoteText.trim(),
      source: source?.trim() || null,
      actionId,
    },
  });

  revalidatePath(
    `/projects/${action.phase.journeyMap.projectId}/journey-maps/${action.phase.journeyMap.id}`
  );
}

// ============================================
// CUSTOM CHANNEL/TOUCHPOINT ACTIONS
// ============================================

export async function createCustomChannel(
  journeyMapId: string,
  label: string,
  iconName: string = "label"
) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });

  if (!journeyMap) return null;

  const channel = await prisma.customChannel.create({
    data: {
      label: label.trim(),
      iconName,
      journeyMapId,
    },
  });

  revalidatePath(`/projects/${journeyMap.projectId}/journey-maps/${journeyMapId}`);
  return channel;
}

export async function createCustomTouchpoint(
  journeyMapId: string,
  label: string,
  iconName: string = "label"
) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });

  if (!journeyMap) return null;

  const touchpoint = await prisma.customTouchpoint.create({
    data: {
      label: label.trim(),
      iconName,
      journeyMapId,
    },
  });

  revalidatePath(`/projects/${journeyMap.projectId}/journey-maps/${journeyMapId}`);
  return touchpoint;
}

export async function getCustomOptions(journeyMapId: string) {
  const [channels, touchpoints] = await Promise.all([
    prisma.customChannel.findMany({
      where: { journeyMapId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customTouchpoint.findMany({
      where: { journeyMapId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return { channels, touchpoints };
}

// ============================================
// PAIN POINTS (with severity)
// ============================================

export async function updateActionPainPoints(
  actionId: string,
  painPoints: PainPoint[]
) {
  const action = await prisma.journeyAction.findUnique({
    where: { id: actionId },
    include: {
      phase: {
        include: { journeyMap: { select: { projectId: true, id: true } } },
      },
    },
  });

  if (!action) return;

  await prisma.journeyAction.update({
    where: { id: actionId },
    data: {
      painPoints: JSON.stringify(painPoints),
    },
  });

  revalidatePath(
    `/projects/${action.phase.journeyMap.projectId}/journey-maps/${action.phase.journeyMap.id}`
  );
}

export async function updateActionOpportunities(
  actionId: string,
  opportunities: Opportunity[]
) {
  const action = await prisma.journeyAction.findUnique({
    where: { id: actionId },
    include: {
      phase: {
        include: { journeyMap: { select: { projectId: true, id: true } } },
      },
    },
  });

  if (!action) return;

  await prisma.journeyAction.update({
    where: { id: actionId },
    data: {
      opportunities: JSON.stringify(opportunities),
    },
  });

  revalidatePath(
    `/projects/${action.phase.journeyMap.projectId}/journey-maps/${action.phase.journeyMap.id}`
  );
}

// ============================================
// BULK SYNC (for local cache)
// ============================================

export type JourneyMapSyncPayload = {
  name: string;
  personaId: string | null;
  phases: Array<{
    id: string;
    order: number;
    title: string;
    timeframe: string | null;
    actions: Array<{
      id: string;
      order: number;
      title: string;
      description: string | null;
      thought: string | null;
      channel: string | null;
      touchpoint: string | null;
      emotion: number | null;
      painPoints: string | null;
      opportunities: string | null;
      thumbnailUrl: string | null;
      quotes: Array<{ id: string; quoteText: string; source: string | null }>;
    }>;
  }>;
  customChannels: Array<{ id: string; label: string; iconName: string }>;
  customTouchpoints: Array<{ id: string; label: string; iconName: string }>;
};

export async function syncJourneyMap(
  journeyMapId: string,
  payload: JourneyMapSyncPayload
) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });
  if (!journeyMap) throw new Error("Journey map not found");

  await prisma.$transaction(async (tx) => {
    await tx.journeyMap.update({
      where: { id: journeyMapId },
      data: { name: payload.name.trim() || "Untitled", personaId: payload.personaId },
    });

    const phaseIds = payload.phases.map((p) => p.id);
    const existingPhases = await tx.journeyPhase.findMany({
      where: { journeyMapId },
      select: { id: true },
    });
    const toDeletePhaseIds = existingPhases
      .filter((p) => !phaseIds.includes(p.id))
      .map((p) => p.id);
    if (toDeletePhaseIds.length > 0) {
      await tx.journeyAction.deleteMany({
        where: { phaseId: { in: toDeletePhaseIds } },
      });
      await tx.journeyPhase.deleteMany({
        where: { id: { in: toDeletePhaseIds } },
      });
    }

    for (const p of payload.phases) {
      await tx.journeyPhase.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          order: p.order,
          title: p.title.trim() || "Untitled",
          timeframe: p.timeframe?.trim() || null,
          journeyMapId,
        },
        update: {
          order: p.order,
          title: p.title.trim() || "Untitled",
          timeframe: p.timeframe?.trim() || null,
        },
      });
      for (const a of p.actions) {
        await tx.journeyAction.upsert({
          where: { id: a.id },
          create: {
            id: a.id,
            order: a.order,
            title: a.title.trim() || "Untitled",
            description: a.description?.trim() || null,
            thought: a.thought?.trim() || null,
            channel: a.channel?.trim() || null,
            touchpoint: a.touchpoint?.trim() || null,
            emotion: a.emotion,
            painPoints: a.painPoints,
            opportunities: a.opportunities,
            thumbnailUrl: a.thumbnailUrl,
            phaseId: p.id,
          },
          update: {
            order: a.order,
            title: a.title.trim() || "Untitled",
            description: a.description?.trim() || null,
            thought: a.thought?.trim() || null,
            channel: a.channel?.trim() || null,
            touchpoint: a.touchpoint?.trim() || null,
            emotion: a.emotion,
            painPoints: a.painPoints,
            opportunities: a.opportunities,
            thumbnailUrl: a.thumbnailUrl,
          },
        });
        for (const q of a.quotes) {
          await tx.journeyQuote.upsert({
            where: { id: q.id },
            create: {
              id: q.id,
              quoteText: q.quoteText.trim(),
              source: q.source?.trim() || null,
              actionId: a.id,
            },
            update: {
              quoteText: q.quoteText.trim(),
              source: q.source?.trim() || null,
            },
          });
        }
      }
    }

    await tx.customChannel.deleteMany({ where: { journeyMapId } });
    await tx.customTouchpoint.deleteMany({ where: { journeyMapId } });
    if (payload.customChannels.length > 0) {
      await tx.customChannel.createMany({
        data: payload.customChannels.map((c) => ({
          id: c.id,
          label: c.label,
          iconName: c.iconName,
          journeyMapId,
        })),
      });
    }
    if (payload.customTouchpoints.length > 0) {
      await tx.customTouchpoint.createMany({
        data: payload.customTouchpoints.map((t) => ({
          id: t.id,
          label: t.label,
          iconName: t.iconName,
          journeyMapId,
        })),
      });
    }
  });

  revalidatePath(`/projects/${journeyMap.projectId}/journey-maps/${journeyMapId}`);
}
