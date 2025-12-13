interface PreviewPanelProps {
  url?: string;
  className?: string;
}

export function PreviewPanel({ url = "localhost:3000", className = "" }: PreviewPanelProps) {
  return (
    <div className={`flex flex-col bg-[var(--bg-elevated)] ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-xs text-[var(--text-secondary)]">
          <div className="w-2 h-2 bg-[var(--green)] rounded-full shadow-[0_0_8px_var(--green-glow)]" />
          <span>{url}</span>
        </div>

        <div className="flex gap-1">
          {/* Refresh button */}
          <button className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          {/* Pop-out button */}
          <button className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content - Preview placeholder */}
      <div className="flex-1 m-4">
        <div className="h-full bg-white rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex items-center justify-center">
          <span className="text-gray-500 text-base">App Preview</span>
        </div>
      </div>
    </div>
  );
}
