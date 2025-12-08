import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PRESETS, type ChatType } from "../../lib/presets";
import { openChatWindow, openMultipleChatWindows } from "../../lib/window-manager";
import { useSessionStore, type Project, type Session } from "../../stores/sessionStore";
import { useUsageStore } from "../../stores/usageStore";
import { ProjectWizardDialog } from "../ProjectWizardDialog";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailView } from "./ProjectDetailView";
import { SessionDetailView } from "./SessionDetailView";
import { UsageLimitsCard } from "./UsageLimitsCard";
import type { DashboardProject, DashboardSession, DashboardActivity, DashboardGitInfo } from "./types";
import { SettingsPage } from "../../pages/SettingsPage";
import { CreateSessionDialog, type SessionConfig } from "../CreateSessionDialog";

type DashboardView = "all" | "recent" | "active" | "settings";

export function Dashboard() {
  const {
    projects,
    sessions,
    createProject,
    createSession,
    setActiveSession,
    refreshGitStatus,
    deleteProject,
    deleteSession,
    refreshActiveChatSessions,
    isSessionActive,
  } = useSessionStore();

  const fetchAll = useUsageStore((state) => state.fetchAll);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>("all");
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [showCreateSessionDialog, setShowCreateSessionDialog] = useState(false);
  const [activityFilterProject, setActivityFilterProject] = useState<string | null>(null);
  const [activityFilterSession, setActivityFilterSession] = useState<string | null>(null);

  // Fetch usage data on mount and refresh every 30 seconds
  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      fetchAll();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Refresh active chat sessions on mount and every 5 seconds
  useEffect(() => {
    refreshActiveChatSessions();
    const interval = setInterval(() => {
      refreshActiveChatSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshActiveChatSessions]);

  const presetMap = useMemo(() => {
    const map: Record<string, (typeof PRESETS)[number]> = {};
    PRESETS.forEach((preset) => {
      map[preset.id] = preset;
    });
    return map;
  }, []);

  const enhancedProjects = useMemo(() => buildDashboardProjects(Object.values(projects), sessions, isSessionActive), [projects, sessions, isSessionActive]);
  const activeProjects = enhancedProjects.filter((project) => !project.isArchived);
  const filteredProjects = activeProjects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedProject = activeProjects.find((p) => p.id === selectedProjectId) || null;

  const allActiveSessions = activeProjects.flatMap((project) =>
    project.sessions
      .filter((session) => session.status === "running" || session.status === "waiting")
      .map((session) => ({ project, session }))
  );

  const recentActivity = useMemo(
    () => {
      let activities = activeProjects
        .flatMap((project) => project.chatHistory.map((item) => ({ ...item, project })))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Apply filters
      if (activityFilterProject) {
        activities = activities.filter(item => item.project.id === activityFilterProject);
      }
      if (activityFilterSession) {
        activities = activities.filter(item => {
          // Find the session that contains this activity
          const session = Object.values(sessions).find(s =>
            s.projectId === item.project.id &&
            s.messages.some(m => m.id === item.id.split('-')[1])
          );
          return session?.id === activityFilterSession;
        });
      }

      return activities.slice(0, 50);
    },
    [activeProjects, activityFilterProject, activityFilterSession, sessions]
  );

  const isSettingsView = activeView === "settings";

  const handleOpenSession = (project: DashboardProject, session: DashboardSession) => {
    const liveSession = sessions[session.id];
    if (liveSession) {
      setActiveSession(liveSession.id);
      refreshGitStatus(liveSession.id);
    }
    setSelectedProjectId(project.id);
    setSelectedSessionId(session.id);
  };

  const handleOpenSessionChat = (sessionId: string) => {
    const liveSession = sessions[sessionId];
    const project = liveSession ? Object.values(projects).find(p => p.id === liveSession.projectId) : null;
    if (liveSession && project) {
      void openChatWindow({
        sessionId: liveSession.id,
        sessionName: liveSession.name,
        projectName: project.name,
        cwd: liveSession.cwd,
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
    }
  };

  const handleOpenCreateSessionDialog = () => {
    setShowCreateSessionDialog(true);
  };

  const handleCreateSession = async (config: SessionConfig) => {
    if (!selectedProjectId) return;
    const project = projects[selectedProjectId];
    if (!project) return;

    const newSession = await createSession(selectedProjectId, config.name, project.path);

    // Update session with additional config
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

    setSelectedSessionId(newSession.id);
  };

  const handleCreateProjectWithChats = async (
    projectName: string,
    projectPath: string,
    sessionName: string,
    chatTypes: ChatType[]
  ) => {
    const project = await createProject(projectName, projectPath);
    const session = await createSession(project.id, sessionName, projectPath);

    if (chatTypes.length > 0) {
      await openMultipleChatWindows(
        {
          sessionId: session.id,
          sessionName: session.name,
          projectName: project.name,
          cwd: session.cwd,
        },
        chatTypes.length
      );
    }

    setSelectedProjectId(project.id);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <div className="h-12 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-lg font-semibold">MindGrid</span>
          <span className="text-xs text-neutral-500 px-2 py-0.5 bg-neutral-800 rounded">{isSettingsView ? "Settings" : "Dashboard"}</span>
        </div>

        {!isSettingsView && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-64 px-3 py-1.5 pl-9 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowProjectWizard(true)}
              className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-colors"
            >
              <span className="text-emerald-400">+</span> New Project
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex">
        <div className="w-56 border-r border-neutral-800 p-4 flex flex-col min-h-0">
          <nav className="space-y-1 flex-1">
            <SidebarButton
              label="All Projects"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              }
              active={activeView === "all"}
              count={activeProjects.length}
              onClick={() => {
                setActiveView("all");
                setSelectedProjectId(null);
                setSelectedSessionId(null);
              }}
            />
            <SidebarButton
              label="Recent Activity"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              active={activeView === "recent"}
              onClick={() => {
                setActiveView("recent");
                setSelectedProjectId(null);
                setSelectedSessionId(null);
              }}
            />
            <SidebarButton
              label="Active Sessions"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              }
              active={activeView === "active"}
              onClick={() => {
                setActiveView("active");
                setSelectedProjectId(null);
                setSelectedSessionId(null);
              }}
              badge={
                allActiveSessions.length > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse-dot" />
                    <span className="text-xs text-blue-400">{allActiveSessions.length}</span>
                  </span>
                ) : undefined
              }
            />
          </nav>

          <div className="border-t border-neutral-800 pt-4">
            <SidebarButton
              label="Settings"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              active={isSettingsView}
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedSessionId(null);
                setActiveView("settings");
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {isSettingsView ? (
            <SettingsPage onBack={() => setActiveView("all")} />
          ) : selectedSessionId && sessions[selectedSessionId] ? (
            <SessionDetailView
              session={sessions[selectedSessionId]}
              projectName={selectedProject?.name || "Unknown Project"}
              onClose={() => setSelectedSessionId(null)}
              onOpenChat={() => handleOpenSessionChat(selectedSessionId)}
              onDeleteSession={handleDeleteSession}
              onRefreshGitStatus={() => refreshGitStatus(selectedSessionId)}
            />
          ) : selectedProject ? (
            <ProjectDetailView
              project={selectedProject}
              preset={presetMap[selectedProject.presetId]}
              onClose={() => setSelectedProjectId(null)}
              onOpenSession={handleOpenSession}
              onCreateSession={handleOpenCreateSessionDialog}
              onDeleteProject={handleDeleteProject}
              onDeleteSession={handleDeleteSession}
            />
          ) : (
            <div className="h-full overflow-y-auto scrollbar-thin p-6">
              <div className="max-w-5xl mx-auto">
                {activeView === "all" && (
                  <>
                    {/* Usage Limits Card */}
                    <div className="mb-6">
                      <UsageLimitsCard />
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <h1 className="text-2xl font-semibold text-white">Projects</h1>
                      <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <span>
                          {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {filteredProjects.length === 0 ? (
                      <EmptyState onCreate={() => setShowProjectWizard(true)} />
                    ) : (
                      <div className="grid gap-4">
                        {filteredProjects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            preset={presetMap[project.presetId]}
                            onOpen={(p) => setSelectedProjectId(p.id)}
                            onOpenSession={handleOpenSession}
                            onDeleteProject={handleDeleteProject}
                            onDeleteSession={handleDeleteSession}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeView === "recent" && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h1 className="text-2xl font-semibold text-white">Recent Activity</h1>
                      <div className="flex items-center gap-3">
                        <select
                          value={activityFilterProject || ""}
                          onChange={(e) => {
                            setActivityFilterProject(e.target.value || null);
                            setActivityFilterSession(null);
                          }}
                          className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Projects</option>
                          {activeProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        {activityFilterProject && (
                          <select
                            value={activityFilterSession || ""}
                            onChange={(e) => setActivityFilterSession(e.target.value || null)}
                            className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="">All Sessions</option>
                            {activeProjects
                              .find((p) => p.id === activityFilterProject)
                              ?.sessions.map((session) => (
                                <option key={session.id} value={session.id}>
                                  {session.name}
                                </option>
                              ))}
                          </select>
                        )}
                        {(activityFilterProject || activityFilterSession) && (
                          <button
                            onClick={() => {
                              setActivityFilterProject(null);
                              setActivityFilterSession(null);
                            }}
                            className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-neutral-300 transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {recentActivity.length === 0 ? (
                      <EmptyActivity />
                    ) : (
                      <div className="space-y-3">
                        {recentActivity.map((item) => {
                          const preset = presetMap[item.project.presetId];
                          return (
                            <div
                              key={`${item.project.id}-${item.id}`}
                              className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors cursor-pointer"
                              onClick={() => setSelectedProjectId(item.project.id)}
                            >
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
                                  <p className="text-sm text-neutral-200 mb-2">{item.message}</p>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded flex items-center justify-center text-xs"
                                      style={{ background: preset?.color || "#6b7280" }}
                                    >
                                      {preset?.icon || "?"}
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

                {activeView === "active" && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h1 className="text-2xl font-semibold text-white">Active Sessions</h1>
                      <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-dot" />
                        <span>{allActiveSessions.length} active</span>
                      </div>
                    </div>

                    {allActiveSessions.length === 0 ? (
                      <EmptyActive />
                    ) : (
                      <div className="space-y-6">
                        {activeProjects
                          .filter((project) => project.sessions.some((s) => s.status === "running" || s.status === "waiting"))
                          .map((project) => {
                            const preset = presetMap[project.presetId];
                            const activeSessions = project.sessions.filter(
                              (session) => session.status === "running" || session.status === "waiting"
                            );
                            return (
                              <div key={project.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                                <div
                                  className="flex items-center gap-3 p-4 border-b border-neutral-800 cursor-pointer hover:bg-neutral-800/50 transition-colors"
                                  onClick={() => setSelectedProjectId(project.id)}
                                >
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                    style={{ background: preset?.color || "#6b7280" }}
                                  >
                                    {preset?.icon || "?"}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-white">{project.name}</div>
                                    <div className="text-xs text-neutral-500">{project.path}</div>
                                  </div>
                                  <span className="text-xs text-blue-400">{activeSessions.length} active</span>
                                </div>
                                <div className="divide-y divide-neutral-800">
                                  {activeSessions.map((session) => (
                                    <div
                                      key={session.id}
                                      className="flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                                      onClick={() => handleOpenSession(project, session)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <StatusDot status={session.status} />
                                        <div>
                                          <div className="text-sm text-white">{session.name}</div>
                                          <div className="text-xs text-neutral-500">
                                            {session.agents.join(", ") || "Coding"}
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
              </div>
            </div>
          )}
        </div>
      </div>

      <ProjectWizardDialog
        isOpen={showProjectWizard}
        onClose={() => setShowProjectWizard(false)}
        onCreate={handleCreateProjectWithChats}
      />

      {selectedProject && (
        <CreateSessionDialog
          isOpen={showCreateSessionDialog}
          projectName={selectedProject.name}
          existingSessionCount={selectedProject.sessions.length}
          onClose={() => setShowCreateSessionDialog(false)}
          onCreate={handleCreateSession}
        />
      )}
    </div>
  );
}

function SidebarButton({
  label,
  icon,
  active,
  onClick,
  count,
  badge,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
  badge?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 rounded-lg text-left text-sm flex items-center gap-2 transition-colors ${
        active ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
      }`}
    >
      {icon}
      {label}
      {typeof count === "number" && <span className="ml-auto text-xs text-neutral-500">{count}</span>}
      {badge && <span className="ml-auto">{badge}</span>}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
        <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
      <p className="text-neutral-400 mb-6">Create your first project to get started</p>
      <button
        onClick={onCreate}
        className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 rounded-lg font-medium text-white transition-colors"
      >
        Create Project
      </button>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
        <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No recent activity</h3>
      <p className="text-neutral-400">Start a session to see activity here</p>
    </div>
  );
}

function EmptyActive() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
        <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">No active sessions</h3>
      <p className="text-neutral-400">All sessions are idle or completed</p>
    </div>
  );
}

function StatusDot({ status }: { status: DashboardSession["status"] }) {
  const className =
    status === "running"
      ? "bg-blue-500"
      : status === "waiting"
        ? "bg-amber-400"
        : status === "completed"
          ? "bg-emerald-500"
          : "bg-neutral-500";

  return <span className={`w-2 h-2 rounded-full ${className}`} />;
}

function buildDashboardProjects(
  projects: Project[],
  sessions: Record<string, Session>,
  isSessionActive: (sessionId: string) => boolean
): DashboardProject[] {
  return projects.map((project) => {
    const projectSessions = (project.sessions || [])
      .map((id) => sessions[id])
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const dashboardSessions: DashboardSession[] = projectSessions.map((session) => {
      // Determine status: active if chat window is open, otherwise check if running
      let status: DashboardSessionStatus;
      if (isSessionActive(session.id)) {
        status = session.isRunning ? "running" : "waiting";
      } else {
        status = session.messages.length > 0 ? "idle" : "idle";
      }

      return {
        id: session.id,
        name: session.name,
        status,
        agents: deriveAgents(session),
        updatedAt: session.updatedAt || session.createdAt || Date.now(),
      };
    });

    const chatHistory: DashboardActivity[] = projectSessions
      .map((session) => {
        const lastMessage = session.messages[session.messages.length - 1];
        if (!lastMessage) return null;
        return {
          id: `${session.id}-${lastMessage.id}`,
          sessionName: session.name,
          message: lastMessage.content,
          time: formatRelativeTime(lastMessage.timestamp),
          agent: "coding",
          projectId: project.id,
          timestamp: lastMessage.timestamp,
        };
      })
      .filter(Boolean) as DashboardActivity[];

    const gitStatus = projectSessions.find((s) => s.gitStatus)?.gitStatus;
    const gitInfo: DashboardGitInfo | undefined = gitStatus
      ? {
          repo: project.name,
          branch: gitStatus.current_branch || "main",
          defaultBranch: gitStatus.main_branch || "main",
          uncommittedChanges: gitStatus.files_changed,
          aheadBehind: { ahead: gitStatus.ahead || 0, behind: gitStatus.behind || 0 },
          diff: {
            filesChanged: gitStatus.files_changed,
            additions: gitStatus.additions,
            deletions: gitStatus.deletions,
          },
        }
      : undefined;

    const totalMessages = projectSessions.reduce((sum, s) => sum + s.messages.length, 0);
    const filesModified = projectSessions.reduce((sum, s) => sum + (s.gitStatus?.files_changed || 0), 0);

    return {
      id: project.id,
      name: project.name,
      path: project.path,
      presetId: project.defaultModel ? "focused-coding" : PRESETS[0].id,
      sessions: dashboardSessions,
      lastOpened: formatRelativeTime(project.updatedAt || project.createdAt || Date.now()),
      github: gitInfo,
      chatHistory: chatHistory.sort((a, b) => b.timestamp - a.timestamp),
      stats: {
        totalSessions: projectSessions.length,
        totalMessages,
        filesModified,
      },
    };
  });
}

function deriveAgents(session: Session): string[] {
  const panelStates = session.panelStates ? Object.keys(session.panelStates) : [];
  const agentPanels = panelStates.filter((panel) => panel === "research" || panel === "coding" || panel === "review");

  if (agentPanels.length > 0) {
    return agentPanels;
  }

  return ["coding"];
}

function formatRelativeTime(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(timestamp).toLocaleDateString();
}
