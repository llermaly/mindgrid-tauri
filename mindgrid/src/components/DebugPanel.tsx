import { useDebugStore, type DebugLogLevel } from "../stores/debugStore";
import { useRef, useEffect } from "react";

const levelColors: Record<DebugLogLevel, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-zinc-500",
  pty: "text-green-400",
  event: "text-purple-400",
};

const levelBg: Record<DebugLogLevel, string> = {
  info: "bg-blue-400/10",
  warn: "bg-yellow-400/10",
  error: "bg-red-400/10",
  debug: "bg-zinc-400/10",
  pty: "bg-green-400/10",
  event: "bg-purple-400/10",
};

export function DebugPanel() {
  const { logs, filter, setFilter, clear, isEnabled, setEnabled } = useDebugStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = filter === "all" ? logs : logs.filter((log) => log.level === filter);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Debug</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as DebugLogLevel | "all")}
            className="text-xs bg-zinc-700 border-none rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
            <option value="pty">PTY</option>
            <option value="event">Event</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600"
          >
            Clear
          </button>
          <button
            onClick={() => setEnabled(!isEnabled)}
            className={`text-xs px-2 py-1 rounded ${
              isEnabled ? "bg-green-600 hover:bg-green-500" : "bg-zinc-700 hover:bg-zinc-600"
            }`}
          >
            {isEnabled ? "On" : "Off"}
          </button>
        </div>
      </div>

      {/* Logs */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-2 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-500 text-center py-4">No logs yet</div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`py-1 px-2 mb-1 rounded ${levelBg[log.level]} border-l-2 ${levelColors[log.level].replace("text-", "border-")}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-zinc-500 shrink-0">{formatTime(log.timestamp)}</span>
                <span className={`shrink-0 uppercase ${levelColors[log.level]}`}>
                  [{log.level}]
                </span>
                <span className="text-zinc-400 shrink-0">{log.source}</span>
                <span className="text-zinc-200 break-all">{log.message}</span>
              </div>
              {log.data !== undefined && (
                <pre className="mt-1 ml-4 text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                  {typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
