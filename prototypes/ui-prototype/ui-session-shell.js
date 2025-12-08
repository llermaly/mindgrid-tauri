    // Session Card
    function SessionCard({ session, index, onClick, isActive, onOpenWindow, onMultitask }) {
      const hasActiveAgent = Object.values(session.agents).some(
        a => a.status === 'coding' || a.status === 'thinking' || a.status === 'reviewing'
      );

      return (
        <div
          className={`session-card h-full flex flex-col bg-neutral-900 border rounded-lg p-4 ${
            isActive ? "border-blue-500" : "border-neutral-800"
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-white truncate">{session.name}</span>
                <span className="kbd flex-shrink-0">⌘{index + 1}</span>
              </div>
              <div className="text-xs text-neutral-500 font-mono truncate" title={session.branch}>
                {session.branch}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenWindow?.(session); }}
              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors flex-shrink-0"
              title="Open in new window"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>

          {/* Content area - grows to fill space */}
          <div className="flex-1">
            {/* Agents Status */}
            <div className="flex items-center gap-3 mb-3">
              {Object.entries(session.agents).map(([type, agent]) => (
                <div key={type} className="flex items-center gap-1.5 text-xs" title={AGENT_TYPES[type].name}>
                  <span className={AGENT_TYPES[type].color}>{AGENT_TYPES[type].icon}</span>
                  <StatusBadge status={agent.status} />
                </div>
              ))}
            </div>

            {/* Git status */}
            {session.git?.changedFiles?.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-orange-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {session.git.changedFiles.length} uncommitted file{session.git.changedFiles.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Open button - always at bottom */}
          <button
            onClick={onClick}
            className="w-full py-2 px-3 mt-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <span>Open Session</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      );
    }

    // Overview Mode
    function OverviewMode({ sessions, activeSessionId, onSelectSession, onOpenWindow, onMultitask }) {
      return (
        <div className="h-full overflow-y-auto scrollbar-thin p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-semibold">All Sessions</h1>
              <button
                onClick={() => onMultitask?.('all')}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Open All in Windows
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session, i) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  index={i}
                  isActive={session.id === activeSessionId}
                  onClick={() => onSelectSession(session.id)}
                  onOpenWindow={onOpenWindow}
                  onMultitask={onMultitask}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Panel Visibility Bar
    function PanelVisibilityBar({ hiddenPanels, onToggle }) {
      const panels = [
        { id: "research", icon: "research", label: "Research" },
        { id: "coding", icon: "coding", label: "Coding" },
        { id: "review", icon: "review", label: "Review" },
        { id: "git", icon: "git", label: "Git" },
        { id: "foundations", icon: "foundations", label: "Foundations" },
        { id: "browser", icon: "browser", label: "Browser" },
        { id: "terminal", icon: "terminal", label: "Terminal" },
      ];

      const hiddenVisible = panels.filter(p => hiddenPanels.includes(p.id));
      if (hiddenVisible.length === 0) return null;

      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 border-b border-neutral-800">
          <span className="text-xs text-neutral-500">Show:</span>
          {hiddenVisible.map(panel => (
            <button
              key={panel.id}
              onClick={() => onToggle(panel.id)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
            >
              {Icons[panel.icon]({ className: "w-3 h-3" })} {panel.label}
            </button>
          ))}
        </div>
      );
    }

    // Resizable Flexible Row - renders children with resize handles, auto-adjusts sizes
    function FlexRow({ children, direction = "horizontal" }) {
      const validChildren = React.Children.toArray(children).filter(Boolean);
      const [sizes, setSizes] = useState(() =>
        validChildren.map(() => 100 / validChildren.length)
      );
      const containerRef = useRef(null);
      const dragInfo = useRef({ index: -1, startPos: 0, startSizes: [] });

      // Reset sizes when children change
      useEffect(() => {
        setSizes(validChildren.map(() => 100 / validChildren.length));
      }, [validChildren.length]);

      if (validChildren.length === 0) return null;
      if (validChildren.length === 1) {
        return <div className="h-full w-full">{validChildren[0]}</div>;
      }

      const handleMouseDown = (index, e) => {
        e.preventDefault();
        dragInfo.current = {
          index,
          startPos: direction === "horizontal" ? e.clientX : e.clientY,
          startSizes: [...sizes]
        };

        const handleMouseMove = (e) => {
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const totalSize = direction === "horizontal" ? rect.width : rect.height;
          const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
          const delta = currentPos - dragInfo.current.startPos;
          const deltaPercent = (delta / totalSize) * 100;

          const newSizes = [...dragInfo.current.startSizes];
          const minSize = 10; // minimum 10%

          // Adjust the two adjacent panels
          const idx = dragInfo.current.index;
          let newSize1 = dragInfo.current.startSizes[idx] + deltaPercent;
          let newSize2 = dragInfo.current.startSizes[idx + 1] - deltaPercent;

          // Enforce minimum sizes
          if (newSize1 < minSize) {
            newSize2 -= (minSize - newSize1);
            newSize1 = minSize;
          }
          if (newSize2 < minSize) {
            newSize1 -= (minSize - newSize2);
            newSize2 = minSize;
          }

          newSizes[idx] = Math.max(minSize, newSize1);
          newSizes[idx + 1] = Math.max(minSize, newSize2);
          setSizes(newSizes);
        };

        const handleMouseUp = () => {
          dragInfo.current.index = -1;
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
      };

      const isHorizontal = direction === "horizontal";

      return (
        <div
          ref={containerRef}
          className={`h-full w-full flex ${isHorizontal ? "flex-row" : "flex-col"}`}
        >
          {validChildren.map((child, i) => (
            <React.Fragment key={i}>
              <div
                style={{ [isHorizontal ? "width" : "height"]: `${sizes[i]}%` }}
                className="min-w-0 min-h-0 overflow-hidden"
              >
                {child}
              </div>
              {i < validChildren.length - 1 && (
                <div
                  className={`resize-handle flex-shrink-0 ${
                    isHorizontal ? "resize-handle-h" : "resize-handle-v"
                  }`}
                  onMouseDown={(e) => handleMouseDown(i, e)}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    
