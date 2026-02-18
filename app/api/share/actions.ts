'use server';

import { prisma } from '@/app/lib/db';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

export async function createShareLink(data: {
  projectId: string;
  journeyMapId?: string;
  blueprintId?: string;
  personaId?: string;
}) {
  try {
    // Generate a short, URL-friendly slug
    const slug = nanoid(10);

    const shareLink = await prisma.shareLink.create({
      data: {
        slug,
        projectId: data.projectId,
        journeyMapId: data.journeyMapId,
        blueprintId: data.blueprintId,
        personaId: data.personaId,
      },
    });

    return { success: true, shareLink };
  } catch (error) {
    console.error('Failed to create share link:', error);
    return { success: false, error: 'Failed to create share link' };
  }
}

export async function getShareLinkBySlug(slug: string) {
  try {
    const shareLink = await prisma.shareLink.findUnique({
      where: { slug },
      include: {
        project: true,
      },
    });

    if (!shareLink || !shareLink.isActive) {
      return { success: false, error: 'Share link not found or expired' };
    }

    // Check expiration
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return { success: false, error: 'Share link has expired' };
    }

    // Increment view count
    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { viewCount: shareLink.viewCount + 1 },
    });

    return { success: true, shareLink };
  } catch (error) {
    console.error('Failed to get share link:', error);
    return { success: false, error: 'Failed to get share link' };
  }
}

export async function deleteShareLink(linkId: string) {
  try {
    await prisma.shareLink.delete({
      where: { id: linkId },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to delete share link:', error);
    return { success: false, error: 'Failed to delete share link' };
  }
}

export async function getProjectShareLinks(projectId: string) {
  try {
    const shareLinks = await prisma.shareLink.findMany({
      where: { projectId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, shareLinks };
  } catch (error) {
    console.error('Failed to get share links:', error);
    return { success: false, error: 'Failed to get share links' };
  }
}
