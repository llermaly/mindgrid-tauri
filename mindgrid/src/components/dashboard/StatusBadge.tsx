interface StatusBadgeProps {
  status: "running" | "waiting" | "idle" | "completed";
  size?: "sm" | "md" | "lg";
}

const STATUS_STYLES: Record<StatusBadgeProps["status"], { label: string; className: string }> = {
  running: { label: "Running", className: "bg-[var(--accent-primary-muted)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30" },
  waiting: { label: "Waiting", className: "bg-[rgba(245,158,11,0.15)] text-[var(--accent-warning)] border-[var(--accent-warning)]/30" },
  idle: { label: "Idle", className: "bg-[var(--bg-hover)] text-[var(--text-tertiary)] border-[var(--border-subtle)]" },
  completed: { label: "Completed", className: "bg-[rgba(34,197,94,0.15)] text-[var(--accent-success)] border-[var(--accent-success)]/30" },
};

const SIZE_STYLES: Record<NonNullable<StatusBadgeProps["size"]>, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-[11px]",
  lg: "px-3 py-1 text-xs",
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <span className={`font-medium border rounded-full ${style.className} ${sizeStyle}`}>
      {style.label}
    </span>
  );
}
