import { useState, useRef, useEffect } from "react";
import type { ProjectPreset } from "../../lib/presets";
import { StatusBadge } from "./StatusBadge";
import type { DashboardProject, DashboardSession } from "./types";

interface ProjectCardProps {
  project: DashboardProject;
  preset?: ProjectPreset;
  onOpen: (project: DashboardProject) => void;
  onOpenSession: (project: DashboardProject, session: DashboardSession) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function ProjectCard({ project, preset, onOpen, onOpenSession, onDeleteProject, onDeleteSession }: ProjectCardProps) {
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
      className="project-card bg-neutral-900 border border-neutral-800 rounded-xl p-4 group cursor-pointer"
      onClick={() => onOpen(project)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: preset?.color || "#6b7280" }}
          >
            {preset?.icon || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-white truncate">{project.name}</h3>
            <p className="text-xs text-neutral-500 truncate">{project.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(project);
            }}
            className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-400"
            title="Open project details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteProjectModal(true);
            }}
            className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-400"
            title="Delete project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <div className="flex items-center gap-4 text-sm">
        <span className="text-neutral-400">
          {project.sessions.length} session{project.sessions.length !== 1 ? "s" : ""}
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
            {project.sessions.slice(0, 4).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg group transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSession(project, session);
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusBadge status={session.status} />
                  <span className="text-neutral-300 text-xs truncate">{session.name}</span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteSessionModal(session.id);
                    }}
                    className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-red-400"
                    title="Delete session"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
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
                className="w-full px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors text-left"
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
