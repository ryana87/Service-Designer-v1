import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get("actionId");
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const where: { actionId?: string; targetType?: string; targetId?: string } = {};
    if (actionId) where.actionId = actionId;
    if (targetType && targetId) {
      where.targetType = targetType;
      where.targetId = targetId;
    }
    if (!actionId && !(targetType && targetId)) {
      return NextResponse.json({ error: "actionId or targetType+targetId required" }, { status: 400 });
    }
    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch (err) {
    console.error("[comments GET]", err);
    const msg = err instanceof Error ? err.message : "Failed to fetch comments";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, actionId, author, targetType, targetId, positionX, positionY, rowKey } = body;
    const hasAction = !!actionId;
    const hasTarget = !!(targetType && targetId);
    if (!content || (!hasAction && !hasTarget)) {
      return NextResponse.json({ error: "content and (actionId or targetType+targetId) required" }, { status: 400 });
    }
    const data: Record<string, unknown> = {
      content: String(content).trim(),
      author: author || null,
      positionX: positionX != null ? Number(positionX) : null,
      positionY: positionY != null ? Number(positionY) : null,
      rowKey: rowKey || null,
    };
    if (hasAction) data.actionId = actionId;
    if (hasTarget) {
      data.targetType = targetType;
      data.targetId = targetId;
    }
    const comment = await prisma.comment.create({ data: data as never });
    return NextResponse.json(comment);
  } catch (err) {
    console.error("[comments POST]", err);
    const msg = err instanceof Error ? err.message : "Failed to create comment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[comments DELETE]", err);
    const msg = err instanceof Error ? err.message : "Failed to delete comment";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
