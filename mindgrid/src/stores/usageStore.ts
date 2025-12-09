import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { parseUsageOutput, getCriticalUsage, type UsageData } from "../lib/usageParser";

// Codex types
export interface CodexUsageData {
  fiveHourLimit?: {
    percentLeft: number;
    resetTime: string;
  };
  weeklyLimit?: {
    percentLeft: number;
    resetTime: string;
  };
  rawOutput: string;
}

interface UsageStore {
  // Claude
  claudeUsageData: UsageData | null;
  claudeLoading: boolean;
  claudeError: string | null;

  // Codex
  codexUsageData: CodexUsageData | null;
  codexLoading: boolean;
  codexError: string | null;

  // Actions
  fetchClaudeUsage: () => Promise<void>;
  fetchCodexUsage: () => Promise<void>;
  fetchAll: () => Promise<void>;

  // Computed
  getClaudeCriticalUsage: () => { percentage: number; label: string; resetTime?: string } | null;
  getCodexCriticalUsage: () => { percentage: number; label: string; resetTime?: string } | null;
}

function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b/g, '')
    .replace(/\[\d+;\d+R/g, '')
    .replace(/\r/g, '');
}

function parseCodexOutput(output: string): CodexUsageData {
  const result: CodexUsageData = {
    rawOutput: output,
  };

  const clean = stripAnsi(output);

  const fiveHourMatch = clean.match(/5h\s*limit:.*?(\d+)%\s*left\s*\(resets\s+([^)]+)\)/i);
  if (fiveHourMatch) {
    result.fiveHourLimit = {
      percentLeft: parseInt(fiveHourMatch[1], 10),
      resetTime: fiveHourMatch[2].trim(),
    };
  }

  const weeklyMatch = clean.match(/Weekly\s*limit:.*?(\d+)%\s*left\s*\(resets\s+([^)]+)\)/i);
  if (weeklyMatch) {
    result.weeklyLimit = {
      percentLeft: parseInt(weeklyMatch[1], 10),
      resetTime: weeklyMatch[2].trim(),
    };
  }

  return result;
}

export const useUsageStore = create<UsageStore>((set, get) => ({
  // Claude state
  claudeUsageData: null,
  claudeLoading: false,
  claudeError: null,

  // Codex state
  codexUsageData: null,
  codexLoading: false,
  codexError: null,

  fetchClaudeUsage: async () => {
    set({ claudeLoading: true, claudeError: null });
    try {
      const rawOutput = await invoke<string>("get_claude_usage");
      const parsed = parseUsageOutput(rawOutput);
      set({ claudeUsageData: parsed, claudeLoading: false });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      set({ claudeError: errorMsg, claudeLoading: false });
    }
  },

  fetchCodexUsage: async () => {
    set({ codexLoading: true, codexError: null });
    try {
      const rawOutput = await invoke<string>("get_codex_usage");
      const parsed = parseCodexOutput(rawOutput);
      set({ codexUsageData: parsed, codexLoading: false });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      set({ codexError: errorMsg, codexLoading: false });
    }
  },

  fetchAll: async () => {
    const { fetchClaudeUsage, fetchCodexUsage } = get();
    await Promise.all([fetchClaudeUsage(), fetchCodexUsage()]);
  },

  getClaudeCriticalUsage: () => {
    const { claudeUsageData } = get();
    return claudeUsageData ? getCriticalUsage(claudeUsageData) : null;
  },

  getCodexCriticalUsage: () => {
    const { codexUsageData } = get();
    if (!codexUsageData) return null;

    // Prioritize session (5h) limit, convert "% left" to "% used"
    if (codexUsageData.fiveHourLimit) {
      return {
        percentage: 100 - codexUsageData.fiveHourLimit.percentLeft,
        label: 'Session',
        resetTime: codexUsageData.fiveHourLimit.resetTime,
      };
    }
    if (codexUsageData.weeklyLimit) {
      return {
        percentage: 100 - codexUsageData.weeklyLimit.percentLeft,
        label: 'Weekly',
        resetTime: codexUsageData.weeklyLimit.resetTime,
      };
    }
    return null;
  },
}));
