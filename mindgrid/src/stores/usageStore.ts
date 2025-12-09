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

// Analytics types (from ccusage library)
export interface SessionAnalytics {
  session: string;
  project: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  costUSD: number;
  modelsUsed: string[];
  lastActivityDate: string;
}

export interface DailyAnalytics {
  date: string;
  totalTokens: number;
  totalCostUSD: number;
  models: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheCreateTokens: number;
    cacheReadTokens: number;
    costUSD: number;
  }>;
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

  // Analytics (from ccusage)
  sessionAnalytics: SessionAnalytics[] | null;
  dailyAnalytics: DailyAnalytics[] | null;
  analyticsLoading: boolean;
  analyticsError: string | null;

  // Actions
  fetchClaudeUsage: () => Promise<void>;
  fetchCodexUsage: () => Promise<void>;
  fetchAll: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;

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

  // Analytics state
  sessionAnalytics: null,
  dailyAnalytics: null,
  analyticsLoading: false,
  analyticsError: null,

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

  fetchAnalytics: async () => {
    set({ analyticsLoading: true, analyticsError: null });
    try {
      // Load raw JSONL data from Tauri
      const jsonlData = await invoke<string>("load_claude_usage_data");

      // Parse JSONL (each line is a JSON object)
      const lines = jsonlData.split('\n').filter(line => line.trim());
      const entries: any[] = [];

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          entries.push(entry);
        } catch {
          // Skip invalid JSON lines
        }
      }

      // Group by session and date
      const sessionMap = new Map<string, any>();
      const dailyMap = new Map<string, any>();

      for (const entry of entries) {
        // Session-level aggregation
        const sessionId = entry.sessionId || entry.session || 'unknown';
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            session: sessionId,
            project: entry.projectPath || entry.project || 'Unknown',
            inputTokens: 0,
            outputTokens: 0,
            cacheCreateTokens: 0,
            cacheReadTokens: 0,
            totalTokens: 0,
            costUSD: 0,
            modelsUsed: new Set<string>(),
            lastActivityDate: entry.timestamp || new Date().toISOString(),
          });
        }

        const session = sessionMap.get(sessionId)!;
        session.inputTokens += entry.input_tokens || entry.inputTokens || 0;
        session.outputTokens += entry.output_tokens || entry.outputTokens || 0;
        session.cacheCreateTokens += entry.cache_creation_tokens || entry.cacheCreationTokens || 0;
        session.cacheReadTokens += entry.cache_read_tokens || entry.cacheReadTokens || 0;
        session.totalTokens = session.inputTokens + session.outputTokens + session.cacheCreateTokens + session.cacheReadTokens;
        session.costUSD += entry.cost || entry.totalCost || 0;

        if (entry.model) {
          session.modelsUsed.add(entry.model);
        }

        if (entry.timestamp && entry.timestamp > session.lastActivityDate) {
          session.lastActivityDate = entry.timestamp;
        }

        // Daily aggregation
        const date = entry.timestamp ? new Date(entry.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            totalTokens: 0,
            totalCostUSD: 0,
            models: {} as Record<string, any>,
          });
        }

        const daily = dailyMap.get(date)!;
        const tokens = (entry.input_tokens || entry.inputTokens || 0) +
                      (entry.output_tokens || entry.outputTokens || 0) +
                      (entry.cache_creation_tokens || entry.cacheCreationTokens || 0) +
                      (entry.cache_read_tokens || entry.cacheReadTokens || 0);

        daily.totalTokens += tokens;
        daily.totalCostUSD += entry.cost || entry.totalCost || 0;

        if (entry.model) {
          if (!daily.models[entry.model]) {
            daily.models[entry.model] = {
              inputTokens: 0,
              outputTokens: 0,
              cacheCreateTokens: 0,
              cacheReadTokens: 0,
              costUSD: 0,
            };
          }
          const modelStats = daily.models[entry.model];
          modelStats.inputTokens += entry.input_tokens || entry.inputTokens || 0;
          modelStats.outputTokens += entry.output_tokens || entry.outputTokens || 0;
          modelStats.cacheCreateTokens += entry.cache_creation_tokens || entry.cacheCreationTokens || 0;
          modelStats.cacheReadTokens += entry.cache_read_tokens || entry.cacheReadTokens || 0;
          modelStats.costUSD += entry.cost || entry.totalCost || 0;
        }
      }

      // Convert to arrays and sort
      const sessions: SessionAnalytics[] = Array.from(sessionMap.values()).map(s => ({
        ...s,
        modelsUsed: Array.from(s.modelsUsed),
      }));

      const daily: DailyAnalytics[] = Array.from(dailyMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      set({
        sessionAnalytics: sessions,
        dailyAnalytics: daily,
        analyticsLoading: false,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Analytics] Failed to load analytics:', err);
      set({
        analyticsError: errorMsg,
        analyticsLoading: false,
        sessionAnalytics: null,
        dailyAnalytics: null,
      });
    }
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
