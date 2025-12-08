import { ReactNode } from 'react';
import { useLayoutContext } from './LayoutContext';

export type PanelType = 'research' | 'coding' | 'review' | 'git' | 'foundations' | 'browser' | 'terminal';

interface PanelMeta {
  icon: ReactNode;
  label: string;
  color: string;
}

export const PANEL_META: Record<PanelType, PanelMeta> = {
  research: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    label: 'Research',
    color: 'text-green-400'
  },
  coding: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    label: 'Coding',
    color: 'text-blue-400'
  },
  review: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    label: 'Review',
    color: 'text-orange-400'
  },
  git: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    label: 'Git',
    color: 'text-purple-400'
  },
  foundations: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Foundations',
    color: 'text-yellow-400'
  },
  browser: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    label: 'Browser',
    color: 'text-cyan-400'
  },
  terminal: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Terminal',
    color: 'text-neutral-400'
  }
};

interface PanelControlsProps {
  panelId: PanelType;
  extraControls?: ReactNode;
}

export function PanelControls({ panelId, extraControls }: PanelControlsProps) {
  const layout = useLayoutContext();
  const isMaximized = layout?.maximizedPanel === panelId;

  return (
    <div className="flex items-center gap-1">
      {extraControls}
      <button
        onClick={() => layout?.toggleMaximize(panelId)}
        className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
      <button
        onClick={() => layout?.hidePanel(panelId)}
        className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
        title="Hide"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12h-15" />
        </svg>
      </button>
    </div>
  );
}

interface PanelProps {
  panelId: PanelType;
  children: ReactNode;
  extraControls?: ReactNode;
}

export function Panel({ panelId, children, extraControls }: PanelProps) {
  const meta = PANEL_META[panelId];

  return (
    <div className="h-full w-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-800/50 border-b border-neutral-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={meta.color}>{meta.icon}</span>
          <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
        </div>
        <PanelControls panelId={panelId} extraControls={extraControls} />
      </div>

      {/* Panel Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {children}
      </div>
    </div>
  );
}
