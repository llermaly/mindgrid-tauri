import { useMemo, useState } from 'react';
import { Terminal } from '../../Terminal';

interface TerminalTab {
  id: string;
  name: string;
}

interface TerminalPanelProps {
  cwd: string;
}

export function TerminalPanel({ cwd }: TerminalPanelProps) {
  const initialTabs = useMemo<TerminalTab[]>(() => [{ id: crypto.randomUUID(), name: 'Terminal 1' }], []);
  const [tabs, setTabs] = useState<TerminalTab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialTabs[0].id);

  const addTab = () => {
    const index = tabs.length + 1;
    const newTab = { id: crypto.randomUUID(), name: `Terminal ${index}` };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return; // Keep at least one terminal available

    setTabs(prev => prev.filter(tab => tab.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter(tab => tab.id !== id);
      if (remaining.length > 0) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 bg-neutral-900/70">
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pr-2">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm border transition-colors ${
                tab.id === activeTabId
                  ? 'border-blue-500/60 bg-blue-500/10 text-blue-200'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              <button onClick={() => setActiveTabId(tab.id)} className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" />
                </svg>
                <span className="whitespace-nowrap">{tab.name}</span>
              </button>
              {tabs.length > 1 && (
                <button
                  onClick={() => closeTab(tab.id)}
                  className="p-1 text-neutral-400 hover:text-neutral-200"
                  title="Close tab"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addTab}
          className="flex items-center gap-1 px-2 py-1 text-sm rounded border border-neutral-700 bg-neutral-800 text-neutral-200 hover:border-neutral-600"
          title="New terminal tab"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add tab</span>
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {tabs.map(tab => (
          <div key={tab.id} className={`${tab.id === activeTabId ? 'block' : 'hidden'} h-full`}>
            <Terminal mode="raw" cwd={cwd} />
          </div>
        ))}
      </div>
    </div>
  );
}
