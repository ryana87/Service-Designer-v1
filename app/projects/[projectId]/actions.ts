"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/db";
import { requireProjectOwner } from "../actions";
import type { JourneyMapDraftSpec } from "../../onboarding/types";

// ============================================
// PROJECT ACTIONS
// ============================================

export async function updateProject(
  projectId: string,
  field: "name" | "description",
  value: string
) {
  await requireProjectOwner(projectId);
  await prisma.project.update({
    where: { id: projectId },
    data: {
      [field]: field === "name" ? (value.trim() || "Untitled Project") : (value.trim() || null),
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

// ============================================
// JOURNEY MAP CRUD ACTIONS
// ============================================

export async function createJourneyMapInProject(projectId: string) {
  await requireProjectOwner(projectId);
  const maxSort = await prisma.journeyMap.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const journeyMap = await prisma.journeyMap.create({
    data: {
      name: "Untitled Journey Map",
      sortOrder: nextSortOrder,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return journeyMap;
}

export async function createJourneyMapFromSpec(projectId: string, spec: JourneyMapDraftSpec) {
  await requireProjectOwner(projectId);
  const maxSort = await prisma.journeyMap.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const journeyMap = await prisma.journeyMap.create({
    data: {
      name: spec.name?.trim() || "Untitled Journey Map",
      persona: spec.personaName?.trim() || null,
      sortOrder: nextSortOrder,
      projectId,
      phases: {
        create: spec.phases.map((phase, phaseIdx) => ({
          order: phaseIdx,
          title: phase.title?.trim() || `Phase ${phaseIdx + 1}`,
          timeframe: phase.timeframe?.trim() || null,
          actions: {
            create: (phase.actions ?? []).map((action, actionIdx) => ({
              order: actionIdx,
              title: action.title?.trim() || `Action ${actionIdx + 1}`,
              description: action.description?.trim() || null,
              thought: action.thought?.trim() || null,
              channel: action.channel?.trim() || null,
              touchpoint: action.touchpoint?.trim() || null,
              emotion: action.emotion ?? null,
              painPoints: action.painPoints?.trim() || null,
              opportunities: action.opportunities?.trim() || null,
              thumbnailUrl: action.thumbnailUrl || null,
              quotes: action.quotes?.length
                ? {
                    create: action.quotes.map((q) => ({
                      quoteText: q.quoteText,
                      source: q.source ?? null,
                    })),
                  }
                : undefined,
            })),
          },
        })),
      },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return journeyMap;
}

export async function renameJourneyMap(journeyMapId: string, newName: string) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });
  if (!journeyMap) return;
  await requireProjectOwner(journeyMap.projectId);

  await prisma.journeyMap.update({
    where: { id: journeyMapId },
    data: { name: newName.trim() || "Untitled Journey Map" },
  });

  revalidatePath(`/projects/${journeyMap.projectId}`);
}

export async function deleteJourneyMap(journeyMapId: string) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true },
  });
  if (!journeyMap) return { projectId: null };
  await requireProjectOwner(journeyMap.projectId);

  await prisma.journeyMap.delete({
    where: { id: journeyMapId },
  });

  revalidatePath(`/projects/${journeyMap.projectId}`);
  return { projectId: journeyMap.projectId };
}

export async function duplicateJourneyMap(journeyMapId: string) {
  const original = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    include: {
      phases: {
        include: {
          actions: {
            include: {
              quotes: true,
            },
          },
        },
      },
      customChannels: true,
      customTouchpoints: true,
    },
  });

  if (!original) return null;
  await requireProjectOwner(original.projectId);

  const maxSort = await prisma.journeyMap.aggregate({
    where: { projectId: original.projectId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  // Create the duplicate with all nested data
  const duplicate = await prisma.journeyMap.create({
    data: {
      name: `${original.name} (copy)`,
      persona: original.persona,
      sortOrder: nextSortOrder,
      projectId: original.projectId,
      phases: {
        create: original.phases.map((phase) => ({
          order: phase.order,
          title: phase.title,
          timeframe: phase.timeframe,
          actions: {
            create: phase.actions.map((action) => ({
              order: action.order,
              title: action.title,
              description: action.description,
              thought: action.thought,
              channel: action.channel,
              touchpoint: action.touchpoint,
              emotion: action.emotion,
              painPoints: action.painPoints,
              opportunities: action.opportunities,
              thumbnailUrl: action.thumbnailUrl,
              quotes: {
                create: action.quotes.map((quote) => ({
                  quoteText: quote.quoteText,
                  source: quote.source,
                })),
              },
            })),
          },
        })),
      },
      customChannels: {
        create: original.customChannels.map((channel) => ({
          label: channel.label,
          iconName: channel.iconName,
        })),
      },
      customTouchpoints: {
        create: original.customTouchpoints.map((touchpoint) => ({
          label: touchpoint.label,
          iconName: touchpoint.iconName,
        })),
      },
    },
  });

  revalidatePath(`/projects/${original.projectId}`);
  return duplicate;
}

// ============================================
// JOURNEY MAP ORDERING
// ============================================

export async function moveJourneyMapUp(journeyMapId: string) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true, sortOrder: true },
  });

  if (!journeyMap) return;
  await requireProjectOwner(journeyMap.projectId);

  const mapAbove = await prisma.journeyMap.findFirst({
    where: {
      projectId: journeyMap.projectId,
      sortOrder: { lt: journeyMap.sortOrder },
    },
    orderBy: { sortOrder: "desc" },
  });

  if (!mapAbove) return; // Already at top

  // Swap sort orders
  await prisma.$transaction([
    prisma.journeyMap.update({
      where: { id: journeyMapId },
      data: { sortOrder: mapAbove.sortOrder },
    }),
    prisma.journeyMap.update({
      where: { id: mapAbove.id },
      data: { sortOrder: journeyMap.sortOrder },
    }),
  ]);

  revalidatePath(`/projects/${journeyMap.projectId}`);
}

