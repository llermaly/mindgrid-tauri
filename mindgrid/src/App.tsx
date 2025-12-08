import { useState, useMemo, useEffect } from "react";
import { DebugPanel } from "./components/DebugPanel";
import { Sidebar } from "./components/Sidebar";
import { useSessionStore, type Session, type Project } from "./stores/sessionStore";
import {
  openChatWindow,
  openNewChatInSession,
  closeAllSessionChatWindows,
  arrangeSessionWindows,
  getSessionChatWindowCount,
  openWorkspaceWindow,
} from "./lib/window-manager";
import { SessionWorkspace } from "./components/workspace/SessionWorkspace";
import { PanelType } from "./components/workspace/Panel";
import { AgentPanel } from "./components/workspace/panels/AgentPanel";
import { TerminalPanel } from "./components/workspace/panels/TerminalPanel";
import { BrowserPanel } from "./components/workspace/panels/BrowserPanel";
import { FoundationsPanel } from "./components/workspace/panels/FoundationsPanel";
import { GitPanel } from "./components/workspace/panels/GitPanel";
import type { ParsedMessage } from "./lib/claude-types";

// Check if this window was opened in workspace mode and get session ID from URL
function getWindowParams(): { mode: 'main' | 'workspace'; sessionId: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get('mode') === 'workspace' ? 'workspace' : 'main',
    sessionId: params.get('sessionId'),
  };
}

