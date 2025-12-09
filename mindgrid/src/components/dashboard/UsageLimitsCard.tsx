import { useState, useEffect } from "react";
import { useUsageStore } from "../../stores/usageStore";

const USAGE_LIMITS_VISIBLE_KEY = "mindgrid_usage_limits_visible";

export function UsageLimitsCard() {
  const [isVisible, setIsVisible] = useState(() => {
    const stored = localStorage.getItem(USAGE_LIMITS_VISIBLE_KEY);
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(USAGE_LIMITS_VISIBLE_KEY, String(isVisible));
  }, [isVisible]);
  const {
    claudeUsageData,
    claudeLoading,
    claudeError,
    codexUsageData,
    codexLoading,
    codexError,
    fetchClaudeUsage,
    fetchCodexUsage,
  } = useUsageStore();

  const [isRefreshingClaude, setIsRefreshingClaude] = useState(false);
  const [isRefreshingCodex, setIsRefreshingCodex] = useState(false);

  const handleRefreshClaude = async () => {
    setIsRefreshingClaude(true);
    try {
      await fetchClaudeUsage();
    } finally {
      setIsRefreshingClaude(false);
    }
  };

  const handleRefreshCodex = async () => {
    setIsRefreshingCodex(true);
    try {
      await fetchCodexUsage();
    } finally {
      setIsRefreshingCodex(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Usage Limits</h3>
        </div>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          title={isVisible ? "Hide usage limits" : "Show usage limits"}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isVisible ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isVisible && <div className="space-y-4">
        {/* Claude Limits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 group relative">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs font-medium text-[var(--text-secondary)] cursor-help">Claude</span>
              {claudeUsageData?.rawOutput && (
                <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-2 max-w-md max-h-64 overflow-auto shadow-lg">
                  <pre className="text-[10px] text-[var(--text-tertiary)] whitespace-pre-wrap font-mono">{claudeUsageData.rawOutput}</pre>
                </div>
              )}
            </div>
            <button
              onClick={handleRefreshClaude}
              disabled={isRefreshingClaude || claudeLoading}
              className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh Claude usage"
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshingClaude || claudeLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {claudeLoading && !claudeUsageData ? (
            <div className="text-xs text-[var(--text-tertiary)] pl-4 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[var(--border-default)] border-t-[var(--text-tertiary)] rounded-full animate-spin" />
              Loading...
            </div>
          ) : claudeError ? (
            <div className="text-xs text-[var(--text-tertiary)] pl-4">
              {claudeError.includes('command not found') ? 'Claude CLI not found' : `Error: ${claudeError}`}
            </div>
          ) : !claudeUsageData ? (
            <div className="text-xs text-[var(--text-tertiary)] pl-4">No data</div>
          ) : (
            <div className="space-y-3 pl-4">
              {!claudeUsageData.currentSession && !claudeUsageData.currentWeekAll && !claudeUsageData.currentWeekSonnet && !claudeUsageData.extraUsage && (
                <div className="text-xs text-[var(--text-tertiary)]">No usage data available (hover Claude label to see raw output)</div>
              )}

              {claudeUsageData.currentSession && (
                <UsageLimitBar
                  label="Session (5h)"
                  percentage={claudeUsageData.currentSession.percentage}
                  resetTime={claudeUsageData.currentSession.resetTime}
                />
              )}

              {claudeUsageData.currentWeekAll && (
                <UsageLimitBar
                  label="Weekly (All Models)"
                  percentage={claudeUsageData.currentWeekAll.percentage}
                  resetTime={claudeUsageData.currentWeekAll.resetTime}
                />
              )}

              {claudeUsageData.currentWeekSonnet && (
                <UsageLimitBar
                  label="Weekly (Sonnet)"
                  percentage={claudeUsageData.currentWeekSonnet.percentage}
                  resetTime={claudeUsageData.currentWeekSonnet.resetTime}
                />
              )}

              {claudeUsageData.extraUsage && (
                <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <UsageLimitBar
                    label="Extra Usage"
                    percentage={claudeUsageData.extraUsage.percentage}
                    resetTime={claudeUsageData.extraUsage.resetTime}
                  />
                  {claudeUsageData.extraUsage.spent !== undefined && claudeUsageData.extraUsage.limit !== undefined && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-tertiary)]">Spent</span>
                      <span className={`font-semibold ${claudeUsageData.extraUsage.spent > claudeUsageData.extraUsage.limit ? 'text-[var(--accent-error)]' : 'text-[var(--text-primary)]'}`}>
                        ${claudeUsageData.extraUsage.spent.toFixed(2)} / ${claudeUsageData.extraUsage.limit.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Codex Limits */}
        <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-success)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">Codex</span>
            </div>
            <button
              onClick={handleRefreshCodex}
              disabled={isRefreshingCodex || codexLoading}
              className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh Codex usage"
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshingCodex || codexLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {codexLoading && !codexUsageData ? (
            <div className="text-xs text-[var(--text-tertiary)] pl-4 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[var(--border-default)] border-t-[var(--text-tertiary)] rounded-full animate-spin" />
              Loading...
            </div>
          ) : codexError ? (
            <div className="text-xs text-[var(--text-tertiary)] pl-4">
              <details className="cursor-pointer">
                <summary className="hover:text-[var(--text-secondary)]">
                  {codexError.includes('command not found') ? 'Codex CLI not found' : 'Error (click to expand)'}
                </summary>
                <pre className="mt-2 text-[10px] text-[var(--text-tertiary)] whitespace-pre-wrap font-mono bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-2 max-w-md max-h-64 overflow-auto">{codexError}</pre>
              </details>
            </div>
          ) : !codexUsageData ? (
            <div className="text-xs text-[var(--text-tertiary)] pl-4">No data</div>
          ) : (
            <div className="space-y-3 pl-4">
              {!codexUsageData.fiveHourLimit && !codexUsageData.weeklyLimit && (
                <div className="text-xs text-[var(--text-tertiary)]">
                  <details className="cursor-pointer">
                    <summary className="hover:text-[var(--text-secondary)]">No usage data available (click for raw output)</summary>
                    <pre className="mt-2 text-[10px] text-[var(--text-tertiary)] whitespace-pre-wrap font-mono bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-2 max-w-md max-h-64 overflow-auto">{codexUsageData.rawOutput}</pre>
                  </details>
                </div>
              )}

              {codexUsageData.fiveHourLimit && (
                <UsageLimitBar
                  label="Session (5h)"
                  percentage={100 - codexUsageData.fiveHourLimit.percentLeft}
                  resetTime={codexUsageData.fiveHourLimit.resetTime}
                />
              )}

              {codexUsageData.weeklyLimit && (
                <UsageLimitBar
                  label="Weekly"
                  percentage={100 - codexUsageData.weeklyLimit.percentLeft}
                  resetTime={codexUsageData.weeklyLimit.resetTime}
                />
              )}

              {(codexUsageData.fiveHourLimit || codexUsageData.weeklyLimit) && (
                <details className="cursor-pointer text-xs text-[var(--text-tertiary)]">
                  <summary className="hover:text-[var(--text-secondary)]">Raw output</summary>
                  <pre className="mt-2 text-[10px] text-[var(--text-tertiary)] whitespace-pre-wrap font-mono bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-2 max-w-md max-h-64 overflow-auto">{codexUsageData.rawOutput}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}

interface UsageLimitBarProps {
  label: string;
  percentage: number;
  resetTime: string;
}

function UsageLimitBar({ label, percentage, resetTime }: UsageLimitBarProps) {
  const displayPercentage = Math.min(100, Math.max(0, percentage));

  const getColors = (pct: number) => {
    if (pct >= 90) return { bar: 'bg-[var(--accent-error)]', text: 'text-[var(--accent-error)]' };
    if (pct >= 70) return { bar: 'bg-[var(--accent-warning)]', text: 'text-[var(--accent-warning)]' };
    if (pct >= 50) return { bar: 'bg-yellow-500', text: 'text-yellow-400' };
    return { bar: 'bg-[var(--accent-success)]', text: 'text-[var(--accent-success)]' };
  };

  const colors = getColors(displayPercentage);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
        <span className={`text-xs font-bold ${colors.text}`}>
          {displayPercentage}%
        </span>
      </div>
      <div className="w-full h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      {resetTime && (
        <div className="text-[11px] text-[var(--text-tertiary)]">
          Resets {resetTime}
        </div>
      )}
    </div>
  );
}
