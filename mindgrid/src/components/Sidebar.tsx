import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionStore, type Project, type Session } from "../stores/sessionStore";
import { debug } from "../stores/debugStore";
import { GitStatusIndicator } from "./GitStatusIndicator";
import { openChatWindow, openNewChatInSession, openMultipleChatWindows, openAllProjectSessionChats } from "../lib/window-manager";
import { CreateSessionDialog, type SessionConfig } from "./CreateSessionDialog";
import { ProjectWizardDialog } from "./ProjectWizardDialog";
import { ModelSelector } from "./ModelSelector";
import type { ChatType } from "../lib/presets";

interface SidebarProps {
  activePage: "home" | "settings";
  onOpenSettings: () => void;
  onNavigateHome: () => void;
}

export function Sidebar({ activePage, onOpenSettings, onNavigateHome }: SidebarProps) {
  const {
    projects,
    sessions,
    activeSessionId,
    activeProjectId,
    createProject,
    createSession,
    setActiveSession,
    deleteProject,
    deleteSession,
    updateSession,
    refreshGitStatus,
    setProjectDefaultModel,
  } = useSessionStore();

  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [createSessionForProject, setCreateSessionForProject] = useState<Project | null>(null);

  const handleCreateProjectWithChats = async (
    projectName: string,
    projectPath: string,
    sessionName: string,
    chatTypes: ChatType[],
    filesToCopy?: string[]
  ) => {
    try {
      debug.info("Sidebar", "Creating project with wizard", { projectName, projectPath, sessionName, chatTypes, filesToCopy });

      // Create the project
      const project = await createProject(projectName, projectPath);
      debug.info("Sidebar", "Project created", { id: project.id });

      setExpandedProjects((prev) => new Set([...prev, project.id]));

      // Create ONE session for this project
      const session = await createSession(project.id, sessionName, projectPath);
      debug.info("Sidebar", "Session created", { id: session.id, name: sessionName });

      // Copy selected gitignored files to worktree
      if (filesToCopy && filesToCopy.length > 0 && session.cwd !== projectPath) {
        try {
          debug.info("Sidebar", "Copying files to worktree", { files: filesToCopy, dest: session.cwd });
          const copied = await invoke<string[]>("copy_files_to_worktree", {
            projectPath,
            worktreePath: session.cwd,
            files: filesToCopy,
          });
          debug.info("Sidebar", "Files copied successfully", { copied });
        } catch (copyErr) {
          debug.error("Sidebar", "Failed to copy files to worktree", copyErr);
          console.error("Failed to copy files:", copyErr);
          // Don't fail the whole operation, just log the error
        }
      }

      // Navigate to the new session
      onNavigateHome();
      setActiveSession(session.id);

      // Open chat windows for each selected chat type
      if (chatTypes.length > 0) {
        debug.info("Sidebar", "Opening chat windows", { count: chatTypes.length });
        await openMultipleChatWindows({
          sessionId: session.id,
          sessionName: session.name,
          projectName: project.name,
          cwd: session.cwd,
        }, chatTypes.length);
      }
    } catch (err) {
      debug.error("Sidebar", "Failed to create project", err);
      console.error("Failed to create project:", err);
      throw err;
    }
  };

  const handleCreateSession = (project: Project) => {
    setCreateSessionForProject(project);
  };

  const handleCreateSessionConfirm = async (config: SessionConfig) => {
    if (!createSessionForProject) return;
    const projectPath = createSessionForProject.path;
    const newSession = await createSession(createSessionForProject.id, config.name, projectPath);

    // Copy selected gitignored files to worktree
    if (config.filesToCopy && config.filesToCopy.length > 0 && newSession.cwd !== projectPath) {
      try {
        debug.info("Sidebar", "Copying files to worktree", { files: config.filesToCopy, dest: newSession.cwd });
        const copied = await invoke<string[]>("copy_files_to_worktree", {
          projectPath,
          worktreePath: newSession.cwd,
          files: config.filesToCopy,
        });
        debug.info("Sidebar", "Files copied successfully", { copied });
      } catch (copyErr) {
        debug.error("Sidebar", "Failed to copy files to worktree", copyErr);
        console.error("Failed to copy files:", copyErr);
        // Don't fail the whole operation, just log the error
      }
    }

    // Apply additional config
    const { setPermissionMode, setCommitMode, setSessionModel } = useSessionStore.getState();
    if (config.permissionMode !== "default") {
      setPermissionMode(newSession.id, config.permissionMode);
    }
    if (config.commitMode !== "checkpoint") {
      setCommitMode(newSession.id, config.commitMode);
    }
    if (config.model) {
      setSessionModel(newSession.id, config.model);
    }

    setCreateSessionForProject(null);

    // Navigate to the new session
    onNavigateHome();
    setActiveSession(newSession.id);
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const projectList = Object.values(projects);
  const handleSelectSession = (id: string) => {
    onNavigateHome();
    setActiveSession(id);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-900 border-r border-zinc-700 w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
        <span className="text-sm font-medium text-zinc-300">Projects</span>
        <button
          onClick={() => setShowProjectWizard(true)}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
          title="New Project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {projectList.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            No projects yet.
            <br />
            Click + to create one.
          </div>
        ) : (
          projectList.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              sessions={project.sessions.map((id) => sessions[id]).filter(Boolean)}
              isExpanded={expandedProjects.has(project.id)}
              isActive={activeProjectId === project.id}
              activeSessionId={activeSessionId}
              onToggle={() => toggleProject(project.id)}
              onSelectSession={handleSelectSession}
              onCreateSession={() => handleCreateSession(project)}
              onDeleteProject={() => deleteProject(project.id)}
              onDeleteSession={deleteSession}
              onRenameSession={(id, name) => updateSession(id, { name })}
              onRefreshGitStatus={refreshGitStatus}
              onSetDefaultModel={(model) => setProjectDefaultModel(project.id, model)}
            />
          ))
        )}
      </div>

      <div className="border-t border-zinc-700 px-3 py-3 flex-shrink-0">
        <button
          onClick={() => {
            onOpenSettings();
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
            activePage === "settings"
              ? "bg-zinc-800 text-white border border-zinc-700"
              : "text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>

      {/* Create Session Dialog */}
      <CreateSessionDialog
        isOpen={createSessionForProject !== null}
        projectName={createSessionForProject?.name ?? ""}
        projectPath={createSessionForProject?.path ?? ""}
        existingSessionCount={createSessionForProject?.sessions.length ?? 0}
        onClose={() => setCreateSessionForProject(null)}
        onCreate={handleCreateSessionConfirm}
      />

      {/* Project Wizard Dialog */}
      <ProjectWizardDialog
        isOpen={showProjectWizard}
        onClose={() => setShowProjectWizard(false)}
        onCreate={handleCreateProjectWithChats}
      />
    </div>
  );
}

