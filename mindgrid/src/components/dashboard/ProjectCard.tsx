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
  onCreateSession: (project: DashboardProject) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function ProjectCard({ project, preset, onOpen, onOpenSession, onOpenSessionChat, onCreateSession, onDeleteProject, onDeleteSession }: ProjectCardProps) {
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
      className="project-card bg-white border-2 border-black p-6 group cursor-pointer transition-all duration-100"
      onClick={() => onOpen(project)}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Icon - monochrome square */}
          <div
            className="w-12 h-12 border-2 border-black bg-black text-white flex items-center justify-center text-xl flex-shrink-0 font-bold group-hover:bg-white group-hover:text-black transition-all duration-100"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {preset?.icon || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-black truncate text-lg group-hover:text-white transition-colors duration-100" style={{ fontFamily: 'var(--font-display)' }}>{project.name}</h3>
            <PathLink path={project.path} className="text-xs text-gray-600 group-hover:text-gray-300 transition-colors duration-100" />
          </div>
        </div>
        {/* Action buttons - appear on hover */}
        <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSession(project);
            }}
            className="p-2 border border-transparent hover:border-white text-black group-hover:text-white transition-all duration-100"
            title="New session"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(project);
            }}
            className="p-2 border border-transparent hover:border-white text-black group-hover:text-white transition-all duration-100"
            title="Open project details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteProjectModal(true);
            }}
            className="p-2 border border-transparent hover:border-white text-black group-hover:text-white transition-all duration-100"
            title="Delete project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats - monospace */}
      <div className="flex items-center gap-4 text-sm" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
        <span className="text-gray-600 group-hover:text-gray-300 transition-colors duration-100">
          {project.sessions.length} session{project.sessions.length !== 1 ? "s" : ""}
        </span>
        {activeSessions.length > 0 && (
          <span className="flex items-center gap-2 text-black group-hover:text-white transition-colors duration-100">
            <span className="w-2 h-2 bg-black group-hover:bg-white animate-pulse-dot" />
            {activeSessions.length} active
          </span>
        )}
        <span className="text-gray-500 group-hover:text-gray-400 ml-auto transition-colors duration-100">{project.lastOpened}</span>
      </div>

      {/* Sessions list */}
      {project.sessions.length > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-black group-hover:border-white transition-colors duration-100">
          <div className="text-xs text-gray-600 group-hover:text-gray-300 mb-2 uppercase tracking-wider transition-colors duration-100" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>Sessions</div>
          <div className="space-y-2">
            {project.sessions.slice(0, 4).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-100 group-hover:bg-gray-800 border border-black group-hover:border-white hover:bg-black hover:text-white transition-all duration-100 cursor-pointer inner-group"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSession(project, session);
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusBadge status={session.status} />
                  <span className="text-black group-hover:text-white inner-group-hover:text-white text-xs truncate transition-colors duration-100">{session.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 inner-group-hover:opacity-100 transition-opacity duration-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSessionChat(session.id);
                    }}
                    className="p-1.5 border border-transparent hover:border-white text-current transition-all duration-100"
                    title="Open workspace"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteSessionModal(session.id);
                    }}
                    className="p-1.5 border border-transparent hover:border-white text-current transition-all duration-100"
                    title="Delete session"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
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
                className="w-full px-3 py-2 text-xs text-gray-600 group-hover:text-gray-300 hover:text-black group-hover:hover:text-white border border-transparent hover:border-black group-hover:hover:border-white transition-all duration-100 text-left"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                +{project.sessions.length - 4} more sessions...
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Project Modal - Minimalist monochrome */}
      {showDeleteProjectModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowDeleteProjectModal(false)}
          onKeyDown={handleProjectModalKeyDown}
        >
          <div
            className="bg-white border-4 border-black p-8 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <h3 className="text-2xl font-bold text-black mb-4" style={{ fontFamily: 'var(--font-display)' }}>Delete Project</h3>
            <p className="text-base text-gray-700 mb-6">
              Are you sure you want to delete "{project.name}" and all its sessions? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
              Press ENTER to confirm • ESC to cancel
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowDeleteProjectModal(false)}
                disabled={isDeletingProject}
                className="px-6 py-3 text-sm font-medium bg-white text-black border-2 border-black hover:bg-black hover:text-white disabled:opacity-50 transition-all duration-100 uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
              >
                Cancel
              </button>
              <button
                ref={deleteProjectButtonRef}
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="px-6 py-3 text-sm font-medium bg-black text-white border-2 border-black hover:bg-white hover:text-black disabled:opacity-50 flex items-center gap-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-black focus-visible:outline-offset-3 transition-all duration-100 uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
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

      {/* Delete Session Modal - Minimalist monochrome */}
      {showDeleteSessionModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowDeleteSessionModal(null)}
          onKeyDown={(e) => handleSessionModalKeyDown(e, showDeleteSessionModal)}
        >
          <div
            className="bg-white border-4 border-black p-8 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <h3 className="text-2xl font-bold text-black mb-4" style={{ fontFamily: 'var(--font-display)' }}>Delete Session</h3>
            <p className="text-base text-gray-700 mb-6">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
              Press ENTER to confirm • ESC to cancel
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowDeleteSessionModal(null)}
                disabled={isDeletingSession}
                className="px-6 py-3 text-sm font-medium bg-white text-black border-2 border-black hover:bg-black hover:text-white disabled:opacity-50 transition-all duration-100 uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
              >
                Cancel
              </button>
              <button
                ref={deleteSessionButtonRef}
                onClick={() => handleDeleteSession(showDeleteSessionModal)}
                disabled={isDeletingSession}
                className="px-6 py-3 text-sm font-medium bg-black text-white border-2 border-black hover:bg-white hover:text-black disabled:opacity-50 flex items-center gap-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-black focus-visible:outline-offset-3 transition-all duration-100 uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
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
