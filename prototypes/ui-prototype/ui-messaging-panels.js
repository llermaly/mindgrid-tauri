    // Panel Controls
    function PanelControls({ panelId, extraControls }) {
      const layout = useLayout();
      const isMaximized = layout?.maximizedPanel === panelId;

      return (
        <div className="flex items-center gap-1">
          {extraControls}
          <button
            onClick={() => layout?.toggleMaximize(panelId)}
            className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
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

    // Message Component - renders different message types
    function MessageItem({ msg, onBranch, onToggleCollapse, isCollapsed, onCompare }) {
      const typeConfig = MESSAGE_TYPES[msg.type] || MESSAGE_TYPES.text;
      const [showActions, setShowActions] = useState(false);

      // Render code block with syntax highlighting placeholder
      const renderCode = (content, language, file) => (
        <div className="mt-2 rounded-lg overflow-hidden border border-neutral-700">
          {file && (
            <div className="px-3 py-1.5 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400">{file}</span>
              <button className="text-xs text-blue-400 hover:text-blue-300">Copy</button>
            </div>
          )}
          <pre className="p-3 bg-neutral-900 overflow-x-auto text-xs font-mono text-green-400 leading-relaxed">
            {content}
          </pre>
        </div>
      );

      // Render diff with +/- coloring
      const renderDiff = (content, file, additions, deletions) => (
        <div className="mt-2 rounded-lg overflow-hidden border border-neutral-700">
          <div className="px-3 py-1.5 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between">
            <span className="text-xs font-mono text-neutral-400">{file}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">+{additions || 0}</span>
              <span className="text-red-400">-{deletions || 0}</span>
              <button className="text-blue-400 hover:text-blue-300 ml-2">View Full</button>
            </div>
          </div>
          <pre className="p-3 bg-neutral-900 overflow-x-auto text-xs font-mono leading-relaxed">
            {content.split('\n').map((line, i) => (
              <div key={i} className={
                line.startsWith('+') ? 'text-green-400 bg-green-500/10' :
                line.startsWith('-') ? 'text-red-400 bg-red-500/10' :
                line.startsWith('@@') ? 'text-cyan-400' :
                'text-neutral-400'
              }>{line}</div>
            ))}
          </pre>
        </div>
      );

      // Render tool call
      const renderToolCall = (tool, input) => (
        <div className="mt-1 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-yellow-400 font-medium">{tool}</span>
            <span className="text-neutral-400 font-mono truncate">{input}</span>
          </div>
        </div>
      );

      // Collapsible wrapper
      const canCollapse = ['thinking', 'tool_result'].includes(msg.type);
      const collapsed = canCollapse && (isCollapsed ?? msg.collapsed);

      return (
        <div
          className={`group relative ${typeConfig.bg} rounded-lg transition-colors`}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          {/* Message header */}
          <div className={`flex items-center gap-2 px-3 py-2 ${canCollapse ? 'cursor-pointer' : ''}`}
               onClick={() => canCollapse && onToggleCollapse?.(msg.id)}>
            <span className={typeConfig.color}>{Icons[typeConfig.icon] && Icons[typeConfig.icon]({ className: "w-3.5 h-3.5" })}</span>
            <span className={`text-xs font-medium ${typeConfig.color}`}>{typeConfig.label}</span>
            {msg.timestamp && <span className="text-xs text-neutral-500">{msg.timestamp}</span>}
            {msg.file && <span className="text-xs text-neutral-400 font-mono ml-auto truncate max-w-[200px]">{msg.file}</span>}
            {canCollapse && (
              <span className="text-neutral-500 ml-auto">
                {collapsed ? '▶' : '▼'}
              </span>
            )}
          </div>

          {/* Message content */}
          {!collapsed && (
            <div className="px-3 pb-3">
              {msg.type === 'user' && (
                <div className="text-sm text-blue-300">{msg.content}</div>
              )}
              {msg.type === 'thinking' && (
                <div className="text-sm text-purple-300 italic whitespace-pre-wrap">{msg.content}</div>
              )}
              {msg.type === 'text' && (
                <div className="text-sm text-neutral-300 whitespace-pre-wrap">{msg.content}</div>
              )}
              {msg.type === 'code' && renderCode(msg.content, msg.language, msg.file)}
              {msg.type === 'diff' && renderDiff(msg.content, msg.file, msg.additions, msg.deletions)}
              {msg.type === 'tool_call' && renderToolCall(msg.tool, msg.input)}
              {msg.type === 'tool_result' && (
                <div className="text-xs text-cyan-300 font-mono bg-neutral-800 rounded p-2">{msg.content}</div>
              )}
              {msg.type === 'error' && (
                <div className="text-sm text-red-300 bg-red-500/10 rounded p-2">{msg.content}</div>
              )}
            </div>
          )}

          {/* Hover actions */}
          {showActions && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-neutral-800 rounded-lg p-1 shadow-lg border border-neutral-700">
              {/* Compare - only for user messages */}
              {msg.type === 'user' && (
                <button
                  onClick={() => onCompare?.(msg.content)}
                  className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
                  title="Compare with other models"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              )}
              {/* Branch - not for user messages */}
              {msg.type !== 'user' && (
                <button
                  onClick={() => onBranch?.(msg.id)}
                  className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
                  title="Branch from here"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <button
                className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
                title="Copy"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      );
    }

    // Filter Bar for message types - compact version
    function MessageFilterBar({ filters, onChange, messageCounts, expanded, onToggleExpand }) {
      const filterTypes = [
        { id: 'all', label: 'All', icon: null },
        { id: 'thinking', label: null, icon: 'thinking', title: 'Thinking' },
        { id: 'text', label: null, icon: 'text', title: 'Text' },
        { id: 'code', label: null, icon: 'code', title: 'Code' },
        { id: 'diff', label: null, icon: 'diff', title: 'Diffs' },
        { id: 'tool', label: null, icon: 'tool', title: 'Tools' },
      ];

      // Compact mode - just show filter icon
      if (!expanded) {
        const activeCount = filters.includes('all') ? 0 : filters.length;
        return (
          <button
            onClick={onToggleExpand}
            className="absolute top-2 right-12 z-10 p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white text-xs flex items-center gap-1"
            title="Show filters"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeCount > 0 && <span className="text-blue-400">{activeCount}</span>}
          </button>
        );
      }

      return (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-neutral-800 bg-neutral-800/30">
          {filterTypes.map(f => {
            const count = f.id === 'all'
              ? null
              : f.id === 'tool'
                ? (messageCounts.tool_call || 0) + (messageCounts.tool_result || 0)
                : messageCounts[f.id] || 0;
            const isActive = filters.includes(f.id);

            if (f.id !== 'all' && count === 0) return null;

            return (
              <button
                key={f.id}
                onClick={() => {
                  if (f.id === 'all') {
                    onChange(['all']);
                  } else {
                    const newFilters = isActive
                      ? filters.filter(x => x !== f.id)
                      : [...filters.filter(x => x !== 'all'), f.id];
                    onChange(newFilters.length === 0 ? ['all'] : newFilters);
                  }
                }}
                className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-600/80 text-white'
                    : 'text-neutral-500 hover:text-white hover:bg-neutral-700'
                }`}
                title={f.title || f.label}
              >
                <span className="flex items-center gap-1">
                  {f.icon ? Icons[f.icon]({ className: "w-3 h-3" }) : f.label}
                  {count ? <span>{count}</span> : null}
                </span>
              </button>
            );
          })}
          <button
            onClick={onToggleExpand}
            className="ml-auto p-1 text-neutral-500 hover:text-white"
            title="Hide filters"
          >
            {Icons.x({ className: "w-3 h-3" })}
          </button>
        </div>
      );
    }
