// ============ LAYOUT SYSTEM ============

    // SVG Icons as React components
    const Icons = {
      research: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      coding: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      review: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      git: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      foundations: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      browser: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      terminal: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      user: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      thinking: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      text: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      code: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      diff: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      tool: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      result: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      error: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      compare: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      plus: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      branch: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      ),
      copy: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      image: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      send: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      filter: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      ),
      file: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      layout: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      chevronDown: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      ),
      chevronRight: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      ),
      x: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      check: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      refresh: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      lightbulb: (props) => (
        <svg className={props.className || "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    };

    // Panel metadata for icons and labels
    const PANEL_META = {
      research: { icon: 'research', label: 'Research', color: 'text-green-400' },
      coding: { icon: 'coding', label: 'Coding', color: 'text-blue-400' },
      review: { icon: 'review', label: 'Review', color: 'text-orange-400' },
      git: { icon: 'git', label: 'Git', color: 'text-purple-400' },
      foundations: { icon: 'foundations', label: 'Foundations', color: 'text-yellow-400' },
      browser: { icon: 'browser', label: 'Browser', color: 'text-cyan-400' },
      terminal: { icon: 'terminal', label: 'Terminal', color: 'text-neutral-400' }
    };

    // Layout presets - supports both row-based and column-based layouts
    const LAYOUT_PRESETS = {
      default: {
        name: 'Default',
        description: 'Research + Coding | Foundations + Browser | Terminal',
        mode: 'rows',
        rows: [
          ['research', 'coding'],
          ['foundations', 'browser'],
          ['terminal']
        ],
        rowHeights: [50, 35, 15], // percentage heights
        collapsed: ['review', 'git']
      },
      vibe: {
        name: 'Vibe Mode',
        description: 'Coding | Browser - minimal distraction',
        mode: 'columns',
        columns: [
          ['coding'],
          ['browser']
        ],
        collapsed: ['research', 'review', 'git', 'foundations', 'terminal']
      },
      research: {
        name: 'Research Mode',
        description: 'Research | Coding + Browser',
        mode: 'columns',
        columns: [
          ['research'],
          ['coding', 'browser']
        ],
        collapsed: ['review', 'git', 'foundations', 'terminal']
      },
      review: {
        name: 'Review Mode',
        description: 'Coding + Git | Review',
        mode: 'columns',
        columns: [
          ['coding', 'git'],
          ['review']
        ],
        collapsed: ['research', 'foundations', 'browser', 'terminal']
      },
      full: {
        name: 'Full Stack',
        description: 'All panels visible',
        mode: 'rows',
        rows: [
          ['research', 'coding', 'review'],
          ['foundations', 'browser', 'git'],
          ['terminal']
        ],
        rowHeights: [45, 40, 15],
        collapsed: []
      }
    };

    // Default positions for panels when re-adding
    const PANEL_DEFAULT_POSITIONS = {
      research: { mode: 'rows', row: 0, position: 0 },
      coding: { mode: 'rows', row: 0, position: 1 },
      review: { mode: 'columns', column: 1, position: 0 },
      git: { mode: 'rows', row: 1, position: 2 },
      foundations: { mode: 'rows', row: 1, position: 0 },
      browser: { mode: 'rows', row: 1, position: 1 },
      terminal: { mode: 'rows', row: 2, position: 0 }
    };

    // Layout Preset Selector
    function LayoutPresetSelector({ currentPreset, onSelect }) {
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
                <div className="border-t border-neutral-700 mt-1 pt-1">
                  <button
                    className="w-full px-3 py-2 text-left hover:bg-neutral-700 text-xs text-neutral-400"
                    onClick={() => { onSelect('custom'); setIsOpen(false); }}
                  >
                    Save current as preset...
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    // Collapsed Panel Tab
    function CollapsedPanelTab({ panelId, position, onExpand, onDragStart, onDragEnd, isDragging }) {
      const meta = PANEL_META[panelId];

      return (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('panelId', panelId);
            e.dataTransfer.effectAllowed = 'move';
            onDragStart?.(panelId);
          }}
          onDragEnd={() => onDragEnd?.()}
          onClick={() => onExpand(panelId)}
          className={`
            flex items-center gap-1.5 px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700
            border border-neutral-700 rounded cursor-grab active:cursor-grabbing transition-all
            ${isDragging ? 'opacity-50 scale-95' : ''}
          `}
          title={`Click to expand ${meta.label}, drag to reposition`}
        >
          <span className={meta.color}>{Icons[meta.icon] && Icons[meta.icon]({ className: "w-4 h-4" })}</span>
          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
        </div>
      );
    }

    // Drop Zone indicator - simplified to not interfere with layout
    function DropZone({ zone, isActive, onDrop, children, className = '' }) {
      const [isOver, setIsOver] = useState(false);

      const handleDragOver = (e) => {
        if (isActive) {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(true);
        }
      };

      const handleDragLeave = (e) => {
        // Only trigger if leaving the element itself, not its children
        if (e.currentTarget === e.target) {
          setIsOver(false);
        }
      };

      const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        const panelId = e.dataTransfer.getData('panelId');
        if (panelId && isActive) {
          onDrop(panelId, zone);
        }
      };

      return (
        <div
          className={`relative ${className} ${isActive && isOver ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {children}
          {isActive && isOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 rounded-lg pointer-events-none z-20">
              <span className="text-blue-400 font-medium text-sm bg-neutral-900/90 px-3 py-1 rounded">Drop here</span>
            </div>
          )}
        </div>
      );
    }

    // Collapsed panels sidebar
    function CollapsedPanelsSidebar({ panels, position, onExpand, onDragStart, onDragEnd, draggingPanel }) {
      if (panels.length === 0) return null;

      const positionClasses = {
        left: 'flex-col border-r',
        right: 'flex-col border-l',
        bottom: 'flex-row border-t'
      };

      return (
        <div className={`flex gap-1 p-1.5 bg-neutral-900/80 border-neutral-800 ${positionClasses[position]}`}>
          {panels.map(panelId => (
            <CollapsedPanelTab
              key={panelId}
              panelId={panelId}
              position={position}
              onExpand={onExpand}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggingPanel === panelId}
            />
          ))}
        </div>
      );
    }

    // Main Session Screen
    function SessionScreen({ session, showGitPanel, onGitPanelShown, onToggleThinking, onNewChat, onSendMessage }) {
      // Layout state - now supports rows or columns mode
      const [layout, setLayout] = useState(() => {
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
      const [maximizedPanel, setMaximizedPanel] = useState(null);
      const [showReviewDialog, setShowReviewDialog] = useState(false);
      const [draggingPanel, setDraggingPanel] = useState(null);

      // Show git panel when triggered from title bar
      useEffect(() => {
        if (showGitPanel) {
          expandPanel('git');
          onGitPanelShown?.();
        }
      }, [showGitPanel, onGitPanelShown]);

      // Apply preset
      const applyPreset = (presetKey) => {
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
      };

      // Get all visible panels
      const getVisiblePanels = () => {
        if (layout.mode === 'rows' && layout.rows) {
          return layout.rows.flat();
        } else if (layout.mode === 'columns' && layout.columns) {
          return layout.columns.flat();
        }
        return [];
      };

      // Remove panel from layout
      const removePanelFromLayout = (panelId) => {
        setLayout(prev => {
          if (prev.mode === 'rows' && prev.rows) {
            return {
              ...prev,
              rows: prev.rows.map(row => row.filter(id => id !== panelId))
            };
          } else if (prev.mode === 'columns' && prev.columns) {
            return {
              ...prev,
              columns: prev.columns.map(col => col.filter(id => id !== panelId))
            };
          }
          return prev;
        });
      };

      // Expand a collapsed panel - add it back to a smart position
      const expandPanel = (panelId) => {
        setLayout(prev => {
          const newCollapsed = prev.collapsed.filter(id => id !== panelId);

          if (prev.mode === 'rows' && prev.rows) {
            const newRows = prev.rows.map(r => [...r]);
            // Find best row based on default position
            const defaultPos = PANEL_DEFAULT_POSITIONS[panelId];
            if (defaultPos && defaultPos.mode === 'rows') {
              const targetRow = Math.min(defaultPos.row, newRows.length - 1);
              // Insert at original position or end
              const pos = Math.min(defaultPos.position, newRows[targetRow].length);
              newRows[targetRow].splice(pos, 0, panelId);
            } else {
              // Add to first row
              newRows[0].push(panelId);
            }
            return { ...prev, rows: newRows, collapsed: newCollapsed };
          } else if (prev.mode === 'columns' && prev.columns) {
            const newColumns = prev.columns.map(c => [...c]);
            // Add to first column that has content, or first column
            const targetCol = newColumns.findIndex(c => c.length > 0);
            newColumns[targetCol >= 0 ? targetCol : 0].push(panelId);
            return { ...prev, columns: newColumns, collapsed: newCollapsed };
          }
          return { ...prev, collapsed: newCollapsed };
        });
        setCurrentPreset('custom');
      };

      // Collapse a panel
      const collapsePanel = (panelId) => {
        removePanelFromLayout(panelId);
        setLayout(prev => ({
          ...prev,
          collapsed: [...prev.collapsed, panelId]
        }));
        if (maximizedPanel === panelId) setMaximizedPanel(null);
        setCurrentPreset('custom');
      };

      // Move panel to a different zone (row index or column index)
      const movePanel = (panelId, targetZone) => {
        setLayout(prev => {
          const newCollapsed = prev.collapsed.filter(id => id !== panelId);

          if (prev.mode === 'rows' && prev.rows) {
            const newRows = prev.rows.map(r => r.filter(id => id !== panelId));
            const targetRow = parseInt(targetZone.replace('row', ''));
            if (targetRow >= 0 && targetRow < newRows.length) {
              newRows[targetRow].push(panelId);
            }
            return { ...prev, rows: newRows, collapsed: newCollapsed };
          } else if (prev.mode === 'columns' && prev.columns) {
            const newColumns = prev.columns.map(c => c.filter(id => id !== panelId));
            const targetCol = parseInt(targetZone.replace('col', ''));
            if (targetCol >= 0 && targetCol < newColumns.length) {
              newColumns[targetCol].push(panelId);
            }
            return { ...prev, columns: newColumns, collapsed: newCollapsed };
          }
          return prev;
        });
        setCurrentPreset('custom');
        setDraggingPanel(null);
      };

      const toggleMaximize = (panelId) => setMaximizedPanel(prev => prev === panelId ? null : panelId);

      const handleShowReview = () => {
        expandPanel('review');
        setShowReviewDialog(true);
      };

      const handleCommit = (message) => {
        console.log('Committing:', message);
      };

      useEffect(() => {
        const handleKeyDown = (e) => {
          if (e.key === "Escape" && maximizedPanel) setMaximizedPanel(null);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
      }, [maximizedPanel]);

      const layoutContextValue = {
        maximizedPanel,
        toggleMaximize,
        hidePanel: collapsePanel,
        showPanel: expandPanel
      };

      // Render a panel by ID
      const renderPanel = (panelId) => {
        const props = { key: panelId, panelId };
        switch (panelId) {
          case 'research':
            return <AgentPanel {...props} agentType="research" data={session.agents.research}
              onToggleThinking={() => onToggleThinking?.('research')}
              onNewChat={() => onNewChat?.('research')}
              onSendMessage={(msg) => onSendMessage?.('research', msg)}
            />;
          case 'coding':
            return <AgentPanel {...props} agentType="coding" data={session.agents.coding}
              onToggleThinking={() => onToggleThinking?.('coding')}
              onNewChat={() => onNewChat?.('coding')}
              onSendMessage={(msg) => onSendMessage?.('coding', msg)}
            />;
          case 'review':
            return <AgentPanel {...props} agentType="review" data={session.agents.review}
              onToggleThinking={() => onToggleThinking?.('review')}
              onNewChat={() => onNewChat?.('review')}
              onSendMessage={(msg) => onSendMessage?.('review', msg)}
            />;
          case 'git':
            return <GitPanel {...props} data={session.git} onCommit={handleCommit} onShowReview={handleShowReview} />;
          case 'foundations':
            return <FoundationsPanel {...props} data={session.foundations} />;
          case 'browser':
            return <BrowserPanel {...props} data={session.browser} />;
          case 'terminal':
            return <TerminalPanel {...props} lines={session.terminal} />;
          default:
            return null;
        }
      };

      const isDragging = draggingPanel !== null;

      // Render rows-based layout
      const renderRowsLayout = () => {
        if (!layout.rows) return null;
        const nonEmptyRows = layout.rows.filter(row => row.length > 0);

        return (
          <FlexRow direction="vertical">
            {nonEmptyRows.map((row, rowIndex) => (
              <DropZone
                key={rowIndex}
                zone={`row${layout.rows.indexOf(row)}`}
                isActive={isDragging}
                onDrop={movePanel}
                className="h-full w-full"
              >
                {row.length === 1 ? (
                  <div className="h-full w-full">{renderPanel(row[0])}</div>
                ) : (
                  <FlexRow>
                    {row.map(panelId => (
                      <div key={panelId} className="h-full w-full">{renderPanel(panelId)}</div>
                    ))}
                  </FlexRow>
                )}
              </DropZone>
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
              <DropZone
                key={colIndex}
                zone={`col${layout.columns.indexOf(col)}`}
                isActive={isDragging}
                onDrop={movePanel}
                className="h-full w-full"
              >
                {col.length === 1 ? (
                  <div className="h-full w-full">{renderPanel(col[0])}</div>
                ) : (
                  <FlexRow direction="vertical">
                    {col.map(panelId => (
                      <div key={panelId} className="h-full w-full">{renderPanel(panelId)}</div>
                    ))}
                  </FlexRow>
                )}
              </DropZone>
            ))}
          </FlexRow>
        );
      };

      return (
        <LayoutContext.Provider value={layoutContextValue}>
          <div className="h-full flex flex-col">
            {/* Layout toolbar */}
            <div className="flex items-center justify-between px-2 py-1 bg-neutral-900/80 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <LayoutPresetSelector currentPreset={currentPreset} onSelect={applyPreset} />
                {layout.collapsed.length > 0 && (
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-xs text-neutral-500">Collapsed:</span>
                    {layout.collapsed.map(panelId => (
                      <button
                        key={panelId}
                        onClick={() => expandPanel(panelId)}
                        className="text-sm hover:bg-neutral-700 px-1 rounded"
                        title={`Expand ${PANEL_META[panelId].label}`}
                      >
                        {Icons[PANEL_META[panelId].icon] && Icons[PANEL_META[panelId].icon]({ className: "w-4 h-4" })}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isDragging && (
                <span className="text-xs text-blue-400 animate-pulse">
                  Drop panel into a zone
                </span>
              )}
            </div>

            {maximizedPanel && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-blue-900/30 border-b border-blue-800">
                <span className="text-xs text-blue-400">
                  Press <span className="kbd">Esc</span> to restore
                </span>
                <button onClick={() => setMaximizedPanel(null)} className="text-xs text-blue-400 hover:text-blue-300">
                  Restore all
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0 flex overflow-hidden">
              {/* Main content area */}
              <div className="flex-1 min-w-0 p-1 overflow-hidden">
                {maximizedPanel ? (
                  <div className="h-full w-full">
                    {renderPanel(maximizedPanel)}
                  </div>
                ) : (
                  <div className="h-full w-full">
                    {layout.mode === 'rows' ? renderRowsLayout() : renderColumnsLayout()}
                  </div>
                )}
              </div>

            </div>

            <ReviewDialog
              isOpen={showReviewDialog}
              onClose={() => setShowReviewDialog(false)}
              session={session}
              onConfirmCommit={() => {
                handleCommit('Implemented auth with NextAuth.js');
                setShowReviewDialog(false);
              }}
            />
          </div>
        </LayoutContext.Provider>
      );
    }

    // Main App
    function App() {
      const [sessions, setSessions] = useState(DUMMY_SESSIONS);
      const [activeSessionId, setActiveSessionId] = useState(1);
      const [showOverview, setShowOverview] = useState(false);
      const [showGitPanel, setShowGitPanel] = useState(false);

      const activeSession = sessions.find(s => s.id === activeSessionId);

      // Handler to toggle thinking mode for an agent
      const handleToggleThinking = (agentType) => {
        setSessions(prev => prev.map(s => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            agents: {
              ...s.agents,
              [agentType]: {
                ...s.agents[agentType],
                thinkingMode: !s.agents[agentType].thinkingMode
              }
            }
          };
        }));
      };

      // Handler to start a new chat (reset messages and context)
      const handleNewChat = (agentType) => {
        setSessions(prev => prev.map(s => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            agents: {
              ...s.agents,
              [agentType]: {
                ...s.agents[agentType],
                messages: [],
                contextUsed: 0,
                status: 'idle'
              }
            }
          };
        }));
      };

      // Handler to send a message
      const handleSendMessage = (agentType, { content, images }) => {
        const newMessage = {
          id: `${agentType[0]}${Date.now()}`,
          type: 'user',
          content: content + (images?.length ? ` [${images.length} image(s) attached]` : ''),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSessions(prev => prev.map(s => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            agents: {
              ...s.agents,
              [agentType]: {
                ...s.agents[agentType],
                messages: [...s.agents[agentType].messages, newMessage],
                status: 'thinking',
                contextUsed: Math.min(100, s.agents[agentType].contextUsed + 5)
              }
            }
          };
        }));
        // Simulate response after a delay
        setTimeout(() => {
          setSessions(prev => prev.map(s => {
            if (s.id !== activeSessionId) return s;
            const responseMessage = {
              id: `${agentType[0]}${Date.now()}`,
              type: 'text',
              content: `This is a simulated response to: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            return {
              ...s,
              agents: {
                ...s.agents,
                [agentType]: {
                  ...s.agents[agentType],
                  messages: [...s.agents[agentType].messages, responseMessage],
                  status: 'idle',
                  contextUsed: Math.min(100, s.agents[agentType].contextUsed + 3)
                }
              }
            };
          }));
        }, 1500);
      };

      useEffect(() => {
        const handleKeyDown = (e) => {
          if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "9") {
            e.preventDefault();
            const index = parseInt(e.key) - 1;
            if (sessions[index]) {
              setActiveSessionId(sessions[index].id);
              setShowOverview(false);
            }
          }
          if ((e.metaKey || e.ctrlKey) && e.key === "`") {
            e.preventDefault();
            setShowOverview(!showOverview);
          }
          if (e.key === "Escape") {
            setShowOverview(false);
          }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
      }, [sessions, showOverview]);

      return (
        <div className="h-screen flex flex-col">
          {/* Title bar */}
          <div className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-sm font-medium">Multitable</span>
              <span className="text-xs text-neutral-500">|</span>
              <span className="text-sm text-neutral-400">{activeSession?.project}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-400">
              {!showOverview && activeSession && (
                <>
                  <span className="px-2 py-1 bg-neutral-800 rounded font-mono">
                    {activeSession.branch}
                  </span>
                  {activeSession.git?.changedFiles?.length > 0 && (
                    <button
                      onClick={() => setShowGitPanel(true)}
                      className="px-2 py-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded flex items-center gap-1.5"
                    >
                      {Icons.git({ className: "w-3.5 h-3.5" })}
                      {activeSession.git.changedFiles.length} changes
                    </button>
                  )}
                  <span className="text-neutral-600">|</span>
                </>
              )}
              <span>Session {sessions.findIndex(s => s.id === activeSessionId) + 1}/{sessions.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOverview(!showOverview)}
                className="px-2 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded"
              >
                {showOverview ? "Back" : "All Sessions"} <span className="kbd ml-1">⌘`</span>
              </button>
              <button
                onClick={() => {
                  window.location.href = 'main-app.html';
                }}
                className="px-2 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded flex items-center gap-1"
                title="Return to main app"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-h-0">
            {showOverview ? (
              <OverviewMode
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={(id) => {
                  setActiveSessionId(id);
                  setShowOverview(false);
                }}
                onOpenWindow={(session) => {
                  const windowFeatures = 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no';
                  window.open(`ui-prototype.html?session=${session.id}`, `session-${session.id}`, windowFeatures);
                }}
                onMultitask={(sessionOrAll) => {
                  const windowFeatures = 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no';
                  const sessionsToOpen = sessionOrAll === 'all' ? sessions : [sessionOrAll];
                  sessionsToOpen.forEach((session, index) => {
                    const left = (index % 3) * 150 + 50;
                    const top = Math.floor(index / 3) * 100 + 50;
                    window.open(
                      `ui-prototype.html?session=${session.id}`,
                      `session-${session.id}`,
                      `${windowFeatures},left=${left},top=${top}`
                    );
                  });
                }}
              />
            ) : activeSession ? (
              <SessionScreen
                session={activeSession}
                showGitPanel={showGitPanel}
                onGitPanelShown={() => setShowGitPanel(false)}
                onToggleThinking={handleToggleThinking}
                onNewChat={handleNewChat}
                onSendMessage={handleSendMessage}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500">
                No session selected
              </div>
            )}
          </div>

          {/* Session switcher */}
          {!showOverview && (
            <div className="h-8 bg-neutral-900 border-t border-neutral-800 flex items-center px-2 gap-1 flex-shrink-0">
              {sessions.map((session, i) => {
                const hasActivity = Object.values(session.agents).some(
                  a => a.status === 'coding' || a.status === 'thinking'
                );
                return (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-2 ${
                      session.id === activeSessionId
                        ? "bg-blue-600 text-white"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                    }`}
                  >
                    <span className="kbd text-[10px]">⌘{i + 1}</span>
                    {session.name}
                    {hasActivity && (
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse-dot" />
                    )}
                  </button>
                );
              })}
              <button className="px-2 py-1 text-xs text-neutral-500 hover:text-white">
                + New
              </button>
            </div>
          )}
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  
