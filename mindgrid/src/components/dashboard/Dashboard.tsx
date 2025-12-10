import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PRESETS, type ChatType } from "../../lib/presets";
import { openAllProjectSessionChats, closeAllProjectSessionChats, closeAllSessionChatWindows, openMultipleChatWindows, runAllProjectSessions, openNewChatInSession } from "../../lib/window-manager";
import { useSessionStore, type Project, type Session } from "../../stores/sessionStore";
import { useUsageStore } from "../../stores/usageStore";
import { getWorktreeInfo } from "../../lib/dev-mode";
import { ProjectWizardDialog } from "../ProjectWizardDialog";
import { ProjectCard } from "./ProjectCard";
import { SessionDetailView } from "./SessionDetailView";
import { UsageLimitsCard } from "./UsageLimitsCard";
import type { DashboardProject, DashboardSession, DashboardGitInfo, DashboardSessionStatus } from "./types";
import { SettingsPage } from "../../pages/SettingsPage";
import { CreateSessionDialog, type SessionConfig, type SessionVariantConfig } from "../CreateSessionDialog";
import { CustomTitlebar } from "../CustomTitlebar";
import { TransformerModeIndicator } from "../TransformerTabBar";
import { useTransformerStore } from "../../stores/transformerStore";

type DashboardView = "all" | "settings";

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
      void openMultipleChatWindows({
        sessionId: liveSession.id,
        sessionName: liveSession.name,
        projectName: project.name,
        cwd: liveSession.cwd,
      }, 1);
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

  const handleOpenNewChat = (session: DashboardSession) => {
    const storeSession = sessions[session.id];
    if (!storeSession) return;
    const project = projects[storeSession.projectId];
    if (!project) return;

    void openNewChatInSession({
      sessionId: session.id,
      sessionName: session.name,
      projectName: project.name,
      cwd: storeSession.cwd,
    });
  };

  const handleCloseAllChats = async (project: DashboardProject) => {
    const sessionIds = project.sessions.map(s => s.id);
    await closeAllProjectSessionChats(sessionIds);
  };

  const handleCloseSessionChats = async (sessionId: string) => {
    await closeAllSessionChatWindows(sessionId);
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
    } else if (createdSessions[0]) {
        // Open the single session chat (which is now the Main Session chat window)
        await openMultipleChatWindows(
          {
            sessionId: createdSessions[0].id,
            sessionName: createdSessions[0].name,
            projectName: project.name,
            cwd: createdSessions[0].cwd,
          },
          1
        );
    }
  };

  const handleCreateProjectWithChats = async (
    projectName: string,
    projectPath: string,
    sessionName: string,
    _chatTypes: ChatType[],
    filesToCopy?: string[],
    projectCommands?: { buildCommand?: string; runCommand?: string },
    options?: { prompt?: string; model?: string | null; variants?: SessionVariantConfig[] }
  ) => {
    try {
      const project = await createProject(projectName, projectPath, projectCommands);
      // Always include the primary session, then add any variants
      const primarySession = { id: "base", name: sessionName, prompt: options?.prompt, model: options?.model };
      const variantConfigs = [primarySession, ...(options?.variants || [])];

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
      } else if (createdSessions[0]) {
        // Always open exactly one chat window for a single session
        await openMultipleChatWindows(
          {
            sessionId: createdSessions[0].id,
            sessionName: createdSessions[0].name,
            projectName: project.name,
            cwd: createdSessions[0].cwd,
          },
          1
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
        subtitle={isSettingsView ? "Settings" : "Dashboard"}
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
      {!isSettingsView && (
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
          </nav>

          {/* Divider */}
          <div className="divider" />

          <div className="space-y-1">
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
          ) : selectedSessionId && sessions[selectedSessionId] ? (
            <SessionDetailView
              session={sessions[selectedSessionId]}
              projectName={selectedProject?.name || "Unknown Project"}
              onClose={() => setSelectedSessionId(null)}
              onOpenChat={() => handleOpenSessionChat(selectedSessionId)}
              onCloseAllChats={() => handleCloseSessionChats(selectedSessionId)}
              onDeleteSession={handleDeleteSession}
              onRefreshGitStatus={() => refreshGitStatus(selectedSessionId)}
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
                            onOpenNewChat={handleOpenNewChat}
                            onCreateSession={(p) => handleOpenCreateSessionDialog(p.id)}
                            onCloseAllChats={() => handleCloseAllChats(project)}
                            onCloseSessionChats={handleCloseSessionChats}
                            onDeleteProject={handleDeleteProject}
                            onDeleteSession={handleDeleteSession}
                          />
                        ))}
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
