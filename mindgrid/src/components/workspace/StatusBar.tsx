import { useState } from "react";
import type { Session } from "../../stores/sessionStore";
import { getModelById } from "../../lib/models";

interface StatusBarProps {
  session: Session;
  model?: string | null;
  isThinking?: boolean;
}

export function StatusBar({ session, model, isThinking = false }: StatusBarProps) {
  const [showGitPanel, setShowGitPanel] = useState(false);

  const modelInfo = model ? getModelById(model) : null;
  const modelName = modelInfo?.name || "No model";

  const gitStatus = session.gitStatus;
  const branch = gitStatus?.current_branch || "main";
  const ahead = gitStatus?.ahead || 0;

  // Mock context usage (would come from actual session data)
  const contextPercent = 55;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] flex-shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Model badge */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <div
            className={`w-2 h-2 rounded-full ${
              isThinking
                ? "bg-[var(--amber)] shadow-[0_0_6px_var(--amber-glow)] animate-pulse"
                : "bg-[var(--green)] shadow-[0_0_6px_var(--green-glow)]"
            }`}
          />
          <span className="font-medium text-[var(--text-primary)]">{modelName}</span>
          <span className="text-[var(--text-muted)] text-[11px]">
            {isThinking ? "thinking" : "ready"}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-[var(--border)]" />

        {/* Context indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md cursor-pointer hover:border-[var(--accent)] transition-all">
          <div className="w-[60px] h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${contextPercent}%`,
                background: `linear-gradient(90deg, var(--green), var(--amber))`,
              }}
            />
          </div>
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
            {contextPercent}%
          </span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Git status */}
        <button
          onClick={() => setShowGitPanel(!showGitPanel)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md text-[11px] text-[var(--text-secondary)] cursor-pointer hover:border-[var(--accent)] transition-all"
        >
          <span>&#x2387;</span>
          <span className="font-medium text-[var(--text-primary)]">{branch}</span>
          {ahead > 0 && (
            <span className="px-1.5 py-0.5 bg-[var(--bg-base)] rounded text-[10px] text-[var(--green)]">
              +{ahead}
            </span>
          )}
        </button>

        {/* Settings/filters button */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-all"
          title="Filters"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
        </button>
      </div>

      {/* Git Panel Overlay - TODO: Implement full panel */}
      {showGitPanel && (
        <GitPanelOverlay session={session} onClose={() => setShowGitPanel(false)} />
      )}
    </div>
  );
}

function GitPanelOverlay({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const gitStatus = session.gitStatus;
  const branch = gitStatus?.current_branch || "main";
  const ahead = gitStatus?.ahead || 0;
  const behind = gitStatus?.behind || 0;
  const filesChanged = gitStatus?.files_changed || 0;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute right-4 top-[calc(var(--topbar-height)+var(--statusbar-height)+8px)] w-72 bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span>&#x2387;</span>
            <span>Git Status</span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            x
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Branch info */}
          <div className="p-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-md">
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <span className="text-[var(--text-muted)]">&#x25C7;</span>
              <span className="font-medium">{branch}</span>
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              +{ahead} ahead - {behind} behind
            </div>
          </div>

          {/* Changed files */}
          <div>
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">
              Changed Files ({filesChanged})
            </div>
            {filesChanged === 0 ? (
              <div className="text-xs text-[var(--text-muted)]">No changes</div>
            ) : (
              <div className="text-xs text-[var(--text-secondary)]">
                {filesChanged} file{filesChanged !== 1 ? "s" : ""} modified
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 text-xs font-medium bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-emphasis)] transition-all">
              Commit
            </button>
            <button className="flex-1 px-3 py-2 text-xs font-medium bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-emphasis)] transition-all">
              Push
            </button>
            <button className="flex-1 px-3 py-2 text-xs font-medium bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-primary-hover)] transition-all">
              Create PR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
