    // Project Card
    function ProjectCard({ project, onOpen, onDetach, onOpenSession, onMultitask, onEdit }) {
      const preset = PRESETS.find(p => p.id === project.preset);
      const activeSessions = project.sessions.filter(s => s.status === 'running' || s.status === 'waiting');

      return (
        <div
          className="project-card bg-neutral-900 border border-neutral-800 rounded-xl p-4 group cursor-pointer"
          onClick={() => onOpen(project)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                   style={{ background: preset?.color || '#6b7280' }}>
                {preset?.icon || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-white truncate">{project.name}</h3>
                <p className="text-xs text-neutral-500 truncate">{project.path}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(project); }}
                className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-400"
                title="Edit project settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMultitask?.(project); }}
                className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-purple-400"
                title="Start multitasking mode (open all sessions)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDetach(project); }}
                className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
                title="Open project in new window"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-neutral-400">
              {project.sessions.length} session{project.sessions.length !== 1 ? 's' : ''}
            </span>
            {activeSessions.length > 0 && (
              <span className="flex items-center gap-1 text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot" />
                {activeSessions.length} active
              </span>
            )}
            <span className="text-neutral-500 ml-auto">{project.lastOpened}</span>
          </div>

          {project.sessions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-neutral-800">
              <div className="text-xs text-neutral-500 mb-2">Sessions</div>
              <div className="space-y-1.5">
                {project.sessions.slice(0, 4).map(session => (
                  <div key={session.id}
                       className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 rounded-lg group transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <StatusBadge status={session.status} />
                      <span className="text-neutral-300 text-xs truncate">{session.name}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenSession?.(project, session); }}
                        className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                        title="Open session in new window"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {project.sessions.length > 4 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpen?.(project); }}
                    className="w-full px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors text-left"
                  >
                    +{project.sessions.length - 4} more sessions...
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
