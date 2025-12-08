    // Project Detail View
    function ProjectDetailView({ project, onClose, onEdit, onOpenSession }) {
      const [activeTab, setActiveTab] = useState('overview');
      const preset = PRESETS.find(p => p.id === project.preset);

      const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'sessions', label: 'Sessions' },
        { id: 'github', label: 'GitHub' },
        { id: 'history', label: 'History' }
      ];

      return (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-medium"
                     style={{ background: preset?.color || '#6b7280' }}>
                  {preset?.icon || '?'}
                </div>
                <div>
                  <h2 className="font-semibold text-white">{project.name}</h2>
                  <p className="text-xs text-neutral-500">{project.path}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => onEdit(project)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors"
            >
              Edit Project
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 py-2 border-b border-neutral-800">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
                    <div className="text-2xl font-semibold text-white">{project.stats?.totalSessions || 0}</div>
                    <div className="text-sm text-neutral-400">Total Sessions</div>
                  </div>
                  <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
                    <div className="text-2xl font-semibold text-white">{project.stats?.totalMessages || 0}</div>
                    <div className="text-sm text-neutral-400">Messages</div>
                  </div>
                  <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
                    <div className="text-2xl font-semibold text-white">{project.stats?.filesModified || 0}</div>
                    <div className="text-sm text-neutral-400">Files Modified</div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-white mb-4">Project Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Preset</span>
                      <span className="text-neutral-200">{preset?.name || 'Custom'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Last Opened</span>
                      <span className="text-neutral-200">{project.lastOpened}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Active Sessions</span>
                      <span className="text-neutral-200">{project.sessions.filter(s => s.status === 'running' || s.status === 'waiting').length}</span>
                    </div>
                    {project.github && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Repository</span>
                          <span className="text-neutral-200 font-mono text-xs">{project.github.repo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Branch</span>
                          <span className="text-neutral-200 font-mono text-xs">{project.github.branch}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                {project.chatHistory && project.chatHistory.length > 0 && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-white mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {project.chatHistory.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                            item.agent === 'coding' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {item.agent === 'coding' ? 'C' : 'R'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-neutral-300 truncate">{item.message}</p>
                            <p className="text-xs text-neutral-500">{item.sessionName} - {item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-3">
                {project.sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-neutral-400">No sessions yet</p>
                    <p className="text-sm text-neutral-500">Start a new session to begin coding</p>
                  </div>
                ) : (
                  project.sessions.map(session => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl hover:border-neutral-600 transition-colors cursor-pointer"
                      onClick={() => onOpenSession(project, session)}
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status={session.status} />
                        <div>
                          <div className="text-sm font-medium text-white">{session.name}</div>
                          <div className="text-xs text-neutral-500">
                            {session.agents.map(a => AGENT_TYPES.find(t => t.id === a)?.name).join(', ')}
                          </div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'github' && (
              <div className="space-y-4">
                {project.github ? (
                  <>
                    {/* Repository Info & Branch Actions */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          <div>
                            <div className="text-sm font-medium text-white">{project.github.repo}</div>
                            <div className="text-xs text-neutral-500">Repository</div>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          Open in IDE
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-neutral-800 rounded-lg">
                          <div className="text-xs text-neutral-400 mb-1">Current Branch</div>
                          <div className="text-sm text-white font-mono">{project.github.branch}</div>
                        </div>
                        <div className="p-3 bg-neutral-800 rounded-lg">
                          <div className="text-xs text-neutral-400 mb-1">Default Branch</div>
                          <div className="text-sm text-white font-mono">{project.github.defaultBranch}</div>
                        </div>
                      </div>

                      {/* Branch Actions */}
                      <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Rebase from {project.github.defaultBranch}
                        </button>
                        <button className="flex-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Merge to {project.github.defaultBranch}
                        </button>
                      </div>
                    </div>

                    {/* Diff Summary */}
                    {project.github.diff && (
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-medium text-white">Changes vs {project.github.defaultBranch}</h3>
                          <button className="text-xs text-blue-400 hover:text-blue-300">View Full Diff</button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-neutral-800 rounded-lg text-center">
                            <div className="text-lg font-semibold text-white">{project.github.diff.filesChanged}</div>
                            <div className="text-xs text-neutral-400">Files Changed</div>
                          </div>
                          <div className="p-3 bg-neutral-800 rounded-lg text-center">
                            <div className="text-lg font-semibold text-green-400">+{project.github.diff.additions}</div>
                            <div className="text-xs text-neutral-400">Additions</div>
                          </div>
                          <div className="p-3 bg-neutral-800 rounded-lg text-center">
                            <div className="text-lg font-semibold text-red-400">-{project.github.diff.deletions}</div>
                            <div className="text-xs text-neutral-400">Deletions</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-white mb-4">Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-sm text-neutral-300">Uncommitted Changes</span>
                          <span className={`text-sm font-medium ${project.github.uncommittedChanges > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                            {project.github.uncommittedChanges} files
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-sm text-neutral-300">Ahead / Behind</span>
                          <span className="text-sm">
                            <span className={project.github.aheadBehind.ahead > 0 ? 'text-green-400' : 'text-neutral-400'}>
                              +{project.github.aheadBehind.ahead}
                            </span>
                            <span className="text-neutral-500 mx-1">/</span>
                            <span className={project.github.aheadBehind.behind > 0 ? 'text-red-400' : 'text-neutral-400'}>
                              -{project.github.aheadBehind.behind}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Commits / Checkpoints */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-white mb-4">Commits</h3>
                      <div className="space-y-2">
                        {(project.github.commits || []).map((commit, index) => (
                          <div key={commit.hash} className="group relative">
                            {/* Timeline connector */}
                            {index < (project.github.commits?.length || 0) - 1 && (
                              <div className="absolute left-4 top-8 bottom-0 w-px bg-neutral-700" />
                            )}
                            <div className="flex items-start gap-3 p-3 bg-neutral-800 hover:bg-neutral-750 rounded-lg transition-colors">
                              {/* Commit indicator */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 ${
                                commit.isCheckpoint
                                  ? 'bg-purple-500/20 border-2 border-purple-500'
                                  : 'bg-neutral-700'
                              }`}>
                                {commit.isCheckpoint ? (
                                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                                  </svg>
                                )}
                              </div>

                              {/* Commit info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm text-neutral-200 truncate">{commit.message}</p>
                                  {commit.isCheckpoint && (
                                    <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">checkpoint</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                  <span className="font-mono">{commit.hash}</span>
                                  <span>by {commit.author}</span>
                                  <span>{commit.time}</span>
                                </div>
                              </div>

                              {/* Actions - show on hover */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                                  title="Create branch from this commit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                  </svg>
                                </button>
                                <button
                                  className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-orange-400"
                                  title="Restore to this checkpoint"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {(!project.github.commits || project.github.commits.length === 0) && (
                        <div className="text-center py-6 text-neutral-500 text-sm">
                          No commits yet
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <svg className="w-6 h-6 text-neutral-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <p className="text-neutral-400">No GitHub repository linked</p>
                    <p className="text-sm text-neutral-500">Connect a repository in project settings</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {project.chatHistory && project.chatHistory.length > 0 ? (
                  project.chatHistory.map(item => (
                    <div key={item.id} className="p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                          item.agent === 'coding' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                          {item.agent === 'coding' ? 'C' : 'R'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-neutral-300">{item.sessionName}</span>
                            <span className="text-xs text-neutral-500">{item.time}</span>
                          </div>
                          <p className="text-sm text-neutral-200">{item.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                      <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-neutral-400">No chat history yet</p>
                    <p className="text-sm text-neutral-500">Start a session to see activity here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
