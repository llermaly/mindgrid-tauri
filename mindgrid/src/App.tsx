import { useEffect, useState } from "react";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Terminal } from "./components/Terminal";
import { CustomTitlebar } from "./components/CustomTitlebar";
import { WorkspaceLayout } from "./components/workspace";
import { useSessionStore } from "./stores/sessionStore";
import { isDevMode, getWorktreeInfo } from "./lib/dev-mode";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getSessionColorVars } from "./lib/session-colors";
import {
  useGlobalShortcuts,
  focusMainWindow,
  cycleNextWindow,
  cyclePrevWindow,
} from "./hooks/useGlobalShortcuts";

type WindowMode = "main" | "terminal" | "workspace";

function getWindowParams(): {
  mode: WindowMode;
  sessionId: string | null;
  projectId: string | null;
  sessionName: string | null;
  projectName: string | null;
  runCommand: string | null;
  cwd: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get("mode");
  let mode: WindowMode = "main";
  if (modeParam === "terminal") mode = "terminal";
  else if (modeParam === "workspace") mode = "workspace";

  return {
    mode,
    sessionId: params.get("sessionId"),
    projectId: params.get("projectId"),
    sessionName: params.get("sessionName"),
    projectName: params.get("projectName"),
    runCommand: params.get("runCommand"),
    cwd: params.get("cwd"),
  };
}

function App() {
  const { mode: windowMode, sessionId, projectId, sessionName, projectName, runCommand, cwd: urlCwd } = getWindowParams();

  // State for triggering actions from global shortcuts
  const [shortcutTrigger, setShortcutTrigger] = useState<{
    action: "newChat" | "toggleTransformer" | "runAll" | null;
    timestamp: number;
  }>({ action: null, timestamp: 0 });

  const {
    initialize,
    isInitialized,
    isLoading,
  } = useSessionStore();

  // Global shortcuts - only register in main window
  useGlobalShortcuts({
    enabled: windowMode === "main",
    onNewChat: () => {
      console.log("[Shortcuts] New chat triggered");
      setShortcutTrigger({ action: "newChat", timestamp: Date.now() });
    },
    onToggleTransformer: () => {
      console.log("[Shortcuts] Toggle transformer triggered");
      setShortcutTrigger({ action: "toggleTransformer", timestamp: Date.now() });
    },
    onRunAll: () => {
      console.log("[Shortcuts] Run all triggered");
      setShortcutTrigger({ action: "runAll", timestamp: Date.now() });
    },
    onNextWindow: cycleNextWindow,
    onPrevWindow: cyclePrevWindow,
    onFocusMain: focusMainWindow,
  });

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

  // Terminal mode doesn't need the store - render immediately if we have cwd from URL
  if (windowMode === "terminal" && urlCwd) {
    const sessionColorVars = sessionId ? getSessionColorVars(sessionId) : {};
    const subtitle = [sessionName, projectName].filter(Boolean).join(" / ");

    return (
      <div
        className="h-screen flex flex-col bg-neutral-900"
        style={{
          ...sessionColorVars as React.CSSProperties,
          ...(sessionId ? { border: '2px solid var(--session-border)' } : {}),
        }}
      >
        {/* Custom titlebar with session color accent */}
        <CustomTitlebar
          title="Terminal"
          subtitle={subtitle || undefined}
          showControls={true}
        />

        {/* Terminal fills the rest */}
        <div className="flex-1 min-h-0">
          <Terminal cwd={urlCwd} initialCommand={runCommand || undefined} mode="raw" />
        </div>
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

  if (windowMode === "terminal") {
    // Terminal mode uses cwd directly from URL
    if (!urlCwd) {
      return (
        <div className="h-full flex items-center justify-center bg-zinc-900">
          <div className="text-center">
            <div className="text-zinc-400 mb-2">No working directory specified</div>
            <div className="text-zinc-500 text-sm">Please provide a cwd parameter</div>
          </div>
        </div>
      );
    }

    const sessionColorVars = sessionId ? getSessionColorVars(sessionId) : {};
    const subtitle = [sessionName, projectName].filter(Boolean).join(" / ");

    return (
      <div
        className="h-screen flex flex-col bg-neutral-900"
        style={{
          ...sessionColorVars as React.CSSProperties,
          ...(sessionId ? { border: '2px solid var(--session-border)' } : {}),
        }}
      >
        {/* Custom titlebar with session color accent */}
        <CustomTitlebar
          title="Terminal"
          subtitle={subtitle || undefined}
          showControls={true}
        />

        {/* Terminal fills the rest */}
        <div className="flex-1 min-h-0">
          <Terminal cwd={urlCwd} initialCommand={runCommand || undefined} mode="raw" />
        </div>
      </div>
    );
  }

  // Workspace mode - unified layout with chat, preview, terminal
  if (windowMode === "workspace" && projectId && sessionId) {
    return (
      <WorkspaceLayout
        projectId={projectId}
        sessionId={sessionId}
        onBack={() => {
          // Navigate back to main dashboard by changing URL
          window.location.search = "";
        }}
      />
    );
  }

  return (
    <Dashboard
      shortcutTrigger={shortcutTrigger}
      onShortcutHandled={() => setShortcutTrigger({ action: null, timestamp: 0 })}
    />
  );
}

export default App;
