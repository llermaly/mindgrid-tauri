import type { Session } from "../../stores/sessionStore";

type SessionStatus = "ready" | "busy" | "idle" | "attention";

interface SessionBarProps {
  sessions: Session[];
  activeSessionId: string;
  onSessionSelect: (id: string) => void;
  onNewSession: () => void;
}

export function SessionBar({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
}: SessionBarProps) {
  return (
    <div className="flex items-center px-3 h-[44px] bg-[var(--bg-elevated)] border-t border-[var(--border)] gap-1 flex-shrink-0">
      {sessions.map((session, index) => {
        const status = getSessionStatus(session);
        return (
          <SessionTab
            key={session.id}
            session={session}
            index={index}
            status={status}
            isActive={session.id === activeSessionId}
            onClick={() => onSessionSelect(session.id)}
          />
        );
      })}

      {/* New session button */}
      <button
        onClick={onNewSession}
        className="w-9 h-9 flex items-center justify-center border border-dashed border-[var(--border)] rounded-md text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:border-solid transition-all text-lg ml-1"
      >
        +
      </button>
    </div>
  );
}

function SessionTab({
  session,
  index,
  status,
  isActive,
  onClick,
}: {
  session: Session;
  index: number;
  status: SessionStatus;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusStyles: Record<SessionStatus, string> = {
    ready: "bg-[var(--green)] shadow-[0_0_8px_var(--green-glow)]",
    busy: "bg-[var(--amber)] shadow-[0_0_8px_var(--amber-glow)] animate-pulse",
    idle: "bg-[var(--text-muted)]",
    attention: "bg-[var(--red)] shadow-[0_0_8px_var(--red-glow)] animate-pulse",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-all ${
        isActive
          ? "bg-[var(--bg-input)] border border-[var(--accent)]"
          : "bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--border)]"
      }`}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${statusStyles[status]}`} />
      <div className="flex flex-col gap-px">
        <span className="text-xs font-medium text-[var(--text-primary)]">
          {session.name}
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">
          Session {index + 1}
        </span>
      </div>
    </button>
  );
}

function getSessionStatus(session: Session): SessionStatus {
  // TODO: Connect to actual session state
  // For now, derive from session properties
  if (session.isRunning) {
    return "busy";
  }
  if (session.messages?.length > 0 || session.chatWindows?.length > 0) {
    return "ready";
  }
  return "idle";
}
