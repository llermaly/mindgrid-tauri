// ============ COMPONENTS ============

    // Resizable Split Pane
    function ResizablePanes({ direction = "horizontal", initialSplit = 50, children, minSize = 15 }) {
      const [split, setSplit] = useState(initialSplit);
      const containerRef = useRef(null);
      const isDragging = useRef(false);

      const handleMouseDown = () => {
        isDragging.current = true;
        document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
      };

      useEffect(() => {
        const handleMouseMove = (e) => {
          if (!isDragging.current || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          let newSplit = direction === "horizontal"
            ? ((e.clientX - rect.left) / rect.width) * 100
            : ((e.clientY - rect.top) / rect.height) * 100;
          newSplit = Math.max(minSize, Math.min(100 - minSize, newSplit));
          setSplit(newSplit);
        };

        const handleMouseUp = () => {
          isDragging.current = false;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
      }, [direction, minSize]);

      const isHorizontal = direction === "horizontal";

      return (
        <div ref={containerRef} className={`flex ${isHorizontal ? "flex-row" : "flex-col"} h-full w-full`}>
          <div style={{ [isHorizontal ? "width" : "height"]: `${split}%` }} className="overflow-hidden">
            {children[0]}
          </div>
          <div
            className={`resize-handle ${isHorizontal ? "resize-handle-h" : "resize-handle-v"} flex-shrink-0`}
            onMouseDown={handleMouseDown}
          />
          <div style={{ [isHorizontal ? "width" : "height"]: `${100 - split}%` }} className="overflow-hidden">
            {children[1]}
          </div>
        </div>
      );
    }

    // Status Badge
    function StatusBadge({ status }) {
      const config = {
        thinking: { color: "bg-yellow-500", label: "Thinking...", animate: true },
        coding: { color: "bg-blue-500", label: "Coding...", animate: true },
        waiting: { color: "bg-orange-500", label: "Waiting", animate: false },
        idle: { color: "bg-gray-500", label: "Idle", animate: false },
        ready: { color: "bg-green-500", label: "Ready", animate: false },
        reviewing: { color: "bg-purple-500", label: "Reviewing...", animate: true },
        disconnected: { color: "bg-red-500", label: "Disconnected", animate: false }
      };
      const { color, label, animate } = config[status] || config.idle;
      return (
        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className={`w-2 h-2 rounded-full ${color} ${animate ? "animate-pulse-dot" : ""}`} />
          {label}
        </span>
      );
    }

    // Context Usage Popup
    function ContextUsagePopup({ contextUsed, model, position }) {
      const modelInfo = MODELS.find(m => m.id === model) || MODELS[0];
      const maxTokens = 200000;
      const usedTokens = Math.round((contextUsed / 100) * maxTokens);

      // Simulated breakdown (in a real app this would come from actual data)
      const breakdown = {
        systemPrompt: { tokens: 3000, percent: 1.5, color: 'text-blue-400', bg: 'bg-blue-400' },
        systemTools: { tokens: 16400, percent: 8.2, color: 'text-cyan-400', bg: 'bg-cyan-400' },
        memoryFiles: { tokens: 54, percent: 0.0, color: 'text-orange-400', bg: 'bg-orange-400' },
        messages: { tokens: Math.round(usedTokens * 0.6), percent: contextUsed * 0.6, color: 'text-purple-400', bg: 'bg-purple-400' },
        freeSpace: { tokens: maxTokens - usedTokens, percent: 100 - contextUsed, color: 'text-neutral-500', bg: 'bg-neutral-600' },
        autocompact: { tokens: 45000, percent: 22.5, color: 'text-neutral-600', bg: 'bg-neutral-700' }
      };

      // Generate visual grid (10x10)
      const generateGrid = () => {
        const grid = [];
        const totalCells = 100;
        let filled = 0;

        const segments = [
          { count: Math.round(breakdown.systemPrompt.percent), color: 'text-blue-400' },
          { count: Math.round(breakdown.systemTools.percent), color: 'text-cyan-400' },
          { count: Math.round(breakdown.memoryFiles.percent), color: 'text-orange-400' },
          { count: Math.round(breakdown.messages.percent / 3), color: 'text-purple-400' },
          { count: Math.round(breakdown.freeSpace.percent / 2), color: 'text-neutral-500' },
          { count: Math.round(breakdown.autocompact.percent), color: 'text-neutral-700' }
        ];

        for (const seg of segments) {
          for (let i = 0; i < seg.count && filled < totalCells; i++) {
            grid.push(seg.color);
            filled++;
          }
        }
        while (filled < totalCells) {
          grid.push('text-neutral-700');
          filled++;
        }
        return grid;
      };

      const grid = generateGrid();

      // Calculate position to keep popup in viewport
      const popupStyle = {
        left: Math.min(position.x, window.innerWidth - 420),
        top: Math.min(position.y + 10, window.innerHeight - 500)
      };

      return (
        <div
          className="fixed z-[100] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-5 min-w-96"
          style={popupStyle}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
            <span className="text-sm font-medium text-white">Context Usage</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: modelInfo.color }} />
              <span className="text-xs text-neutral-400">{modelInfo.name}</span>
            </div>
          </div>

          {/* Main stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold" style={{ color: contextUsed > 80 ? '#f87171' : contextUsed > 50 ? '#fbbf24' : '#4ade80' }}>
              {contextUsed}%
            </div>
            <div className="text-xs text-neutral-400">
              <div>{(usedTokens / 1000).toFixed(1)}k / {(maxTokens / 1000).toFixed(0)}k tokens</div>
              <div className="text-neutral-500">~{Math.round((maxTokens - usedTokens) / 1000)}k remaining</div>
            </div>
          </div>

          {/* Visual grid */}
          <div className="grid grid-cols-10 gap-0.5 mb-4 p-2 bg-neutral-800/50 rounded-lg">
            {grid.map((color, i) => (
              <span key={i} className={`text-xs ${color}`}>⛁</span>
            ))}
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-blue-400">⛁</span>
                <span className="text-neutral-300">System prompt</span>
              </span>
              <span className="text-neutral-500">{(breakdown.systemPrompt.tokens / 1000).toFixed(1)}k ({breakdown.systemPrompt.percent}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-cyan-400">⛁</span>
                <span className="text-neutral-300">System tools</span>
              </span>
              <span className="text-neutral-500">{(breakdown.systemTools.tokens / 1000).toFixed(1)}k ({breakdown.systemTools.percent}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-orange-400">⛁</span>
                <span className="text-neutral-300">Memory files</span>
              </span>
              <span className="text-neutral-500">{breakdown.memoryFiles.tokens} ({breakdown.memoryFiles.percent}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-purple-400">⛁</span>
                <span className="text-neutral-300">Messages</span>
              </span>
              <span className="text-neutral-500">{(breakdown.messages.tokens / 1000).toFixed(1)}k ({breakdown.messages.percent.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-neutral-500">⛶</span>
                <span className="text-neutral-300">Free space</span>
              </span>
              <span className="text-neutral-500">{(breakdown.freeSpace.tokens / 1000).toFixed(0)}k ({breakdown.freeSpace.percent.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span className="flex items-center gap-2">
                <span>⛝</span>
                <span>Autocompact buffer</span>
              </span>
              <span>{(breakdown.autocompact.tokens / 1000).toFixed(1)}k ({breakdown.autocompact.percent}%)</span>
            </div>
          </div>

          {/* Memory files section */}
          <div className="mt-4 pt-3 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-neutral-400 font-medium">Memory files</span>
              <span className="text-neutral-600">/memory</span>
            </div>
            <div className="text-xs text-neutral-500 pl-2 border-l border-neutral-700">
              └ Project (CLAUDE.md): <span className="text-neutral-400">54 tokens</span>
            </div>
          </div>
        </div>
      );
    }
