import type { UsageData } from "../lib/usageParser";

interface UsagePopupProps {
  usageData: UsageData;
  position: { x: number; y: number };
}

export function UsagePopup({ usageData, position }: UsagePopupProps) {
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y + 20}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-3 text-xs pointer-events-auto min-w-[280px]">
        <div className="font-medium text-zinc-200 mb-2 border-b border-zinc-700 pb-2">
          Claude Usage Limits
        </div>

        <div className="space-y-2">
          {usageData.currentSession && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Session (5h)</span>
                <span className={`font-medium ${
                  usageData.currentSession.percentage > 80 ? 'text-red-400' :
                  usageData.currentSession.percentage > 50 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {usageData.currentSession.percentage}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div
                  className={`h-full ${
                    usageData.currentSession.percentage > 80 ? 'bg-red-500' :
                    usageData.currentSession.percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, usageData.currentSession.percentage)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500">
                Resets {usageData.currentSession.resetTime}
              </div>
            </div>
          )}

          {usageData.currentWeekAll && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Weekly (All Models)</span>
                <span className={`font-medium ${
                  usageData.currentWeekAll.percentage > 80 ? 'text-red-400' :
                  usageData.currentWeekAll.percentage > 50 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {usageData.currentWeekAll.percentage}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div
                  className={`h-full ${
                    usageData.currentWeekAll.percentage > 80 ? 'bg-red-500' :
                    usageData.currentWeekAll.percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, usageData.currentWeekAll.percentage)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500">
                Resets {usageData.currentWeekAll.resetTime}
              </div>
            </div>
          )}

          {usageData.currentWeekSonnet && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Weekly (Sonnet)</span>
                <span className={`font-medium ${
                  usageData.currentWeekSonnet.percentage > 80 ? 'text-red-400' :
                  usageData.currentWeekSonnet.percentage > 50 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {usageData.currentWeekSonnet.percentage}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div
                  className={`h-full ${
                    usageData.currentWeekSonnet.percentage > 80 ? 'bg-red-500' :
                    usageData.currentWeekSonnet.percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, usageData.currentWeekSonnet.percentage)}%` }}
                />
              </div>
              <div className="text-[10px] text-zinc-500">
                Resets {usageData.currentWeekSonnet.resetTime}
              </div>
            </div>
          )}

          {usageData.extraUsage && (
            <div className="flex flex-col gap-1 border-t border-zinc-700 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Extra Usage</span>
                <span className={`font-medium ${
                  usageData.extraUsage.percentage > 80 ? 'text-red-400' :
                  usageData.extraUsage.percentage > 50 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {usageData.extraUsage.percentage}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div
                  className={`h-full ${
                    usageData.extraUsage.percentage > 80 ? 'bg-red-500' :
                    usageData.extraUsage.percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, usageData.extraUsage.percentage)}%` }}
                />
              </div>
              {usageData.extraUsage.spent !== undefined && usageData.extraUsage.limit !== undefined && (
                <div className="text-[10px] text-zinc-500">
                  ${usageData.extraUsage.spent.toFixed(2)} / ${usageData.extraUsage.limit.toFixed(2)} spent
                </div>
              )}
              <div className="text-[10px] text-zinc-500">
                Resets {usageData.extraUsage.resetTime}
              </div>
            </div>
          )}
        </div>

        {!usageData.currentSession && !usageData.currentWeekAll && !usageData.currentWeekSonnet && !usageData.extraUsage && (
          <div className="text-zinc-500 text-center py-2">
            No usage data available
          </div>
        )}
      </div>
    </div>
  );
}
