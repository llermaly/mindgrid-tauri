import { useState, useRef, useEffect } from "react";
import type { ProjectPreset } from "../../lib/presets";
import { StatusBadge } from "./StatusBadge";
import type { DashboardProject, DashboardSession } from "./types";

interface ProjectDetailViewProps {
  project: DashboardProject;
  preset?: ProjectPreset;
  onClose: () => void;
  onOpenSession: (project: DashboardProject, session: DashboardSession) => void;
  onCreateSession: () => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Sessions" },
  { id: "github", label: "GitHub" },
  { id: "history", label: "History" },
];

export function ProjectDetailView({ project, preset, onClose, onOpenSession, onCreateSession, onDeleteProject, onDeleteSession }: ProjectDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "sessions" | "github" | "history">("overview");
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const deleteProjectButtonRef = useRef<HTMLButtonElement>(null);
  const deleteSessionButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus delete button when modal opens
  useEffect(() => {
    if (showDeleteProjectModal && deleteProjectButtonRef.current) {
      deleteProjectButtonRef.current.focus();
    }
  }, [showDeleteProjectModal]);

  useEffect(() => {
    if (showDeleteSessionModal && deleteSessionButtonRef.current) {
      deleteSessionButtonRef.current.focus();
    }
  }, [showDeleteSessionModal]);

  const handleDeleteProject = async () => {
    setIsDeletingProject(true);
    try {
      await onDeleteProject(project.id);
      onClose();
    } finally {
      setIsDeletingProject(false);
      setShowDeleteProjectModal(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setIsDeletingSession(true);
    try {
      await onDeleteSession(sessionId);
    } finally {
      setIsDeletingSession(false);
      setShowDeleteSessionModal(null);
    }
  };

  const handleProjectModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isDeletingProject) {
      e.preventDefault();
      handleDeleteProject();
    } else if (e.key === "Escape") {
      setShowDeleteProjectModal(false);
    }
  };

  const handleSessionModalKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === "Enter" && !isDeletingSession) {
      e.preventDefault();
      handleDeleteSession(sessionId);
    } else if (e.key === "Escape") {
      setShowDeleteSessionModal(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
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
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-medium"
              style={{ background: preset?.color || "#6b7280" }}
            >
              {preset?.icon || "?"}
            </div>
            <div>
              <h2 className="font-semibold text-white">{project.name}</h2>
              <p className="text-xs text-neutral-500">{project.path}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateSession}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </button>
          <span className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300">
            {preset?.name || "Custom Project"}
          </span>
          <button
            onClick={() => setShowDeleteProjectModal(true)}
            className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-400 transition-colors"
            title="Delete project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-6 py-2 border-b border-neutral-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeTab === tab.id ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
                <div className="text-2xl font-semibold text-white">{project.stats.totalSessions}</div>
                <div className="text-sm text-neutral-400">Total Sessions</div>
              </div>
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
                <div className="text-2xl font-semibold text-white">{project.stats.totalMessages}</div>
                <div className="text-sm text-neutral-400">Messages</div>
              </div>
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
                <div className="text-2xl font-semibold text-white">{project.stats.filesModified}</div>
                <div className="text-sm text-neutral-400">Files Modified</div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Project Info</h3>
              <div className="space-y-3 text-sm">
                <InfoRow label="Preset" value={preset?.name || "Custom"} />
                <InfoRow label="Last Opened" value={project.lastOpened} />
                <InfoRow
                  label="Active Sessions"
                  value={project.sessions.filter((s) => s.status === "running" || s.status === "waiting").length.toString()}
                />
                {project.github && (
                  <>
                    <InfoRow label="Repository" value={project.github.repo} mono />
                    <InfoRow label="Branch" value={project.github.branch} mono />
                  </>
                )}
              </div>
            </div>

            {project.chatHistory.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {project.chatHistory.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                          item.agent === "coding" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {item.agent === "coding" ? "C" : "R"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-neutral-300 truncate">{item.message}</p>
                        <p className="text-xs text-neutral-500">
                          {item.sessionName} - {item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-3">
            {project.sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-neutral-400">No sessions yet</p>
                <p className="text-sm text-neutral-500">Start a new session to begin coding</p>
              </div>
            ) : (
              project.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-neutral-800/50 border border-neutral-700 rounded-xl hover:border-neutral-600 transition-colors cursor-pointer group"
                  onClick={() => onOpenSession(project, session)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <StatusBadge status={session.status} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white">{session.name}</div>
                      {session.initialPrompt ? (
                        <div className="text-xs text-neutral-400 truncate" title={session.initialPrompt}>
                          {session.initialPrompt}
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-500">{session.agents.join(", ") || "Coding"}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteSessionModal(session.id);
                      }}
                      className="p-1.5 hover:bg-neutral-700 rounded text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete session"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "github" && (
          <div className="space-y-4">
            {project.github ? (
              <>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-white">{project.github.repo}</div>
                        <div className="text-xs text-neutral-500">Repository</div>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300">
                      {project.github.branch}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-neutral-800 rounded-lg">
                      <div className="text-xs text-neutral-400 mb-1">Default Branch</div>
                      <div className="text-sm text-neutral-200">{project.github.defaultBranch}</div>
                    </div>
                    <div className="p-3 bg-neutral-800 rounded-lg">
                      <div className="text-xs text-neutral-400 mb-1">Ahead / Behind</div>
                      <div className="text-sm text-neutral-200">
                        {project.github.aheadBehind
                          ? `${project.github.aheadBehind.ahead} ahead / ${project.github.aheadBehind.behind} behind`
                          : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {project.github.diff && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <DiffStat label="Files" value={project.github.diff.filesChanged ?? 0} />
                      <DiffStat label="Additions" value={project.github.diff.additions ?? 0} />
                      <DiffStat label="Deletions" value={project.github.diff.deletions ?? 0} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No repo linked</h3>
                <p className="text-neutral-400">Connect a repository to see git details</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {project.chatHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-neutral-400">No recent activity</p>
                <p className="text-sm text-neutral-500">Start a session to see updates here</p>
              </div>
            ) : (
              project.chatHistory.map((item) => (
                <div key={item.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        item.agent === "coding" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {item.agent === "coding" ? "C" : "R"}
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
            )}
          </div>
        )}
      </div>

      {/* Delete Project Modal */}
      {showDeleteProjectModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteProjectModal(false)}
          onKeyDown={handleProjectModalKeyDown}
        >
          <div
            className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-neutral-200 mb-2">Delete Project</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Are you sure you want to delete "{project.name}" and all its sessions? This action cannot be undone.
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              Press Enter to confirm, Escape to cancel
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteProjectModal(false)}
                disabled={isDeletingProject}
                className="px-3 py-1.5 text-xs font-medium rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                ref={deleteProjectButtonRef}
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {isDeletingProject ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Modal */}
      {showDeleteSessionModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteSessionModal(null)}
          onKeyDown={(e) => handleSessionModalKeyDown(e, showDeleteSessionModal)}
        >
          <div
            className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-neutral-200 mb-2">Delete Session</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              Press Enter to confirm, Escape to cancel
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteSessionModal(null)}
                disabled={isDeletingSession}
                className="px-3 py-1.5 text-xs font-medium rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                ref={deleteSessionButtonRef}
                onClick={() => handleDeleteSession(showDeleteSessionModal)}
                disabled={isDeletingSession}
                className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {isDeletingSession ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-400">{label}</span>
      <span className={`text-neutral-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function DiffStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 bg-neutral-800 rounded-lg">
      <div className="text-xs text-neutral-400 mb-1">{label}</div>
      <div className="text-sm text-neutral-200">{value}</div>
    </div>
  );
}
