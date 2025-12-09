/**
 * Global keyboard shortcuts configuration for MindGrid
 * Uses Tauri's global-shortcut plugin for system-wide shortcuts
 */

export const SHORTCUTS = {
  // New chat/session
  NEW_CHAT: "CommandOrControl+N",

  // Toggle window transformer mode (combine/separate windows)
  TOGGLE_TRANSFORMER: "CommandOrControl+Shift+T",

  // Run all sessions in current project
  RUN_ALL: "CommandOrControl+Shift+R",

  // Quick switch between windows
  NEXT_WINDOW: "CommandOrControl+Tab",
  PREV_WINDOW: "CommandOrControl+Shift+Tab",

  // Focus main window
  FOCUS_MAIN: "CommandOrControl+1",
} as const;

export type ShortcutKey = keyof typeof SHORTCUTS;
export type ShortcutHandler = () => void | Promise<void>;

export interface ShortcutConfig {
  key: ShortcutKey;
  accelerator: string;
  description: string;
  handler: ShortcutHandler;
}

/**
 * Human-readable descriptions for shortcuts
 */
export const SHORTCUT_DESCRIPTIONS: Record<ShortcutKey, string> = {
  NEW_CHAT: "Create new session",
  TOGGLE_TRANSFORMER: "Toggle window transformer mode",
  RUN_ALL: "Run all sessions in project",
  NEXT_WINDOW: "Switch to next window",
  PREV_WINDOW: "Switch to previous window",
  FOCUS_MAIN: "Focus main window",
};

/**
 * Get display string for a shortcut (e.g., "Cmd+N" on Mac, "Ctrl+N" on Windows)
 */
export function getShortcutDisplay(key: ShortcutKey): string {
  const accelerator = SHORTCUTS[key];
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return accelerator
    .replace("CommandOrControl", isMac ? "Cmd" : "Ctrl")
    .replace("Shift", isMac ? "Shift" : "Shift")
    .replace("+", " + ");
}
