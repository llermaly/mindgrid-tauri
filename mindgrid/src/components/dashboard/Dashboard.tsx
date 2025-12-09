import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PRESETS, type ChatType } from "../../lib/presets";
import { openAllProjectSessionChats, openMultipleChatWindows, openRunCommandWindow, openWorkspaceWindow, runAllProjectSessions } from "../../lib/window-manager";
import { useSessionStore, type Project, type Session } from "../../stores/sessionStore";
import { useUsageStore } from "../../stores/usageStore";
import { getWorktreeInfo } from "../../lib/dev-mode";
import { ProjectWizardDialog } from "../ProjectWizardDialog";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetailView } from "./ProjectDetailView";
import { SessionDetailView } from "./SessionDetailView";
import { UsageLimitsCard } from "./UsageLimitsCard";
import type { DashboardProject, DashboardSession, DashboardActivity, DashboardGitInfo, DashboardSessionStatus } from "./types";
import { SettingsPage } from "../../pages/SettingsPage";
import { AnalyticsPage } from "../../pages/AnalyticsPage";
import { CreateSessionDialog, type SessionConfig, type SessionVariantConfig } from "../CreateSessionDialog";
import { PathLink } from "../PathLink";
import { CustomTitlebar } from "../CustomTitlebar";
import { TransformerModeIndicator } from "../TransformerTabBar";
import { useTransformerStore } from "../../stores/transformerStore";

type DashboardView = "all" | "recent" | "active" | "analytics" | "settings";

interface DashboardProps {
  shortcutTrigger?: {
    action: "newChat" | "toggleTransformer" | "runAll" | null;
    timestamp: number;
  };
  onShortcutHandled?: () => void;
}

