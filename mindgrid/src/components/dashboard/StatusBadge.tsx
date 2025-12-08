interface StatusBadgeProps {
  status: "running" | "waiting" | "idle" | "completed";
}

const STATUS_STYLES: Record<StatusBadgeProps["status"], { label: string; className: string }> = {
  running: { label: "Running", className: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  waiting: { label: "Waiting", className: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  idle: { label: "Idle", className: "bg-zinc-700/40 text-zinc-300 border-zinc-600" },
  completed: { label: "Completed", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <span className={`px-2 py-0.5 text-[11px] font-medium border rounded-full ${style.className}`}>
      {style.label}
    </span>
  );
}
