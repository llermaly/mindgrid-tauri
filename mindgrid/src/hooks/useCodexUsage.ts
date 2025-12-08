import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

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

interface UseCodexUsageResult {
  usageData: CodexUsageData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Strip ANSI escape codes from text
 */
function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b/g, '')
    .replace(/\[\d+;\d+R/g, '') // cursor position responses
    .replace(/\r/g, '');
}

/**
 * Parse Codex /status output to extract usage limits
 */
function parseCodexOutput(output: string): CodexUsageData {
  const result: CodexUsageData = {
    rawOutput: output,
  };

  const clean = stripAnsi(output);

  // Parse: 5h limit: [███████████████████░] 94% left (resets 17:28)
  const fiveHourMatch = clean.match(/5h\s*limit:.*?(\d+)%\s*left\s*\(resets\s+([^)]+)\)/i);
  if (fiveHourMatch) {
    result.fiveHourLimit = {
      percentLeft: parseInt(fiveHourMatch[1], 10),
      resetTime: fiveHourMatch[2].trim(),
    };
  }

  // Parse: Weekly limit: [██████████░░░░░░░░░░] 51% left (resets 19:42 on 14 Dec)
  const weeklyMatch = clean.match(/Weekly\s*limit:.*?(\d+)%\s*left\s*\(resets\s+([^)]+)\)/i);
  if (weeklyMatch) {
    result.weeklyLimit = {
      percentLeft: parseInt(weeklyMatch[1], 10),
      resetTime: weeklyMatch[2].trim(),
    };
  }

  return result;
}

export function useCodexUsage(): UseCodexUsageResult {
  const [usageData, setUsageData] = useState<CodexUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const CACHE_DURATION = 30 * 1000; // 30 seconds

  const fetchUsage = useCallback(async (force = false) => {
    const now = Date.now();

    if (!force && usageData && (now - lastFetchRef.current) < CACHE_DURATION) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rawOutput = await invoke<string>("get_codex_usage");
      const parsed = parseCodexOutput(rawOutput);
      setUsageData(parsed);
      lastFetchRef.current = now;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [usageData]);

  useEffect(() => {
    fetchUsage();

    const intervalId = setInterval(() => {
      fetchUsage(true);
    }, CACHE_DURATION);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    usageData,
    isLoading,
    error,
    refresh: () => fetchUsage(true),
  };
}
