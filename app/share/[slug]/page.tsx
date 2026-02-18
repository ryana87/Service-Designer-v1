import { getShareLinkBySlug } from '@/app/api/share/actions';
import { prisma } from '@/app/lib/db';
import { notFound } from 'next/navigation';

export default async function SharedViewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getShareLinkBySlug(slug);

  if (!result.success || !result.shareLink) {
    notFound();
  }

  const { shareLink } = result;

  // Fetch the specific content being shared
  let content = null;
  let contentType = '';

  if (shareLink.journeyMapId) {
    content = await prisma.journeyMap.findUnique({
      where: { id: shareLink.journeyMapId },
      include: {
        phases: {
          include: {
            actions: {
              include: {
                quotes: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        customChannels: true,
        customTouchpoints: true,
        personaRef: true,
      },
    });
    contentType = 'journey-map';
  } else if (shareLink.blueprintId) {
    content = await prisma.serviceBlueprint.findUnique({
      where: { id: shareLink.blueprintId },
      include: {
        phases: {
          include: {
            columns: {
              include: {
                basicCards: true,
                decisionCards: true,
                teamSections: {
                  include: {
                    team: true,
                    cards: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        teams: true,
        softwareServices: true,
        connections: true,
      },
    });
    contentType = 'blueprint';
  } else if (shareLink.personaId) {
    content = await prisma.persona.findUnique({
      where: { id: shareLink.personaId },
    });
    contentType = 'persona';
  }

  if (!content) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span>Shared from {shareLink.project.name}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Read-only
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {content.name || 'Shared Content'}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {contentType === 'journey-map' && (
            <div className="text-gray-600">
              <p className="mb-4">Journey Map: {content.name}</p>
              <p className="text-sm text-gray-500">
                This is a shared journey map. Full rendering to be implemented.
              </p>
            </div>
          )}
          
          {contentType === 'blueprint' && (
            <div className="text-gray-600">
              <p className="mb-4">Service Blueprint: {content.name}</p>
              <p className="text-sm text-gray-500">
                This is a shared service blueprint. Full rendering to be implemented.
              </p>
            </div>
          )}
          
          {contentType === 'persona' && 'avatarUrl' in content && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {content.avatarUrl && (
                  <img
                    src={content.avatarUrl}
                    alt={content.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                )}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{content.name}</h2>
                  {content.shortDescription && (
                    <p className="text-gray-600">{content.shortDescription}</p>
                  )}
                  {content.role && (
                    <p className="text-sm text-gray-500">{content.role}</p>
                  )}
                </div>
              </div>

              {content.context && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Context</h3>
                  <p className="text-sm text-gray-600">{content.context}</p>
                </div>
              )}

              {content.goals && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Goals</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{content.goals}</p>
                </div>
              )}

              {content.needs && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Needs</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{content.needs}</p>
                </div>
              )}

              {content.painPoints && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Pain Points</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{content.painPoints}</p>
                </div>
              )}

              {content.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{content.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Want to create service design artifacts like this?</p>
          <a href="/" className="text-blue-600 hover:underline">
            Get started with Service Design 4.0
          </a>
        </div>
      </div>
    </div>
  );
}
