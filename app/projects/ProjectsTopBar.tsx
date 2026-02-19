"use client";

import React, { useState, useRef, useEffect } from "react";
import { logout } from "../login/actions";
import { AppIcon } from "../components/Icon";

type User = {
  userId: string;
  userDisplayName: string;
};

export function ProjectsTopBar({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initial = user.userDisplayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-12 shrink-0 items-center justify-end border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)] text-sm font-medium text-white"
            aria-hidden
          >
            {initial}
          </span>
          <span className="text-sm font-medium">{user.userDisplayName}</span>
          <AppIcon name="chevronDown" size="xs" className="text-[var(--text-muted)]" />
        </button>
        {open && (
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] py-1 shadow-lg"
            role="menu"
          >
            <div className="border-b border-[var(--border-subtle)] px-3 py-2">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Signed in as {user.userDisplayName}
              </p>
            </div>
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-muted)] disabled:cursor-not-allowed"
              role="menuitem"
            >
              <AppIcon name="settings" size="xs" />
              User settings (coming soon)
            </button>
            <form action={logout} className="block">
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                role="menuitem"
              >
                <AppIcon name="logout" size="xs" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
