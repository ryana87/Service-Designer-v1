// ============================================
// SHARED TYPES AND DEFAULT OPTIONS
// ============================================

export type SelectOption = {
  value: string;
  label: string;
  icon: string;
  isCustom?: boolean;
};

export const DEFAULT_CHANNEL_OPTIONS: SelectOption[] = [
  { value: "", label: "—", icon: "remove" },
  { value: "Web", label: "Web", icon: "language" },
  { value: "Mobile App", label: "Mobile App", icon: "smartphone" },
  { value: "Email", label: "Email", icon: "mail" },
  { value: "Phone", label: "Phone", icon: "call" },
  { value: "In-Person", label: "In-Person", icon: "person" },
  { value: "Chat", label: "Chat", icon: "chat" },
  { value: "Social Media", label: "Social Media", icon: "share" },
  { value: "SMS", label: "SMS", icon: "sms" },
];

export const DEFAULT_TOUCHPOINT_OPTIONS: SelectOption[] = [
  { value: "", label: "—", icon: "remove" },
  { value: "Homepage", label: "Homepage", icon: "home" },
  { value: "Checkout", label: "Checkout", icon: "shopping_cart" },
  { value: "Support", label: "Support", icon: "support_agent" },
  { value: "Onboarding", label: "Onboarding", icon: "start" },
  { value: "Dashboard", label: "Dashboard", icon: "dashboard" },
  { value: "Notification", label: "Notification", icon: "notifications" },
  { value: "Form", label: "Form", icon: "edit_note" },
  { value: "Search", label: "Search", icon: "search" },
  { value: "Profile", label: "Profile", icon: "account_circle" },
];