interface ProjectItemProps {
  project: Project;
  sessions: Session[];
  isExpanded: boolean;
  isActive: boolean;
  activeSessionId: string | null;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteProject: () => void;
  onDeleteSession: (id: string) => Promise<void>;
  onRenameSession: (id: string, name: string) => void;
  onRefreshGitStatus: (sessionId: string) => void;
  onSetDefaultModel: (model: string | null) => void;
}

function ProjectItem({
  project,
  sessions,
  isExpanded,
  isActive,
  activeSessionId,
  onToggle,
  onSelectSession,
  onCreateSession,
  onDeleteProject,
  onDeleteSession,
  onRenameSession,
  onRefreshGitStatus,
  onSetDefaultModel,
}: ProjectItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteModal(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      setShowDeleteModal(true);
    }
  };

  const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setShowDeleteModal(false);
    } else if (e.key === "Enter" && !isDeleting) {
      e.preventDefault();
      deleteButtonRef.current?.click();
    }
  }, [isDeleting]);

  // Auto-focus delete button when modal opens
  useEffect(() => {
    if (showDeleteModal && deleteButtonRef.current) {
      deleteButtonRef.current.focus();
    }
  }, [showDeleteModal]);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteProject();
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="border-b border-zinc-800">
        {/* Project Header */}
        <div
          tabIndex={0}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-inset ${
            isActive ? "bg-zinc-800" : ""
          }`}
          onClick={onToggle}
          onKeyDown={handleKeyDown}
        >
          <svg
            className={`w-3 h-3 text-zinc-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="flex-1 text-sm font-medium text-zinc-200 truncate">{project.name}</span>
          <span className="text-xs text-zinc-500">{sessions.length}</span>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateSession();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Session
                </button>
                {sessions.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAllProjectSessionChats(
                        sessions.map(s => ({
                          sessionId: s.id,
                          sessionName: s.name,
                          cwd: s.cwd,
                        })),
                        project.name
                      );
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    Open All Chats ({sessions.length})
                  </button>
                )}
                <div className="px-3 py-2 border-t border-zinc-700">
                  <div className="text-xs text-zinc-500 mb-1.5">Default Model</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ModelSelector
                      value={project.defaultModel}
                      onChange={(model) => {
                        onSetDefaultModel(model);
                      }}
                      size="sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleDeleteClick}
                  className="w-full px-3 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-700 flex items-center gap-2 border-t border-zinc-700"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sessions */}
        {isExpanded && (
          <div className="pb-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
                onSelect={() => onSelectSession(session.id)}
                onDelete={() => onDeleteSession(session.id)}
                onRename={(name) => onRenameSession(session.id, name)}
                onRefreshGitStatus={() => onRefreshGitStatus(session.id)}
                onOpenChatWindow={() => openChatWindow({
                  sessionId: session.id,
                  sessionName: session.name,
                  projectName: project.name,
                  cwd: session.cwd,
                })}
                onNewChat={() => openNewChatInSession({
                  sessionId: session.id,
                  sessionName: session.name,
                  projectName: project.name,
                  cwd: session.cwd,
                })}
              />
            ))}
            {sessions.length === 0 && (
              <div className="px-6 py-2 text-xs text-zinc-500 italic">No sessions</div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
          onKeyDown={handleModalKeyDown}
        >
          <div
            className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-zinc-200 mb-2">Delete Project</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Are you sure you want to delete "{project.name}" and all its sessions? This action cannot be undone.
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              Press Enter to confirm, Escape to cancel
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                ref={deleteButtonRef}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {isDeleting ? (
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
    </>
  );
}

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void> | void;
  onRename: (name: string) => void;
  onRefreshGitStatus: () => void;
  onOpenChatWindow: () => void;
  onNewChat: () => void;
}

function SessionItem({ session, isActive, onSelect, onDelete, onRename, onRefreshGitStatus, onOpenChatWindow, onNewChat }: SessionItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refresh git status when session becomes active
  useEffect(() => {
    if (isActive) {
      onRefreshGitStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Auto-focus delete button when modal opens
  useEffect(() => {
    if (showModal && deleteButtonRef.current) {
      deleteButtonRef.current.focus();
    }
  }, [showModal]);

  // Auto-focus and select input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(session.name);
    setIsEditing(true);
  };

  const handleRenameSubmit = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== session.name) {
      onRename(trimmedName);
    }
    setIsEditing(false);
  };

  const handleRenameCancel = () => {
    setEditName(session.name);
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleRenameCancel();
    }
    e.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
    } else if (e.key === "F2") {
      e.preventDefault();
      setEditName(session.name);
      setIsEditing(true);
    }
  };

  const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setShowModal(false);
    } else if (e.key === "Enter" && !isDeleting) {
      e.preventDefault();
      deleteButtonRef.current?.click();
    }
  }, [isDeleting]);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <div
        tabIndex={0}
        onMouseEnter={() => setShowDelete(true)}
        onMouseLeave={() => setShowDelete(false)}
        onClick={onSelect}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        className={`flex items-center gap-2 px-3 py-1.5 ml-4 cursor-pointer rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-inset ${
          isActive
            ? "bg-blue-600/20 border-r-2 border-blue-500"
            : "hover:bg-zinc-800"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            session.isRunning ? "bg-green-500 animate-pulse" : "bg-zinc-600"
          }`}
        />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleInputKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs text-zinc-100 bg-zinc-700 border border-zinc-600 rounded px-1 py-0.5 outline-none focus:border-blue-500"
          />
        ) : (
          <span className="flex-1 text-xs text-zinc-300 truncate">{session.name}</span>
        )}
        <GitStatusIndicator
          gitStatus={session.gitStatus}
          isLoading={session.gitStatusLoading}
          onClick={onRefreshGitStatus}
        />
        {session.totalCost > 0 && (
          <span className="text-xs text-zinc-500 shrink-0">${session.totalCost.toFixed(3)}</span>
        )}
        {showDelete && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenChatWindow();
              }}
              className="p-0.5 rounded shrink-0 hover:bg-zinc-700 text-zinc-500 hover:text-blue-400"
              title="Open chat in new window"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNewChat();
              }}
              className="p-0.5 rounded shrink-0 hover:bg-zinc-700 text-zinc-500 hover:text-green-400"
              title="New chat in new window (Cmd+N)"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-0.5 rounded shrink-0 hover:bg-zinc-700 text-zinc-500 hover:text-red-400"
              title="Delete session"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
          onKeyDown={handleModalKeyDown}
        >
          <div
            className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-zinc-200 mb-2">Delete Session</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Are you sure you want to delete "{session.name}"? This action cannot be undone.
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              Press Enter to confirm, Escape to cancel
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                ref={deleteButtonRef}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {isDeleting ? (
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
    </>
  );
}
