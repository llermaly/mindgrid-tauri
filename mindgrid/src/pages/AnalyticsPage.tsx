import { useEffect, useMemo } from "react";
import { useUsageStore } from "../stores/usageStore";

interface AnalyticsPageProps {
  onBack?: () => void;
}

export function AnalyticsPage({ onBack }: AnalyticsPageProps) {
  const {
    sessionAnalytics,
    dailyAnalytics,
    analyticsLoading,
    analyticsError,
    fetchAnalytics,
  } = useUsageStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Helper to calculate total tokens from session
  const getSessionTotalTokens = (s: typeof sessionAnalytics extends (infer T)[] | null ? T : never) =>
    s.inputTokens + s.outputTokens + s.cacheCreationTokens + s.cacheReadTokens;

  // Helper to calculate total tokens from daily
  const getDailyTotalTokens = (d: typeof dailyAnalytics extends (infer T)[] | null ? T : never) =>
    d.inputTokens + d.outputTokens + d.cacheCreationTokens + d.cacheReadTokens;

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!sessionAnalytics || !dailyAnalytics) return null;

    const totalSessions = sessionAnalytics.length;
    const totalCost = sessionAnalytics.reduce((sum, s) => sum + s.totalCost, 0);
    const totalTokens = sessionAnalytics.reduce((sum, s) => sum + getSessionTotalTokens(s), 0);

    // Last 7 days cost
    const last7Days = dailyAnalytics.slice(0, 7);
    const last7DaysCost = last7Days.reduce((sum, d) => sum + d.totalCost, 0);

    // Most expensive session
    const mostExpensive = [...sessionAnalytics].sort((a, b) => b.totalCost - a.totalCost)[0];

    return {
      totalSessions,
      totalCost,
      totalTokens,
      last7DaysCost,
      mostExpensive,
    };
  }, [sessionAnalytics, dailyAnalytics]);

  // Top 10 most expensive sessions
  const topExpensiveSessions = useMemo(() => {
    if (!sessionAnalytics) return [];
    return [...sessionAnalytics]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);
  }, [sessionAnalytics]);

  // Recent daily data (last 14 days)
  const recentDaily = useMemo(() => {
    if (!dailyAnalytics) return [];
    return dailyAnalytics.slice(0, 14);
  }, [dailyAnalytics]);

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              aria-label="Back to dashboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-white">Usage Analytics</span>
              <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Experimental
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Detailed usage metrics from Claude Code sessions</p>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={analyticsLoading}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 disabled:opacity-50"
        >
          {analyticsLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
        <div className="max-w-6xl mx-auto">
          {analyticsLoading && !sessionAnalytics ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-neutral-400">Loading analytics data...</p>
              </div>
            </div>
          ) : analyticsError ? (
            <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-400">Failed to load analytics</h3>
                  <p className="text-xs text-neutral-400 mt-1">{analyticsError}</p>
                  <p className="text-xs text-neutral-500 mt-2">
                    Make sure Claude Code is installed and has created usage logs at ~/.claude/projects/
                  </p>
                </div>
              </div>
            </div>
          ) : sessionAnalytics && dailyAnalytics && summary ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <SummaryCard
                  title="Total Sessions"
                  value={summary.totalSessions.toString()}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                />
                <SummaryCard
                  title="Total Cost"
                  value={`$${summary.totalCost.toFixed(2)}`}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                <SummaryCard
                  title="Total Tokens"
                  value={formatNumber(summary.totalTokens)}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  }
                />
                <SummaryCard
                  title="Last 7 Days"
                  value={`$${summary.last7DaysCost.toFixed(2)}`}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  }
                />
              </div>

              {/* Daily Usage Chart */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Daily Usage (Last 14 Days)</h2>
                <div className="space-y-2">
                  {recentDaily.map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-neutral-400 font-mono">{formatDate(day.date)}</div>
                      <div className="flex-1">
                        <div className="h-8 bg-neutral-800 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center px-2"
                            style={{
                              width: `${Math.min((day.totalCost / Math.max(...recentDaily.map(d => d.totalCost))) * 100, 100)}%`,
                            }}
                          >
                            <span className="text-xs text-white font-medium">${day.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-24 text-xs text-neutral-500 text-right font-mono">
                        {formatNumber(getDailyTotalTokens(day))} tokens
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Expensive Sessions */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Top 10 Most Expensive Sessions</h2>
                <div className="space-y-2">
                  {topExpensiveSessions.map((session, index) => (
                    <div
                      key={session.sessionId}
                      className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-300">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{session.projectPath}</div>
                        <div className="text-xs text-neutral-500 truncate">{session.sessionId}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-neutral-400">
                            {formatNumber(getSessionTotalTokens(session))} tokens
                          </span>
                          {session.modelsUsed.length > 0 && (
                            <span className="text-xs text-neutral-500">
                              {session.modelsUsed.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-400">${session.totalCost.toFixed(3)}</div>
                        <div className="text-xs text-neutral-500">{formatDate(session.lastActivity)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral-400">{title}</span>
        <div className="text-neutral-500">{icon}</div>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
