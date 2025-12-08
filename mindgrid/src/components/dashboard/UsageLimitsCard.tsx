import { useState } from "react";
import { useClaudeUsage } from "../../hooks/useClaudeUsage";
import { useCodexUsage } from "../../hooks/useCodexUsage";

export function UsageLimitsCard() {
  const { usageData: claudeData, error: claudeError, isLoading: claudeLoading, refresh: refreshClaude } = useClaudeUsage();
  const { usageData: codexData, error: codexError, isLoading: codexLoading, refresh: refreshCodex } = useCodexUsage();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshClaude(), refreshCodex()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = claudeLoading || codexLoading;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="text-sm font-medium text-white">Usage Limits</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="px-2 py-1 text-xs rounded border border-neutral-700 hover:border-neutral-600 text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          title="Refresh usage data"
        >
          <svg
            className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
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
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Claude Limits */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 group relative">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-xs font-medium text-neutral-300 cursor-help">Claude</span>
            {claudeData?.rawOutput && (
              <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-neutral-800 border border-neutral-700 rounded p-2 max-w-md max-h-64 overflow-auto shadow-lg">
                <pre className="text-[10px] text-neutral-400 whitespace-pre-wrap font-mono">{claudeData.rawOutput}</pre>
              </div>
            )}
          </div>

          {claudeError ? (
            <div className="text-xs text-neutral-500 pl-4">
              {claudeError.includes('command not found') ? 'Claude CLI not found' : `Error: ${claudeError}`}
            </div>
          ) : !claudeData ? (
            <div className="text-xs text-neutral-500 pl-4 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="space-y-3 pl-4">
              {!claudeData.currentSession && !claudeData.currentWeekAll && !claudeData.currentWeekSonnet && !claudeData.extraUsage && (
                <div className="text-xs text-neutral-500">No usage data available (hover Claude label to see raw output)</div>
              )}

              {claudeData.currentSession && (
                <UsageLimitBar
                  label="Session (5h)"
                  percentage={claudeData.currentSession.percentage}
                  resetTime={claudeData.currentSession.resetTime}
                />
              )}

              {claudeData.currentWeekAll && (
                <UsageLimitBar
                  label="Weekly (All Models)"
                  percentage={claudeData.currentWeekAll.percentage}
                  resetTime={claudeData.currentWeekAll.resetTime}
                />
              )}

              {claudeData.currentWeekSonnet && (
                <UsageLimitBar
                  label="Weekly (Sonnet)"
                  percentage={claudeData.currentWeekSonnet.percentage}
                  resetTime={claudeData.currentWeekSonnet.resetTime}
                />
              )}

              {claudeData.extraUsage && (
                <div className="space-y-1.5 pt-2 border-t border-neutral-700/50">
                  <UsageLimitBar
                    label="Extra Usage"
                    percentage={claudeData.extraUsage.percentage}
                    resetTime={claudeData.extraUsage.resetTime}
                  />
                  {claudeData.extraUsage.spent !== undefined && claudeData.extraUsage.limit !== undefined && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">Spent</span>
                      <span className={`font-semibold ${claudeData.extraUsage.spent > claudeData.extraUsage.limit ? 'text-red-400' : 'text-neutral-200'}`}>
                        ${claudeData.extraUsage.spent.toFixed(2)} / ${claudeData.extraUsage.limit.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Codex Limits */}
        <div className="space-y-2 pt-3 border-t border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-neutral-300">Codex</span>
          </div>

          {codexError ? (
            <div className="text-xs text-neutral-500 pl-4">
              <details className="cursor-pointer">
                <summary className="hover:text-neutral-300">
                  {codexError.includes('command not found') ? 'Codex CLI not found' : 'Error (click to expand)'}
                </summary>
                <pre className="mt-2 text-[10px] text-neutral-400 whitespace-pre-wrap font-mono bg-neutral-800 border border-neutral-700 rounded p-2 max-w-md max-h-64 overflow-auto">{codexError}</pre>
              </details>
            </div>
          ) : !codexData ? (
            <div className="text-xs text-neutral-500 pl-4 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="space-y-3 pl-4">
              {!codexData.fiveHourLimit && !codexData.weeklyLimit && (
                <div className="text-xs text-neutral-500">
                  <details className="cursor-pointer">
                    <summary className="hover:text-neutral-300">No usage data available (click for raw output)</summary>
                    <pre className="mt-2 text-[10px] text-neutral-400 whitespace-pre-wrap font-mono bg-neutral-800 border border-neutral-700 rounded p-2 max-w-md max-h-64 overflow-auto">{codexData.rawOutput}</pre>
                  </details>
                </div>
              )}

              {codexData.fiveHourLimit && (
                <UsageLimitBar
                  label="Session (5h)"
                  percentage={100 - codexData.fiveHourLimit.percentLeft}
                  resetTime={codexData.fiveHourLimit.resetTime}
                />
              )}

              {codexData.weeklyLimit && (
                <UsageLimitBar
                  label="Weekly"
                  percentage={100 - codexData.weeklyLimit.percentLeft}
                  resetTime={codexData.weeklyLimit.resetTime}
                />
              )}

              {(codexData.fiveHourLimit || codexData.weeklyLimit) && (
                <details className="cursor-pointer text-xs text-neutral-500">
                  <summary className="hover:text-neutral-300">Raw output</summary>
                  <pre className="mt-2 text-[10px] text-neutral-400 whitespace-pre-wrap font-mono bg-neutral-800 border border-neutral-700 rounded p-2 max-w-md max-h-64 overflow-auto">{codexData.rawOutput}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
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
    if (pct >= 90) return { bar: 'bg-red-500', text: 'text-red-400' };
    if (pct >= 70) return { bar: 'bg-orange-500', text: 'text-orange-400' };
    if (pct >= 50) return { bar: 'bg-yellow-500', text: 'text-yellow-400' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-400' };
  };

  const colors = getColors(displayPercentage);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-200">{label}</span>
        <span className={`text-xs font-bold ${colors.text}`}>
          {displayPercentage}%
        </span>
      </div>
      <div className="w-full h-2 bg-neutral-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      {resetTime && (
        <div className="text-[11px] text-neutral-400">
          Resets {resetTime}
        </div>
      )}
    </div>
  );
}
