import type { ProjectPreset } from "../../lib/presets";
import { StatusBadge } from "./StatusBadge";
import type { DashboardProject, DashboardSession } from "./types";
import { PathLink } from "../PathLink";

interface ProjectCardProps {
  project: DashboardProject;
  preset?: ProjectPreset;
  onOpen: (project: DashboardProject) => void;
  onOpenSession: (project: DashboardProject, session: DashboardSession) => void;
}

export function ProjectCard({ project, preset, onOpen, onOpenSession }: ProjectCardProps) {
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
            <PathLink path={project.path} className="text-xs text-neutral-500" />
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
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg group transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <StatusBadge status={session.status} />
                  <span className="text-neutral-300 text-xs truncate">{session.name}</span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSession(project, session);
                    }}
                    className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                    title="Open session"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
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
    </div>
  );
}
