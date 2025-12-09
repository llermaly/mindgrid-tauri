/**
 * Window Transformer Store
 * Manages the state for combining/separating multiple windows into tabbed groups
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";

export interface WindowInfo {
  label: string;
  title: string;
  sessionId?: string;
  type: "workspace" | "chat" | "terminal" | "run" | "main";
}

export interface WindowGroup {
  id: string;
  name: string;
  windows: WindowInfo[];
  activeWindowLabel: string;
  createdAt: number;
}

interface TransformerState {
  // Whether transformer mode is currently active
  isTransformerMode: boolean;

  // Groups of combined windows
  windowGroups: Record<string, WindowGroup>;

  // Windows that are currently being dragged for combining
  pendingCombine: string[];

  // Actions
  toggleTransformerMode: () => void;
  setTransformerMode: (active: boolean) => void;

  // Create a new group from multiple windows
  createGroup: (windowLabels: string[], name?: string) => Promise<string>;

  // Add a window to an existing group
  addToGroup: (groupId: string, windowLabel: string) => void;

  // Remove a window from a group (separate it)
  removeFromGroup: (groupId: string, windowLabel: string) => Promise<void>;

  // Separate all windows in a group
  separateGroup: (groupId: string) => Promise<void>;

  // Delete a group entirely
  deleteGroup: (groupId: string) => void;

  // Set the active tab in a group
  setActiveWindow: (groupId: string, windowLabel: string) => void;

  // Pending combine operations
  addToPendingCombine: (windowLabel: string) => void;
  removeFromPendingCombine: (windowLabel: string) => void;
  clearPendingCombine: () => void;
  executePendingCombine: () => Promise<string | null>;

  // Get window info from all open windows
  refreshWindowList: () => Promise<WindowInfo[]>;
}

/**
 * Parse window label to determine type and extract session ID
 */
function parseWindowLabel(label: string): WindowInfo {
  let type: WindowInfo["type"] = "main";
  let sessionId: string | undefined;

  if (label === "main") {
    type = "main";
  } else if (label.startsWith("workspace-")) {
    type = "workspace";
    sessionId = label.replace("workspace-", "");
  } else if (label.startsWith("chat-")) {
    type = "chat";
    sessionId = label.replace("chat-", "");
  } else if (label.startsWith("run-")) {
    type = "run";
    sessionId = label.replace("run-", "");
  } else if (label.includes("terminal")) {
    type = "terminal";
  }

  return {
    label,
    title: label,
    type,
    sessionId,
  };
}

export const useTransformerStore = create<TransformerState>()(
  persist(
    (set, get) => ({
      isTransformerMode: false,
      windowGroups: {},
      pendingCombine: [],

      toggleTransformerMode: () => {
        set((state) => ({ isTransformerMode: !state.isTransformerMode }));
      },

      setTransformerMode: (active) => {
        set({ isTransformerMode: active });
      },

      createGroup: async (windowLabels, name) => {
        const groupId = `group-${Date.now()}`;
        const windows: WindowInfo[] = [];

        for (const label of windowLabels) {
          try {
            const win = new WebviewWindow(label);
            const title = await win.title();
            const info = parseWindowLabel(label);
            info.title = title;
            windows.push(info);
          } catch (error) {
            console.error(`[Transformer] Failed to get info for window ${label}:`, error);
          }
        }

        if (windows.length < 2) {
          console.warn("[Transformer] Need at least 2 windows to create a group");
          return "";
        }

        const group: WindowGroup = {
          id: groupId,
          name: name || `Group ${Object.keys(get().windowGroups).length + 1}`,
          windows,
          activeWindowLabel: windows[0].label,
          createdAt: Date.now(),
        };

        set((state) => ({
          windowGroups: { ...state.windowGroups, [groupId]: group },
          pendingCombine: [],
        }));

        console.log(`[Transformer] Created group ${groupId} with ${windows.length} windows`);
        return groupId;
      },

      addToGroup: (groupId, windowLabel) => {
        set((state) => {
          const group = state.windowGroups[groupId];
          if (!group) return state;

          // Check if window is already in the group
          if (group.windows.some((w) => w.label === windowLabel)) {
            return state;
          }

          const info = parseWindowLabel(windowLabel);
          return {
            windowGroups: {
              ...state.windowGroups,
              [groupId]: {
                ...group,
                windows: [...group.windows, info],
              },
            },
          };
        });
      },

      removeFromGroup: async (groupId, windowLabel) => {
        const state = get();
        const group = state.windowGroups[groupId];
        if (!group) return;

        const remainingWindows = group.windows.filter((w) => w.label !== windowLabel);

        // If only one or zero windows remain, delete the group
        if (remainingWindows.length < 2) {
          set((state) => {
            const { [groupId]: _, ...rest } = state.windowGroups;
            return { windowGroups: rest };
          });
        } else {
          // Update the group with remaining windows
          const newActiveLabel =
            group.activeWindowLabel === windowLabel
              ? remainingWindows[0].label
              : group.activeWindowLabel;

          set((state) => ({
            windowGroups: {
              ...state.windowGroups,
              [groupId]: {
                ...group,
                windows: remainingWindows,
                activeWindowLabel: newActiveLabel,
              },
            },
          }));
        }

        // Show the separated window
        try {
          const win = new WebviewWindow(windowLabel);
          await win.show();
          await win.setFocus();
        } catch (error) {
          console.error(`[Transformer] Failed to show separated window:`, error);
        }
      },

      separateGroup: async (groupId) => {
        const state = get();
        const group = state.windowGroups[groupId];
        if (!group) return;

        // Show all windows in the group
        for (const windowInfo of group.windows) {
          try {
            const win = new WebviewWindow(windowInfo.label);
            await win.show();
          } catch (error) {
            console.error(`[Transformer] Failed to show window ${windowInfo.label}:`, error);
          }
        }

        // Delete the group
        set((state) => {
          const { [groupId]: _, ...rest } = state.windowGroups;
          return { windowGroups: rest };
        });
      },

      deleteGroup: (groupId) => {
        set((state) => {
          const { [groupId]: _, ...rest } = state.windowGroups;
          return { windowGroups: rest };
        });
      },

      setActiveWindow: (groupId, windowLabel) => {
        set((state) => {
          const group = state.windowGroups[groupId];
          if (!group) return state;

          return {
            windowGroups: {
              ...state.windowGroups,
              [groupId]: {
                ...group,
                activeWindowLabel: windowLabel,
              },
            },
          };
        });
      },

      addToPendingCombine: (windowLabel) => {
        set((state) => {
          if (state.pendingCombine.includes(windowLabel)) {
            return state;
          }
          return { pendingCombine: [...state.pendingCombine, windowLabel] };
        });
      },

      removeFromPendingCombine: (windowLabel) => {
        set((state) => ({
          pendingCombine: state.pendingCombine.filter((l) => l !== windowLabel),
        }));
      },

      clearPendingCombine: () => {
        set({ pendingCombine: [] });
      },

      executePendingCombine: async () => {
        const state = get();
        if (state.pendingCombine.length < 2) {
          return null;
        }

        const groupId = await get().createGroup(state.pendingCombine);
        return groupId;
      },

      refreshWindowList: async () => {
        try {
          const windows = await getAllWebviewWindows();
          return windows.map((win) => {
            const info = parseWindowLabel(win.label);
            return info;
          });
        } catch (error) {
          console.error("[Transformer] Failed to refresh window list:", error);
          return [];
        }
      },
    }),
    {
      name: "mindgrid-transformer-store",
      partialize: (state) => ({
        windowGroups: state.windowGroups,
      }),
    }
  )
);
