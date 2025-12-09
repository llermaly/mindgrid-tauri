import { getCurrentWindow } from "@tauri-apps/api/window";

interface CustomTitlebarProps {
  title?: string;
  subtitle?: string;
  showControls?: boolean;
  children?: React.ReactNode;
}

export function CustomTitlebar({
  title = "MindGrid",
  subtitle,
  showControls = true,
  children,
}: CustomTitlebarProps) {
  const appWindow = getCurrentWindow();

  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    await appWindow.toggleMaximize();
  };

  const handleClose = async () => {
    await appWindow.close();
  };

  return (
    <div
      className="h-[38px] bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 select-none flex-shrink-0"
      data-tauri-drag-region
    >
      {/* Left: Window controls (macOS style) */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {showControls && (
          <div className="flex items-center gap-2 mr-4">
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors group relative"
              title="Close"
            >
              <svg
                className="w-2 h-2 absolute inset-0.5 opacity-0 group-hover:opacity-100 text-[#4a0002]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#f5a623] transition-colors group relative"
              title="Minimize"
            >
              <svg
                className="w-2 h-2 absolute inset-0.5 opacity-0 group-hover:opacity-100 text-[#995700]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleMaximize}
              className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#1db954] transition-colors group relative"
              title="Maximize"
            >
              <svg
                className="w-2 h-2 absolute inset-0.5 opacity-0 group-hover:opacity-100 text-[#006400]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        )}

        {/* Title */}
        <div className="flex items-center gap-3" data-tauri-drag-region>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
          {subtitle && (
            <span className="px-2 py-0.5 text-xs bg-[var(--bg-tertiary)] rounded-md text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Center/Right: Custom content */}
      {children && (
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {children}
        </div>
      )}
    </div>
  );
}
