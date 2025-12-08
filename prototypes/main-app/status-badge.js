// ============ COMPONENTS ============

    // Status Badge
    function StatusBadge({ status }) {
      const config = {
        running: { color: 'bg-blue-500', label: 'Running', animate: true },
        waiting: { color: 'bg-orange-500', label: 'Waiting', animate: false },
        idle: { color: 'bg-gray-500', label: 'Idle', animate: false },
        completed: { color: 'bg-green-500', label: 'Done', animate: false },
        error: { color: 'bg-red-500', label: 'Error', animate: false }
      };
      const { color, label, animate } = config[status] || config.idle;
      return (
        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className={`w-2 h-2 rounded-full ${color} ${animate ? 'animate-pulse-dot' : ''}`} />
          {label}
        </span>
      );
    }