export async function moveJourneyMapDown(journeyMapId: string) {
  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    select: { projectId: true, sortOrder: true },
  });
  if (!journeyMap) return;
  await requireProjectOwner(journeyMap.projectId);

  const mapBelow = await prisma.journeyMap.findFirst({
    where: {
      projectId: journeyMap.projectId,
      sortOrder: { gt: journeyMap.sortOrder },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (!mapBelow) return; // Already at bottom

  // Swap sort orders
  await prisma.$transaction([
    prisma.journeyMap.update({
      where: { id: journeyMapId },
      data: { sortOrder: mapBelow.sortOrder },
    }),
    prisma.journeyMap.update({
      where: { id: mapBelow.id },
      data: { sortOrder: journeyMap.sortOrder },
    }),
  ]);

  revalidatePath(`/projects/${journeyMap.projectId}`);
}


// ============================================
// SEARCH ACTIONS
// ============================================

export type SearchResult = {
  type: "journeyMap" | "blueprint" | "phase" | "action" | "quote" | "card";
  artefactType: "journeyMap" | "blueprint";
  artefactId: string;
  artefactName: string;
  matchField: string;
  matchText: string;
  context?: string;
  actionIndex?: number;
};

export async function searchProjectContent(
  projectId: string,
  query: string
): Promise<{
  nameMatches: SearchResult[];
  contentMatches: SearchResult[];
}> {
  await requireProjectOwner(projectId);
  if (!query.trim()) {
    return { nameMatches: [], contentMatches: [] };
  }
  const lowerQuery = query.trim().toLowerCase();
  const nameMatches: SearchResult[] = [];
  const contentMatches: SearchResult[] = [];

  // Search Journey Map names
  const mapNameMatches = await prisma.journeyMap.findMany({
    where: {
      projectId,
      name: { contains: query.trim() },
    },
    select: { id: true, name: true },
    take: 4,
    orderBy: { sortOrder: "asc" },
  });

  for (const map of mapNameMatches) {
    nameMatches.push({
      type: "journeyMap",
      artefactType: "journeyMap",
      artefactId: map.id,
      artefactName: map.name,
      matchField: "Journey Map",
      matchText: map.name,
    });
  }

  // Search Blueprint names
  const blueprintNameMatches = await prisma.serviceBlueprint.findMany({
    where: {
      projectId,
      name: { contains: query.trim() },
    },
    select: { id: true, name: true },
    take: 4,
    orderBy: { sortOrder: "asc" },
  });

  for (const bp of blueprintNameMatches) {
    nameMatches.push({
      type: "blueprint",
      artefactType: "blueprint",
      artefactId: bp.id,
      artefactName: bp.name,
      matchField: "Blueprint",
      matchText: bp.name,
    });
  }

  // Search content within Journey Maps
  const journeyMaps = await prisma.journeyMap.findMany({
    where: { projectId },
    include: {
      phases: {
        include: {
          actions: {
            include: {
              quotes: true,
            },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  for (const map of journeyMaps) {
    let actionIdx = 0;

    for (const phase of map.phases) {
      if (phase.title.toLowerCase().includes(lowerQuery)) {
        contentMatches.push({
          type: "phase",
          artefactType: "journeyMap",
          artefactId: map.id,
          artefactName: map.name,
          matchField: "Phase title",
          matchText: phase.title,
        });
      }

      if (phase.timeframe?.toLowerCase().includes(lowerQuery)) {
        contentMatches.push({
          type: "phase",
          artefactType: "journeyMap",
          artefactId: map.id,
          artefactName: map.name,
          matchField: "Phase timeframe",
          matchText: phase.timeframe,
        });
      }

      for (const action of phase.actions) {
        const currentActionIdx = actionIdx++;

        const fieldsToSearch: { field: string; value: string | null }[] = [
          { field: "Action title", value: action.title },
          { field: "Description", value: action.description },
          { field: "Thought", value: action.thought },
          { field: "Channel", value: action.channel },
          { field: "Touchpoint", value: action.touchpoint },
          { field: "Pain point", value: action.painPoints },
          { field: "Opportunity", value: action.opportunities },
        ];

        for (const { field, value } of fieldsToSearch) {
          if (value?.toLowerCase().includes(lowerQuery)) {
            contentMatches.push({
              type: "action",
              artefactType: "journeyMap",
              artefactId: map.id,
              artefactName: map.name,
              matchField: field,
              matchText: truncateWithContext(value, lowerQuery, 60),
              actionIndex: currentActionIdx,
            });
          }
        }

        for (const quote of action.quotes) {
          if (quote.quoteText.toLowerCase().includes(lowerQuery)) {
            contentMatches.push({
              type: "quote",
              artefactType: "journeyMap",
              artefactId: map.id,
              artefactName: map.name,
              matchField: "Quote",
              matchText: truncateWithContext(quote.quoteText, lowerQuery, 60),
              actionIndex: currentActionIdx,
            });
          }
          if (quote.source?.toLowerCase().includes(lowerQuery)) {
            contentMatches.push({
              type: "quote",
              artefactType: "journeyMap",
              artefactId: map.id,
              artefactName: map.name,
              matchField: "Quote source",
              matchText: quote.source,
              actionIndex: currentActionIdx,
            });
          }
        }
      }
    }
  }

  // Search content within Blueprints (new schema with columns, team sections)
  const blueprints = await prisma.serviceBlueprint.findMany({
    where: { projectId },
    include: {
      phases: {
        include: {
          columns: {
            include: {
              basicCards: true,
              teamSections: {
                include: {
                  team: true,
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
    orderBy: { sortOrder: "asc" },
  });

  for (const bp of blueprints) {
    // Search teams
    for (const team of bp.teams) {
      if (team.name.toLowerCase().includes(lowerQuery)) {
        contentMatches.push({
          type: "card",
          artefactType: "blueprint",
          artefactId: bp.id,
          artefactName: bp.name,
          matchField: "Team",
          matchText: team.name,
        });
      }
    }

    // Search software/services
    for (const sw of bp.softwareServices) {
      if (sw.label.toLowerCase().includes(lowerQuery)) {
        contentMatches.push({
          type: "card",
          artefactType: "blueprint",
          artefactId: bp.id,
          artefactName: bp.name,
          matchField: "Software/Service",
          matchText: sw.label,
        });
      }
    }

    for (const phase of bp.phases) {
      if (phase.title.toLowerCase().includes(lowerQuery)) {
        contentMatches.push({
          type: "phase",
          artefactType: "blueprint",
          artefactId: bp.id,
          artefactName: bp.name,
          matchField: "Phase title",
          matchText: phase.title,
        });
      }

      if (phase.timeframe?.toLowerCase().includes(lowerQuery)) {
        contentMatches.push({
          type: "phase",
          artefactType: "blueprint",
          artefactId: bp.id,
          artefactName: bp.name,
          matchField: "Phase timeframe",
          matchText: phase.timeframe,
        });
      }

      // Search within columns
      for (const column of phase.columns) {
        // Search basic cards
        for (const card of column.basicCards) {
          if (card.title.toLowerCase().includes(lowerQuery)) {
            contentMatches.push({
              type: "card",
              artefactType: "blueprint",
              artefactId: bp.id,
              artefactName: bp.name,
              matchField: "Card title",
              matchText: card.title,
            });
          }

          if (card.description?.toLowerCase().includes(lowerQuery)) {
            contentMatches.push({
              type: "card",
              artefactType: "blueprint",
              artefactId: bp.id,
              artefactName: bp.name,
              matchField: "Card description",
              matchText: truncateWithContext(card.description, lowerQuery, 60),
            });
          }

          // Search pain points
          if (card.painPoints) {
            try {
              const painPoints = JSON.parse(card.painPoints) as { text: string }[];
              for (const pp of painPoints) {
                if (pp.text.toLowerCase().includes(lowerQuery)) {
                  contentMatches.push({
                    type: "card",
                    artefactType: "blueprint",
                    artefactId: bp.id,
                    artefactName: bp.name,
                    matchField: "Pain point",
                    matchText: truncateWithContext(pp.text, lowerQuery, 60),
                  });
                }
              }
            } catch {
              // Invalid JSON, skip
            }
          }
        }

        // Search complex cards in team sections
        for (const section of column.teamSections) {
          for (const card of section.cards) {
            if (card.title.toLowerCase().includes(lowerQuery)) {
              contentMatches.push({
                type: "card",
                artefactType: "blueprint",
                artefactId: bp.id,
                artefactName: bp.name,
                matchField: "Card title",
                matchText: card.title,
              });
            }

            if (card.description?.toLowerCase().includes(lowerQuery)) {
              contentMatches.push({
                type: "card",
                artefactType: "blueprint",
                artefactId: bp.id,
                artefactName: bp.name,
                matchField: "Card description",
                matchText: truncateWithContext(card.description, lowerQuery, 60),
              });
            }

            // Search pain points
            if (card.painPoints) {
              try {
                const painPoints = JSON.parse(card.painPoints) as { text: string }[];
                for (const pp of painPoints) {
                  if (pp.text.toLowerCase().includes(lowerQuery)) {
                    contentMatches.push({
                      type: "card",
                      artefactType: "blueprint",
                      artefactId: bp.id,
                      artefactName: bp.name,
                      matchField: "Pain point",
                      matchText: truncateWithContext(pp.text, lowerQuery, 60),
                    });
                  }
                }
              } catch {
                // Invalid JSON, skip
              }
            }
          }
        }
      }
    }
  }

  // Limit content matches
  return {
    nameMatches: nameMatches.slice(0, 8),
    contentMatches: contentMatches.slice(0, 12),
  };
}

// Helper to truncate text with context around the match
function truncateWithContext(text: string, query: string, maxLength: number): string {
  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(query);

  if (matchIndex === -1 || text.length <= maxLength) {
    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  }

  // Center the match in the truncated text
  const halfLength = Math.floor(maxLength / 2);
  let start = Math.max(0, matchIndex - halfLength);
  let end = Math.min(text.length, matchIndex + query.length + halfLength);

  // Adjust if at boundaries
  if (start === 0) {
    end = Math.min(text.length, maxLength);
  } else if (end === text.length) {
    start = Math.max(0, text.length - maxLength);
  }

  let result = text.slice(start, end);
  if (start > 0) result = "…" + result;
  if (end < text.length) result = result + "…";

  return result;
}

// ============================================
// PERSONA ACTIONS
// ============================================

export async function createPersona(
  projectId: string,
  data: {
    name: string;
    shortDescription?: string | null;
    role?: string | null;
    context?: string | null;
    goals?: string | null;
    needs?: string | null;
    painPoints?: string | null;
    notes?: string | null;
    avatarUrl?: string | null;
    templateId?: string | null;
  }
) {
  await requireProjectOwner(projectId);
  const persona = await prisma.persona.create({
    data: {
      name: data.name,
      shortDescription: data.shortDescription || null,
      role: data.role || null,
      context: data.context || null,
      goals: data.goals || null,
      needs: data.needs || null,
      painPoints: data.painPoints || null,
      notes: data.notes || null,
      avatarUrl: data.avatarUrl || null,
      templateId: data.templateId ?? null,
      projectId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return persona;
}

/** Add a persona to the project from a library template. Only way to add personas in v1. */
export async function addPersonaFromTemplate(projectId: string, templateId: string) {
  const { getPersonaTemplateById } = await import("../../lib/persona-library");
  const template = getPersonaTemplateById(templateId);
  if (!template) return null;
  return createPersona(projectId, {
    name: template.personaName ?? template.name,
    shortDescription: template.shortDescription || null,
    role: template.role ?? null,
    context: template.context ?? null,
    goals: template.goals ?? null,
    needs: template.needs ?? null,
    painPoints: template.painPoints ?? null,
    notes: template.notes ?? null,
    avatarUrl: template.avatarUrl ?? null,
    templateId: template.id,
  });
}

export async function updatePersona(
  personaId: string,
  data: {
    name?: string;
    shortDescription?: string | null;
    role?: string | null;
    context?: string | null;
    goals?: string | null;
    needs?: string | null;
    painPoints?: string | null;
    notes?: string | null;
    avatarUrl?: string | null;
  }
) {
  const existing = await prisma.persona.findUnique({
    where: { id: personaId },
    select: { projectId: true },
  });
  if (!existing) return null;
  await requireProjectOwner(existing.projectId);
  const persona = await prisma.persona.update({
    where: { id: personaId },
    data,
    include: { project: { select: { id: true } } },
  });
  revalidatePath(`/projects/${persona.project.id}`);
  return persona;
}

export async function deletePersona(personaId: string) {
  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    select: { projectId: true },
  });
  if (!persona) return;
  await requireProjectOwner(persona.projectId);

  await prisma.persona.delete({
    where: { id: personaId },
  });

  revalidatePath(`/projects/${persona.projectId}`);
}