function App() {
  const [showDebug, setShowDebug] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const { mode: windowMode, sessionId: urlSessionId } = getWindowParams();

  const {
    activeSessionId,
    sessions,
    projects,
    initialize,
    isInitialized,
    isLoading,
  } = useSessionStore();

  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // For workspace windows, use sessionId from URL; for main window, use activeSessionId
  const effectiveSessionId = windowMode === 'workspace' && urlSessionId ? urlSessionId : activeSessionId;
  const activeSession = effectiveSessionId ? sessions[effectiveSessionId] : null;
  const activeProject = activeSession ? projects[activeSession.projectId] : null;

  // Debug logging for workspace windows
  useEffect(() => {
    if (windowMode === 'workspace') {
      console.log('[Workspace] Window mode:', windowMode);
      console.log('[Workspace] URL Session ID:', urlSessionId);
      console.log('[Workspace] Sessions loaded:', Object.keys(sessions));
      console.log('[Workspace] Session found:', !!activeSession);
    }
  }, [windowMode, urlSessionId, sessions, activeSession]);

  const totalCost = useMemo(() => {
    return Object.values(sessions).reduce((sum, s) => sum + s.totalCost, 0);
  }, [sessions]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N: Open new chat window for active session
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && activeSession && activeProject) {
        e.preventDefault();
        openNewChatInSession({
          sessionId: activeSession.id,
          sessionName: activeSession.name,
          projectName: activeProject.name,
          cwd: activeSession.cwd,
        });
      }

      // Cmd/Ctrl + O: Open chat window for active session (existing conversation)
      if ((e.metaKey || e.ctrlKey) && e.key === "o" && activeSession && activeProject) {
        e.preventDefault();
        openChatWindow({
          sessionId: activeSession.id,
          sessionName: activeSession.name,
          projectName: activeProject.name,
          cwd: activeSession.cwd,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession, activeProject]);

  // Render panel content for workspace mode
  const renderPanelContent = (panelId: PanelType, session: Session) => {
    switch (panelId) {
      case 'research':
      case 'coding':
      case 'review':
        return (
          <AgentPanel
            sessionId={session.id}
            cwd={session.cwd}
            claudeSessionId={session.claudeSessionId}
            messages={session.messages}
            model={session.model}
          />
        );
      case 'terminal':
        return <TerminalPanel cwd={session.cwd} />;
      case 'browser':
        return <BrowserPanel initialUrl="http://localhost:3000" />;
      case 'foundations':
        return <FoundationsPanel cwd={session.cwd} />;
      case 'git':
        return <GitPanel />;
      default:
        return null;
    }
  };

  // Show loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  // If this is a workspace window, show only the workspace view
  if (windowMode === 'workspace') {
    if (!activeSession) {
      return (
        <div className="h-full flex items-center justify-center bg-zinc-900">
          <div className="text-center">
            <div className="text-zinc-400 mb-2">Session not found</div>
            <div className="text-zinc-500 text-sm">Session ID: {urlSessionId}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full bg-neutral-900">
        <SessionWorkspace
          sessionName={activeSession.name}
          renderPanel={(panelId: PanelType) => renderPanelContent(panelId, activeSession)}
        />
      </div>
    );
  }

  // Handler to open workspace window
  const handleOpenWorkspace = () => {
    if (activeSession && activeProject) {
      openWorkspaceWindow({
        sessionId: activeSession.id,
        sessionName: activeSession.name,
        projectName: activeProject.name,
        cwd: activeSession.cwd,
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-1 rounded ${
              showSidebar ? "bg-zinc-700" : "hover:bg-zinc-700"
            } text-zinc-400 hover:text-zinc-200`}
            title="Toggle Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-zinc-100">MindGrid</h1>
          {activeProject && (
            <span className="text-sm text-zinc-400">
              / {activeProject.name}
            </span>
          )}
          {activeSession && (
            <span className="text-sm text-zinc-500">
              / {activeSession.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalCost > 0 && (
            <span className="text-xs text-zinc-500">
              Total: ${totalCost.toFixed(4)}
            </span>
          )}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`px-3 py-1 text-xs font-medium rounded ${
              showDebug
                ? "bg-purple-600 hover:bg-purple-500"
                : "bg-zinc-700 hover:bg-zinc-600"
            } text-zinc-100`}
          >
            Debug
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0 flex">
        {/* Sidebar */}
        {showSidebar && <Sidebar />}

        {/* Main area */}
        <div className="flex-1 flex min-w-0">
          <div className={`${showDebug ? "w-1/2" : "w-full"} h-full border-r border-zinc-700`}>
            {activeSession && activeProject ? (
              <SessionOverview
                session={activeSession}
                project={activeProject}
                onOpenChat={() => openChatWindow({
                  sessionId: activeSession.id,
                  sessionName: activeSession.name,
                  projectName: activeProject.name,
                  cwd: activeSession.cwd,
                })}
                onNewChat={() => openNewChatInSession({
                  sessionId: activeSession.id,
                  sessionName: activeSession.name,
                  projectName: activeProject.name,
                  cwd: activeSession.cwd,
                })}
                onOpenWorkspace={handleOpenWorkspace}
              />
            ) : (
              <EmptyState />
            )}
          </div>

          {/* Debug Panel */}
          {showDebug && (
            <div className="w-1/2 h-full">
              <DebugPanel />
            </div>
          )}
        </div>
      </main>

      {/* Status bar */}
      <footer className="flex items-center justify-between px-4 py-1 bg-zinc-800 border-t border-zinc-700 text-xs text-zinc-400">
        <span>MindGrid v0.1.0</span>
        <div className="flex items-center gap-4">
          <span className="text-zinc-600">Cmd+N: New Chat</span>
          <span className="text-zinc-600">Cmd+O: Open Chat</span>
          {activeSession && (
            <span className="text-zinc-500 truncate max-w-md" title={activeSession.cwd}>
              {activeSession.cwd}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

interface SessionOverviewProps {
  session: Session;
  project: Project;
  onOpenChat: () => void;
  onNewChat: () => void;
  onOpenWorkspace: () => void;
}

function SessionOverview({ session, project, onOpenChat, onNewChat, onOpenWorkspace }: SessionOverviewProps) {
  const [openWindowCount, setOpenWindowCount] = useState(0);
  const [isClosingWindows, setIsClosingWindows] = useState(false);

  // Poll for open window count
  useEffect(() => {
    const updateCount = async () => {
      const count = await getSessionChatWindowCount(session.id);
      setOpenWindowCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, [session.id]);

  const handleCloseAll = async () => {
    setIsClosingWindows(true);
    await closeAllSessionChatWindows(session.id);
    setOpenWindowCount(0);
    setIsClosingWindows(false);
  };

  const handleArrangeWindows = async () => {
    await arrangeSessionWindows(session.id);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 p-6 overflow-y-auto">
      {/* Session Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">{session.name}</h2>
            <p className="text-sm text-zinc-500">{project.name}</p>
          </div>
          {openWindowCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm text-blue-400">{openWindowCount} chat window{openWindowCount !== 1 ? 's' : ''} open</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={onOpenChat}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Open Chat
          <span className="text-xs opacity-70 ml-1">(Cmd+O)</span>
        </button>
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
          <span className="text-xs opacity-70 ml-1">(Cmd+N)</span>
        </button>
        <button
          onClick={onOpenWorkspace}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Workspace
        </button>
      </div>

      {/* Window Management - only show if windows are open */}
      {openWindowCount > 0 && (
        <div className="flex gap-3 mb-6 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <button
            onClick={handleArrangeWindows}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Arrange Windows
          </button>
          <button
            onClick={handleCloseAll}
            disabled={isClosingWindows}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors text-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {isClosingWindows ? 'Closing...' : 'Close All Chats'}
          </button>
        </div>
      )}

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Messages"
          value={session.messages.length.toString()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        />
        <StatCard
          label="Cost"
          value={`$${session.totalCost.toFixed(4)}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Model"
          value={session.model || "Not set"}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Git Status"
          value={session.gitStatus?.state || "Unknown"}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          extra={session.gitStatus?.ahead ? `+${session.gitStatus.ahead}` : undefined}
        />
      </div>

      {/* Working Directory */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-zinc-400 mb-2">Working Directory</h3>
        <div className="p-3 bg-zinc-800 rounded-lg font-mono text-sm text-zinc-300 break-all">
          {session.cwd}
        </div>
      </div>

      {/* Git Info */}
      {session.gitStatus && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Git</h3>
          <div className="p-3 bg-zinc-800 rounded-lg">
            {session.gitStatus.current_branch && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-zinc-400">Branch:</span>
                <span className="text-zinc-200 font-mono">{session.gitStatus.current_branch}</span>
              </div>
            )}
            {((session.gitStatus.ahead ?? 0) > 0 || (session.gitStatus.behind ?? 0) > 0) && (
              <div className="flex items-center gap-4 mt-2 text-sm">
                {(session.gitStatus.ahead ?? 0) > 0 && (
                  <span className="text-green-400">+{session.gitStatus.ahead} ahead</span>
                )}
                {(session.gitStatus.behind ?? 0) > 0 && (
                  <span className="text-orange-400">-{session.gitStatus.behind} behind</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Messages Preview */}
      {session.messages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Recent Activity</h3>
          <div className="space-y-2">
            {session.messages.slice(-3).map((msg: ParsedMessage) => (
              <div key={msg.id} className="p-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${
                    msg.role === "user" ? "text-blue-400" :
                    msg.role === "assistant" ? "text-green-400" :
                    "text-zinc-400"
                  }`}>
                    {msg.role === "user" ? "You" : msg.role === "assistant" ? "Claude" : msg.role}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 line-clamp-2">
                  {msg.content || (msg.toolName ? `Tool: ${msg.toolName}` : "...")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  extra?: string;
}

function StatCard({ label, value, icon, extra }: StatCardProps) {
  return (
    <div className="p-4 bg-zinc-800 rounded-lg">
      <div className="flex items-center gap-2 text-zinc-500 mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-zinc-100">{value}</span>
        {extra && (
          <span className="text-xs text-green-400">{extra}</span>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
      <svg className="w-16 h-16 mb-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-lg mb-2">No session selected</p>
      <p className="text-sm text-zinc-500">
        Create a project and session from the sidebar to get started
      </p>
    </div>
  );
}

export default App;
