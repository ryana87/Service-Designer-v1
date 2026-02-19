/**
 * Swappable Icon Component
 * 
 * Currently uses Google Material Symbols Outlined.
 * To switch icon systems later, update the ICON_MAP and rendering logic
 * without changing any consuming components.
 */

// Icon name mapping - maps semantic names to Material Symbols names
const ICON_MAP: Record<string, string> = {
  // Navigation
  home: "home",
  folder: "folder",
  settings: "settings",
  help: "help_outline",
  logout: "logout",
  
  // Actions
  add: "add",
  edit: "edit",
  delete: "delete",
  close: "close",
  check: "check",
  search: "search",
  download: "download",
  remove: "remove",
  undo: "undo",
  redo: "redo",
  share: "share",
  
  // Arrows / Direction
  arrowLeft: "arrow_back",
  arrowRight: "arrow_forward",
  chevronLeft: "chevron_left",
  chevronRight: "chevron_right",
  chevronDown: "expand_more",
  chevronUp: "expand_less",
  
  // Content
  journeyMap: "route",
  blueprint: "architecture",
  persona: "person",
  quote: "format_quote",
  
  // Status / Info
  info: "info",
  warning: "warning",
  error: "error",
  success: "check_circle",
  check_circle: "check_circle",
  lightbulb: "lightbulb",
  arrow_forward: "arrow_forward",
  
  // AI / Assistant
  ai: "auto_awesome",
  send: "send",
  
  // Misc
  more: "more_horiz",
  drag: "drag_indicator",
  dragHandle: "drag_handle",
  duplicate: "content_copy",
  upload: "upload",
  image: "image",
  
  // Flow markers
  start: "play_arrow",
  stop: "stop",
  play: "play_arrow",
  grid_view: "grid_view",
  decision: "call_split", // Decision/branching point
  article: "article",
  
  // Compare / Lock
  compare: "compare_arrows",
  lock: "lock",
  lock_open: "lock_open",

  // Select mode
  select_all: "select_all",
  check_box: "check_box",
  check_box_outline_blank: "check_box_outline_blank",
};

type IconName = keyof typeof ICON_MAP;

type IconProps = {
  name: IconName;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

export function AppIcon({ name, size = "md", className = "" }: IconProps) {
  const materialName = ICON_MAP[name] || name;
  
  const sizeClass = {
    xs: "icon-xs",
    sm: "icon-sm",
    md: "",
    lg: "icon-lg",
  }[size];

  return (
    <span
      className={`material-symbols-outlined ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      {materialName}
    </span>
  );
}

// Export icon names for type safety
export type { IconName };
export { ICON_MAP };