export function Dashboard({ shortcutTrigger, onShortcutHandled }: DashboardProps) {
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
    isSessionRunning,
  } = useSessionStore();

  const fetchAll = useUsageStore((state) => state.fetchAll);
  const toggleTransformerMode = useTransformerStore((state) => state.toggleTransformerMode);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>("all");
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [showCreateSessionDialog, setShowCreateSessionDialog] = useState(false);
  const [activityFilterProject, setActivityFilterProject] = useState<string | null>(null);
  const [activityFilterSession, setActivityFilterSession] = useState<string | null>(null);
  const [createSessionForProjectId, setCreateSessionForProjectId] = useState<string | null>(null);
  const [worktreeName, setWorktreeName] = useState<string | null>(null);

  // Check if running from a worktree
  useEffect(() => {
    getWorktreeInfo().then(setWorktreeName);
  }, []);

  // Handle global shortcut triggers
  useEffect(() => {
    if (!shortcutTrigger?.action) return;

    switch (shortcutTrigger.action) {
      case "newChat":
        // If we have a selected project, create session for it; otherwise show project wizard
        if (selectedProjectId) {
          setCreateSessionForProjectId(selectedProjectId);
          setShowCreateSessionDialog(true);
        } else if (Object.keys(projects).length > 0) {
          // Open create session for the first project
          const firstProject = Object.values(projects)[0];
          setCreateSessionForProjectId(firstProject.id);
          setShowCreateSessionDialog(true);
        } else {
          setShowProjectWizard(true);
        }
        break;
      case "toggleTransformer":
        toggleTransformerMode();
        break;
      case "runAll":
        // Run command in all sessions for the selected project
        if (selectedProjectId) {
          const project = projects[selectedProjectId];
          if (project) {
            const projectSessions = Object.values(sessions).filter(s => s.projectId === selectedProjectId);
            if (projectSessions.length > 0 && project.runCommand) {
              // Run the project's configured command in all sessions
              const sessionData = projectSessions.map(s => ({
                sessionId: s.id,
                sessionName: s.name,
                cwd: s.cwd,
              }));
              runAllProjectSessions(sessionData, project.name, project.runCommand);
            } else if (projectSessions.length > 0) {
              // No run command configured, open all chats instead
              const sessionData = projectSessions.map(s => ({
                sessionId: s.id,
                sessionName: s.name,
                cwd: s.cwd,
              }));
              openAllProjectSessionChats(sessionData, project.name);
            }
          }
        }
        break;
    }

    onShortcutHandled?.();
  }, [shortcutTrigger, selectedProjectId, projects, sessions, onShortcutHandled]);

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

  const enhancedProjects = useMemo(() => buildDashboardProjects(Object.values(projects), sessions, isSessionActive, isSessionRunning), [projects, sessions, isSessionActive, isSessionRunning]);
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
  const isAnalyticsView = activeView === "analytics";

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
      void openWorkspaceWindow({
        sessionId: liveSession.id,
        sessionName: liveSession.name,
        projectName: project.name,
        cwd: liveSession.cwd,
      });
    }
  };

  const handleRunProject = (dashboardProject: DashboardProject, session: DashboardSession) => {
    const liveSession = sessions[session.id];
    if (liveSession && dashboardProject.runCommand) {
      void openRunCommandWindow({
        sessionId: liveSession.id,
        sessionName: liveSession.name,
        projectName: dashboardProject.name,
        cwd: liveSession.cwd,
        command: dashboardProject.runCommand,
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

  const handleOpenCreateSessionDialog = (projectId?: string) => {
    if (projectId) {
      setCreateSessionForProjectId(projectId);
    }
    setShowCreateSessionDialog(true);
  };

  const handleCreateSession = async (config: SessionConfig) => {
    const targetProjectId = createSessionForProjectId || selectedProjectId;
    if (!targetProjectId) return;
    const project = projects[targetProjectId];
    if (!project) return;

    const variantConfigs = config.variants && config.variants.length > 0
      ? config.variants
      : [{ id: "base", name: config.name, prompt: config.prompt, model: config.model }];

    const { setPermissionMode, setCommitMode, setSessionModel, updateSession } = useSessionStore.getState();
    const createdSessions: Session[] = [];

    for (const [index, variant] of variantConfigs.entries()) {
      const sessionName =
        variant.name?.trim() ||
        (config.name ? `${config.name} ${variantConfigs.length > 1 ? `(${index + 1})` : ""}` : `Variant ${index + 1}`);

      const newSession = await createSession(targetProjectId, sessionName, project.path);

      // Copy selected gitignored files to worktree
      if (config.filesToCopy && config.filesToCopy.length > 0 && newSession.cwd !== project.path) {
        try {
          await invoke<string[]>("copy_files_to_worktree", {
            projectPath: project.path,
            worktreePath: newSession.cwd,
            files: config.filesToCopy,
          });
        } catch (copyErr) {
          console.error("Failed to copy files:", copyErr);
          // Don't fail the whole operation, just log the error
        }
      }

      // Update session with additional config
      if (config.permissionMode !== "default") {
        setPermissionMode(newSession.id, config.permissionMode);
      }
      if (config.commitMode !== "checkpoint") {
        setCommitMode(newSession.id, config.commitMode);
      }
      const variantModel = variant.model ?? config.model;
      if (variantModel) {
        setSessionModel(newSession.id, variantModel);
      }
      const variantPrompt = variant.prompt || config.prompt;
      if (variantPrompt) {
        await updateSession(newSession.id, { initialPrompt: variantPrompt });
      }

      createdSessions.push(newSession);
    }

    // Navigate to the newly created session
    setSelectedProjectId(targetProjectId);
    setSelectedSessionId(createdSessions[0]?.id ?? null);
    setCreateSessionForProjectId(null);

    if (createdSessions.length > 1) {
      await openAllProjectSessionChats(
        createdSessions.map((session) => ({
          sessionId: session.id,
          sessionName: session.name,
          cwd: session.cwd,
        })),
        project.name
      );
    }
  };

  const handleCreateProjectWithChats = async (
    projectName: string,
    projectPath: string,
    sessionName: string,
    chatTypes: ChatType[],
    filesToCopy?: string[],
    projectCommands?: { buildCommand?: string; runCommand?: string },
    options?: { prompt?: string; model?: string | null; variants?: SessionVariantConfig[] }
  ) => {
    try {
      const project = await createProject(projectName, projectPath, projectCommands);
      const variantConfigs =
        options?.variants && options.variants.length > 0
          ? options.variants
          : [{ id: "base", name: sessionName, prompt: options?.prompt, model: options?.model }];

      const { setSessionModel, updateSession } = useSessionStore.getState();
      const createdSessions: Session[] = [];

      for (const [index, variant] of variantConfigs.entries()) {
        const name =
          variant.name?.trim() ||
          (sessionName ? `${sessionName} ${variantConfigs.length > 1 ? `(${index + 1})` : ""}` : `Variant ${index + 1}`);

        const newSession = await createSession(project.id, name, projectPath);

        // Copy selected gitignored files to worktree
        if (filesToCopy && filesToCopy.length > 0 && newSession.cwd !== projectPath) {
          try {
            await invoke<string[]>("copy_files_to_worktree", {
              projectPath,
              worktreePath: newSession.cwd,
              files: filesToCopy,
            });
          } catch (copyErr) {
            console.error("Failed to copy files:", copyErr);
          }
        }

        const variantModel = variant.model ?? options?.model;
        if (variantModel) {
          setSessionModel(newSession.id, variantModel);
        }

        const variantPrompt = variant.prompt || options?.prompt;
        if (variantPrompt) {
          await updateSession(newSession.id, { initialPrompt: variantPrompt });
        }

        createdSessions.push(newSession);
      }

      if (createdSessions.length > 1) {
        await openAllProjectSessionChats(
          createdSessions.map((session) => ({
            sessionId: session.id,
            sessionName: session.name,
            cwd: session.cwd,
          })),
          project.name
        );
      } else if (createdSessions[0] && chatTypes.length > 0) {
        await openMultipleChatWindows(
          {
            sessionId: createdSessions[0].id,
            sessionName: createdSessions[0].name,
            projectName: project.name,
            cwd: createdSessions[0].cwd,
          },
          chatTypes.length
        );
      }

      setSelectedProjectId(project.id);
    } catch (err) {
      // Show error to user (the error will bubble up to ProjectWizardDialog)
      throw err;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Custom Titlebar */}
      <CustomTitlebar
        title="MindGrid"
        subtitle={isSettingsView ? "Settings" : isAnalyticsView ? "Analytics" : "Dashboard"}
      >
        {worktreeName && (
          <span className="badge badge-warning">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {worktreeName}
          </span>
        )}
      </CustomTitlebar>

      {/* Header - Search and actions */}
      {!isSettingsView && !isAnalyticsView && (
        <div className="h-14 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-[var(--text-primary)]">Projects</span>
            <span className="badge badge-default">{activeProjects.length}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-64 h-9 px-3 pl-9 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)] transition-all"
              />
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* New Project button */}
            <button
              onClick={() => setShowProjectWizard(true)}
              className="h-9 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-[var(--accent-primary-muted)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-56 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] p-4 flex flex-col min-h-0">
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
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse-dot" />
                    <span className="text-xs text-[var(--accent-success)]">{allActiveSessions.length}</span>
                  </span>
                ) : undefined
              }
            />
          </nav>

          {/* Divider */}
          <div className="divider" />

          <div className="space-y-1">
            <SidebarButton
              label="Analytics"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              active={isAnalyticsView}
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedSessionId(null);
                setActiveView("analytics");
              }}
            />
            <SidebarButton
              label="Settings"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
          ) : isAnalyticsView ? (
            <AnalyticsPage onBack={() => setActiveView("all")} />
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
              onCreateSession={() => handleOpenCreateSessionDialog(selectedProject.id)}
              onDeleteProject={handleDeleteProject}
              onDeleteSession={handleDeleteSession}
              onRunProject={handleRunProject}
            />
          ) : (
            <div className="h-full overflow-y-auto scrollbar-thin p-6 bg-[var(--bg-primary)]">
              <div className="max-w-5xl mx-auto">
                {activeView === "all" && (
                  <>
                    {/* Usage Limits Card */}
                    <div className="mb-6">
                      <UsageLimitsCard />
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
                            onOpenSessionChat={handleOpenSessionChat}
                            onCreateSession={(p) => handleOpenCreateSessionDialog(p.id)}
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
                      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Recent Activity</h1>
                      <div className="flex items-center gap-3">
                        <select
                          value={activityFilterProject || ""}
                          onChange={(e) => {
                            setActivityFilterProject(e.target.value || null);
                            setActivityFilterSession(null);
                          }}
                          className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)]"
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
                            className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary-muted)]"
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
                            className="px-3 py-1.5 bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] rounded-lg text-sm text-[var(--text-secondary)] transition-colors"
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
                              className="card p-4 hover:border-[var(--border-default)] cursor-pointer"
                              onClick={() => setSelectedProjectId(item.project.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                                    item.agent === "coding" ? "bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]" : "bg-[rgba(34,197,94,0.15)] text-[var(--accent-success)]"
                                  }`}
                                >
                                  {item.agent === "coding" ? "C" : "R"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-[var(--text-secondary)]">{item.sessionName}</span>
                                    <span className="text-xs text-[var(--text-tertiary)]">{item.time}</span>
                                  </div>
                                  <p className="text-sm text-[var(--text-primary)] mb-2">{item.message}</p>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded flex items-center justify-center text-xs"
                                      style={{ background: preset?.color || "#6b7280" }}
                                    >
                                      {preset?.icon || "?"}
                                    </div>
                                    <span className="text-xs text-[var(--text-tertiary)]">{item.project.name}</span>
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
                      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Active Sessions</h1>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse-dot" />
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
                              <div key={project.id} className="card overflow-hidden">
                                <div
                                  className="flex items-center gap-3 p-4 border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                                  onClick={() => setSelectedProjectId(project.id)}
                                >
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                    style={{ background: preset?.color || "#6b7280" }}
                                  >
                                    {preset?.icon || "?"}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-[var(--text-primary)]">{project.name}</div>
                                    <PathLink path={project.path} className="text-xs text-[var(--text-tertiary)]" />
                                  </div>
                                  <span className="text-xs text-[var(--accent-primary)]">{activeSessions.length} active</span>
                                </div>
                                <div className="divide-y divide-[var(--border-subtle)]">
                                  {activeSessions.map((session) => (
                                    <div
                                      key={session.id}
                                      className="flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                                      onClick={() => handleOpenSession(project, session)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <StatusDot status={session.status} />
                                        <div>
                                          <div className="text-sm text-[var(--text-primary)]">{session.name}</div>
                                          <div className="text-xs text-[var(--text-tertiary)]">
                                            {session.agents.join(", ") || "Coding"}
                                          </div>
                                        </div>
                                      </div>
                                      <button className="p-1.5 hover:bg-[var(--bg-active)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
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

      {(() => {
        const dialogProjectId = createSessionForProjectId || selectedProjectId;
        const dialogProject = dialogProjectId
          ? activeProjects.find(p => p.id === dialogProjectId)
          : null;
        const sourceProject = dialogProjectId ? projects[dialogProjectId] : null;
        return dialogProject && (
          <CreateSessionDialog
            isOpen={showCreateSessionDialog}
            projectName={dialogProject.name}
            projectPath={dialogProject.path}
            existingSessionCount={dialogProject.sessions.length}
            defaultModel={sourceProject?.defaultModel}
            defaultPermissionMode={sourceProject?.defaultPermissionMode}
            defaultCommitMode={sourceProject?.defaultCommitMode}
            onClose={() => {
              setShowCreateSessionDialog(false);
              setCreateSessionForProjectId(null);
            }}
            onCreate={handleCreateSession}
          />
        );
      })()}

      {/* Transformer Mode Indicator - shows floating indicator when active */}
      <TransformerModeIndicator />
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
      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 rounded-lg transition-all ${
        active
          ? "bg-[var(--accent-primary-muted)] text-[var(--accent-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {typeof count === "number" && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
          {count}
        </span>
      )}
      {badge && <span className="ml-auto">{badge}</span>}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="w-20 h-20 mx-auto mb-6 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl flex items-center justify-center">
        <svg className="w-10 h-10 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
      <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">No projects yet</h3>
      <p className="text-[var(--text-secondary)] mb-8">Create your first project to get started</p>
      <button
        onClick={onCreate}
        className="px-6 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-[var(--accent-primary-muted)]"
      >
        Create Project
      </button>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="text-center py-24">
      <div className="w-20 h-20 mx-auto mb-6 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl flex items-center justify-center">
        <svg className="w-10 h-10 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">No recent activity</h3>
      <p className="text-[var(--text-secondary)]">Start a session to see activity here</p>
    </div>
  );
}

function EmptyActive() {
  return (
    <div className="text-center py-24">
      <div className="w-20 h-20 mx-auto mb-6 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl flex items-center justify-center">
        <svg className="w-10 h-10 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
      <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">No active sessions</h3>
      <p className="text-[var(--text-secondary)]">All sessions are idle or completed</p>
    </div>
  );
}

function StatusDot({ status }: { status: DashboardSession["status"] }) {
  const colors = {
    running: "bg-[var(--accent-success)]",
    waiting: "bg-[var(--accent-primary)]",
    completed: "bg-[var(--text-tertiary)]",
    idle: "bg-[var(--text-tertiary)]",
  };

  const animate = status === "running" || status === "waiting";

  return (
    <span
      className={`w-2 h-2 rounded-full ${colors[status] || colors.idle} ${animate ? "animate-pulse-dot" : ""}`}
    />
  );
}

function buildDashboardProjects(
  projects: Project[],
  sessions: Record<string, Session>,
  isSessionActive: (sessionId: string) => boolean,
  isSessionRunning: (sessionId: string) => boolean
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
        initialPrompt: session.initialPrompt,
        isRunning: isSessionRunning(session.id),
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
      buildCommand: project.buildCommand,
      runCommand: project.runCommand,
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
