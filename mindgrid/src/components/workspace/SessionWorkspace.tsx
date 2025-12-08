import { useState, useEffect, useCallback } from 'react';
import { FlexRow } from './FlexRow';
import { Panel, PanelType, PANEL_META } from './Panel';
import { LayoutContext } from './LayoutContext';
import { LAYOUT_PRESETS, PANEL_DEFAULT_POSITIONS } from './layoutPresets';

interface LayoutState {
  mode: 'rows' | 'columns';
  rows: PanelType[][] | null;
  columns: PanelType[][] | null;
  rowHeights: number[] | null;
  collapsed: PanelType[];
}

interface SessionWorkspaceProps {
  sessionName: string;
  renderPanel: (panelId: PanelType) => React.ReactNode;
}

export function SessionWorkspace({ sessionName, renderPanel }: SessionWorkspaceProps) {
  const [layout, setLayout] = useState<LayoutState>(() => {
    const preset = LAYOUT_PRESETS.default;
    return {
      mode: preset.mode,
      rows: preset.rows ? preset.rows.map(r => [...r]) : null,
      columns: preset.columns ? preset.columns.map(c => [...c]) : null,
      rowHeights: preset.rowHeights ? [...preset.rowHeights] : null,
      collapsed: [...preset.collapsed]
    };
  });
  const [currentPreset, setCurrentPreset] = useState('default');
  const [maximizedPanel, setMaximizedPanel] = useState<PanelType | null>(null);

  // Apply preset
  const applyPreset = useCallback((presetKey: string) => {
    if (presetKey === 'custom') return;
    const preset = LAYOUT_PRESETS[presetKey];
    if (preset) {
      setLayout({
        mode: preset.mode,
        rows: preset.rows ? preset.rows.map(r => [...r]) : null,
        columns: preset.columns ? preset.columns.map(c => [...c]) : null,
        rowHeights: preset.rowHeights ? [...preset.rowHeights] : null,
        collapsed: [...preset.collapsed]
      });
      setCurrentPreset(presetKey);
    }
  }, []);

  // Expand a collapsed panel
  const expandPanel = useCallback((panelId: PanelType) => {
    setLayout(prev => {
      const newCollapsed = prev.collapsed.filter(id => id !== panelId);

      if (prev.mode === 'rows' && prev.rows) {
        const newRows = prev.rows.map(r => [...r]);
        const defaultPos = PANEL_DEFAULT_POSITIONS[panelId];
        if (defaultPos && defaultPos.mode === 'rows' && defaultPos.row !== undefined) {
          const targetRow = Math.min(defaultPos.row, newRows.length - 1);
          const pos = Math.min(defaultPos.position, newRows[targetRow].length);
          newRows[targetRow].splice(pos, 0, panelId);
        } else {
          newRows[0].push(panelId);
        }
        return { ...prev, rows: newRows, collapsed: newCollapsed };
      } else if (prev.mode === 'columns' && prev.columns) {
        const newColumns = prev.columns.map(c => [...c]);
        const targetCol = newColumns.findIndex(c => c.length > 0);
        newColumns[targetCol >= 0 ? targetCol : 0].push(panelId);
        return { ...prev, columns: newColumns, collapsed: newCollapsed };
      }
      return { ...prev, collapsed: newCollapsed };
    });
    setCurrentPreset('custom');
  }, []);

  // Collapse a panel
  const collapsePanel = useCallback((panelId: PanelType) => {
    setLayout(prev => {
      let newLayout: LayoutState;
      if (prev.mode === 'rows' && prev.rows) {
        newLayout = {
          ...prev,
          rows: prev.rows.map(row => row.filter(id => id !== panelId))
        };
      } else if (prev.mode === 'columns' && prev.columns) {
        newLayout = {
          ...prev,
          columns: prev.columns.map(col => col.filter(id => id !== panelId))
        };
      } else {
        newLayout = prev;
      }
      return {
        ...newLayout,
        collapsed: [...newLayout.collapsed, panelId]
      };
    });
    if (maximizedPanel === panelId) setMaximizedPanel(null);
    setCurrentPreset('custom');
  }, [maximizedPanel]);

  const toggleMaximize = useCallback((panelId: PanelType) => {
    setMaximizedPanel(prev => prev === panelId ? null : panelId);
  }, []);

  // Escape key to restore maximized panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && maximizedPanel) {
        setMaximizedPanel(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedPanel]);

  const layoutContextValue = {
    maximizedPanel,
    toggleMaximize,
    hidePanel: collapsePanel,
    showPanel: expandPanel
  };

  // Wrap panel rendering
  const renderPanelWrapper = (panelId: PanelType) => (
    <Panel panelId={panelId}>
      {renderPanel(panelId)}
    </Panel>
  );

  // Render rows-based layout
  const renderRowsLayout = () => {
    if (!layout.rows) return null;
    const nonEmptyRows = layout.rows.filter(row => row.length > 0);

    return (
      <FlexRow direction="vertical">
        {nonEmptyRows.map((row, rowIndex) => (
          <div key={rowIndex} className="h-full w-full">
            {row.length === 1 ? (
              <div className="h-full w-full">{renderPanelWrapper(row[0])}</div>
            ) : (
              <FlexRow>
                {row.map(panelId => (
                  <div key={panelId} className="h-full w-full">{renderPanelWrapper(panelId)}</div>
                ))}
              </FlexRow>
            )}
          </div>
        ))}
      </FlexRow>
    );
  };

  // Render columns-based layout
  const renderColumnsLayout = () => {
    if (!layout.columns) return null;
    const nonEmptyColumns = layout.columns.filter(col => col.length > 0);

    return (
      <FlexRow direction="horizontal">
        {nonEmptyColumns.map((col, colIndex) => (
          <div key={colIndex} className="h-full w-full">
            {col.length === 1 ? (
              <div className="h-full w-full">{renderPanelWrapper(col[0])}</div>
            ) : (
              <FlexRow direction="vertical">
                {col.map(panelId => (
                  <div key={panelId} className="h-full w-full">{renderPanelWrapper(panelId)}</div>
                ))}
              </FlexRow>
            )}
          </div>
        ))}
      </FlexRow>
    );
  };

  return (
    <LayoutContext.Provider value={layoutContextValue}>
      <div className="h-full flex flex-col">
        {/* Layout toolbar */}
        <div className="flex items-center justify-between px-2 py-1 bg-neutral-900/80 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <LayoutPresetSelector currentPreset={currentPreset} onSelect={applyPreset} />
            {layout.collapsed.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-neutral-500">Collapsed:</span>
                {layout.collapsed.map(panelId => {
                  const meta = PANEL_META[panelId];
                  return (
                    <button
                      key={panelId}
                      onClick={() => expandPanel(panelId)}
                      className={`text-sm hover:bg-neutral-700 px-1.5 py-0.5 rounded ${meta.color}`}
                      title={`Expand ${meta.label}`}
                    >
                      {meta.icon}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-xs text-neutral-500">
            {sessionName}
          </div>
        </div>

        {maximizedPanel && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-blue-900/30 border-b border-blue-800 flex-shrink-0">
            <span className="text-xs text-blue-400">
              Press <kbd className="px-1 py-0.5 bg-neutral-800 rounded text-xs">Esc</kbd> to restore
            </span>
            <button onClick={() => setMaximizedPanel(null)} className="text-xs text-blue-400 hover:text-blue-300">
              Restore all
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 p-1 overflow-hidden">
          {maximizedPanel ? (
            <div className="h-full w-full">
              {renderPanelWrapper(maximizedPanel)}
            </div>
          ) : (
            <div className="h-full w-full">
              {layout.mode === 'rows' ? renderRowsLayout() : renderColumnsLayout()}
            </div>
          )}
        </div>
      </div>
    </LayoutContext.Provider>
  );
}

interface LayoutPresetSelectorProps {
  currentPreset: string;
  onSelect: (preset: string) => void;
}

function LayoutPresetSelector({ currentPreset, onSelect }: LayoutPresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <span>{LAYOUT_PRESETS[currentPreset]?.name || 'Custom'}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 py-1 min-w-56">
            {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                className={`w-full px-3 py-2 text-left hover:bg-neutral-700 flex flex-col ${currentPreset === key ? 'bg-neutral-700' : ''}`}
                onClick={() => { onSelect(key); setIsOpen(false); }}
              >
                <span className="text-sm font-medium">{preset.name}</span>
                <span className="text-xs text-neutral-500">{preset.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
