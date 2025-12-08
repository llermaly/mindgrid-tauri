    // Git Panel
    function GitPanel({ data, onCommit, onShowReview, panelId }) {
      const layout = useLayout();
      const [commitMessage, setCommitMessage] = useState("");
      const hasChanges = data.changedFiles.length > 0;

      const totalAdditions = data.changedFiles.reduce((sum, f) => sum + f.additions, 0);
      const totalDeletions = data.changedFiles.reduce((sum, f) => sum + f.deletions, 0);

      return (
        <div className="h-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/50 cursor-pointer select-none"
            onDoubleClick={() => layout?.toggleMaximize(panelId)}
          >
            <div className="flex items-center gap-2">
              {Icons.git({ className: "w-4 h-4 text-orange-400" })}
              <span className="font-medium text-sm">Git Changes</span>
              {hasChanges && (
                <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
                  {data.changedFiles.length} files
                </span>
              )}
            </div>
            <PanelControls panelId={panelId} />
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {!hasChanges ? (
              <div className="text-center text-neutral-500 py-8">
                <div className="mb-2">{Icons.check({ className: "w-8 h-8 mx-auto text-green-400" })}</div>
                <p className="text-sm">Working tree clean</p>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-400">+{totalAdditions}</span>
                  <span className="text-red-400">-{totalDeletions}</span>
                  <span className="text-neutral-400">{data.changedFiles.length} files</span>
                </div>

                {/* File list */}
                <div className="space-y-1">
                  {data.changedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-800 rounded text-sm">
                      <span className={`text-xs px-1 rounded ${
                        file.status === 'added' ? 'bg-green-500/20 text-green-400' :
                        file.status === 'modified' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {file.status === 'added' ? 'A' : file.status === 'modified' ? 'M' : 'D'}
                      </span>
                      <span className="flex-1 truncate text-neutral-300 font-mono text-xs">{file.path}</span>
                      <span className="text-xs text-green-400">+{file.additions}</span>
                      <span className="text-xs text-red-400">-{file.deletions}</span>
                    </div>
                  ))}
                </div>

                {/* Commit area */}
                <div className="pt-3 border-t border-neutral-800">
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message..."
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={onShowReview}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {Icons.review({ className: "w-4 h-4" })} Review First
                    </button>
                    <button
                      onClick={() => onCommit(commitMessage)}
                      disabled={!commitMessage.trim()}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                        commitMessage.trim()
                          ? 'bg-green-600 hover:bg-green-500'
                          : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      Commit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Foundations Panel
    function FoundationsPanel({ data, panelId }) {
      const [activeFile, setActiveFile] = useState(data.activeFile);
      const [content, setContent] = useState(data.files[activeFile]);
      const [view, setView] = useState('files'); // 'files', 'progress', 'features'
      const files = Object.keys(data.files);
      const layout = useLayout();

      useEffect(() => {
        setContent(data.files[activeFile]);
      }, [activeFile, data.files]);

      // File type icons and colors
      const fileConfig = {
        "CLAUDE.md": { icon: "📋", color: "text-blue-400", desc: "Project context" },
        "progress.txt": { icon: "📝", color: "text-purple-400", desc: "Session log" },
        "features.json": { icon: "✓", color: "text-green-400", desc: "Feature tests" },
        "init.sh": { icon: "⚡", color: "text-yellow-400", desc: "Setup script" }
      };

      const featureProgress = data.features ? Math.round((data.features.passing / data.features.total) * 100) : 0;

      return (
        <div className="h-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/50 cursor-pointer select-none"
            onDoubleClick={() => layout?.toggleMaximize(panelId)}
          >
            <div className="flex items-center gap-2">
              {Icons.foundations({ className: "w-4 h-4 text-yellow-400" })}
              <span className="font-medium text-sm text-yellow-400">Foundations</span>
              {data.features && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                  {data.features.passing}/{data.features.total} features
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setView('files'); }}
                className={`p-1.5 rounded text-xs ${view === 'files' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                title="Context files"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setView('progress'); }}
                className={`p-1.5 rounded text-xs ${view === 'progress' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                title="Session history"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setView('features'); }}
                className={`p-1.5 rounded text-xs ${view === 'features' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                title="Feature tests"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>
              <PanelControls panelId={panelId} />
            </div>
          </div>

          {/* Files View */}
          {view === 'files' && (
            <>
              {/* File tabs */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-800 bg-neutral-800/30 overflow-x-auto">
                {files.map(file => {
                  const config = fileConfig[file] || { icon: "📄", color: "text-neutral-400", desc: file };
                  return (
                    <button
                      key={file}
                      onClick={() => setActiveFile(file)}
                      className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                        activeFile === file
                          ? "bg-neutral-700 text-white"
                          : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                      }`}
                      title={config.desc}
                    >
                      <span>{config.icon}</span>
                      <span>{file}</span>
                    </button>
                  );
                })}
                <button className="p-1 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded" title="Add file">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* File content */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full bg-transparent text-sm font-mono text-neutral-300 resize-none focus:outline-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
            </>
          )}

          {/* Progress/Sessions View */}
          {view === 'progress' && (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
              <div className="space-y-2">
                <div className="text-xs text-neutral-500 uppercase tracking-wide mb-3">Agent Sessions</div>
                {data.sessions?.map((session, i) => (
                  <div key={session.id} className={`p-2.5 rounded-lg border ${i === 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-neutral-800/50 border-neutral-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          session.agent === 'coding' ? 'bg-blue-500/20 text-blue-400' :
                          session.agent === 'research' ? 'bg-green-500/20 text-green-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {session.agent}
                        </span>
                        <span className="text-xs text-neutral-500">Session #{session.id}</span>
                      </div>
                      <span className="text-xs text-neutral-500">{session.time}</span>
                    </div>
                    <div className="text-sm text-neutral-300">{session.task}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-xs text-neutral-500 capitalize">{session.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features View */}
          {view === 'features' && (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-400">Feature Progress</span>
                  <span className="text-green-400">{featureProgress}%</span>
                </div>
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${featureProgress}%` }} />
                </div>
              </div>

              {/* Feature list from JSON */}
              <div className="space-y-1.5">
                <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Feature Tests</div>
                {(() => {
                  try {
                    const features = JSON.parse(data.files["features.json"] || "[]");
                    return features.map(f => (
                      <div key={f.id} className="flex items-center gap-2 p-2 bg-neutral-800/50 rounded text-sm">
                        <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs ${
                          f.passes ? 'bg-green-500/20 text-green-400' : 'bg-neutral-700 text-neutral-500'
                        }`}>
                          {f.passes ? '✓' : '○'}
                        </span>
                        <span className={f.passes ? 'text-neutral-300' : 'text-neutral-500'}>{f.name}</span>
                      </div>
                    ));
                  } catch (e) {
                    return <div className="text-xs text-neutral-500">No features defined</div>;
                  }
                })()}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 border-t border-neutral-800 text-xs text-neutral-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
              Shared with all agents
            </span>
            <button className="text-blue-400 hover:text-blue-300">Edit in settings</button>
          </div>
        </div>
      );
    }

    // Browser Panel
    function BrowserPanel({ data, panelId }) {
      const [url, setUrl] = useState(data.url);
      const layout = useLayout();

      return (
        <div className="h-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div
            className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 bg-neutral-900/50 cursor-pointer select-none"
            onDoubleClick={() => layout?.toggleMaximize(panelId)}
          >
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-neutral-800 rounded text-neutral-400" onClick={e => e.stopPropagation()}>←</button>
              <button className="p-1 hover:bg-neutral-800 rounded text-neutral-400" onClick={e => e.stopPropagation()}>→</button>
              <button className="p-1 hover:bg-neutral-800 rounded text-neutral-400" onClick={e => e.stopPropagation()}>↻</button>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-neutral-800 rounded px-2 py-1" onClick={e => e.stopPropagation()}>
              <span className="text-green-500 text-xs">🔒</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <StatusBadge status={data.status} />
            <PanelControls panelId={panelId} />
          </div>

          <div className="flex-1 bg-white flex items-center justify-center">
            <div className="text-center text-neutral-400">
              <div className="mb-4">{Icons.browser({ className: "w-16 h-16 mx-auto text-neutral-300" })}</div>
              <div className="text-lg font-medium text-neutral-600">Browser Preview</div>
              <div className="text-sm text-neutral-500">{url}</div>
            </div>
          </div>

          <div className="px-3 py-2 border-t border-neutral-800 flex items-center justify-end text-xs">
            <span className="text-neutral-500">Console: 0 errors</span>
          </div>
        </div>
      );
    }

    // Terminal Panel
    function TerminalPanel({ lines, panelId }) {
      const [activeTab, setActiveTab] = useState("logs");
      const [terminals, setTerminals] = useState(["Terminal 1", "Terminal 2"]);
      const layout = useLayout();

      const handleCloseTerminal = (e, term) => {
        e.stopPropagation();
        setTerminals(prev => prev.filter(t => t !== term));
        if (activeTab === term.toLowerCase()) {
          setActiveTab("logs");
        }
      };

      const handleAddTerminal = (e) => {
        e.stopPropagation();
        const num = terminals.length + 1;
        const newName = `Terminal ${num}`;
        setTerminals(prev => [...prev, newName]);
        setActiveTab(newName.toLowerCase());
      };

      const allTabs = ["Logs", ...terminals];

      return (
        <div className="h-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between px-2 py-1 border-b border-neutral-800 bg-neutral-900/50 cursor-pointer select-none"
            onDoubleClick={() => layout?.toggleMaximize(panelId)}
          >
            <div className="flex items-center gap-1">
              {allTabs.map(tab => (
                <div
                  key={tab}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors group ${
                    activeTab === tab.toLowerCase()
                      ? "bg-neutral-700 text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveTab(tab.toLowerCase()); }}
                    className="whitespace-nowrap"
                  >
                    {tab}
                  </button>
                  {tab !== "Logs" && (
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
              ))}
              <button
                className="px-2 py-1 text-xs text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                onClick={handleAddTerminal}
                title="New terminal"
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button className="text-xs text-neutral-500 hover:text-white px-2" onClick={e => e.stopPropagation()}>Clear</button>
              <PanelControls panelId={panelId} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 font-mono text-xs bg-black/30">
            {lines.map((line, i) => (
              <div key={i} className="text-green-400 leading-relaxed">{line || " "}</div>
            ))}
            <div className="text-green-400">
              $ <span className="animate-pulse">▊</span>
            </div>
          </div>
        </div>
      );
    }
