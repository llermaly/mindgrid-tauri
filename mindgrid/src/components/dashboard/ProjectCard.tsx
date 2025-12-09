import { useState, useRef, useEffect } from "react";
import type { ProjectPreset } from "../../lib/presets";
import { StatusBadge } from "./StatusBadge";
import type { DashboardProject, DashboardSession } from "./types";
import { PathLink } from "../PathLink";

interface ProjectCardProps {
  project: DashboardProject;
  preset?: ProjectPreset;
  onOpen: (project: DashboardProject) => void;
  onOpenSession: (project: DashboardProject, session: DashboardSession) => void;
  onOpenSessionChat: (sessionId: string) => void;
  onOpenNewChat: (session: DashboardSession) => void;
  onCreateSession: (project: DashboardProject) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function ProjectCard({ project, preset, onOpen, onOpenSession, onOpenSessionChat, onOpenNewChat, onCreateSession, onDeleteProject, onDeleteSession }: ProjectCardProps) {
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

  const activeSessions = project.sessions.filter(
    (session) => session.status === "running" || session.status === "waiting"
  );

  return (
    <div
      className="card p-5 group cursor-pointer hover:border-[var(--border-default)] hover:shadow-lg hover:shadow-black/20 transition-all"
      onClick={() => onOpen(project)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Project icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: preset?.color || "var(--bg-tertiary)" }}
          >
            {preset?.icon || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--text-primary)] truncate text-base">{project.name}</h3>
            <PathLink path={project.path} className="text-xs text-[var(--text-tertiary)]" />
          </div>
        </div>
        {/* Action buttons - appear on hover */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSession(project);
            }}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="New session"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(project);
            }}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Open project details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteProjectModal(true);
            }}
            className="p-2 rounded-lg hover:bg-[rgba(239,68,68,0.15)] text-[var(--text-tertiary)] hover:text-[var(--accent-error)] transition-colors"
            title="Delete project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-[var(--text-secondary)]">
          {project.sessions.length} session{project.sessions.length !== 1 ? "s" : ""}
        </span>
        {activeSessions.length > 0 && (
          <span className="flex items-center gap-2 text-[var(--accent-success)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse-dot" />
            {activeSessions.length} active
          </span>
        )}
        <span className="text-[var(--text-tertiary)] ml-auto">{project.lastOpened}</span>
      </div>

      {/* Sessions list */}
      {project.sessions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wider font-medium">Sessions</div>
          <div className="space-y-1">
            {project.sessions.slice(0, 4).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] transition-colors cursor-pointer group/session"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSession(project, session);
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusBadge status={session.status} />
                  <span className="text-[var(--text-secondary)] text-xs truncate group-hover/session:text-[var(--text-primary)] transition-colors">{session.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/session:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewChat(session);
                    }}
                    className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
                    title="Open new chat window"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSessionChat(session.id);
                    }}
                    className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Open workspace"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteSessionModal(session.id);
                    }}
                    className="p-1.5 rounded hover:bg-[rgba(239,68,68,0.15)] text-[var(--text-tertiary)] hover:text-[var(--accent-error)] transition-colors"
                    title="Delete session"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {project.sessions.length > 4 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(project);
                }}
                className="w-full px-3 py-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left"
              >
                +{project.sessions.length - 4} more sessions...
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteProjectModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowDeleteProjectModal(false)}
          onKeyDown={handleProjectModalKeyDown}
        >
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Delete Project</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Are you sure you want to delete "{project.name}" and all its sessions? This action cannot be undone.
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mb-6">
              Press ENTER to confirm or ESC to cancel
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteProjectModal(false)}
                disabled={isDeletingProject}
                className="px-4 py-2 text-sm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                ref={deleteProjectButtonRef}
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="px-4 py-2 text-sm font-medium bg-[var(--accent-error)] text-white rounded-lg hover:bg-[#dc2626] disabled:opacity-50 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-error)] focus-visible:outline-offset-2 transition-colors"
              >
                {isDeletingProject ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowDeleteSessionModal(null)}
          onKeyDown={(e) => handleSessionModalKeyDown(e, showDeleteSessionModal)}
        >
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6 max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Delete Session</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mb-6">
              Press ENTER to confirm or ESC to cancel
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteSessionModal(null)}
                disabled={isDeletingSession}
                className="px-4 py-2 text-sm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-active)] hover:text-[var(--text-primary)] disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                ref={deleteSessionButtonRef}
                onClick={() => handleDeleteSession(showDeleteSessionModal)}
                disabled={isDeletingSession}
                className="px-4 py-2 text-sm font-medium bg-[var(--accent-error)] text-white rounded-lg hover:bg-[#dc2626] disabled:opacity-50 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-error)] focus-visible:outline-offset-2 transition-colors"
              >
                {isDeletingSession ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
