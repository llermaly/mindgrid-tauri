    // File Navigation for diffs/code
    function FileNavigation({ files, activeFile, onSelect }) {
      if (files.length === 0) return null;

      return (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-800 bg-neutral-800/50 overflow-x-auto">
          <span className="text-xs text-neutral-500 mr-1">Files:</span>
          {files.map(file => (
            <button
              key={file}
              onClick={() => onSelect(file)}
              className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                activeFile === file
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              {file.split('/').pop()}
            </button>
          ))}
        </div>
      );
    }

    // Agent Panel - new version with rich messages
    function AgentPanel({ agentType, data, panelId, onModelChange, onToggleThinking, onNewChat, onSendMessage }) {
      const [input, setInput] = useState("");
      const [showModelMenu, setShowModelMenu] = useState(false);
      const [filters, setFilters] = useState(['text']);
      const [showFilters, setShowFilters] = useState(false);
      const [showFiles, setShowFiles] = useState(false);
      const [collapsedMessages, setCollapsedMessages] = useState(() => {
        // Collapse thinking and tool_result by default
        return new Set(data.messages.filter(m => m.type === 'thinking' || m.type === 'tool_result').map(m => m.id));
      });
      const [activeFile, setActiveFile] = useState(null);
      const [showCompareDialog, setShowCompareDialog] = useState(false);
      const [comparePrompt, setComparePrompt] = useState("");
      const [attachedImages, setAttachedImages] = useState([]);
      const [isRecording, setIsRecording] = useState(false);
      const [showContextPopup, setShowContextPopup] = useState(false);
      const [contextPopupPos, setContextPopupPos] = useState({ x: 0, y: 0 });
      const layout = useLayout();
      const agent = AGENT_TYPES[agentType];
      const messagesEndRef = useRef(null);

      // Count messages by type
      const messageCounts = data.messages.reduce((acc, msg) => {
        acc[msg.type] = (acc[msg.type] || 0) + 1;
        return acc;
      }, {});

      // Get unique files from diffs and code blocks
      const filesWithChanges = [...new Set(
        data.messages
          .filter(m => m.type === 'diff' || m.type === 'code')
          .map(m => m.file)
          .filter(Boolean)
      )];

      // Filter messages - user messages always visible
      const filteredMessages = data.messages.filter(msg => {
        // User messages are always shown
        if (msg.type === 'user') return true;
        if (filters.includes('all')) return true;
        if (filters.includes('tool') && (msg.type === 'tool_call' || msg.type === 'tool_result')) return true;
        if (activeFile && (msg.type === 'diff' || msg.type === 'code') && msg.file === activeFile) return true;
        return filters.includes(msg.type);
      });

      const handleBranch = (messageId) => {
        alert(`Branch from message ${messageId} - This would create a new conversation branch`);
      };

      const handleToggleCollapse = (messageId) => {
        setCollapsedMessages(prev => {
          const next = new Set(prev);
          if (next.has(messageId)) {
            next.delete(messageId);
          } else {
            next.add(messageId);
          }
          return next;
        });
      };

      const handleCompare = (prompt) => {
        setComparePrompt(prompt);
        setShowCompareDialog(true);
      };

      const handleUseResponse = (modelId, content) => {
        // Add the response to the conversation
        alert(`Using response from ${modelId}. This would add the response to the conversation.`);
        setShowCompareDialog(false);
      };

      const handleSend = () => {
        if (!input.trim() && attachedImages.length === 0) return;
        onSendMessage?.({
          content: input.trim(),
          images: attachedImages.map(img => img.file)
        });
        setInput("");
        setAttachedImages([]);
      };

      const extraControls = (
        <div className="flex items-center gap-0.5">
          {/* Filter toggle */}
          {data.messages.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}
              title="Filter messages"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          )}
          {/* Files toggle */}
          {filesWithChanges.length > 0 && (
            <button
              onClick={() => setShowFiles(!showFiles)}
              className={`p-1.5 rounded transition-colors ${showFiles ? 'bg-blue-600 text-white' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}
              title={`${filesWithChanges.length} files changed`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="px-2 py-1 hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5 border border-neutral-700 hover:border-neutral-600"
              title="Change model"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: MODELS.find(m => m.id === data.model)?.color }} />
              <span className="text-xs font-medium text-neutral-300">
                {MODELS.find(m => m.id === data.model)?.name?.split(' ')[1] || 'Model'}
              </span>
              <svg className="w-3 h-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModelMenu && (
              <div className="absolute top-full right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 py-1 min-w-40">
                {MODELS.map(model => (
                  <button
                    key={model.id}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-700 flex items-center gap-2"
                    onClick={() => { onModelChange?.(model.id); setShowModelMenu(false); }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: model.color }} />
                    {model.name}
                    {data.model === model.id && <span className="ml-auto text-blue-400">{Icons.check({ className: "w-4 h-4" })}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );

      return (
        <div className="h-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/50 cursor-pointer select-none"
            onDoubleClick={() => layout?.toggleMaximize(panelId)}
          >
            <div className="flex items-center gap-2">
              <span className={agent.color}>{Icons[agent.icon] && Icons[agent.icon]({ className: "w-4 h-4" })}</span>
              <span className={`font-medium text-sm ${agent.color}`}>{agent.name}</span>
              <StatusBadge status={data.status} />
              {/* Session info */}
              <div className="flex items-center gap-2 ml-2 text-xs text-neutral-500">
                <div
                  className="relative"
                  onMouseEnter={(e) => {
                    setContextPopupPos({ x: e.clientX, y: e.clientY });
                    setShowContextPopup(true);
                  }}
                  onMouseLeave={() => setShowContextPopup(false)}
                >
                  <span className={`flex items-center gap-1 cursor-help px-1.5 py-0.5 rounded hover:bg-neutral-800 transition-colors ${data.contextUsed > 80 ? 'text-red-400' : data.contextUsed > 50 ? 'text-yellow-400' : 'text-neutral-400'}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    {data.contextUsed}%
                  </span>
                  {showContextPopup && (
                    <ContextUsagePopup contextUsed={data.contextUsed} model={data.model} position={contextPopupPos} />
                  )}
                </div>
                <span className="text-neutral-700">|</span>
                <button
                  onClick={() => onToggleThinking?.()}
                  className={`flex items-center gap-1 hover:opacity-80 transition-opacity ${data.thinkingMode ? 'text-purple-400' : 'text-neutral-600'}`}
                  title={data.thinkingMode ? 'Click to disable thinking mode' : 'Click to enable thinking mode'}
                >
                  {Icons.thinking({ className: "w-3.5 h-3.5" })} {data.thinkingMode ? 'on' : 'off'}
                </button>
                <span className="text-neutral-700">|</span>
                <button
                  onClick={() => onNewChat?.()}
                  className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                  title="Start new chat (reset context)"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  new
                </button>
              </div>
            </div>
            <PanelControls panelId={panelId} extraControls={extraControls} />
          </div>

          {/* Filter bar - hidden by default, click filter icon to show */}
          {data.messages.length > 0 && showFilters && (
            <MessageFilterBar
              filters={filters}
              onChange={setFilters}
              messageCounts={messageCounts}
              expanded={showFilters}
              onToggleExpand={() => setShowFilters(false)}
            />
          )}

          {/* File navigation - hidden by default */}
          {filesWithChanges.length > 0 && showFiles && (
            <FileNavigation files={filesWithChanges} activeFile={activeFile} onSelect={setActiveFile} />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1 relative">
            {data.messages.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <span className={`mb-2 block ${agent.color}`}>{Icons[agent.icon] && Icons[agent.icon]({ className: "w-10 h-10 mx-auto" })}</span>
                <p className="text-sm">{agent.description}</p>
                <p className="text-xs mt-1">Send a message to start</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                <p className="text-sm">No messages match your filter</p>
                <button
                  onClick={() => setFilters(['all'])}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                >
                  Show all messages
                </button>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  onBranch={handleBranch}
                  onToggleCollapse={handleToggleCollapse}
                  isCollapsed={collapsedMessages.has(msg.id)}
                  onCompare={handleCompare}
                />
              ))
            )}
            {data.status === "thinking" && (
              <div className="flex items-center gap-2 text-purple-400 text-sm px-3 py-2 bg-purple-500/10 rounded-lg">
                <span className="animate-pulse-dot">●</span> Thinking...
              </div>
            )}
            {data.status === "coding" && (
              <div className="flex items-center gap-2 text-blue-400 text-sm px-3 py-2 bg-blue-500/10 rounded-lg">
                <span className="animate-pulse-dot">●</span> Writing code...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-neutral-800">
            {/* Attached images preview */}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {attachedImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.preview} alt="attached" className="w-16 h-16 object-cover rounded-lg border border-neutral-700" />
                    <button
                      onClick={() => setAttachedImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              {/* Image upload */}
              <label className="p-2 hover:bg-neutral-800 rounded-lg cursor-pointer text-neutral-400 hover:text-white transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setAttachedImages(prev => [...prev, { file, preview: ev.target.result }]);
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                  }}
                />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </label>
              {/* Microphone button */}
              <button
                onClick={() => {
                  setIsRecording(!isRecording);
                  if (!isRecording) {
                    // Dummy: simulate recording for 3 seconds
                    setTimeout(() => setIsRecording(false), 3000);
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title={isRecording ? "Recording... (click to stop)" : "Start voice input"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${agent.name.toLowerCase()}...`}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500 min-h-[40px] max-h-[120px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() && attachedImages.length === 0}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>

          {/* Compare Models Dialog */}
          <CompareModelsDialog
            isOpen={showCompareDialog}
            onClose={() => setShowCompareDialog(false)}
            prompt={comparePrompt}
            onUseResponse={handleUseResponse}
          />
        </div>
      );
    }
