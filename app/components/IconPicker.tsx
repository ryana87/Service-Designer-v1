"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

// ============================================
// MATERIAL SYMBOLS ICON LIST
// Curated list of commonly useful icons for teams
// ============================================

const ICON_CATEGORIES = {
  "People & Teams": [
    "group", "person", "groups", "diversity_3", "supervisor_account",
    "engineering", "support_agent", "manage_accounts", "badge", "contact_page",
    "face", "sentiment_satisfied", "psychology", "handshake", "volunteer_activism",
  ],
  "Business": [
    "business", "store", "storefront", "apartment", "corporate_fare",
    "domain", "work", "business_center", "cases", "inventory_2",
    "receipt_long", "request_quote", "payments", "account_balance", "savings",
  ],
  "Communication": [
    "chat", "forum", "mail", "call", "video_call",
    "campaign", "notifications", "announcement", "feedback", "rate_review",
    "comment", "sms", "contact_mail", "mark_email_read", "send",
  ],
  "Technology": [
    "computer", "devices", "phone_android", "tablet", "laptop",
    "cloud", "database", "storage", "memory", "developer_board",
    "code", "terminal", "api", "integration_instructions", "data_object",
  ],
  "Design & Creative": [
    "palette", "brush", "design_services", "draw", "edit",
    "format_paint", "auto_fix_high", "auto_awesome", "style", "texture",
    "gradient", "filter_vintage", "photo_camera", "videocam", "mic",
  ],
  "Analytics & Data": [
    "analytics", "insights", "trending_up", "bar_chart", "pie_chart",
    "show_chart", "timeline", "query_stats", "monitoring", "speed",
    "leaderboard", "equalizer", "stacked_line_chart", "area_chart", "ssid_chart",
  ],
  "Security & Admin": [
    "security", "shield", "admin_panel_settings", "lock", "key",
    "verified_user", "gpp_good", "policy", "privacy_tip", "fingerprint",
    "vpn_key", "password", "enhanced_encryption", "health_and_safety", "local_police",
  ],
  "Operations": [
    "settings", "build", "construction", "handyman", "precision_manufacturing",
    "factory", "warehouse", "local_shipping", "inventory", "package_2",
    "conveyor_belt", "forklift", "pallet", "trolley", "dolly_cart",
  ],
  "Finance": [
    "attach_money", "currency_exchange", "credit_card", "account_balance_wallet", "paid",
    "price_check", "sell", "shopping_cart", "point_of_sale", "receipt",
    "calculate", "percent", "money", "euro", "currency_pound",
  ],
  "Health & Wellness": [
    "health_and_safety", "medical_services", "local_hospital", "healing", "medication",
    "vaccines", "monitor_heart", "ecg_heart", "psychology_alt", "self_improvement",
    "spa", "fitness_center", "sports", "directions_run", "accessibility_new",
  ],
  "Education": [
    "school", "menu_book", "auto_stories", "library_books", "class",
    "quiz", "assignment", "grading", "history_edu", "science",
    "biotech", "architecture", "calculate", "functions", "abc",
  ],
  "Travel & Location": [
    "flight", "directions_car", "train", "directions_boat", "two_wheeler",
    "local_taxi", "airport_shuttle", "commute", "map", "explore",
    "place", "near_me", "my_location", "navigation", "route",
  ],
  "Nature & Environment": [
    "eco", "park", "forest", "grass", "yard",
    "water_drop", "air", "wb_sunny", "cloud", "thunderstorm",
    "pets", "cruelty_free", "bug_report", "compost", "recycling",
  ],
  "Actions": [
    "check_circle", "task_alt", "done_all", "verified", "thumb_up",
    "star", "favorite", "bookmark", "flag", "priority_high",
    "new_releases", "lightbulb", "tips_and_updates", "help", "info",
  ],
};

// Flatten all icons for search
const ALL_ICONS = Object.values(ICON_CATEGORIES).flat();

type IconPickerProps = {
  currentIcon: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
};

export function IconPicker({ currentIcon, onSelect, onClose }: IconPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      if (selectedCategory) {
        return ICON_CATEGORIES[selectedCategory as keyof typeof ICON_CATEGORIES] || [];
      }
      return ALL_ICONS;
    }
    
    const query = searchQuery.toLowerCase();
    return ALL_ICONS.filter((icon) =>
      icon.toLowerCase().includes(query) ||
      icon.replace(/_/g, " ").toLowerCase().includes(query)
    );
  }, [searchQuery, selectedCategory]);

  const categories = Object.keys(ICON_CATEGORIES);

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full z-[100] mt-1 w-[320px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
      style={{ maxHeight: "400px" }}
    >
      {/* Search header */}
      <div className="sticky top-0 z-10 border-b border-[var(--border-muted)] bg-[var(--bg-panel)] p-2">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1.5">
          <span className="material-symbols-outlined text-[var(--text-muted)]" style={{ fontSize: "16px" }}>
            search
          </span>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedCategory(null);
            }}
            placeholder="Search icons..."
            className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            style={{ fontSize: "12px" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs (when not searching) */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-1 border-b border-[var(--border-muted)] p-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded px-2 py-0.5 transition-colors ${
              !selectedCategory
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
            style={{ fontSize: "10px" }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded px-2 py-0.5 transition-colors ${
                selectedCategory === cat
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
              style={{ fontSize: "10px" }}
            >
              {cat.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Icon grid */}
      <div className="overflow-y-auto p-2" style={{ maxHeight: "280px" }}>
        {filteredIcons.length === 0 ? (
          <p className="py-4 text-center text-[var(--text-muted)]" style={{ fontSize: "12px" }}>
            No icons found
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filteredIcons.map((icon) => (
              <button
                key={icon}
                onClick={() => {
                  onSelect(icon);
                  onClose();
                }}
                className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                  icon === currentIcon
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)]"
                }`}
                title={icon.replace(/_/g, " ")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {icon}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current selection preview */}
      <div className="flex items-center justify-between border-t border-[var(--border-muted)] bg-[var(--bg-sidebar)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--accent-primary)]" style={{ fontSize: "20px" }}>
            {currentIcon}
          </span>
          <span className="text-[var(--text-secondary)]" style={{ fontSize: "11px" }}>
            {currentIcon.replace(/_/g, " ")}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded bg-[var(--bg-hover)] px-2 py-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-active)] hover:text-[var(--text-secondary)]"
          style={{ fontSize: "11px" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
