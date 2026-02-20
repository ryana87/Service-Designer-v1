"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/db";
import { requireProjectOwner } from "../../actions";
import { TEAM_COLOR_TOKENS, SOFTWARE_COLOR_TOKENS } from "../../../lib/colorTokens";
import type { BlueprintDraftSpec, BlueprintLaneType } from "../../../onboarding/types";
import type { BlueprintSyncPayload } from "./[blueprintId]/cache-types";

async function requireBlueprintAccess(blueprintId: string) {
  const b = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true },
  });
  if (!b?.projectId) throw new Error("Blueprint not found");
  await requireProjectOwner(b.projectId);
}

// ============================================
// TYPES
// ============================================

export type PainPoint = {
  text: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

// ============================================
// BLUEPRINT CRUD ACTIONS
// ============================================

export async function createBlueprint(projectId: string) {
  await requireProjectOwner(projectId);
  const maxSort = await prisma.serviceBlueprint.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  // Create blueprint with one phase and one blank column
  const blueprint = await prisma.serviceBlueprint.create({
    data: {
      name: "Untitled Blueprint",
      sortOrder: nextSortOrder,
      projectId,
    },
  });

  // Create initial phase
  const phase = await prisma.blueprintPhase.create({
    data: {
      title: "New Phase",
      order: 0,
      blueprintId: blueprint.id,
    },
  });

  // Create one blank column in the phase (no default cards)
  await prisma.blueprintColumn.create({
    data: {
      order: 0,
      phaseId: phase.id,
      blueprintId: blueprint.id,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return blueprint;
}

function hasComplexLaneContent(spec: BlueprintDraftSpec, laneType: "FRONTSTAGE_ACTION" | "BACKSTAGE_ACTION") {
  return spec.phases.some((p) =>
    p.steps.some((s) => (s.lanes?.[laneType]?.length ?? 0) > 0)
  );
}

export async function createBlueprintFromSpec(projectId: string, spec: BlueprintDraftSpec) {
  await requireProjectOwner(projectId);
  const maxSort = await prisma.serviceBlueprint.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const blueprint = await prisma.serviceBlueprint.create({
    data: {
      name: spec.name?.trim() || "Untitled Blueprint",
      sortOrder: nextSortOrder,
      projectId,
    },
  });

  const needsFrontstage = hasComplexLaneContent(spec, "FRONTSTAGE_ACTION");
  const needsBackstage = hasComplexLaneContent(spec, "BACKSTAGE_ACTION");

  // Create teams (minimal defaults if omitted but complex lanes are used)
  const teamsToCreate =
    spec.teams?.length
      ? spec.teams
      : [
          ...(needsFrontstage ? [{ name: "Frontstage Team" }] : []),
          ...(needsBackstage ? [{ name: "Backstage Team" }] : []),
        ];

  const createdTeams = await Promise.all(
    (teamsToCreate ?? []).map((t, idx) =>
      prisma.blueprintTeam.create({
        data: {
          name: t.name?.trim() || `Team ${idx + 1}`,
          iconName: "group",
          colorHex: TEAM_COLOR_TOKENS[idx % TEAM_COLOR_TOKENS.length].background,
          blueprintId: blueprint.id,
        },
      })
    )
  );

  const teamByName = new Map(createdTeams.map((t) => [t.name, t]));

  // Long timeout: guided blueprints create many phases/columns/cards in one transaction.
  const TX_TIMEOUT_MS = 20_000;
  await prisma.$transaction(
    async (tx) => {
      for (let phaseIdx = 0; phaseIdx < spec.phases.length; phaseIdx++) {
        const phaseSpec = spec.phases[phaseIdx];
        const phase = await tx.blueprintPhase.create({
        data: {
          order: phaseIdx,
          title: phaseSpec.title?.trim() || `Phase ${phaseIdx + 1}`,
          timeframe: phaseSpec.timeframe?.trim() || null,
          blueprintId: blueprint.id,
        },
      });

      const steps = phaseSpec.steps ?? [];
      for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
        const stepSpec = steps[stepIdx];
        const column = await tx.blueprintColumn.create({
          data: {
            order: stepIdx,
            phaseId: phase.id,
            blueprintId: blueprint.id,
          },
        });

        const lanes = stepSpec.lanes ?? {};

        // Basic lanes
        const basicLanes: BlueprintLaneType[] = [
          "PHYSICAL_EVIDENCE",
          "CUSTOMER_ACTION",
          "SUPPORT_PROCESS",
        ];
        for (const laneType of basicLanes) {
          const cards = lanes[laneType] ?? [];
          for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            await tx.blueprintBasicCard.create({
              data: {
                order: i,
                laneType,
                title: c.title?.trim() || "Untitled",
                description: c.description?.trim() || null,
                columnId: column.id,
              },
            });
          }
        }

        // Complex lanes: create one section per team, per lane, when needed
        const complexLanes: Array<"FRONTSTAGE_ACTION" | "BACKSTAGE_ACTION"> = [
          "FRONTSTAGE_ACTION",
          "BACKSTAGE_ACTION",
        ];
        for (const laneType of complexLanes) {
          const cards = lanes[laneType] ?? [];
          if (!cards.length) continue;

          for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            const teamName = (c as { teamName?: string | null }).teamName;
            const team =
              (teamName ? teamByName.get(teamName) : null) ??
              (spec.teams?.[0]?.name ? teamByName.get(spec.teams[0].name) : null) ??
              createdTeams[0] ??
              null;
            if (!team) continue;

            const section = await tx.teamSection.create({
              data: {
                order: i,
                laneType,
                columnId: column.id,
                teamId: team.id,
                blueprintId: blueprint.id,
              },
            });

            await tx.blueprintComplexCard.create({
              data: {
                order: 0,
                title: c.title?.trim() || "Untitled",
                description: c.description?.trim() || null,
                teamSectionId: section.id,
              },
            });
          }
        }
      }
    }
    },
    { timeout: TX_TIMEOUT_MS }
  );

  // Create connections: customer-action flow + cross-lane (customer→frontstage→backstage)
  await createSequentialConnections(blueprint.id);
  await createCrossLaneConnections(blueprint.id);

  revalidatePath(`/projects/${projectId}`);
  return blueprint;
}

async function createCrossLaneConnections(blueprintId: string) {
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          columns: {
            orderBy: { order: "asc" },
            include: {
              basicCards: {
                where: { laneType: "CUSTOMER_ACTION" },
                orderBy: { order: "asc" },
              },
              teamSections: {
                include: {
                  cards: { orderBy: { order: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!blueprint) return;

  const allColumns = blueprint.phases.flatMap((p) => p.columns);

  for (let i = 0; i < allColumns.length; i++) {
    const col = allColumns[i];
    const customerCard = col.basicCards[0];
    const fsSections = col.teamSections.filter((ts) => ts.laneType === "FRONTSTAGE_ACTION");
    const bsSections = col.teamSections.filter((ts) => ts.laneType === "BACKSTAGE_ACTION");
    const fsCard = fsSections[0]?.cards[0];
    const bsCard = bsSections[0]?.cards[0];

    const nextCol = allColumns[i + 1];
    const nextFsCard = nextCol?.teamSections.find((ts) => ts.laneType === "FRONTSTAGE_ACTION")?.cards[0];
    const nextBsCard = nextCol?.teamSections.find((ts) => ts.laneType === "BACKSTAGE_ACTION")?.cards[0];

    const createConn = async (
      srcId: string,
      srcType: "basic" | "complex",
      tgtId: string,
      tgtType: "basic" | "complex"
    ) => {
      try {
        await prisma.blueprintConnection.create({
          data: {
            blueprintId,
            sourceCardId: srcId,
            sourceCardType: srcType,
            targetCardId: tgtId,
            targetCardType: tgtType,
            connectorType: "standard",
            arrowDirection: "forward",
          },
        });
      } catch {
        /* ignore duplicate */
      }
    };

    if (customerCard && fsCard) {
      await createConn(customerCard.id, "basic", fsCard.id, "complex");
    }
    if (fsCard && bsCard) {
      await createConn(fsCard.id, "complex", bsCard.id, "complex");
    }
    if (bsCard && nextFsCard) {
      await createConn(bsCard.id, "complex", nextFsCard.id, "complex");
    }
    if (fsCard && nextBsCard && !bsCard) {
      await createConn(fsCard.id, "complex", nextBsCard.id, "complex");
    }
  }
}

async function createSequentialConnections(blueprintId: string) {
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          columns: {
            orderBy: { order: "asc" },
            include: {
              basicCards: {
                where: { laneType: "CUSTOMER_ACTION" },
                orderBy: { order: "asc" },
              },
              teamSections: {
                include: {
                  cards: { orderBy: { order: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!blueprint) return;

  const allColumns = blueprint.phases.flatMap((p) => p.columns);
  for (let i = 0; i < allColumns.length - 1; i++) {
    const colA = allColumns[i];
    const colB = allColumns[i + 1];
    const cardA = colA.basicCards[0];
    const cardB = colB.basicCards[0];
    if (cardA && cardB) {
      try {
        await prisma.blueprintConnection.create({
          data: {
            blueprintId,
            sourceCardId: cardA.id,
            sourceCardType: "basic",
            targetCardId: cardB.id,
            targetCardType: "basic",
            connectorType: "standard",
            arrowDirection: "forward",
          },
        });
      } catch {
        // Ignore duplicate connection
      }
    }
  }
}

export async function renameBlueprint(blueprintId: string, newName: string) {
  await requireBlueprintAccess(blueprintId);
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true },
  });
  if (!blueprint) return;

  await prisma.serviceBlueprint.update({
    where: { id: blueprintId },
    data: { name: newName.trim() || "Untitled Blueprint" },
  });

  revalidatePath(`/projects/${blueprint.projectId}`);
}

export async function deleteBlueprint(blueprintId: string) {
  await requireBlueprintAccess(blueprintId);
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true },
  });
  if (!blueprint) return { projectId: null };

  await prisma.serviceBlueprint.delete({
    where: { id: blueprintId },
  });

  revalidatePath(`/projects/${blueprint.projectId}`);
  return { projectId: blueprint.projectId };
}

export async function duplicateBlueprint(blueprintId: string) {
  await requireBlueprintAccess(blueprintId);
  const original = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    include: {
      phases: {
        include: {
          columns: {
            include: {
              basicCards: true,
              teamSections: {
                include: {
                  cards: true,
                },
              },
            },
          },
        },
      },
      teams: true,
      softwareServices: true,
    },
  });
  if (!original) return null;

  const maxSort = await prisma.serviceBlueprint.aggregate({
    where: { projectId: original.projectId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  // Create mapping for old team/software IDs to new ones
  const teamIdMap = new Map<string, string>();
  const softwareIdMap = new Map<string, string>();

  // Create the duplicate
  const duplicate = await prisma.serviceBlueprint.create({
    data: {
      name: `${original.name} (copy)`,
      sortOrder: nextSortOrder,
      projectId: original.projectId,
    },
  });

  // Duplicate teams first
  for (const team of original.teams) {
    const newTeam = await prisma.blueprintTeam.create({
      data: {
        name: team.name,
        iconName: team.iconName,
        colorHex: team.colorHex,
        blueprintId: duplicate.id,
      },
    });
    teamIdMap.set(team.id, newTeam.id);
  }

  // Duplicate software services
  for (const sw of original.softwareServices) {
    const newSw = await prisma.softwareService.create({
      data: {
        label: sw.label,
        colorHex: sw.colorHex,
        blueprintId: duplicate.id,
      },
    });
    softwareIdMap.set(sw.id, newSw.id);
  }

  // Duplicate phases, columns, cards
  for (const phase of original.phases) {
    const newPhase = await prisma.blueprintPhase.create({
      data: {
        order: phase.order,
        title: phase.title,
        timeframe: phase.timeframe,
        blueprintId: duplicate.id,
      },
    });

    for (const column of phase.columns) {
      const newColumn = await prisma.blueprintColumn.create({
        data: {
          order: column.order,
          phaseId: newPhase.id,
          blueprintId: duplicate.id,
        },
      });

      // Duplicate basic cards
      for (const card of column.basicCards) {
        await prisma.blueprintBasicCard.create({
          data: {
            order: card.order,
            laneType: card.laneType,
            title: card.title,
            description: card.description,
            painPoints: card.painPoints,
            columnId: newColumn.id,
          },
        });
      }

      // Duplicate team sections and their cards
      for (const section of column.teamSections) {
        const newTeamId = teamIdMap.get(section.teamId);
        if (!newTeamId) continue;

        const newSection = await prisma.teamSection.create({
          data: {
            order: section.order,
            laneType: section.laneType,
            columnId: newColumn.id,
            teamId: newTeamId,
            blueprintId: duplicate.id,
          },
        });

        for (const card of section.cards) {
          // Map software IDs
          let newSoftwareIds: string | null = null;
          if (card.softwareIds) {
            try {
              const oldIds = JSON.parse(card.softwareIds) as string[];
              const mappedIds = oldIds.map((id) => softwareIdMap.get(id) || id);
              newSoftwareIds = JSON.stringify(mappedIds);
            } catch {
              newSoftwareIds = card.softwareIds;
            }
          }

          await prisma.blueprintComplexCard.create({
            data: {
              order: card.order,
              title: card.title,
              description: card.description,
              painPoints: card.painPoints,
              softwareIds: newSoftwareIds,
              teamSectionId: newSection.id,
            },
          });
        }
      }
    }
  }

  revalidatePath(`/projects/${original.projectId}`);
  return duplicate;
}

// ============================================
// BLUEPRINT ORDERING
// ============================================

export async function moveBlueprintUp(blueprintId: string) {
  await requireBlueprintAccess(blueprintId);
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true, sortOrder: true },
  });
  if (!blueprint) return;

  const above = await prisma.serviceBlueprint.findFirst({
    where: {
      projectId: blueprint.projectId,
      sortOrder: { lt: blueprint.sortOrder },
    },
    orderBy: { sortOrder: "desc" },
  });

  if (!above) return;

  await prisma.$transaction([
    prisma.serviceBlueprint.update({
      where: { id: blueprintId },
      data: { sortOrder: above.sortOrder },
    }),
    prisma.serviceBlueprint.update({
      where: { id: above.id },
      data: { sortOrder: blueprint.sortOrder },
    }),
  ]);

  revalidatePath(`/projects/${blueprint.projectId}`);
}

export async function moveBlueprintDown(blueprintId: string) {
  await requireBlueprintAccess(blueprintId);
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true, sortOrder: true },
  });
  if (!blueprint) return;

  const below = await prisma.serviceBlueprint.findFirst({
    where: {
      projectId: blueprint.projectId,
      sortOrder: { gt: blueprint.sortOrder },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (!below) return;

  await prisma.$transaction([
    prisma.serviceBlueprint.update({
      where: { id: blueprintId },
      data: { sortOrder: below.sortOrder },
    }),
    prisma.serviceBlueprint.update({
      where: { id: below.id },
      data: { sortOrder: blueprint.sortOrder },
    }),
  ]);

  revalidatePath(`/projects/${blueprint.projectId}`);
}

// ============================================
// PHASE ACTIONS
// ============================================

export async function createBlankPhase(blueprintId: string) {
  await requireBlueprintAccess(blueprintId);
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true, phases: { select: { order: true } } },
  });
  if (!blueprint) return null;

  const maxOrder = blueprint.phases.length > 0
    ? Math.max(...blueprint.phases.map((p) => p.order))
    : -1;

  const newPhase = await prisma.blueprintPhase.create({
    data: {
      title: "New Phase",
      order: maxOrder + 1,
      blueprintId,
    },
  });

  // Create one blank column (no default cards)
  const newColumn = await prisma.blueprintColumn.create({
    data: {
      order: 0,
      phaseId: newPhase.id,
      blueprintId,
    },
  });

  revalidatePath(`/projects/${blueprint.projectId}/blueprints/${blueprintId}`);
  return { phaseId: newPhase.id, columnId: newColumn.id };
}

