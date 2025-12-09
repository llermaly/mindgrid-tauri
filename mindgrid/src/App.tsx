import { useEffect, useCallback } from "react";
import { Dashboard } from "./components/dashboard/Dashboard";
import { SessionWorkspace } from "./components/workspace/SessionWorkspace";
import { AgentPanel } from "./components/workspace/panels/AgentPanel";
import { TerminalPanel } from "./components/workspace/panels/TerminalPanel";
import { BrowserPanel } from "./components/workspace/panels/BrowserPanel";
import { FoundationsPanel } from "./components/workspace/panels/FoundationsPanel";
import { GitPanel } from "./components/workspace/panels/GitPanel";
import type { ParsedMessage, ClaudeEvent } from "./lib/claude-types";
import { useSessionStore, type Session, type PanelType } from "./stores/sessionStore";
import { isDevMode, getWorktreeInfo } from "./lib/dev-mode";
import { getCurrentWindow } from "@tauri-apps/api/window";

function getWindowParams(): { mode: "main" | "workspace" | "terminal"; sessionId: string | null; runCommand: string | null; cwd: string | null } {
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get("mode");
  let mode: "main" | "workspace" | "terminal" = "main";
  if (modeParam === "workspace") mode = "workspace";
  if (modeParam === "terminal") mode = "terminal";
  return {
    mode,
    sessionId: params.get("sessionId"),
    runCommand: params.get("runCommand"),
    cwd: params.get("cwd"),
  };
}

function App() {
  const { mode: windowMode, sessionId: urlSessionId, runCommand, cwd: urlCwd } = getWindowParams();

  const {
    activeSessionId,
    sessions,
    initialize,
    isInitialized,
    isLoading,
    setPermissionMode,
    setCommitMode,
    gitPush,
    getPrInfo,
    createPr,
    mergePr,
    ghAvailable,
    checkpointCommit,
    setPanelModel,
    addPanelMessage,
    handlePanelClaudeEvent,
    clearPanelSession,
    getPanelState,
  } = useSessionStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Check dev mode and worktree status on mount
  useEffect(() => {
    const checkEnvironment = async () => {
      const devEnabled = await isDevMode();
      const worktree = await getWorktreeInfo();

      if (devEnabled) {
        console.log("[App] Developer mode enabled");
      }

      // Update window title if running from a worktree
      if (worktree) {
        console.log("[App] Running from worktree:", worktree);
        const win = getCurrentWindow();
        const currentTitle = await win.title();
        if (!currentTitle.includes("TESTING")) {
          await win.setTitle(`${currentTitle} [TESTING: ${worktree}]`);
        }
      }
    };
    checkEnvironment();
  }, []);

  const effectiveSessionId = (windowMode === "workspace" || windowMode === "terminal") && urlSessionId ? urlSessionId : activeSessionId;
  const activeSession = effectiveSessionId ? sessions[effectiveSessionId] : null;

  useEffect(() => {
    if (windowMode === "workspace") {
      console.log("[Workspace] Window mode:", windowMode);
      console.log("[Workspace] URL Session ID:", urlSessionId);
      console.log("[Workspace] Sessions loaded:", Object.keys(sessions));
      console.log("[Workspace] Session found:", !!activeSession);
    }
  }, [windowMode, urlSessionId, sessions, activeSession]);

  const handlePanelClaudeEventCallback = useCallback(
    (sessionId: string, panelType: PanelType) => (event: ClaudeEvent) => {
      handlePanelClaudeEvent(sessionId, panelType, event);

      const session = sessions[sessionId];
      if (event.type === "result" && session?.commitMode === "checkpoint") {
        checkpointCommit(sessionId);
      }
    },
    [handlePanelClaudeEvent, sessions, checkpointCommit]
  );

  const handlePanelMessageCallback = useCallback(
    (sessionId: string, panelType: PanelType) => (message: ParsedMessage) => {
      addPanelMessage(sessionId, panelType, message);
    },
    [addPanelMessage]
  );

  const renderPanelContent = (panelId: PanelType, session: Session) => {
    const panelState = getPanelState(session.id, panelId);

    switch (panelId) {
      case "research":
      case "coding":
      case "review":
        return (
          <AgentPanel
            sessionId={session.id}
            cwd={session.cwd}
            claudeSessionId={panelState.claudeSessionId}
            messages={panelState.messages}
            model={panelState.model}
            permissionMode={session.permissionMode}
            commitMode={session.commitMode}
            gitAhead={session.gitStatus?.ahead ?? 0}
            sessionName={`${session.name} - ${panelId}`}
            ghAvailable={ghAvailable}
            onClaudeEvent={handlePanelClaudeEventCallback(session.id, panelId)}
            onClaudeMessage={handlePanelMessageCallback(session.id, panelId)}
            onModelChange={(model) => setPanelModel(session.id, panelId, model)}
            onPermissionModeChange={(mode) => setPermissionMode(session.id, mode)}
            onCommitModeChange={(mode) => setCommitMode(session.id, mode)}
            onClearSession={() => clearPanelSession(session.id, panelId)}
            onGitPush={() => gitPush(session.id)}
            onGetPrInfo={() => getPrInfo(session.id)}
            onCreatePr={(title, body) => createPr(session.id, title, body)}
            onMergePr={(squash) => mergePr(session.id, squash)}
          />
        );
      case "terminal":
        return <TerminalPanel cwd={session.cwd} />;
      case "browser":
        return <BrowserPanel initialUrl="http://localhost:3000" />;
      case "foundations":
        return <FoundationsPanel cwd={session.cwd} />;
      case "git":
        return <GitPanel />;
      default:
        return null;
    }
  };

  // Terminal mode doesn't need the store - render immediately if we have cwd from URL
  if (windowMode === "terminal" && urlCwd) {
    return (
      <div className="h-full bg-neutral-900">
        <TerminalPanel cwd={urlCwd} initialCommand={runCommand || undefined} />
      </div>
    );
  }

  if (!isInitialized || isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (windowMode === "workspace") {
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
        <SessionWorkspace sessionName={activeSession.name} renderPanel={(panelId: PanelType) => renderPanelContent(panelId, activeSession)} />
      </div>
    );
  }

  if (windowMode === "terminal") {
    // Terminal mode uses cwd directly from URL, no session needed
    const terminalCwd = urlCwd || activeSession?.cwd;
    if (!terminalCwd) {
      return (
        <div className="h-full flex items-center justify-center bg-zinc-900">
          <div className="text-center">
            <div className="text-zinc-400 mb-2">No working directory specified</div>
            <div className="text-zinc-500 text-sm">Please provide a cwd parameter</div>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full bg-neutral-900">
        <TerminalPanel cwd={terminalCwd} initialCommand={runCommand || undefined} />
      </div>
    );
  }

  return <Dashboard />;
}

export default App;
