import { useState } from 'react';

interface TerminalPanelProps {
  cwd: string;
}

export function TerminalPanel({ cwd }: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState('logs');
  const [terminals, setTerminals] = useState(['Terminal 1', 'Terminal 2']);

  // Dummy terminal lines for display
  const lines = [
    '$ npm run dev',
    '',
    '> mindgrid@0.1.0 dev',
    '> vite',
    '',
    '  VITE v7.2.7  ready in 892 ms',
    '',
    '  Local:   http://localhost:1420/',
    '  Network: use --host to expose',
    '',
  ];

  const handleCloseTerminal = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    setTerminals(prev => prev.filter(t => t !== term));
    if (activeTab === term.toLowerCase().replace(' ', '-')) {
      setActiveTab('logs');
    }
  };

  const handleAddTerminal = (e: React.MouseEvent) => {
    e.stopPropagation();
    const num = terminals.length + 1;
    const newName = `Terminal ${num}`;
    setTerminals(prev => [...prev, newName]);
    setActiveTab(newName.toLowerCase().replace(' ', '-'));
  };

  const allTabs = ['Logs', ...terminals];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-1">
          {allTabs.map(tab => {
            const tabId = tab.toLowerCase().replace(' ', '-');
            return (
              <div
                key={tab}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors group ${
                  activeTab === tabId
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveTab(tabId); }}
                  className="whitespace-nowrap"
                >
                  {tab}
                </button>
                {tab !== 'Logs' && (
                  <button
                    onClick={(e) => handleCloseTerminal(e, tab)}
                    className="ml-1 p-0.5 rounded hover:bg-neutral-600 text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Close ${tab}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          <button
            className="px-2 py-1 text-xs text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            onClick={handleAddTerminal}
            title="New terminal"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="text-xs text-neutral-500 hover:text-white px-2">Clear</button>
        </div>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-black/30">
        {lines.map((line, i) => (
          <div key={i} className="text-green-400 leading-relaxed">{line || ' '}</div>
        ))}
        <div className="text-green-400">
          $ <span className="animate-pulse">|</span>
        </div>
      </div>

      {/* Footer with cwd */}
      <div className="px-3 py-1 border-t border-neutral-800 text-xs text-neutral-500 truncate">
        {cwd}
      </div>
    </div>
  );
}
