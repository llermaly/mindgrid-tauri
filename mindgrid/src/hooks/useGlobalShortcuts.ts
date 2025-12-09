/**
 * Hook for registering and managing global keyboard shortcuts
 * Uses Tauri's global-shortcut plugin
 */

import { useEffect, useCallback, useRef } from "react";
import { register, unregister, isRegistered } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow, Window, getAllWindows } from "@tauri-apps/api/window";
import { SHORTCUTS, type ShortcutHandler } from "../lib/shortcuts";

interface UseGlobalShortcutsOptions {
  onNewChat?: () => void;
  onToggleTransformer?: () => void;
  onRunAll?: () => void;
  onNextWindow?: () => void;
  onPrevWindow?: () => void;
  onFocusMain?: () => void;
  enabled?: boolean;
}

/**
 * Register global shortcuts that work even when the app is not focused
 */
export function useGlobalShortcuts(options: UseGlobalShortcutsOptions) {
  const {
    onNewChat,
    onToggleTransformer,
    onRunAll,
    onNextWindow,
    onPrevWindow,
    onFocusMain,
    enabled = true,
  } = options;

  const registeredShortcuts = useRef<Set<string>>(new Set());

  const registerShortcut = useCallback(
    async (accelerator: string, handler: ShortcutHandler) => {
      try {
        // Check if already registered
        const alreadyRegistered = await isRegistered(accelerator);
        if (alreadyRegistered) {
          // Unregister first if already registered
          await unregister(accelerator);
        }

        await register(accelerator, async (event) => {
          // Only trigger on key down, not key up
          if (event.state === "Pressed") {
            try {
              await handler();
            } catch (error) {
              console.error(`Error in shortcut handler for ${accelerator}:`, error);
            }
          }
        });

        registeredShortcuts.current.add(accelerator);
        console.log(`[Shortcuts] Registered: ${accelerator}`);
      } catch (error) {
        console.error(`[Shortcuts] Failed to register ${accelerator}:`, error);
      }
    },
    []
  );

  const unregisterAll = useCallback(async () => {
    for (const accelerator of registeredShortcuts.current) {
      try {
        await unregister(accelerator);
        console.log(`[Shortcuts] Unregistered: ${accelerator}`);
      } catch (error) {
        console.error(`[Shortcuts] Failed to unregister ${accelerator}:`, error);
      }
    }
    registeredShortcuts.current.clear();
  }, []);

  useEffect(() => {
    if (!enabled) {
      unregisterAll();
      return;
    }

    const setupShortcuts = async () => {
      // Register each shortcut with its handler
      if (onNewChat) {
        await registerShortcut(SHORTCUTS.NEW_CHAT, onNewChat);
      }

      if (onToggleTransformer) {
        await registerShortcut(SHORTCUTS.TOGGLE_TRANSFORMER, onToggleTransformer);
      }

      if (onRunAll) {
        await registerShortcut(SHORTCUTS.RUN_ALL, onRunAll);
      }

      if (onNextWindow) {
        await registerShortcut(SHORTCUTS.NEXT_WINDOW, onNextWindow);
      }

      if (onPrevWindow) {
        await registerShortcut(SHORTCUTS.PREV_WINDOW, onPrevWindow);
      }

      if (onFocusMain) {
        await registerShortcut(SHORTCUTS.FOCUS_MAIN, onFocusMain);
      }
    };

    setupShortcuts();

    // Cleanup on unmount
    return () => {
      unregisterAll();
    };
  }, [
    enabled,
    onNewChat,
    onToggleTransformer,
    onRunAll,
    onNextWindow,
    onPrevWindow,
    onFocusMain,
    registerShortcut,
    unregisterAll,
  ]);

  return {
    unregisterAll,
  };
}

/**
 * Focus the main MindGrid window
 */
export async function focusMainWindow(): Promise<void> {
  try {
    const mainWindow = new Window("main");
    await mainWindow.setFocus();
    await mainWindow.unminimize();
  } catch (error) {
    console.error("[Shortcuts] Failed to focus main window:", error);
  }
}

/**
 * Get all open MindGrid windows
 */
export async function getOpenWindows(): Promise<Window[]> {
  try {
    return getAllWindows();
  } catch (error) {
    console.error("[Shortcuts] Failed to get windows:", error);
    return [];
  }
}

/**
 * Cycle to the next window
 */
export async function cycleNextWindow(): Promise<void> {
  try {
    const windows = await getOpenWindows();
    if (windows.length <= 1) return;

    const currentWindow = getCurrentWindow();
    const currentLabel = currentWindow.label;

    const currentIndex = windows.findIndex((w) => w.label === currentLabel);
    const nextIndex = (currentIndex + 1) % windows.length;
    const nextWindow = windows[nextIndex];

    await nextWindow.setFocus();
    await nextWindow.unminimize();
  } catch (error) {
    console.error("[Shortcuts] Failed to cycle to next window:", error);
  }
}

/**
 * Cycle to the previous window
 */
export async function cyclePrevWindow(): Promise<void> {
  try {
    const windows = await getOpenWindows();
    if (windows.length <= 1) return;

    const currentWindow = getCurrentWindow();
    const currentLabel = currentWindow.label;

    const currentIndex = windows.findIndex((w) => w.label === currentLabel);
    const prevIndex = (currentIndex - 1 + windows.length) % windows.length;
    const prevWindow = windows[prevIndex];

    await prevWindow.setFocus();
    await prevWindow.unminimize();
  } catch (error) {
    console.error("[Shortcuts] Failed to cycle to previous window:", error);
  }
}
