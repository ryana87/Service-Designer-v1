"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginDemo } from "./actions";

export default function DemoLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/projects";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await loginDemo(password);
      if (result.success) {
        const loginUrl = from && from !== "/login" ? `/login?from=${encodeURIComponent(from)}` : "/login";
        router.push(loginUrl);
        router.refresh();
      } else {
        setError(result.error || "Invalid password");
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
          Demo Access
        </h1>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Enter the password to access the SD4 demo.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            disabled={isSubmitting}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] disabled:opacity-60"
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[var(--accent-primary)] px-3 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
          >
            {isSubmitting ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
