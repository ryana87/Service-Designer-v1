'use client';

import { useState } from 'react';
import { AppIcon } from './Icon';
import ShareModal from './ShareModal';

type ShareButtonProps = {
  projectId: string;
  itemType: 'journey-map' | 'blueprint' | 'persona';
  itemId: string;
  itemName: string;
  size?: 'sm' | 'md';
};

export default function ShareButton({
  projectId,
  itemType,
  itemId,
  itemName,
  size = 'md',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 rounded px-3 transition-colors
          bg-[var(--bg-sidebar)] text-[var(--text-secondary)]
          hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]
          ${size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm'}`}
        title="Share (Ctrl/Cmd+Shift+S)"
      >
        <AppIcon name="share" size="xs" />
        {size === 'md' && <span>Share</span>}
      </button>

      <ShareModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        projectId={projectId}
        itemType={itemType}
        itemId={itemId}
        itemName={itemName}
      />
    </>
  );
}
