    function App() {
      const [projects, setProjects] = useState(DUMMY_PROJECTS);
      const [showCreateDialog, setShowCreateDialog] = useState(false);
      const [editingProject, setEditingProject] = useState(null);
      const [selectedProject, setSelectedProject] = useState(null);
      const [searchQuery, setSearchQuery] = useState('');
      const [activeView, setActiveView] = useState('all'); // 'all', 'recent', 'active', 'archived'

      // Get all active projects (not archived)
      const activeProjects = projects.filter(p => !p.isArchived);

      // Get archived projects
      const archivedProjects = projects.filter(p => p.isArchived);

      // Get all active sessions across all projects
      const allActiveSessions = activeProjects.flatMap(project =>
        project.sessions
          .filter(s => s.status === 'running' || s.status === 'waiting')
          .map(session => ({ ...session, project }))
      );

      // Get recent activity (chat messages from all projects, sorted by recency)
      const recentActivity = activeProjects
        .flatMap(project =>
          (project.chatHistory || []).map(chat => ({ ...chat, project }))
        )
        .sort((a, b) => {
          // Simple sort by time string - in real app would use timestamps
          const timeOrder = { 'min': 1, 'hour': 2, 'day': 3, 'Yesterday': 4 };
          const getOrder = (time) => {
            if (time.includes('min')) return 1;
            if (time.includes('hour')) return 2;
            if (time.includes('day')) return 3;
            return 4;
          };
          return getOrder(a.time) - getOrder(b.time);
        })
        .slice(0, 20);

      const filteredProjects = activeProjects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const handleOpenProject = (project) => {
        // Show project detail view
        setSelectedProject(project);
      };

      const handleDetachProject = (project) => {
        // Mark project as detached
        setProjects(prev => prev.map(p =>
          p.id === project.id ? { ...p, isDetached: true } : p
        ));

        // Open in new window with project info
        const windowFeatures = 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no';
        const newWindow = window.open('ui-prototype.html', `project-${project.id}`, windowFeatures);

        // When window closes, mark project as not detached
        if (newWindow) {
          const checkClosed = setInterval(() => {
            if (newWindow.closed) {
              clearInterval(checkClosed);
              setProjects(prev => prev.map(p =>
                p.id === project.id ? { ...p, isDetached: false } : p
              ));
            }
          }, 1000);
        }
      };

      const handleOpenSession = (project, session) => {
        // Open a specific session in a new window
        const windowFeatures = 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no';
        const newWindow = window.open(
          `ui-prototype.html?project=${project.id}&session=${session.id}`,
          `session-${session.id}`,
          windowFeatures
        );
      };

      const handleMultitask = (project) => {
        // Open all sessions in separate windows (multitasking mode)
        const windowFeatures = 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no';
        const screenWidth = window.screen.availWidth;
        const screenHeight = window.screen.availHeight;
        const windowWidth = 1200;
        const windowHeight = 800;

        project.sessions.forEach((session, index) => {
          // Cascade windows slightly
          const left = (index % 3) * 100 + 50;
          const top = Math.floor(index / 3) * 100 + 50;

          window.open(
            `ui-prototype.html?project=${project.id}&session=${session.id}`,
            `session-${session.id}`,
            `${windowFeatures},left=${left},top=${top}`
          );
        });

        // Mark project as in multitasking mode
        setProjects(prev => prev.map(p =>
          p.id === project.id ? { ...p, isDetached: true } : p
        ));
      };

      const handleCreateComplete = ({ preset, config, isOpenExisting, existingPath }) => {
        const newProject = {
          id: Date.now(),
          name: config.projectName || 'New Project',
          path: isOpenExisting ? existingPath : `/Users/dev/projects/${config.projectName?.toLowerCase().replace(/\s+/g, '-') || 'new-project'}`,
          preset: preset.id,
          sessions: config.variants.map((v, i) => ({
            id: Date.now() + i,
            name: v.name,
            status: 'idle',
            agents: v.agents
          })),
          lastOpened: 'Just now',
          isDetached: false,
          isExisting: isOpenExisting || false,
          github: isOpenExisting ? {
            repo: '',
            branch: 'main',
            defaultBranch: 'main',
            lastCommit: null,
            uncommittedChanges: 0,
            aheadBehind: { ahead: 0, behind: 0 }
          } : null,
          chatHistory: [],
          stats: { totalSessions: 0, totalMessages: 0, filesModified: 0 }
        };
        setProjects([newProject, ...projects]);
        setShowCreateDialog(false);
      };

      const handleEditProject = (project) => {
        setEditingProject(project);
      };

      const handleSaveProject = (updatedProject) => {
        setProjects(prev => prev.map(p =>
          p.id === updatedProject.id ? { ...p, ...updatedProject } : p
        ));
        setEditingProject(null);
      };

      const handleDeleteProject = (project) => {
        setProjects(prev => prev.filter(p => p.id !== project.id));
        setEditingProject(null);
      };

      const handleArchiveProject = (project) => {
        setProjects(prev => prev.map(p =>
          p.id === project.id ? { ...p, isArchived: true } : p
        ));
        setEditingProject(null);
        setSelectedProject(null);
      };

      const handleRestoreProject = (project) => {
        setProjects(prev => prev.map(p =>
          p.id === project.id ? { ...p, isArchived: false } : p
        ));
      };

      return (
        <div className="h-screen flex flex-col">
          {/* Title Bar */}
          <div className="h-12 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-lg font-semibold">Multitable</span>
              <span className="text-xs text-neutral-500 px-2 py-0.5 bg-neutral-800 rounded">Dashboard</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-64 px-3 py-1.5 pl-9 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-colors"
              >
                <span className="text-emerald-400">+</span> New Project
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar */}
            <div className="w-56 border-r border-neutral-800 p-4 flex flex-col">
              <nav className="space-y-1">
                <button
                  onClick={() => { setActiveView('all'); setSelectedProject(null); }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-2 transition-colors ${
                    activeView === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  All Projects
                  <span className="ml-auto text-xs text-neutral-500">{activeProjects.length}</span>
                </button>
                <button
                  onClick={() => { setActiveView('recent'); setSelectedProject(null); }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-2 transition-colors ${
                    activeView === 'recent' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Activity
                </button>
                <button
                  onClick={() => { setActiveView('active'); setSelectedProject(null); }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-2 transition-colors ${
                    activeView === 'active' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Active Sessions
                  {allActiveSessions.length > 0 && (
                    <span className="ml-auto flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot" />
                      <span className="text-xs text-blue-400">{allActiveSessions.length}</span>
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setActiveView('archived'); setSelectedProject(null); }}
                  className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-2 transition-colors ${
                    activeView === 'archived' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Archived
                  {archivedProjects.length > 0 && (
                    <span className="ml-auto text-xs text-neutral-500">{archivedProjects.length}</span>
                  )}
                </button>
              </nav>

              <div className="mt-auto pt-4 border-t border-neutral-800">
                <a href="settings.html" className="w-full px-3 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/50 text-left text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </a>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
              {selectedProject ? (
                <ProjectDetailView
                  project={selectedProject}
                  onClose={() => setSelectedProject(null)}
                  onEdit={(project) => {
                    setEditingProject(project);
                  }}
                  onOpenSession={handleOpenSession}
                />
              ) : (
                <div className="h-full overflow-y-auto scrollbar-thin p-6">
                  <div className="max-w-4xl mx-auto">
                    {/* All Projects View */}
                    {activeView === 'all' && (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h1 className="text-2xl font-semibold text-white">Projects</h1>
                          <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <span>{filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {filteredProjects.length === 0 ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                              <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
                            <p className="text-neutral-400 mb-6">Create your first project to get started</p>
                            <button
                              onClick={() => setShowCreateDialog(true)}
                              className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-lg font-medium text-white transition-colors"
                            >
                              Create Project
                            </button>
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            {filteredProjects.map(project => (
                              <ProjectCard
                                key={project.id}
                                project={project}
                                onOpen={handleOpenProject}
                                onDetach={handleDetachProject}
                                onOpenSession={handleOpenSession}
                                onMultitask={handleMultitask}
                                onEdit={handleEditProject}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Recent Activity View */}
                    {activeView === 'recent' && (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h1 className="text-2xl font-semibold text-white">Recent Activity</h1>
                        </div>

                        {recentActivity.length === 0 ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                              <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No recent activity</h3>
                            <p className="text-neutral-400">Start a session to see activity here</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {recentActivity.map((item, index) => {
                              const preset = PRESETS.find(p => p.id === item.project.preset);
                              return (
                                <div
                                  key={`${item.project.id}-${item.id}-${index}`}
                                  className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors cursor-pointer"
                                  onClick={() => handleOpenProject(item.project)}
                                >
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
                                      <p className="text-sm text-neutral-200 mb-2">{item.message}</p>
                                      <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded flex items-center justify-center text-xs"
                                             style={{ background: preset?.color || '#6b7280' }}>
                                          {preset?.icon || '?'}
                                        </div>
                                        <span className="text-xs text-neutral-500">{item.project.name}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {/* Active Sessions View */}
                    {activeView === 'active' && (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h1 className="text-2xl font-semibold text-white">Active Sessions</h1>
                          <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-dot" />
                            <span>{allActiveSessions.length} active</span>
                          </div>
                        </div>

                        {allActiveSessions.length === 0 ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                              <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No active sessions</h3>
                            <p className="text-neutral-400">All sessions are idle or completed</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Group by project */}
                            {activeProjects
                              .filter(project => project.sessions.some(s => s.status === 'running' || s.status === 'waiting'))
                              .map(project => {
                                const preset = PRESETS.find(p => p.id === project.preset);
                                const activeSessions = project.sessions.filter(s => s.status === 'running' || s.status === 'waiting');
                                return (
                                  <div key={project.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                                    <div
                                      className="flex items-center gap-3 p-4 border-b border-neutral-800 cursor-pointer hover:bg-neutral-800/50 transition-colors"
                                      onClick={() => handleOpenProject(project)}
                                    >
                                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                           style={{ background: preset?.color || '#6b7280' }}>
                                        {preset?.icon || '?'}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-white">{project.name}</div>
                                        <div className="text-xs text-neutral-500">{project.path}</div>
                                      </div>
                                      <span className="text-xs text-blue-400">{activeSessions.length} active</span>
                                    </div>
                                    <div className="divide-y divide-neutral-800">
                                      {activeSessions.map(session => (
                                        <div
                                          key={session.id}
                                          className="flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                                          onClick={() => handleOpenSession(project, session)}
                                        >
                                          <div className="flex items-center gap-3">
                                            <StatusBadge status={session.status} />
                                            <div>
                                              <div className="text-sm text-white">{session.name}</div>
                                              <div className="text-xs text-neutral-500">
                                                {session.agents.map(a => AGENT_TYPES.find(t => t.id === a)?.name).join(', ')}
                                              </div>
                                            </div>
                                          </div>
                                          <button className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    )}

                    {/* Archived View */}
                    {activeView === 'archived' && (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h1 className="text-2xl font-semibold text-white">Archived Projects</h1>
                          <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <span>{archivedProjects.length} archived</span>
                          </div>
                        </div>

                        {archivedProjects.length === 0 ? (
                          <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                              <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No archived projects</h3>
                            <p className="text-neutral-400">Archived projects will appear here</p>
                          </div>
                        ) : (
                          <div className="grid gap-4">
                            {archivedProjects.map(project => {
                              const preset = PRESETS.find(p => p.id === project.preset);
                              return (
                                <div key={project.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 opacity-75 hover:opacity-100 transition-opacity">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                           style={{ background: preset?.color || '#6b7280' }}>
                                        {preset?.icon || '?'}
                                      </div>
                                      <div>
                                        <h3 className="font-medium text-white">{project.name}</h3>
                                        <p className="text-xs text-neutral-500">{project.path}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleRestoreProject(project)}
                                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white transition-colors flex items-center gap-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                        Restore
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to permanently delete "${project.name}"?`)) {
                                            handleDeleteProject(project);
                                          }
                                        }}
                                        className="p-1.5 hover:bg-red-600/20 rounded text-neutral-400 hover:text-red-400 transition-colors"
                                        title="Delete permanently"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 mt-3 text-sm text-neutral-500">
                                    <span>{project.sessions.length} session{project.sessions.length !== 1 ? 's' : ''}</span>
                                    <span>Last opened: {project.lastOpened}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create Dialog */}
          <CreateProjectDialog
            isOpen={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onComplete={handleCreateComplete}
          />

          {/* Edit Dialog */}
          <EditProjectDialog
            isOpen={!!editingProject}
            project={editingProject}
            onClose={() => setEditingProject(null)}
            onSave={handleSaveProject}
            onDelete={handleDeleteProject}
            onArchive={handleArchiveProject}
          />
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  
