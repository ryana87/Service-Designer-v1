"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginWithUser } from "./actions";
import { DEMO_USERS } from "../lib/demoUsers";

const DEMO_PASSWORD = "demo";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/projects";
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showUserModal) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (usernameInputRef.current?.contains(target)) return;
      const modal = document.getElementById("user-picker-modal");
      if (modal?.contains(target)) return;
      setShowUserModal(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserModal]);

  const handleSelectUser = (name: string) => {
    setUsername(name);
    setPassword(DEMO_PASSWORD);
    setShowUserModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (activeTab !== "signin") return;
    if (!username.trim()) {
      setError("Please select a user.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await loginWithUser(username.trim(), password);
      if (result.success) {
        router.push(from);
        router.refresh();
      } else {
        setError(result.error || "Sign in failed.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)]">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 shadow-[var(--panel-shadow)]">
        <h1 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
          Sign in
        </h1>

        {/* Tabs */}
        <div className="mb-4 flex gap-4 border-b border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setActiveTab("signin")}
            className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
              activeTab === "signin"
                ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
              activeTab === "register"
                ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Register
          </button>
        </div>

        {activeTab === "signin" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative" ref={usernameInputRef}>
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-medium text-[var(--text-muted)]"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setShowUserModal(true)}
                onClick={() => setShowUserModal(true)}
                readOnly
                placeholder="Click to select user"
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] disabled:opacity-60"
              />
              {showUserModal && (
                <div
                  id="user-picker-modal"
                  className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] py-1 shadow-lg"
                >
                  {DEMO_USERS.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user.name)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    >
                      <span className="font-medium">{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-[var(--text-muted)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] disabled:opacity-60"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--emotion-1)]">{error}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[var(--accent-primary)] px-3 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        {activeTab === "register" && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
            <p>Registration is coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
