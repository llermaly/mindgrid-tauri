interface StatusBadgeProps {
  status: "running" | "waiting" | "idle" | "completed";
  size?: "sm" | "md" | "lg";
}

// Minimalist Monochrome - All status indicators use black/white with patterns
const STATUS_STYLES: Record<StatusBadgeProps["status"], { label: string; className: string }> = {
  running: { label: "Running", className: "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]" },
  waiting: { label: "Waiting", className: "bg-[var(--background)] text-[var(--foreground)] border-[var(--foreground)]" },
  idle: { label: "Idle", className: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--muted-foreground)]" },
  completed: { label: "Completed", className: "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]" },
};

const SIZE_STYLES: Record<NonNullable<StatusBadgeProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-[10px]",
  lg: "px-3 py-1 text-xs",
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <span className={`font-mono tracking-widest uppercase font-semibold border ${style.className} ${sizeStyle}`}>
      {style.label}
    </span>
  );
}
