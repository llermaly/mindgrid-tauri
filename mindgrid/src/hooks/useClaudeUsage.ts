import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { parseUsageOutput, getCriticalUsage, type UsageData } from "../lib/usageParser";

interface UseClaudeUsageResult {
  usageData: UsageData | null;
  criticalUsage: { percentage: number; label: string; resetTime?: string } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and parse Claude usage data
 * Caches the result for 30 seconds to avoid too many calls
 * Note: Usage limits are account-wide, not per conversation
 */
export function useClaudeUsage(): UseClaudeUsageResult {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const CACHE_DURATION = 30 * 1000; // 30 seconds

  const fetchUsage = useCallback(async (force = false) => {
    const now = Date.now();

    // Use cached data if available and not expired
    if (!force && usageData && (now - lastFetchRef.current) < CACHE_DURATION) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rawOutput = await invoke<string>("get_claude_usage");
      console.log("[useClaudeUsage] Raw output:", rawOutput);
      const parsed = parseUsageOutput(rawOutput);
      console.log("[useClaudeUsage] Parsed data:", parsed);
      setUsageData(parsed);
      lastFetchRef.current = now;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      console.error("[useClaudeUsage] Failed to fetch:", err);
    } finally {
      setIsLoading(false);
    }
  }, [usageData, CACHE_DURATION]);

  // Fetch on mount and auto-refresh every 30 seconds
  useEffect(() => {
    fetchUsage();

    const intervalId = setInterval(() => {
      fetchUsage(true);
    }, CACHE_DURATION);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate critical usage (highest percentage)
  const criticalUsage = usageData ? getCriticalUsage(usageData) : null;

  return {
    usageData,
    criticalUsage,
    isLoading,
    error,
    refresh: () => fetchUsage(true),
  };
}
