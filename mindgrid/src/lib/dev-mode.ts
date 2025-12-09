import { invoke } from "@tauri-apps/api/core";

// Cache the dev mode status to avoid repeated calls
let devModeCache: boolean | null = null;
let worktreeInfoCache: string | null | undefined = undefined;

/**
 * Check if the application is running in developer mode.
 * Developer mode uses isolated data storage and ports so you can
 * develop the application using the application itself.
 */
export async function isDevMode(): Promise<boolean> {
  if (devModeCache !== null) {
    return devModeCache;
  }

  try {
    devModeCache = await invoke<boolean>("is_dev_mode");
    return devModeCache;
  } catch (err) {
    console.warn("Failed to check dev mode:", err);
    return false;
  }
}

/**
 * Get the store filename based on dev mode.
 * - Production: mindgrid-data.json
 * - Dev mode: mindgrid-dev-data.json
 */
export async function getStoreFilename(): Promise<string> {
  const isDev = await isDevMode();
  return isDev ? "mindgrid-dev-data.json" : "mindgrid-data.json";
}

/**
 * Get the database URI based on dev mode.
 * - Production: sqlite:mindgrid.db
 * - Dev mode: sqlite:mindgrid-dev.db
 */
export async function getDatabaseUri(): Promise<string> {
  const isDev = await isDevMode();
  return isDev ? "sqlite:mindgrid-dev.db" : "sqlite:mindgrid.db";
}

/**
 * Synchronous check for dev mode (only works after initial async check).
 * Returns false if dev mode hasn't been checked yet.
 */
export function isDevModeSync(): boolean {
  return devModeCache ?? false;
}

/**
 * Get worktree info if running from a git worktree.
 * Returns null if running from main repo, worktree name if running from a worktree.
 */
export async function getWorktreeInfo(): Promise<string | null> {
  if (worktreeInfoCache !== undefined) {
    return worktreeInfoCache;
  }

  try {
    worktreeInfoCache = await invoke<string | null>("get_worktree_info");
    return worktreeInfoCache;
  } catch (err) {
    console.warn("Failed to get worktree info:", err);
    worktreeInfoCache = null;
    return null;
  }
}

/**
 * Synchronous check for worktree info (only works after initial async check).
 * Returns null if not checked yet or not in a worktree.
 */
export function getWorktreeInfoSync(): string | null {
  return worktreeInfoCache ?? null;
}