export async function insertPhaseAt(
  blueprintId: string,
  referencePhaseId: string,
  position: "before" | "after"
) {
  await requireBlueprintAccess(blueprintId);
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    include: {
      phases: { orderBy: { order: "asc" } },
    },
  });

  if (!blueprint) return null;

  const referencePhase = blueprint.phases.find((p) => p.id === referencePhaseId);
  if (!referencePhase) return null;

  const targetOrder = position === "before"
    ? referencePhase.order
    : referencePhase.order + 1;

  // Shift existing phases
  await prisma.blueprintPhase.updateMany({
    where: {
      blueprintId,
      order: { gte: targetOrder },
    },
    data: {
      order: { increment: 1 },
    },
  });

  const newPhase = await prisma.blueprintPhase.create({
    data: {
      title: "New Phase",
      order: targetOrder,
      blueprintId,
    },
  });

  // Create one blank column (no default cards)
  const newColumn = await prisma.blueprintColumn.create({
    data: {
      order: 0,
      phaseId: newPhase.id,
      blueprintId,
    },
  });

  revalidatePath(`/projects/${blueprint.projectId}/blueprints/${blueprintId}`);
  return { phaseId: newPhase.id, columnId: newColumn.id };
}

export async function updatePhase(
  phaseId: string,
  field: "title" | "timeframe",
  value: string
) {
  const phase = await prisma.blueprintPhase.findUnique({
    where: { id: phaseId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!phase) return;

  await prisma.blueprintPhase.update({
    where: { id: phaseId },
    data: { [field]: value.trim() || (field === "title" ? "Untitled" : null) },
  });

  revalidatePath(`/projects/${phase.blueprint.projectId}/blueprints/${phase.blueprint.id}`);
}

export async function deletePhase(phaseId: string) {
  const phase = await prisma.blueprintPhase.findUnique({
    where: { id: phaseId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!phase) return;

  await prisma.blueprintPhase.delete({
    where: { id: phaseId },
  });

  revalidatePath(`/projects/${phase.blueprint.projectId}/blueprints/${phase.blueprint.id}`);
}

// ============================================
// COLUMN ACTIONS
// ============================================

export async function insertColumnAt(
  columnId: string,
  position: "before" | "after"
) {
  const column = await prisma.blueprintColumn.findUnique({
    where: { id: columnId },
    include: {
      phase: {
        include: {
          blueprint: { select: { projectId: true, id: true } },
          columns: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!column) return null;

  const targetOrder = position === "before"
    ? column.order
    : column.order + 1;

  // Shift existing columns in the same phase
  await prisma.blueprintColumn.updateMany({
    where: {
      phaseId: column.phaseId,
      order: { gte: targetOrder },
    },
    data: {
      order: { increment: 1 },
    },
  });

  // Create new blank column (no default cards)
  const newColumn = await prisma.blueprintColumn.create({
    data: {
      order: targetOrder,
      phaseId: column.phaseId,
      blueprintId: column.blueprintId,
    },
  });

  revalidatePath(
    `/projects/${column.phase.blueprint.projectId}/blueprints/${column.phase.blueprint.id}`
  );
  return { columnId: newColumn.id };
}

export async function deleteColumn(columnId: string) {
  const column = await prisma.blueprintColumn.findUnique({
    where: { id: columnId },
    include: {
      phase: {
        include: {
          blueprint: { select: { projectId: true, id: true } },
          columns: true,
        },
      },
    },
  });

  if (!column) return;

  // Don't delete if it's the last column in the phase
  if (column.phase.columns.length <= 1) return;

  await prisma.blueprintColumn.delete({
    where: { id: columnId },
  });

  revalidatePath(
    `/projects/${column.phase.blueprint.projectId}/blueprints/${column.phase.blueprint.id}`
  );
}

// ============================================
// BASIC CARD ACTIONS (Physical Evidence, Customer Action, Support Process)
// ============================================

export async function createBasicCard(columnId: string, laneType: string) {
  const column = await prisma.blueprintColumn.findUnique({
    where: { id: columnId },
    include: {
      phase: {
        include: { blueprint: { select: { projectId: true, id: true } } },
      },
      basicCards: { where: { laneType }, select: { order: true } },
    },
  });

  if (!column) return null;

  const maxOrder = column.basicCards.length > 0
    ? Math.max(...column.basicCards.map((c) => c.order))
    : -1;

  const card = await prisma.blueprintBasicCard.create({
    data: {
      title: "New Action",
      laneType,
      order: maxOrder + 1,
      columnId,
    },
  });

  revalidatePath(
    `/projects/${column.phase.blueprint.projectId}/blueprints/${column.phase.blueprint.id}`
  );
  return card;
}

export async function updateBasicCard(
  cardId: string,
  field: string,
  value: string | null
) {
  const card = await prisma.blueprintBasicCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintBasicCard.update({
    where: { id: cardId },
    data: { [field]: value },
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
}

export async function duplicateBasicCard(cardId: string) {
  const card = await prisma.blueprintBasicCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!card) return null;

  const maxOrder = await prisma.blueprintBasicCard.aggregate({
    where: { columnId: card.columnId, laneType: card.laneType },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const newCard = await prisma.blueprintBasicCard.create({
    data: {
      title: `${card.title} (copy)`,
      description: card.description,
      painPoints: card.painPoints,
      isStart: card.isStart,
      isEnd: card.isEnd,
      laneType: card.laneType,
      columnId: card.columnId,
      order: nextOrder,
    },
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
  return newCard;
}

export async function deleteBasicCard(cardId: string) {
  const card = await prisma.blueprintBasicCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintBasicCard.delete({
    where: { id: cardId },
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
}

export async function updateBasicCardPainPoints(cardId: string, painPoints: PainPoint[]) {
  const card = await prisma.blueprintBasicCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintBasicCard.update({
    where: { id: cardId },
    data: { painPoints: JSON.stringify(painPoints) },
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
}

export async function updateBasicCardMarkers(
  cardId: string,
  updates: { isStart?: boolean; isEnd?: boolean }
) {
  const card = await prisma.blueprintBasicCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintBasicCard.update({
    where: { id: cardId },
    data: updates,
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
}

// ============================================
// TEAM SECTION ACTIONS
// ============================================

export async function createTeamSection(
  columnId: string,
  laneType: string,
  teamId: string
) {
  const column = await prisma.blueprintColumn.findUnique({
    where: { id: columnId },
    include: {
      phase: {
        include: { blueprint: { select: { projectId: true, id: true } } },
      },
      teamSections: { where: { laneType }, select: { order: true } },
    },
  });

  if (!column) return null;

  const maxOrder = column.teamSections.length > 0
    ? Math.max(...column.teamSections.map((s) => s.order))
    : -1;

  const section = await prisma.teamSection.create({
    data: {
      order: maxOrder + 1,
      laneType,
      columnId,
      teamId,
      blueprintId: column.blueprintId,
    },
    include: { team: true },
  });

  revalidatePath(
    `/projects/${column.phase.blueprint.projectId}/blueprints/${column.phase.blueprint.id}`
  );
  return section;
}

export async function deleteTeamSection(sectionId: string) {
  const section = await prisma.teamSection.findUnique({
    where: { id: sectionId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!section) return;

  await prisma.teamSection.delete({
    where: { id: sectionId },
  });

  revalidatePath(
    `/projects/${section.column.phase.blueprint.projectId}/blueprints/${section.column.phase.blueprint.id}`
  );
}

export async function duplicateTeamSection(sectionId: string) {
  const section = await prisma.teamSection.findUnique({
    where: { id: sectionId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
      team: true,
    },
  });

  if (!section) return null;

  // Get max order for sections in this column/lane
  const maxOrder = await prisma.teamSection.aggregate({
    where: {
      columnId: section.columnId,
      laneType: section.laneType,
    },
    _max: { order: true },
  });

  const newSection = await prisma.teamSection.create({
    data: {
      order: (maxOrder._max.order ?? 0) + 1,
      laneType: section.laneType,
      columnId: section.columnId,
      teamId: section.teamId,
      blueprintId: section.blueprintId,
    },
    include: { team: true },
  });

  revalidatePath(
    `/projects/${section.column.phase.blueprint.projectId}/blueprints/${section.column.phase.blueprint.id}`
  );
  return newSection;
}

// ============================================
// COMPLEX CARD ACTIONS (Frontstage, Backstage)
// ============================================

export async function createComplexCard(teamSectionId: string) {
  const section = await prisma.teamSection.findUnique({
    where: { id: teamSectionId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
      cards: { select: { order: true } },
    },
  });

  if (!section) return null;

  const maxOrder = section.cards.length > 0
    ? Math.max(...section.cards.map((c) => c.order))
    : -1;

  const card = await prisma.blueprintComplexCard.create({
    data: {
      title: "New Action",
      order: maxOrder + 1,
      teamSectionId,
    },
  });

  revalidatePath(
    `/projects/${section.column.phase.blueprint.projectId}/blueprints/${section.column.phase.blueprint.id}`
  );
  return card;
}

export async function updateComplexCard(
  cardId: string,
  field: string,
  value: string | null
) {
  const card = await prisma.blueprintComplexCard.findUnique({
    where: { id: cardId },
    include: {
      teamSection: {
        include: {
          column: {
            include: {
              phase: {
                include: { blueprint: { select: { projectId: true, id: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintComplexCard.update({
    where: { id: cardId },
    data: { [field]: value },
  });

  revalidatePath(
    `/projects/${card.teamSection.column.phase.blueprint.projectId}/blueprints/${card.teamSection.column.phase.blueprint.id}`
  );
}

export async function duplicateComplexCard(cardId: string) {
  const card = await prisma.blueprintComplexCard.findUnique({
    where: { id: cardId },
    include: {
      teamSection: {
        include: {
          column: {
            include: {
              phase: {
                include: { blueprint: { select: { projectId: true, id: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!card) return null;

  const maxOrder = await prisma.blueprintComplexCard.aggregate({
    where: { teamSectionId: card.teamSectionId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const newCard = await prisma.blueprintComplexCard.create({
    data: {
      title: `${card.title} (copy)`,
      description: card.description,
      painPoints: card.painPoints,
      softwareIds: card.softwareIds,
      isStart: card.isStart,
      isEnd: card.isEnd,
      teamSectionId: card.teamSectionId,
      order: nextOrder,
    },
  });

  revalidatePath(
    `/projects/${card.teamSection.column.phase.blueprint.projectId}/blueprints/${card.teamSection.column.phase.blueprint.id}`
  );
  return newCard;
}

export async function deleteComplexCard(cardId: string) {
  const card = await prisma.blueprintComplexCard.findUnique({
    where: { id: cardId },
    include: {
      teamSection: {
        include: {
          column: {
            include: {
              phase: {
                include: { blueprint: { select: { projectId: true, id: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintComplexCard.delete({
    where: { id: cardId },
  });

  revalidatePath(
    `/projects/${card.teamSection.column.phase.blueprint.projectId}/blueprints/${card.teamSection.column.phase.blueprint.id}`
  );
}

export async function updateComplexCardPainPoints(cardId: string, painPoints: PainPoint[]) {
  const card = await prisma.blueprintComplexCard.findUnique({
    where: { id: cardId },
    include: {
      teamSection: {
        include: {
          column: {
            include: {
              phase: {
                include: { blueprint: { select: { projectId: true, id: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintComplexCard.update({
    where: { id: cardId },
    data: { painPoints: JSON.stringify(painPoints) },
  });

  revalidatePath(
    `/projects/${card.teamSection.column.phase.blueprint.projectId}/blueprints/${card.teamSection.column.phase.blueprint.id}`
  );
}

export async function updateComplexCardSoftware(cardId: string, softwareIds: string[]) {
  const card = await prisma.blueprintComplexCard.findUnique({
    where: { id: cardId },
    include: {
      teamSection: {
        include: {
          column: {
            include: {
              phase: {
                include: { blueprint: { select: { projectId: true, id: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintComplexCard.update({
    where: { id: cardId },
    data: { softwareIds: JSON.stringify(softwareIds) },
  });

  revalidatePath(
    `/projects/${card.teamSection.column.phase.blueprint.projectId}/blueprints/${card.teamSection.column.phase.blueprint.id}`
  );
}

export async function updateComplexCardMarkers(
  cardId: string,
  updates: { isStart?: boolean; isEnd?: boolean }
) {
  const card = await prisma.blueprintComplexCard.findUnique({
    where: { id: cardId },
    include: {
      teamSection: {
        include: {
          column: {
            include: {
              phase: {
                include: { blueprint: { select: { projectId: true, id: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintComplexCard.update({
    where: { id: cardId },
    data: updates,
  });

  revalidatePath(
    `/projects/${card.teamSection.column.phase.blueprint.projectId}/blueprints/${card.teamSection.column.phase.blueprint.id}`
  );
}

// ============================================
// DECISION CARD ACTIONS
// ============================================

// Allowed lane types for Decision Cards - Customer Action, Frontstage, Backstage
const DECISION_ALLOWED_LANES = ["CUSTOMER_ACTION", "FRONTSTAGE_ACTION", "BACKSTAGE_ACTION"];

export async function createDecisionCard(columnId: string, laneType: string, insertAtOrder?: number) {
  // Validate lane type
  if (!DECISION_ALLOWED_LANES.includes(laneType)) {
    throw new Error(`Decision cards not allowed in ${laneType} lane`);
  }

  const column = await prisma.blueprintColumn.findUnique({
    where: { id: columnId },
    include: {
      phase: {
        include: { blueprint: { select: { projectId: true, id: true } } },
      },
      basicCards: { where: { laneType }, select: { id: true, order: true } },
      decisionCards: { where: { laneType }, select: { id: true, order: true } },
      teamSections: {
        where: { laneType },
        include: { cards: { select: { id: true, order: true } } },
      },
    },
  });

  if (!column) return null;

  // For basic lanes (CUSTOMER_ACTION), use unified order with basicCards + decisionCards
  // For complex lanes (FRONTSTAGE/BACKSTAGE), use unified order with complexCards + decisionCards
  let maxOrder = -1;
  let targetOrder: number;

  if (laneType === "CUSTOMER_ACTION") {
    const allOrders = [
      ...column.basicCards.map(c => c.order),
      ...column.decisionCards.map(c => c.order),
    ];
    maxOrder = allOrders.length > 0 ? Math.max(...allOrders) : -1;
  } else {
    // For complex lanes, find max order from team section cards + decision cards
    const teamCards = column.teamSections.flatMap(ts => ts.cards);
    const allOrders = [
      ...teamCards.map(c => c.order),
      ...column.decisionCards.map(c => c.order),
    ];
    maxOrder = allOrders.length > 0 ? Math.max(...allOrders) : -1;
  }

  if (insertAtOrder !== undefined) {
    targetOrder = insertAtOrder;
    // Shift all cards at or after this position
    if (laneType === "CUSTOMER_ACTION") {
      await prisma.blueprintBasicCard.updateMany({
        where: { columnId, laneType, order: { gte: insertAtOrder } },
        data: { order: { increment: 1 } },
      });
    } else {
      // For complex lanes, shift complex cards in all team sections
      for (const ts of column.teamSections) {
        await prisma.blueprintComplexCard.updateMany({
          where: { teamSectionId: ts.id, order: { gte: insertAtOrder } },
          data: { order: { increment: 1 } },
        });
      }
    }
    await prisma.blueprintDecisionCard.updateMany({
      where: { columnId, laneType, order: { gte: insertAtOrder } },
      data: { order: { increment: 1 } },
    });
  } else {
    targetOrder = maxOrder + 1;
  }

  const card = await prisma.blueprintDecisionCard.create({
    data: {
      title: "Decision",
      question: "What condition?",
      laneType,
      order: targetOrder,
      columnId,
      blueprintId: column.blueprintId,
    },
  });

  revalidatePath(
    `/projects/${column.phase.blueprint.projectId}/blueprints/${column.phase.blueprint.id}`
  );
  return card;
}

export async function updateDecisionCard(
  cardId: string,
  updates: {
    title?: string;
    question?: string;
    description?: string | null;
    isStart?: boolean;
    isEnd?: boolean;
  }
) {
  const card = await prisma.blueprintDecisionCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!card) return;

  await prisma.blueprintDecisionCard.update({
    where: { id: cardId },
    data: updates,
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
}

export async function duplicateDecisionCard(cardId: string) {
  const card = await prisma.blueprintDecisionCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!card) return null;

  const maxOrder = await prisma.blueprintDecisionCard.aggregate({
    where: { columnId: card.columnId, laneType: card.laneType },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const newCard = await prisma.blueprintDecisionCard.create({
    data: {
      title: `${card.title} (copy)`,
      question: card.question,
      description: card.description,
      isStart: card.isStart,
      isEnd: card.isEnd,
      laneType: card.laneType,
      columnId: card.columnId,
      blueprintId: card.blueprintId,
      order: nextOrder,
    },
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
  return newCard;
}

export async function deleteDecisionCard(cardId: string) {
  const card = await prisma.blueprintDecisionCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: {
            include: { blueprint: { select: { projectId: true, id: true } } },
          },
        },
      },
    },
  });

  if (!card) return;

  // Also delete any connections involving this card
  await prisma.blueprintConnection.deleteMany({
    where: {
      OR: [
        { sourceCardId: cardId },
        { targetCardId: cardId },
      ],
    },
  });

  await prisma.blueprintDecisionCard.delete({
    where: { id: cardId },
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
}

// ============================================
// CARD ORDER ACTIONS (for reordering within a cell)
// ============================================

export async function updateBasicCardOrder(cardId: string, newOrder: number) {
  const card = await prisma.blueprintBasicCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: { include: { blueprint: { select: { projectId: true, id: true } } } },
          basicCards: { select: { id: true, order: true, laneType: true } },
          decisionCards: { select: { id: true, order: true, laneType: true } },
        },
      },
    },
  });

  if (!card) return;

  const laneType = card.laneType;
  const oldOrder = card.order;

  // Get all cards in the same lane
  const laneBasicCards = card.column.basicCards.filter(c => c.laneType === laneType);
  const laneDecisionCards = card.column.decisionCards.filter(c => c.laneType === laneType);

  if (newOrder === oldOrder) return;

  // Shift other cards
  if (newOrder < oldOrder) {
    // Moving up: shift cards in [newOrder, oldOrder) down by 1
    await prisma.blueprintBasicCard.updateMany({
      where: {
        columnId: card.columnId,
        laneType,
        order: { gte: newOrder, lt: oldOrder },
      },
      data: { order: { increment: 1 } },
    });
    await prisma.blueprintDecisionCard.updateMany({
      where: {
        columnId: card.columnId,
        laneType,
        order: { gte: newOrder, lt: oldOrder },
      },
      data: { order: { increment: 1 } },
    });
  } else {
    // Moving down: shift cards in (oldOrder, newOrder] up by 1
    await prisma.blueprintBasicCard.updateMany({
      where: {
        columnId: card.columnId,
        laneType,
        order: { gt: oldOrder, lte: newOrder },
      },
      data: { order: { decrement: 1 } },
    });
    await prisma.blueprintDecisionCard.updateMany({
      where: {
        columnId: card.columnId,
        laneType,
        order: { gt: oldOrder, lte: newOrder },
      },
      data: { order: { decrement: 1 } },
    });
  }

  // Update this card's order
  await prisma.blueprintBasicCard.update({
    where: { id: cardId },
    data: { order: newOrder },
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
}

export async function updateDecisionCardOrder(cardId: string, newOrder: number) {
  const card = await prisma.blueprintDecisionCard.findUnique({
    where: { id: cardId },
    include: {
      column: {
        include: {
          phase: { include: { blueprint: { select: { projectId: true, id: true } } } },
          basicCards: { select: { id: true, order: true, laneType: true } },
          decisionCards: { select: { id: true, order: true, laneType: true } },
          teamSections: { include: { cards: { select: { id: true, order: true } } } },
        },
      },
    },
  });

  if (!card) return;

  const laneType = card.laneType;
  const oldOrder = card.order;

  if (newOrder === oldOrder) return;

  // Shift other cards based on lane type
  if (laneType === "CUSTOMER_ACTION") {
    if (newOrder < oldOrder) {
      await prisma.blueprintBasicCard.updateMany({
        where: { columnId: card.columnId, laneType, order: { gte: newOrder, lt: oldOrder } },
        data: { order: { increment: 1 } },
      });
      await prisma.blueprintDecisionCard.updateMany({
        where: { columnId: card.columnId, laneType, order: { gte: newOrder, lt: oldOrder }, id: { not: cardId } },
        data: { order: { increment: 1 } },
      });
    } else {
      await prisma.blueprintBasicCard.updateMany({
        where: { columnId: card.columnId, laneType, order: { gt: oldOrder, lte: newOrder } },
        data: { order: { decrement: 1 } },
      });
      await prisma.blueprintDecisionCard.updateMany({
        where: { columnId: card.columnId, laneType, order: { gt: oldOrder, lte: newOrder }, id: { not: cardId } },
        data: { order: { decrement: 1 } },
      });
    }
  } else {
    // For complex lanes (FRONTSTAGE/BACKSTAGE), shift complex cards in team sections + decision cards
    const teamSections = card.column.teamSections.filter(ts => ts.laneType === laneType);
    for (const ts of teamSections) {
      if (newOrder < oldOrder) {
        await prisma.blueprintComplexCard.updateMany({
          where: { teamSectionId: ts.id, order: { gte: newOrder, lt: oldOrder } },
          data: { order: { increment: 1 } },
        });
      } else {
        await prisma.blueprintComplexCard.updateMany({
          where: { teamSectionId: ts.id, order: { gt: oldOrder, lte: newOrder } },
          data: { order: { decrement: 1 } },
        });
      }
    }
    if (newOrder < oldOrder) {
      await prisma.blueprintDecisionCard.updateMany({
        where: { columnId: card.columnId, laneType, order: { gte: newOrder, lt: oldOrder }, id: { not: cardId } },
        data: { order: { increment: 1 } },
      });
    } else {
      await prisma.blueprintDecisionCard.updateMany({
        where: { columnId: card.columnId, laneType, order: { gt: oldOrder, lte: newOrder }, id: { not: cardId } },
        data: { order: { decrement: 1 } },
      });
    }
  }

  await prisma.blueprintDecisionCard.update({
    where: { id: cardId },
    data: { order: newOrder },
  });

  revalidatePath(
    `/projects/${card.column.phase.blueprint.projectId}/blueprints/${card.column.phase.blueprint.id}`
  );
}

export async function updateComplexCardOrder(cardId: string, newOrder: number) {
  const card = await prisma.blueprintComplexCard.findUnique({
    where: { id: cardId },
    include: {
      teamSection: {
        include: {
          column: {
            include: {
              phase: { include: { blueprint: { select: { projectId: true, id: true } } } },
              decisionCards: { select: { id: true, order: true, laneType: true } },
            },
          },
          cards: { select: { id: true, order: true } },
        },
      },
    },
  });

  if (!card) return;

  const oldOrder = card.order;
  const laneType = card.teamSection.laneType;

  if (newOrder === oldOrder) return;

  // Shift complex cards in the same team section
  if (newOrder < oldOrder) {
    await prisma.blueprintComplexCard.updateMany({
      where: { teamSectionId: card.teamSectionId, order: { gte: newOrder, lt: oldOrder }, id: { not: cardId } },
      data: { order: { increment: 1 } },
    });
    await prisma.blueprintDecisionCard.updateMany({
      where: { columnId: card.teamSection.columnId, laneType, order: { gte: newOrder, lt: oldOrder } },
      data: { order: { increment: 1 } },
    });
  } else {
    await prisma.blueprintComplexCard.updateMany({
      where: { teamSectionId: card.teamSectionId, order: { gt: oldOrder, lte: newOrder }, id: { not: cardId } },
      data: { order: { decrement: 1 } },
    });
    await prisma.blueprintDecisionCard.updateMany({
      where: { columnId: card.teamSection.columnId, laneType, order: { gt: oldOrder, lte: newOrder } },
      data: { order: { decrement: 1 } },
    });
  }

  await prisma.blueprintComplexCard.update({
    where: { id: cardId },
    data: { order: newOrder },
  });

  revalidatePath(
    `/projects/${card.teamSection.column.phase.blueprint.projectId}/blueprints/${card.teamSection.column.phase.blueprint.id}`
  );
}

export async function insertBasicCardAt(columnId: string, laneType: string, insertAtOrder: number) {
  const column = await prisma.blueprintColumn.findUnique({
    where: { id: columnId },
    include: {
      phase: { include: { blueprint: { select: { projectId: true, id: true } } } },
    },
  });

  if (!column) return null;

  // Shift all cards at or after this position
  await prisma.blueprintBasicCard.updateMany({
    where: { columnId, laneType, order: { gte: insertAtOrder } },
    data: { order: { increment: 1 } },
  });
  await prisma.blueprintDecisionCard.updateMany({
    where: { columnId, laneType, order: { gte: insertAtOrder } },
    data: { order: { increment: 1 } },
  });

  const card = await prisma.blueprintBasicCard.create({
    data: {
      title: "",
      laneType,
      order: insertAtOrder,
      columnId,
    },
  });

  revalidatePath(
    `/projects/${column.phase.blueprint.projectId}/blueprints/${column.phase.blueprint.id}`
  );
  return card;
}

export async function insertComplexCardAt(teamSectionId: string, insertAtOrder: number) {
  const teamSection = await prisma.teamSection.findUnique({
    where: { id: teamSectionId },
    include: {
      column: {
        include: {
          phase: { include: { blueprint: { select: { projectId: true, id: true } } } },
          decisionCards: { select: { id: true, order: true, laneType: true } },
        },
      },
    },
  });

  if (!teamSection) return null;

  const laneType = teamSection.laneType;

  // Shift complex cards in this team section
  await prisma.blueprintComplexCard.updateMany({
    where: { teamSectionId, order: { gte: insertAtOrder } },
    data: { order: { increment: 1 } },
  });
  // Also shift decision cards in the same lane
  await prisma.blueprintDecisionCard.updateMany({
    where: { columnId: teamSection.columnId, laneType, order: { gte: insertAtOrder } },
    data: { order: { increment: 1 } },
  });

  const card = await prisma.blueprintComplexCard.create({
    data: {
      title: "",
      order: insertAtOrder,
      teamSectionId,
    },
  });

  revalidatePath(
    `/projects/${teamSection.column.phase.blueprint.projectId}/blueprints/${teamSection.column.phase.blueprint.id}`
  );
  return card;
}

// ============================================
// TEAM ACTIONS
// ============================================

export async function createTeam(
  blueprintId: string,
  name: string,
  iconName: string = "group"
) {
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true, teams: { select: { colorHex: true } } },
  });

  if (!blueprint) return null;

  // Pick an unused AA-safe team color
  const usedColors = blueprint.teams.map((t) => t.colorHex.toLowerCase());
  const availableToken = TEAM_COLOR_TOKENS.find(
    (t) => !usedColors.includes(t.background.toLowerCase())
  ) || TEAM_COLOR_TOKENS[blueprint.teams.length % TEAM_COLOR_TOKENS.length];
  const availableColor = availableToken.background;

  const team = await prisma.blueprintTeam.create({
    data: {
      name: name.trim() || "New Team",
      iconName,
      colorHex: availableColor,
      blueprintId,
    },
  });

  revalidatePath(`/projects/${blueprint.projectId}/blueprints/${blueprintId}`);
  return team;
}

export async function updateTeam(
  teamId: string,
  field: "name" | "iconName" | "colorHex",
  value: string
) {
  const team = await prisma.blueprintTeam.findUnique({
    where: { id: teamId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!team) return;

  await prisma.blueprintTeam.update({
    where: { id: teamId },
    data: { [field]: value },
  });

  revalidatePath(`/projects/${team.blueprint.projectId}/blueprints/${team.blueprint.id}`);
}

export async function deleteTeam(teamId: string) {
  const team = await prisma.blueprintTeam.findUnique({
    where: { id: teamId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!team) return;

  await prisma.blueprintTeam.delete({
    where: { id: teamId },
  });

  revalidatePath(`/projects/${team.blueprint.projectId}/blueprints/${team.blueprint.id}`);
}

// ============================================
// SOFTWARE/SERVICE ACTIONS
// ============================================

export async function createSoftwareService(blueprintId: string, label: string) {
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true, softwareServices: { select: { colorHex: true } } },
  });

  if (!blueprint) return null;

  // Pick an unused AA-safe pastel color
  const usedColors = blueprint.softwareServices.map((s) => s.colorHex.toLowerCase());
  const availableToken = SOFTWARE_COLOR_TOKENS.find(
    (t) => !usedColors.includes(t.background.toLowerCase())
  ) || SOFTWARE_COLOR_TOKENS[blueprint.softwareServices.length % SOFTWARE_COLOR_TOKENS.length];
  const availableColor = availableToken.background;

  const software = await prisma.softwareService.create({
    data: {
      label: label.trim() || "New Software",
      colorHex: availableColor,
      blueprintId,
    },
  });

  revalidatePath(`/projects/${blueprint.projectId}/blueprints/${blueprintId}`);
  return software;
}

export async function updateSoftwareService(
  softwareId: string,
  field: "label" | "colorHex",
  value: string
) {
  const software = await prisma.softwareService.findUnique({
    where: { id: softwareId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!software) return;

  await prisma.softwareService.update({
    where: { id: softwareId },
    data: { [field]: value },
  });

  revalidatePath(`/projects/${software.blueprint.projectId}/blueprints/${software.blueprint.id}`);
}

export async function deleteSoftwareService(softwareId: string) {
  const software = await prisma.softwareService.findUnique({
    where: { id: softwareId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!software) return;

  await prisma.softwareService.delete({
    where: { id: softwareId },
  });

  revalidatePath(`/projects/${software.blueprint.projectId}/blueprints/${software.blueprint.id}`);
}

// ============================================
// CONNECTION ACTIONS (Flow/Dependencies)
// ============================================

// Connector type definitions
export type ConnectorType = "standard" | "dependency" | "feedback" | "wait";
export type ArrowDirection = "forward" | "backward" | "bidirectional" | "none";
export type StrokeWeight = "thin" | "normal" | "thick";
export type StrokePattern = "solid" | "dashed" | "dotted";
export type StrokeColor = "grey" | "red" | "green";

export type CardType = "basic" | "complex" | "decision";

export async function createConnection(
  blueprintId: string,
  sourceCardId: string,
  sourceCardType: CardType,
  targetCardId: string,
  targetCardType: CardType
) {
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true },
  });

  if (!blueprint) return null;

  // Check if connection already exists
  const existing = await prisma.blueprintConnection.findUnique({
    where: {
      sourceCardId_targetCardId: {
        sourceCardId,
        targetCardId,
      },
    },
  });

  if (existing) return existing;

  const connection = await prisma.blueprintConnection.create({
    data: {
      blueprintId,
      sourceCardId,
      sourceCardType,
      targetCardId,
      targetCardType,
      // Defaults from schema: connectorType="standard", arrowDirection="forward", strokeWeight="normal", strokePattern="solid"
    },
  });

  revalidatePath(`/projects/${blueprint.projectId}/blueprints/${blueprintId}`);
  return connection;
}

export async function updateConnection(
  connectionId: string,
  updates: {
    connectorType?: ConnectorType;
    label?: string | null;
    arrowDirection?: ArrowDirection;
    strokeWeight?: StrokeWeight;
    strokePattern?: StrokePattern;
    strokeColor?: StrokeColor;
  }
) {
  const connection = await prisma.blueprintConnection.findUnique({
    where: { id: connectionId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!connection) return null;

  const updated = await prisma.blueprintConnection.update({
    where: { id: connectionId },
    data: updates,
  });

  revalidatePath(`/projects/${connection.blueprint.projectId}/blueprints/${connection.blueprint.id}`);
  return updated;
}

export async function duplicateConnection(connectionId: string) {
  const connection = await prisma.blueprintConnection.findUnique({
    where: { id: connectionId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!connection) return null;

  // Note: Since source/target must be unique, we can't truly duplicate.
  // Instead, we return the existing connection (or this could open a modal to pick new target)
  // For now, just return the connection data for the UI to handle
  return connection;
}

export async function deleteConnection(connectionId: string) {
  const connection = await prisma.blueprintConnection.findUnique({
    where: { id: connectionId },
    include: { blueprint: { select: { projectId: true, id: true } } },
  });

  if (!connection) return;

  await prisma.blueprintConnection.delete({
    where: { id: connectionId },
  });

  revalidatePath(`/projects/${connection.blueprint.projectId}/blueprints/${connection.blueprint.id}`);
}

// ============================================
// BULK SYNC (for local cache)
// ============================================

export async function syncBlueprint(blueprintId: string, payload: BlueprintSyncPayload) {
  await requireBlueprintAccess(blueprintId);
  const blueprint = await prisma.serviceBlueprint.findUnique({
    where: { id: blueprintId },
    select: { projectId: true },
  });
  if (!blueprint) throw new Error("Blueprint not found");

  const connectionIds = new Set(payload.connections.map((c) => c.id));
  const phaseIds = new Set(payload.phases.map((p) => p.id));
  const teamIds = new Set(payload.teams.map((t) => t.id));
  const softwareIds = new Set(payload.softwareServices.map((s) => s.id));

  await prisma.$transaction(async (tx) => {
    await tx.serviceBlueprint.update({
      where: { id: blueprintId },
      data: { name: payload.name.trim() || "Untitled Blueprint" },
    });

    await tx.blueprintConnection.deleteMany({
      where: {
        blueprintId,
        id: { notIn: [...connectionIds] },
      },
    });

    const existingPhases = await tx.blueprintPhase.findMany({
      where: { blueprintId },
      select: { id: true },
    });
    const toDeletePhaseIds = existingPhases.filter((p) => !phaseIds.has(p.id)).map((p) => p.id);
    if (toDeletePhaseIds.length > 0) {
      await tx.blueprintPhase.deleteMany({
        where: { id: { in: toDeletePhaseIds } },
      });
    }

    for (const t of payload.teams) {
      await tx.blueprintTeam.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          name: t.name.trim() || "Team",
          iconName: t.iconName || "group",
          colorHex: t.colorHex || "#6366f1",
          blueprintId,
        },
        update: {
          name: t.name.trim() || "Team",
          iconName: t.iconName || "group",
          colorHex: t.colorHex || "#6366f1",
        },
      });
    }
    const existingTeams = await tx.blueprintTeam.findMany({
      where: { blueprintId },
      select: { id: true },
    });
    const toDeleteTeamIds = existingTeams.filter((x) => !teamIds.has(x.id)).map((x) => x.id);
    if (toDeleteTeamIds.length > 0) {
      await tx.blueprintTeam.deleteMany({
        where: { id: { in: toDeleteTeamIds } },
      });
    }

    for (const s of payload.softwareServices) {
      await tx.softwareService.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          label: s.label.trim() || "Software",
          colorHex: s.colorHex || "#cbd5e1",
          blueprintId,
        },
        update: {
          label: s.label.trim() || "Software",
          colorHex: s.colorHex || "#cbd5e1",
        },
      });
    }
    const existingSoftware = await tx.softwareService.findMany({
      where: { blueprintId },
      select: { id: true },
    });
    const toDeleteSoftwareIds = existingSoftware.filter((x) => !softwareIds.has(x.id)).map((x) => x.id);
    if (toDeleteSoftwareIds.length > 0) {
      await tx.softwareService.deleteMany({
        where: { id: { in: toDeleteSoftwareIds } },
      });
    }

    for (const p of payload.phases) {
      await tx.blueprintPhase.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          order: p.order,
          title: p.title.trim() || "Untitled",
          timeframe: p.timeframe?.trim() || null,
          blueprintId,
        },
        update: {
          order: p.order,
          title: p.title.trim() || "Untitled",
          timeframe: p.timeframe?.trim() || null,
        },
      });

      const columnIds = new Set(p.columns.map((c) => c.id));
      const existingColumns = await tx.blueprintColumn.findMany({
        where: { phaseId: p.id },
        select: { id: true },
      });
      const toDeleteColumnIds = existingColumns.filter((c) => !columnIds.has(c.id)).map((c) => c.id);
      if (toDeleteColumnIds.length > 0) {
        await tx.blueprintColumn.deleteMany({
          where: { id: { in: toDeleteColumnIds } },
        });
      }

      for (const col of p.columns) {
        await tx.blueprintColumn.upsert({
          where: { id: col.id },
          create: {
            id: col.id,
            order: col.order,
            phaseId: p.id,
            blueprintId,
          },
          update: { order: col.order },
        });

        for (const card of col.basicCards) {
          await tx.blueprintBasicCard.upsert({
            where: { id: card.id },
            create: {
              id: card.id,
              order: card.order,
              laneType: card.laneType,
              title: card.title?.trim() || "Untitled",
              description: card.description?.trim() || null,
              painPoints: card.painPoints ?? null,
              isStart: card.isStart ?? false,
              isEnd: card.isEnd ?? false,
              columnId: col.id,
            },
            update: {
              order: card.order,
              laneType: card.laneType,
              title: card.title?.trim() || "Untitled",
              description: card.description?.trim() || null,
              painPoints: card.painPoints ?? null,
              isStart: card.isStart ?? false,
              isEnd: card.isEnd ?? false,
            },
          });
        }
        const existingBasic = await tx.blueprintBasicCard.findMany({
          where: { columnId: col.id },
          select: { id: true },
        });
        const basicIds = new Set(col.basicCards.map((c) => c.id));
        const toDeleteBasic = existingBasic.filter((c) => !basicIds.has(c.id)).map((c) => c.id);
        if (toDeleteBasic.length > 0) {
          await tx.blueprintBasicCard.deleteMany({
            where: { id: { in: toDeleteBasic } },
          });
        }

        for (const card of col.decisionCards) {
          await tx.blueprintDecisionCard.upsert({
            where: { id: card.id },
            create: {
              id: card.id,
              order: card.order,
              laneType: card.laneType,
              title: card.title?.trim() || "Untitled",
              question: card.question?.trim() || "?",
              description: card.description?.trim() || null,
              isStart: card.isStart ?? false,
              isEnd: card.isEnd ?? false,
              columnId: col.id,
              blueprintId,
            },
            update: {
              order: card.order,
              laneType: card.laneType,
              title: card.title?.trim() || "Untitled",
              question: card.question?.trim() || "?",
              description: card.description?.trim() || null,
              isStart: card.isStart ?? false,
              isEnd: card.isEnd ?? false,
            },
          });
        }
        const existingDecision = await tx.blueprintDecisionCard.findMany({
          where: { columnId: col.id },
          select: { id: true },
        });
        const decisionIds = new Set(col.decisionCards.map((c) => c.id));
        const toDeleteDecision = existingDecision.filter((c) => !decisionIds.has(c.id)).map((c) => c.id);
        if (toDeleteDecision.length > 0) {
          await tx.blueprintDecisionCard.deleteMany({
            where: { id: { in: toDeleteDecision } },
          });
        }

        for (const ts of col.teamSections) {
          await tx.teamSection.upsert({
            where: { id: ts.id },
            create: {
              id: ts.id,
              order: ts.order,
              laneType: ts.laneType,
              teamId: ts.teamId,
              columnId: col.id,
              blueprintId,
            },
            update: {
              order: ts.order,
              laneType: ts.laneType,
              teamId: ts.teamId,
            },
          });
          for (const c of ts.cards) {
            await tx.blueprintComplexCard.upsert({
              where: { id: c.id },
              create: {
                id: c.id,
                order: c.order,
                title: c.title?.trim() || "Untitled",
                description: c.description?.trim() || null,
                painPoints: c.painPoints ?? null,
                softwareIds: c.softwareIds ?? null,
                isStart: c.isStart ?? false,
                isEnd: c.isEnd ?? false,
                teamSectionId: ts.id,
              },
              update: {
                order: c.order,
                title: c.title?.trim() || "Untitled",
                description: c.description?.trim() || null,
                painPoints: c.painPoints ?? null,
                softwareIds: c.softwareIds ?? null,
                isStart: c.isStart ?? false,
                isEnd: c.isEnd ?? false,
              },
            });
          }
          const existingComplex = await tx.blueprintComplexCard.findMany({
            where: { teamSectionId: ts.id },
            select: { id: true },
          });
          const complexIds = new Set(ts.cards.map((c) => c.id));
          const toDeleteComplex = existingComplex.filter((x) => !complexIds.has(x.id)).map((x) => x.id);
          if (toDeleteComplex.length > 0) {
            await tx.blueprintComplexCard.deleteMany({
              where: { id: { in: toDeleteComplex } },
            });
          }
        }
        const existingSections = await tx.teamSection.findMany({
          where: { columnId: col.id },
          select: { id: true },
        });
        const sectionIds = new Set(col.teamSections.map((s) => s.id));
        const toDeleteSections = existingSections.filter((s) => !sectionIds.has(s.id)).map((s) => s.id);
        if (toDeleteSections.length > 0) {
          await tx.teamSection.deleteMany({
            where: { id: { in: toDeleteSections } },
          });
        }
      }
    }

    for (const c of payload.connections) {
      await tx.blueprintConnection.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          blueprintId,
          sourceCardId: c.sourceCardId,
          sourceCardType: c.sourceCardType,
          targetCardId: c.targetCardId,
          targetCardType: c.targetCardType,
          connectorType: c.connectorType || "standard",
          label: c.label?.trim() || null,
          arrowDirection: c.arrowDirection || "forward",
          strokeWeight: c.strokeWeight || "normal",
          strokePattern: c.strokePattern || "solid",
          strokeColor: c.strokeColor || "grey",
        },
        update: {
          connectorType: c.connectorType || "standard",
          label: c.label?.trim() || null,
          arrowDirection: c.arrowDirection || "forward",
          strokeWeight: c.strokeWeight || "normal",
          strokePattern: c.strokePattern || "solid",
          strokeColor: c.strokeColor || "grey",
        },
      });
    }
  });

  revalidatePath(`/projects/${blueprint.projectId}/blueprints/${blueprintId}`);
}
