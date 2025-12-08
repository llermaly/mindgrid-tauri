import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useSessionStore, type Project, type Session } from "../stores/sessionStore";
import { debug } from "../stores/debugStore";

export function Sidebar() {
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
  } = useSessionStore();

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const handleCreateProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Folder",
      });

      if (selected) {
        const path = selected as string;
        const name = newProjectName || path.split("/").pop() || "Untitled";

        debug.info("Sidebar", "Creating project", { name, path });
        const project = await createProject(name, path);
        debug.info("Sidebar", "Project created", { id: project.id });

        setExpandedProjects((prev) => new Set([...prev, project.id]));
        await createSession(project.id, "Session 1", path);
        debug.info("Sidebar", "Session created");

        setNewProjectName("");
        setIsCreatingProject(false);
      }
    } catch (err) {
      debug.error("Sidebar", "Failed to create project", err);
      console.error("Failed to create project:", err);
    }
  };

  const handleCreateSession = async (project: Project) => {
    const sessionNum = project.sessions.length + 1;
    await createSession(project.id, `Session ${sessionNum}`, project.path);
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

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-700 w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
        <span className="text-sm font-medium text-zinc-300">Projects</span>
        <button
          onClick={() => setIsCreatingProject(true)}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
          title="New Project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* New Project Form */}
      {isCreatingProject && (
        <div className="p-3 border-b border-zinc-700 bg-zinc-800">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name (optional)"
            className="w-full px-2 py-1 text-sm bg-zinc-700 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateProject}
              className="flex-1 px-2 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 text-zinc-100"
            >
              Select Folder
            </button>
            <button
              onClick={() => setIsCreatingProject(false)}
              className="px-2 py-1 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
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
              onSelectSession={setActiveSession}
              onCreateSession={() => handleCreateSession(project)}
              onDeleteProject={() => deleteProject(project.id)}
              onDeleteSession={deleteSession}
            />
          ))
        )}
      </div>
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
}: ProjectItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteProject = () => {
    if (confirmDelete) {
      onDeleteProject();
      setConfirmDelete(false);
      setShowMenu(false);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="border-b border-zinc-800">
      {/* Project Header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-800 ${
          isActive ? "bg-zinc-800" : ""
        }`}
        onClick={onToggle}
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
              setConfirmDelete(false);
            }}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-36 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-10">
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject();
                }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 flex items-center gap-2 ${
                  confirmDelete ? "text-red-400 bg-red-900/20" : "text-zinc-400"
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {confirmDelete ? "Click to confirm" : "Delete Project"}
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
            />
          ))}
          {sessions.length === 0 && (
            <div className="px-6 py-2 text-xs text-zinc-500 italic">No sessions</div>
          )}
        </div>
      )}
    </div>
  );
}

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SessionItem({ session, isActive, onSelect, onDelete }: SessionItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000); // Reset after 3s
    }
  };

  return (
    <div
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => {
        setShowDelete(false);
        setConfirmDelete(false);
      }}
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 ml-4 cursor-pointer rounded-l ${
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
      <span className="flex-1 text-xs text-zinc-300 truncate">{session.name}</span>
      {session.totalCost > 0 && (
        <span className="text-xs text-zinc-500 shrink-0">${session.totalCost.toFixed(3)}</span>
      )}
      {showDelete && (
        <button
          onClick={handleDelete}
          className={`p-0.5 rounded shrink-0 ${
            confirmDelete
              ? "bg-red-600 text-white"
              : "hover:bg-zinc-700 text-zinc-500 hover:text-red-400"
          }`}
          title={confirmDelete ? "Click to confirm delete" : "Delete session"}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
