'use client';

import React, { useState, useEffect } from 'react';
import { AppIcon } from './Icon';
import { createShareLink } from '@/app/api/share/actions';

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  itemType: 'journey-map' | 'blueprint' | 'persona';
  itemId: string;
  itemName: string;
};

export default function ShareModal({
  isOpen,
  onClose,
  projectId,
  itemType,
  itemId,
  itemName,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-generate share link when modal opens
  const generateShareLink = async () => {
    if (shareUrl) return; // Don't regenerate if we already have one
    
    setIsGenerating(true);
    try {
      const data: any = { projectId };
      
      if (itemType === 'journey-map') {
        data.journeyMapId = itemId;
      } else if (itemType === 'blueprint') {
        data.blueprintId = itemId;
      } else if (itemType === 'persona') {
        data.personaId = itemId;
      }

      const result = await createShareLink(data);
      
      if (result.success && result.shareLink) {
        const url = `${window.location.origin}/share/${result.shareLink.slug}`;
        setShareUrl(url);
      }
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate link when modal opens
  useEffect(() => {
    if (isOpen && !shareUrl) {
      generateShareLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const copyToClipboard = () => {
    if (displayUrl) {
      navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  // Fallback dummy link if generation fails
  const displayUrl = shareUrl || `${window.location.origin}/share/example-link`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Share {itemType === 'journey-map' ? 'Journey Map' : itemType === 'blueprint' ? 'Service Blueprint' : 'Persona'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <AppIcon name="close" size="sm" className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Share <strong>{itemName}</strong> with a read-only link.
              Anyone with the link can view it without signing in.
            </p>
          </div>

          {isGenerating ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Generating link...</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                <input
                  type="text"
                  value={displayUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                This link will remain active until you delete it. Anyone with the link can view this {itemType}.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
