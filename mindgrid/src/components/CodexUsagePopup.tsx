import type { CodexUsageData } from "../stores/usageStore";

interface CodexUsagePopupProps {
  usageData: CodexUsageData;
  position: { x: number; y: number };
}

export function CodexUsagePopup({ usageData, position }: CodexUsagePopupProps) {
  // Convert "% left" to "% used" for consistency with Claude
  const sessionUsed = usageData.fiveHourLimit ? 100 - usageData.fiveHourLimit.percentLeft : null;
  const weeklyUsed = usageData.weeklyLimit ? 100 - usageData.weeklyLimit.percentLeft : null;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y + 20}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-3 text-xs pointer-events-auto min-w-[240px]">
        <div className="font-medium text-zinc-200 mb-2 border-b border-zinc-700 pb-2">
          Codex Usage Limits
        </div>

        <div className="space-y-2">
          {sessionUsed !== null && usageData.fiveHourLimit && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Session (5h)</span>
                <span className={`font-medium ${
                  sessionUsed > 80 ? 'text-red-400' :
                  sessionUsed > 50 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {sessionUsed}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div
                  className={`h-full ${
                    sessionUsed > 80 ? 'bg-red-500' :
                    sessionUsed > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, sessionUsed)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500">
                Resets {usageData.fiveHourLimit.resetTime}
              </div>
            </div>
          )}

          {weeklyUsed !== null && usageData.weeklyLimit && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Weekly</span>
                <span className={`font-medium ${
                  weeklyUsed > 80 ? 'text-red-400' :
                  weeklyUsed > 50 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {weeklyUsed}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div
                  className={`h-full ${
                    weeklyUsed > 80 ? 'bg-red-500' :
                    weeklyUsed > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, weeklyUsed)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500">
                Resets {usageData.weeklyLimit.resetTime}
              </div>
            </div>
          )}
        </div>

        {!usageData.fiveHourLimit && !usageData.weeklyLimit && (
          <div className="text-zinc-500 text-center py-2">
            No usage data available
          </div>
        )}
      </div>
    </div>
  );
}
