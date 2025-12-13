interface TerminalPanelProps {
  cwd: string;
  expanded: boolean;
  onToggle: () => void;
}

export function TerminalPanel({ cwd: _cwd, expanded, onToggle }: TerminalPanelProps) {
  // Mock terminal output for now
  // TODO: Connect to actual terminal
  const terminalLines = [
    { type: "prompt", content: "npm run dev" },
    { type: "output", content: "ready - started server on 0.0.0.0:3000" },
    { type: "success", content: "Compiled successfully" },
  ];

  return (
    <div
      className="bg-[var(--bg-base)] border-t border-[var(--border)] flex flex-col flex-shrink-0"
      style={{ height: expanded ? "140px" : "36px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <div className="w-2 h-2 bg-[var(--green)] rounded-full shadow-[0_0_8px_var(--green-glow)]" />
          <span>Terminal</span>
        </div>
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px] transition-all"
        >
          {expanded ? "v" : "^"}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="flex-1 px-4 py-3 font-mono text-xs leading-relaxed text-[var(--text-secondary)] overflow-y-auto">
          {terminalLines.map((line, index) => (
            <TerminalLine key={index} type={line.type} content={line.content} />
          ))}
        </div>
      )}
    </div>
  );
}

function TerminalLine({ type, content }: { type: string; content: string }) {
  if (type === "prompt") {
    return (
      <div className="mb-1">
        <span className="text-[var(--accent)]">{'>'}</span>{" "}
        <span>{content}</span>
      </div>
    );
  }

  if (type === "success") {
    return (
      <div className="mb-1 text-[var(--green)]">
        <span>{'[check]'}</span> {content}
      </div>
    );
  }

  return <div className="mb-1">{content}</div>;
}
