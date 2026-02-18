'use client';

import { useEffect, useState } from 'react';
import { AppIcon } from './Icon';

type Shortcut = {
  keys: string[];
  description: string;
  category: string;
};

const shortcuts: Shortcut[] = [
  // General
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'General' },
  { keys: ['Esc'], description: 'Close modal or cancel action', category: 'General' },
  
  // Editing
  { keys: ['Cmd', 'Z'], description: 'Undo', category: 'Editing' },
  { keys: ['Cmd', 'Shift', 'Z'], description: 'Redo', category: 'Editing' },
  { keys: ['Cmd', 'D'], description: 'Duplicate selected', category: 'Editing' },
  { keys: ['Delete'], description: 'Delete selected', category: 'Editing' },
  { keys: ['Backspace'], description: 'Delete selected', category: 'Editing' },
  
  // Navigation
  { keys: ['Space'], description: 'Pan canvas (hold and drag)', category: 'Navigation' },
  { keys: ['Cmd', '+'], description: 'Zoom in', category: 'Navigation' },
  { keys: ['Cmd', '-'], description: 'Zoom out', category: 'Navigation' },
  { keys: ['Cmd', '0'], description: 'Reset zoom', category: 'Navigation' },
];

export default function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    // Detect OS
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Open modal with '?' or Cmd+? (Cmd+/ on some keyboards)
      const mod = e.metaKey || e.ctrlKey;
      if ((e.key === '?' && !mod) || (mod && (e.key === '?' || e.key === '/'))) {
        // Don't trigger if in input field
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA'
        ) {
          return;
        }
        e.preventDefault();
        setIsOpen(true);
      }

      // Close modal with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  // Replace Cmd with Ctrl on Windows
  const formatKeys = (keys: string[]) => {
    return keys.map((key) => {
      if (key === 'Cmd' && !isMac) return 'Ctrl';
      return key;
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-[var(--bg-panel)] rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto border border-[var(--border-subtle)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-panel)] border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
          >
            <AppIcon name="close" size="sm" className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-sm text-[var(--text-secondary)]">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {formatKeys(shortcut.keys).map((key, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] rounded">
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-[var(--text-muted)] text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--bg-sidebar)] border-t border-[var(--border-subtle)] px-6 py-3 text-xs text-[var(--text-muted)] text-center">
          Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded">?</kbd> or <kbd className="px-1.5 py-0.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded">⌘?</kbd> to toggle this panel
        </div>
      </div>
    </div>
  );
}
