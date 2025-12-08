import { useState, useCallback, useMemo, useEffect } from "react";
import { ChatUI } from "./components/ChatUI";
import { DebugPanel } from "./components/DebugPanel";
import { Sidebar } from "./components/Sidebar";
import { useSessionStore } from "./stores/sessionStore";
import type { ClaudeEvent, ParsedMessage } from "./lib/claude-types";
import { debug } from "./stores/debugStore";

function App() {
  const [showDebug, setShowDebug] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  const {
    activeSessionId,
    sessions,
    addMessage,
    handleClaudeEvent: storeHandleClaudeEvent,
    initialize,
    isInitialized,
    isLoading,
  } = useSessionStore();

  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const activeSession = activeSessionId ? sessions[activeSessionId] : null;

  const handleClaudeEvent = useCallback(
    (event: ClaudeEvent) => {
      debug.event("App", `Claude event: ${event.type}`, event);
      console.log("[App] Claude event:", event.type, "activeSessionId:", activeSessionId);
      if (activeSessionId) {
        storeHandleClaudeEvent(activeSessionId, event);
      } else {
        console.warn("[App] No activeSessionId, event not processed");
      }
    },
    [activeSessionId, storeHandleClaudeEvent]
  );

  const handleClaudeMessage = useCallback(
    (message: ParsedMessage) => {
      console.log("[App] handleClaudeMessage called:", message.role, "activeSessionId:", activeSessionId);
      if (activeSessionId) {
        console.log("[App] Adding message to session:", activeSessionId);
        addMessage(activeSessionId, message);
      } else {
        console.warn("[App] No activeSessionId, message not added:", message);
      }
    },
    [activeSessionId, addMessage]
  );

  const messageCount = activeSession?.messages.length || 0;
  const totalCost = useMemo(() => {
    return Object.values(sessions).reduce((sum, s) => sum + s.totalCost, 0);
  }, [sessions]);

  // Show loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

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
          {activeSession && (
            <span className="text-sm text-zinc-400">
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
          <span className="text-xs text-zinc-400">
            {messageCount} messages
          </span>
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
          {/* Chat UI or Empty State */}
          <div className={`${showDebug ? "w-1/2" : "w-full"} h-full border-r border-zinc-700`}>
            {activeSession ? (
              <ChatUI
                key={activeSessionId} // Remount on session change
                className="h-full"
                cwd={activeSession.cwd}
                claudeSessionId={activeSession.claudeSessionId}
                messages={activeSession.messages}
                model={activeSession.model}
                onClaudeEvent={handleClaudeEvent}
                onClaudeMessage={handleClaudeMessage}
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
          {activeSession && (
            <span className="text-zinc-500 truncate max-w-md" title={activeSession.cwd}>
              {activeSession.cwd}
            </span>
          )}
          <span>Chat Mode</span>
        </div>
      </footer>
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
