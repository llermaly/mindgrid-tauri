import { create } from "zustand";

export type DebugLogLevel = "info" | "warn" | "error" | "debug" | "pty" | "event";

export interface DebugLogEntry {
  id: number;
  timestamp: number;
  level: DebugLogLevel;
  source: string;
  message: string;
  data?: unknown;
}

interface DebugState {
  logs: DebugLogEntry[];
  isEnabled: boolean;
  maxLogs: number;
  filter: DebugLogLevel | "all";

  // Actions
  log: (level: DebugLogLevel, source: string, message: string, data?: unknown) => void;
  clear: () => void;
  setEnabled: (enabled: boolean) => void;
  setFilter: (filter: DebugLogLevel | "all") => void;
}

let logCounter = 0;

export const useDebugStore = create<DebugState>((set, get) => ({
  logs: [],
  isEnabled: true,
  maxLogs: 1000,
  filter: "all",

  log: (level, source, message, data) => {
    if (!get().isEnabled) return;

    const entry: DebugLogEntry = {
      id: ++logCounter,
      timestamp: Date.now(),
      level,
      source,
      message,
      data,
    };

    set((state) => {
      const newLogs = [...state.logs, entry];
      // Keep only last maxLogs entries
      if (newLogs.length > state.maxLogs) {
        return { logs: newLogs.slice(-state.maxLogs) };
      }
      return { logs: newLogs };
    });

    // Also log to console in dev
    const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    consoleMethod(`[${source}] ${message}`, data ?? "");
  },

  clear: () => set({ logs: [] }),

  setEnabled: (enabled) => set({ isEnabled: enabled }),

  setFilter: (filter) => set({ filter }),
}));

// Convenience functions
export const debug = {
  info: (source: string, message: string, data?: unknown) =>
    useDebugStore.getState().log("info", source, message, data),
  warn: (source: string, message: string, data?: unknown) =>
    useDebugStore.getState().log("warn", source, message, data),
  error: (source: string, message: string, data?: unknown) =>
    useDebugStore.getState().log("error", source, message, data),
  debug: (source: string, message: string, data?: unknown) =>
    useDebugStore.getState().log("debug", source, message, data),
  pty: (source: string, message: string, data?: unknown) =>
    useDebugStore.getState().log("pty", source, message, data),
  event: (source: string, message: string, data?: unknown) =>
    useDebugStore.getState().log("event", source, message, data),
};
