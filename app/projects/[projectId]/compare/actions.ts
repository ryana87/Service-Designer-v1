"use server";

import { prisma } from "../../../lib/db";
import {
  buildJourneyDiff,
  buildBlueprintDiff,
  buildNarrativeFromJourneyDiff,
  buildNarrativeFromBlueprintDiff,
  narrativeToMarkdown,
  type WhatChangedNarrative,
  type JourneyForDiff,
  type BlueprintForDiff,
} from "../../../lib/what-changed-narrative";

export type WhatChangedResult = {
  ok: true;
  narrative: WhatChangedNarrative;
  markdown: string;
  beforeName: string;
  afterName: string;
} | { ok: false; error: string };

export async function generateWhatChangedSummary(
  projectId: string,
  leftId: string,
  rightId: string,
  type: "journeyMap" | "blueprint",
  leftLabel: string,
  rightLabel: string
): Promise<WhatChangedResult> {
  try {
    if (type === "journeyMap") {
      const [left, right] = await Promise.all([
        prisma.journeyMap.findUnique({
          where: { id: leftId, projectId },
          include: {
            phases: {
              orderBy: { order: "asc" },
              include: {
                actions: { orderBy: { order: "asc" } },
              },
            },
          },
        }),
        prisma.journeyMap.findUnique({
          where: { id: rightId, projectId },
          include: {
            phases: {
              orderBy: { order: "asc" },
              include: {
                actions: { orderBy: { order: "asc" } },
              },
            },
          },
        }),
      ]);
      if (!left || !right) {
        return { ok: false, error: "Journey maps not found." };
      }
      const leftForDiff: JourneyForDiff = {
        name: left.name,
        phases: left.phases.map((p) => ({
          title: p.title,
          actions: p.actions.map((a) => ({
            title: a.title,
            description: a.description,
            emotion: a.emotion,
            painPoints: a.painPoints,
            opportunities: a.opportunities,
          })),
        })),
      };
      const rightForDiff: JourneyForDiff = {
        name: right.name,
        phases: right.phases.map((p) => ({
          title: p.title,
          actions: p.actions.map((a) => ({
            title: a.title,
            description: a.description,
            emotion: a.emotion,
            painPoints: a.painPoints,
            opportunities: a.opportunities,
          })),
        })),
      };
      const diff = buildJourneyDiff(leftForDiff, rightForDiff);
      const narrative = buildNarrativeFromJourneyDiff(
        left.name,
        right.name,
        leftLabel,
        rightLabel,
        diff
      );
      const markdown = narrativeToMarkdown(narrative, left.name, right.name);
      return {
        ok: true,
        narrative,
        markdown,
        beforeName: left.name,
        afterName: right.name,
      };
    }

    // type === "blueprint"
    const [left, right] = await Promise.all([
      prisma.serviceBlueprint.findUnique({
        where: { id: leftId, projectId },
        include: {
          phases: {
            orderBy: { order: "asc" },
            include: {
              columns: {
                orderBy: { order: "asc" },
                include: {
                  basicCards: true,
                  teamSections: { include: { cards: true } },
                  decisionCards: true,
                },
              },
            },
          },
        },
      }),
      prisma.serviceBlueprint.findUnique({
        where: { id: rightId, projectId },
        include: {
          phases: {
            orderBy: { order: "asc" },
            include: {
              columns: {
                orderBy: { order: "asc" },
                include: {
                  basicCards: true,
                  teamSections: { include: { cards: true } },
                  decisionCards: true,
                },
              },
            },
          },
        },
      }),
    ]);
    if (!left || !right) {
      return { ok: false, error: "Blueprints not found." };
    }
    const leftForDiff: BlueprintForDiff = {
      name: left.name,
      phases: left.phases.map((p) => ({
        title: p.title,
        columns: p.columns.map((col) => ({
          basicCards: col.basicCards.map((c) => ({ laneType: c.laneType })),
          teamSections: col.teamSections.map((ts) => ({
            laneType: ts.laneType,
            cards: ts.cards,
          })),
          decisionCards: col.decisionCards,
        })),
      })),
    };
    const rightForDiff: BlueprintForDiff = {
      name: right.name,
      phases: right.phases.map((p) => ({
        title: p.title,
        columns: p.columns.map((col) => ({
          basicCards: col.basicCards.map((c) => ({ laneType: c.laneType })),
          teamSections: col.teamSections.map((ts) => ({
            laneType: ts.laneType,
            cards: ts.cards,
          })),
          decisionCards: col.decisionCards,
        })),
      })),
    };
    const diff = buildBlueprintDiff(leftForDiff, rightForDiff);
    const narrative = buildNarrativeFromBlueprintDiff(
      left.name,
      right.name,
      leftLabel,
      rightLabel,
      diff
    );
    const markdown = narrativeToMarkdown(narrative, left.name, right.name);
    return {
      ok: true,
      narrative,
      markdown,
      beforeName: left.name,
      afterName: right.name,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}
