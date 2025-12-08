import { invoke } from "@tauri-apps/api/core";

// Cache the dev mode status to avoid repeated calls
let devModeCache: boolean | null = null;

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
